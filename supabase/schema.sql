-- =====================================================================
-- Sitisbooks · esquema de base de datos (Supabase / Postgres)
-- Ejecutar completo en Supabase → SQL Editor → New query → Run
-- =====================================================================


-- ---------- Perfiles ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  first_name  text not null,
  last_name   text not null,
  phone       text not null check (phone ~ '^9[0-9]{8}$'),
  district    text not null,
  address     text not null,
  reference   text,
  credits     int  not null default 1 check (credits >= 0),
  donated     int  not null default 0,
  received    int  not null default 0,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- Configuración (fila única) ----------
create table if not exists public.settings (
  id           int primary key default 1 check (id = 1),
  fee          numeric(10,2) not null default 5,
  tariffs      jsonb not null default '{}'::jsonb,
  default_tariff numeric(10,2) not null default 12,
  yape_number  text,
  yape_holder  text,
  bank_info    text,
  updated_at   timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- Libros ----------
create table if not exists public.books (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 160),
  author      text not null check (char_length(author) between 1 and 120),
  cover_url   text,
  genre       text not null,
  condition   text not null,
  district    text not null,
  status      text not null default 'disponible'
              check (status in ('disponible','reservado','entregado','retirado')),
  created_at  timestamptz not null default now()
);
create index if not exists books_status_idx on public.books(status, created_at desc);
-- v3: se elimina la nota del libro (podía usarse para compartir datos de contacto)
drop view if exists public.catalog;
drop view if exists public.my_books;
alter table public.books drop column if exists note;
drop function if exists public.publish_book(text, text, text, text, text, text);

-- Bloquea datos de contacto en título y autor: más de 5 dígitos en total, correos, @usuarios, enlaces o redes sociales.
create or replace function public.contact_violation(t text) returns text
language sql immutable as $$
  select case
    when length(regexp_replace(coalesce(t,''), '[^0-9]', '', 'g')) > 5 then 'no puede tener más de 5 números en total'
    when t ~ '@' then 'no puede incluir correos ni usuarios (@)'
    when t ~* '(https?://|www\.|\.(com|pe|net|org|io|me|ly)\M)' then 'no puede incluir enlaces'
    when t ~* '\m(instagram|insta|facebook|fb|tiktok|twitter|whatsapp|wsp|wasap|telegram|ig|linkedin|youtube|snapchat|wa\.me)\M' then 'no puede mencionar redes sociales'
  end
$$;

-- ---------- Intercambios ----------
create table if not exists public.requests (
  id              uuid primary key default gen_random_uuid(),
  book_id         uuid not null references public.books(id) on delete cascade,
  donor_id        uuid not null references public.profiles(id),
  requester_id    uuid not null references public.profiles(id),
  book_title      text not null,
  book_cover      text,
  from_district   text not null,
  to_district     text not null,
  delivery_fee    numeric(10,2) not null,
  platform_fee    numeric(10,2) not null,
  total           numeric(10,2) not null,
  status          text not null default 'pendiente_pago'
                  check (status in ('pendiente_pago','pago_en_revision','pagado','coordinando','en_camino','entregado','cancelado')),
  payment_method  text check (payment_method in ('yape','transferencia')),
  operation_code  text,
  proof_path      text,
  payment_note    text,
  pickup_at       timestamptz,
  delivery_at     timestamptz,
  admin_note      text,
  credit_granted  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.requests add column if not exists delivered_at timestamptz;
create index if not exists requests_status_idx on public.requests(status, created_at desc);

-- ---------- Helpers ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists requests_touch on public.requests;
create trigger requests_touch before update on public.requests
  for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.books    enable row level security;
alter table public.requests enable row level security;

drop policy if exists "perfil propio o admin" on public.profiles;
create policy "perfil propio o admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "settings lectura publica" on public.settings;
create policy "settings lectura publica" on public.settings for select using (true);
drop policy if exists "settings admin" on public.settings;
create policy "settings admin" on public.settings for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "libros visibles" on public.books;
create policy "libros visibles" on public.books for select
  using (status = 'disponible' or owner_id = auth.uid() or public.is_admin());

drop policy if exists "intercambios propios o admin" on public.requests;
drop policy if exists "intercambios solo admin" on public.requests;
create policy "intercambios solo admin" on public.requests for select
  using (public.is_admin());

-- Toda escritura pasa por las funciones de abajo (security definer).

-- ---------- Perfil ----------
create or replace function public.save_profile(
  p_first_name text, p_last_name text, p_phone text, p_district text, p_address text, p_reference text
) returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.profiles (id, email, first_name, last_name, phone, district, address, reference)
  values (auth.uid(), v_email, trim(p_first_name), trim(p_last_name), p_phone, p_district, trim(p_address), nullif(trim(p_reference),''))
  on conflict (id) do update set
    first_name = excluded.first_name, last_name = excluded.last_name, phone = excluded.phone,
    district = excluded.district, address = excluded.address, reference = excluded.reference;
end $$;

-- ---------- Libros ----------
create or replace function public.publish_book(
  p_title text, p_author text, p_cover_url text, p_genre text, p_condition text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_district text; v_id uuid; v_err text;
begin
  v_err := public.contact_violation(p_title);
  if v_err is not null then raise exception 'El título %', v_err; end if;
  v_err := public.contact_violation(p_author);
  if v_err is not null then raise exception 'El autor %', v_err; end if;
  select district into v_district from public.profiles where id = auth.uid();
  if v_district is null then raise exception 'Completa tu perfil antes de publicar'; end if;
  insert into public.books (owner_id, title, author, cover_url, genre, condition, district)
  values (auth.uid(), trim(p_title), trim(p_author), nullif(p_cover_url,''), p_genre, p_condition, v_district)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.withdraw_book(p_book uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.books set status = 'retirado'
  where id = p_book and owner_id = auth.uid() and status = 'disponible';
  if not found then raise exception 'Solo puedes retirar libros disponibles que sean tuyos'; end if;
end $$;

-- ---------- Pedir un libro (consume 1 crédito, reserva el libro) ----------
create or replace function public.request_book(p_book uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare b public.books; me public.profiles; s public.settings; v_fee numeric; v_tariff numeric; v_id uuid;
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'Completa tu perfil antes de pedir libros'; end if;
  if me.credits < 1 then raise exception 'No tienes créditos. Dona un libro para ganar uno'; end if;
  select * into b from public.books where id = p_book for update;
  if b.id is null or b.status <> 'disponible' then raise exception 'Este libro ya no está disponible'; end if;
  if b.owner_id = me.id then raise exception 'No puedes pedir tu propio libro'; end if;
  select * into s from public.settings where id = 1;
  v_fee := s.fee;
  v_tariff := coalesce((s.tariffs ->> me.district)::numeric, s.default_tariff);
  insert into public.requests (book_id, donor_id, requester_id, book_title, book_cover, from_district, to_district, delivery_fee, platform_fee, total)
  values (b.id, b.owner_id, me.id, b.title, b.cover_url, b.district, me.district, v_tariff, v_fee, v_tariff + v_fee)
  returning id into v_id;
  update public.books set status = 'reservado' where id = b.id;
  update public.profiles set credits = credits - 1 where id = me.id;
  return v_id;
end $$;

create or replace function public.submit_payment(p_request uuid, p_method text, p_operation text, p_proof text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.requests set payment_method = p_method, operation_code = nullif(trim(p_operation),''),
    proof_path = p_proof, payment_note = null, status = 'pago_en_revision'
  where id = p_request and requester_id = auth.uid() and status = 'pendiente_pago';
  if not found then raise exception 'Este pedido no está esperando pago'; end if;
end $$;

create or replace function public.cancel_my_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  select * into r from public.requests where id = p_request and requester_id = auth.uid() for update;
  if r.id is null or r.status <> 'pendiente_pago' then raise exception 'Solo puedes cancelar pedidos aún no pagados'; end if;
  update public.requests set status = 'cancelado' where id = r.id;
  update public.books set status = 'disponible' where id = r.book_id and status = 'reservado';
  update public.profiles set credits = credits + 1 where id = r.requester_id;
end $$;

-- ---------- Admin ----------
create or replace function public.admin_review_payment(p_request uuid, p_approve boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo admin'; end if;
  update public.requests
     set status = case when p_approve then 'pagado' else 'pendiente_pago' end,
         payment_note = case when p_approve then null else p_note end
   where id = p_request and status = 'pago_en_revision';
  if not found then raise exception 'El pago no está en revisión'; end if;
end $$;

create or replace function public.admin_update_request(
  p_request uuid, p_status text, p_pickup timestamptz, p_delivery timestamptz, p_note text
) returns void language plpgsql security definer set search_path = public as $$
declare r public.requests;
begin
  if not public.is_admin() then raise exception 'Solo admin'; end if;
  select * into r from public.requests where id = p_request for update;
  if r.id is null then raise exception 'Intercambio no encontrado'; end if;
  if r.status in ('entregado','cancelado') then raise exception 'Este intercambio ya está cerrado'; end if;
  if p_status = 'coordinando' and p_pickup is null then raise exception 'Programa la fecha de recojo'; end if;
  if p_status = 'en_camino' and p_delivery is null then raise exception 'Programa la fecha de entrega'; end if;

  update public.requests set status = p_status, pickup_at = p_pickup, delivery_at = p_delivery, admin_note = p_note
  where id = r.id;

  if p_status = 'entregado' and not r.credit_granted then
    update public.books set status = 'entregado' where id = r.book_id;
    update public.profiles set credits = credits + 1, donated = donated + 1 where id = r.donor_id;
    update public.profiles set received = received + 1 where id = r.requester_id;
    update public.requests set credit_granted = true, delivered_at = coalesce(p_delivery, now()) where id = r.id;
  elsif p_status = 'cancelado' then
    update public.books set status = 'disponible' where id = r.book_id and status = 'reservado';
    update public.profiles set credits = credits + 1 where id = r.requester_id;
  end if;
end $$;

create or replace function public.admin_set_credits(p_user uuid, p_credits int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo admin'; end if;
  update public.profiles set credits = greatest(p_credits, 0) where id = p_user;
end $$;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values ('comprobantes','comprobantes', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('portadas','portadas', true) on conflict (id) do nothing;

drop policy if exists "subir comprobante propio" on storage.objects;
create policy "subir comprobante propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "ver comprobante propio o admin" on storage.objects;
create policy "ver comprobante propio o admin" on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "subir portada propia" on storage.objects;
create policy "subir portada propia" on storage.objects for insert to authenticated
  with check (bucket_id = 'portadas' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Permisos de ejecución ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_admin to anon, authenticated;
grant execute on function public.save_profile, public.publish_book, public.withdraw_book, public.request_book,
  public.submit_payment, public.cancel_my_request, public.admin_review_payment, public.admin_update_request,
  public.admin_set_credits to authenticated;

-- ---------- Privacidad: vistas seguras para usuarios ----------
-- Los usuarios NUNCA leen las tablas books/requests directamente: solo estas vistas,
-- que no exponen quién dona, quién recibe, distritos ni datos de otros usuarios.
revoke select on public.books from anon, authenticated;

create or replace view public.catalog as
  select id, title, author, cover_url, genre, condition, created_at,
         (owner_id = auth.uid()) as is_mine
  from public.books
  where status = 'disponible';

create or replace view public.my_books as
  select id, title, author, cover_url, genre, condition, status, created_at
  from public.books
  where owner_id = auth.uid() and status <> 'retirado';

create or replace view public.my_requests as
  select r.id,
         case when r.requester_id = auth.uid() then 'recibido' else 'donado' end as role,
         r.book_title, r.book_cover, r.created_at, r.delivered_at,
         -- El donante ve un estado simplificado (no ve el pago del otro usuario)
         case when r.requester_id = auth.uid() then r.status
              when r.status in ('pendiente_pago','pago_en_revision','pagado') then 'reservado'
              else r.status end as status,
         case when r.requester_id = auth.uid() then r.delivery_fee end as delivery_fee,
         case when r.requester_id = auth.uid() then r.platform_fee end as platform_fee,
         case when r.requester_id = auth.uid() then r.total end as total,
         case when r.requester_id = auth.uid() then r.payment_note end as payment_note,
         case when r.requester_id = auth.uid() then r.delivery_at end as delivery_at,
         case when r.donor_id = auth.uid() then r.pickup_at end as pickup_at
  from public.requests r
  where r.requester_id = auth.uid() or r.donor_id = auth.uid();

grant select on public.catalog to anon, authenticated;
grant select on public.my_books, public.my_requests to authenticated;

-- ---------- Primer admin (ejecutar DESPUÉS de crear tu perfil en la web) ----------
-- update public.profiles set is_admin = true where email = 'tu-correo@dominio.com';
