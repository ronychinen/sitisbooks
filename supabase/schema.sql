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

-- v10: términos aceptados y suspensión de cuentas
alter table public.profiles add column if not exists terms_version text;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists ban_reason text;
-- v11: foto de perfil
alter table public.profiles add column if not exists avatar_url text;

-- ---------- Direcciones (v4: varias por usuario: casa, trabajo, etc.) ----------
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 30),
  district    text not null,
  address     text not null check (char_length(address) between 3 and 160),
  reference   text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses(user_id);
-- v5: departamento / oficina (opcional)
alter table public.addresses add column if not exists unit text check (unit is null or char_length(unit) <= 30);
-- v6: ubicación en el mapa (opcional, desde Google Maps)
alter table public.addresses add column if not exists lat double precision;
alter table public.addresses add column if not exists lng double precision;
-- Migración: cada perfil existente obtiene su dirección actual como "Casa" (predeterminada)
insert into public.addresses (user_id, label, district, address, reference, is_default)
  select p.id, 'Casa', p.district, p.address, p.reference, true from public.profiles p
  where not exists (select 1 from public.addresses a where a.user_id = p.id);

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
-- v8: precio de 1 crédito (null = venta de créditos desactivada hasta que el admin lo configure)
alter table public.settings add column if not exists credit_price numeric(10,2) check (credit_price is null or credit_price > 0);
-- v9: datos bancarios por separado
alter table public.settings add column if not exists bank_name text;
alter table public.settings add column if not exists bank_holder text;
alter table public.settings add column if not exists bank_account text;
alter table public.settings add column if not exists bank_cci text;

-- ---------- Tarifa de delivery por distancia (v9) ----------
-- Ruta del motorizado: base (Embajada de Brasil, Av. José Pardo 850, Miraflores) → recojo → entrega.
-- km = (distancia en línea recta de cada tramo) × factor vial. Tarifa = base + km × precio por km, mínimo y tope opcional.
alter table public.settings add column if not exists origin_lat double precision not null default -12.1184;
alter table public.settings add column if not exists origin_lng double precision not null default -77.0376;
alter table public.settings add column if not exists km_base_fare numeric(10,2) not null default 5;
alter table public.settings add column if not exists km_price numeric(10,2) not null default 0.6;
alter table public.settings add column if not exists km_min_fee numeric(10,2) not null default 8;
alter table public.settings add column if not exists km_max_fee numeric(10,2);
alter table public.settings add column if not exists road_factor numeric(4,2) not null default 1.3;

-- Centro aproximado de cada distrito (OpenStreetMap); se usa cuando la dirección no tiene pin en el mapa
create table if not exists public.district_centroids (district text primary key, lat double precision not null, lng double precision not null);
insert into public.district_centroids (district, lat, lng) values
  ('Ancón', -11.6968, -77.1116),
  ('Ate', -12.0387, -76.8969),
  ('Barranco', -12.144, -77.0203),
  ('Breña', -12.0597, -77.0501),
  ('Carabayllo', -11.795, -76.9893),
  ('Chaclacayo', -11.9925, -76.7762),
  ('Chorrillos', -12.1923, -77.009),
  ('Cieneguilla', -12.0732, -76.7771),
  ('Comas', -11.9329, -77.0407),
  ('El Agustino', -12.0421, -76.9957),
  ('Independencia', -11.989, -77.0436),
  ('Jesús María', -12.0782, -77.0464),
  ('La Molina', -12.0901, -76.9227),
  ('La Victoria', -12.074, -77.0182),
  ('Lima (Cercado)', -12.053, -77.0358),
  ('Lince', -12.0853, -77.037),
  ('Los Olivos', -11.966, -77.0731),
  ('Lurigancho-Chosica', -11.9488, -76.7627),
  ('Lurín', -12.2382, -76.7839),
  ('Magdalena del Mar', -12.0957, -77.0682),
  ('Miraflores', -12.1215, -77.0259),
  ('Pachacámac', -12.1495, -76.7913),
  ('Pucusana', -12.4685, -76.7725),
  ('Pueblo Libre', -12.0766, -77.0679),
  ('Puente Piedra', -11.8768, -77.0747),
  ('Punta Hermosa', -12.3327, -76.8257),
  ('Punta Negra', -12.3656, -76.7952),
  ('Rímac', -12.0203, -77.0355),
  ('San Bartolo', -12.3898, -76.7806),
  ('San Borja', -12.0965, -76.9957),
  ('San Isidro', -12.0979, -77.0354),
  ('San Juan de Lurigancho', -11.9488, -76.9779),
  ('San Juan de Miraflores', -12.1554, -76.9724),
  ('San Luis', -12.0724, -76.9959),
  ('San Martín de Porres', -11.9878, -77.0983),
  ('San Miguel', -12.0791, -77.0948),
  ('Santa Anita', -12.0433, -76.9619),
  ('Santa María del Mar', -12.4019, -76.7737),
  ('Santa Rosa', -11.805, -77.16),
  ('Santiago de Surco', -12.1251, -76.9822),
  ('Surquillo', -12.1142, -77.0105),
  ('Villa El Salvador', -12.2169, -76.9491),
  ('Villa María del Triunfo', -12.1766, -76.919),
  ('Bellavista', -12.0597, -77.1112),
  ('Callao', -12.0548, -77.1287),
  ('Carmen de la Legua Reynoso', -12.0431, -77.0909),
  ('La Perla', -12.0716, -77.1174),
  ('La Punta', -12.0709, -77.163),
  ('Mi Perú', -11.8535, -77.1204),
  ('Ventanilla', -11.8839, -77.1232)
on conflict (district) do update set lat = excluded.lat, lng = excluded.lng;

-- Distancia en km entre dos puntos (fórmula de haversine)
create or replace function public.km_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371 * asin(sqrt(power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- Tarifa de delivery para un recojo y una entrega (usa el pin si existe, si no el centro del distrito)
create or replace function public.delivery_fee_for(
  p_from_lat double precision, p_from_lng double precision, p_from_district text,
  p_to_lat double precision, p_to_lng double precision, p_to_district text
) returns numeric language plpgsql stable security definer set search_path = public as $$
declare s public.settings; fl double precision := p_from_lat; fg double precision := p_from_lng;
        tl double precision := p_to_lat; tg double precision := p_to_lng; km double precision; fee numeric;
begin
  select * into s from public.settings where id = 1;
  if fl is null or fg is null then select lat, lng into fl, fg from public.district_centroids where district = p_from_district; end if;
  if tl is null or tg is null then select lat, lng into tl, tg from public.district_centroids where district = p_to_district; end if;
  if fl is null or tl is null then return s.default_tariff; end if;
  km := (public.km_between(s.origin_lat, s.origin_lng, fl, fg) + public.km_between(fl, fg, tl, tg)) * s.road_factor;
  fee := ceil((s.km_base_fare + s.km_price * km::numeric) * 2) / 2;  -- redondeo hacia arriba a S/ 0.50
  fee := greatest(fee, s.km_min_fee);
  if s.km_max_fee is not null then fee := least(fee, s.km_max_fee); end if;
  return round(fee, 2);
end $$;

-- ---------- Compra de créditos (v8) ----------
create table if not exists public.credit_purchases (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  quantity        int not null check (quantity between 1 and 10),
  unit_price      numeric(10,2) not null,
  total           numeric(10,2) not null,
  payment_method  text not null check (payment_method in ('yape','transferencia')),
  operation_code  text,
  proof_path      text not null,
  status          text not null default 'pago_en_revision' check (status in ('pago_en_revision','aprobado','rechazado')),
  admin_note      text,
  created_at      timestamptz not null default now(),
  reviewed_at     timestamptz
);
create index if not exists credit_purchases_status_idx on public.credit_purchases(status, created_at desc);

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
-- v4: dirección elegida (copia fija al momento de publicar / pedir)
alter table public.books    add column if not exists pickup_label text;
alter table public.books    add column if not exists pickup_address text;
alter table public.books    add column if not exists pickup_reference text;
alter table public.requests add column if not exists pickup_label text;
alter table public.requests add column if not exists pickup_address text;
alter table public.requests add column if not exists pickup_reference text;
alter table public.requests add column if not exists delivery_label text;
alter table public.requests add column if not exists delivery_address text;
alter table public.requests add column if not exists delivery_reference text;
alter table public.books    add column if not exists pickup_lat double precision;
alter table public.books    add column if not exists pickup_lng double precision;
alter table public.requests add column if not exists pickup_lat double precision;
alter table public.requests add column if not exists pickup_lng double precision;
alter table public.requests add column if not exists delivery_lat double precision;
alter table public.requests add column if not exists delivery_lng double precision;
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
alter table public.addresses enable row level security;
alter table public.credit_purchases enable row level security;
drop policy if exists "compras propias o admin" on public.credit_purchases;
create policy "compras propias o admin" on public.credit_purchases
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "direcciones propias o admin" on public.addresses;
create policy "direcciones propias o admin" on public.addresses
  for select using (user_id = auth.uid() or public.is_admin());

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
drop function if exists public.save_profile(text, text, text, text, text, text);
drop function if exists public.save_profile(text, text, text, text, text, text, text);
drop function if exists public.save_profile(text, text, text, text, text, text, text, double precision, double precision);
create or replace function public.save_profile(
  p_first_name text, p_last_name text, p_phone text, p_district text, p_address text, p_reference text, p_unit text default null,
  p_lat double precision default null, p_lng double precision default null, p_terms_version text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) and coalesce(p_terms_version,'') = '' then
    raise exception 'Debes aceptar los términos y condiciones';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.profiles (id, email, first_name, last_name, phone, district, address, reference)
  values (auth.uid(), v_email, trim(p_first_name), trim(p_last_name), p_phone, p_district,
          concat_ws(', ', trim(p_address), nullif(left(trim(coalesce(p_unit,'')),30),'')), nullif(trim(p_reference),''))
  on conflict (id) do update set
    first_name = excluded.first_name, last_name = excluded.last_name, phone = excluded.phone,
    district = excluded.district, address = excluded.address, reference = excluded.reference;
  if coalesce(p_terms_version,'') <> '' then
    update public.profiles set terms_version = left(p_terms_version, 20), terms_accepted_at = now() where id = auth.uid();
  end if;
  if not exists (select 1 from public.addresses where user_id = auth.uid()) then
    insert into public.addresses (user_id, label, district, address, unit, reference, is_default, lat, lng)
    values (auth.uid(), 'Casa', p_district, trim(p_address), nullif(left(trim(coalesce(p_unit,'')),30),''), nullif(trim(p_reference),''), true, p_lat, p_lng);
  end if;
end $$;

-- Datos de contacto (sin dirección: las direcciones se gestionan aparte)
create or replace function public.update_contact(p_first_name text, p_last_name text, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  update public.profiles set first_name = trim(p_first_name), last_name = trim(p_last_name), phone = p_phone
  where id = auth.uid();
  if not found then raise exception 'Completa tu perfil primero'; end if;
end $$;

-- Aceptar (o volver a aceptar) los términos vigentes
create or replace function public.accept_terms(p_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_version,'') = '' then raise exception 'Versión inválida'; end if;
  update public.profiles set terms_version = left(p_version, 20), terms_accepted_at = now() where id = auth.uid();
  if not found then raise exception 'Completa tu perfil primero'; end if;
end $$;

-- Foto de perfil: solo una imagen subida por el mismo usuario a su carpeta del bucket "avatares" (o null para quitarla)
create or replace function public.set_avatar(p_url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_url is not null and position('/storage/v1/object/public/avatares/' || auth.uid()::text || '/' in p_url) = 0 then
    raise exception 'Imagen no válida';
  end if;
  update public.profiles set avatar_url = left(p_url, 500) where id = auth.uid();
  if not found then raise exception 'Completa tu perfil primero'; end if;
end $$;

-- Corta cualquier acción si la cuenta está suspendida
create or replace function public.assert_active() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where id = auth.uid() and banned_at is not null) then
    raise exception 'Tu cuenta está suspendida. Escríbenos si crees que es un error';
  end if;
end $$;

-- Admin: suspender o reactivar una cuenta. Al suspender, sus libros disponibles salen del catálogo.
create or replace function public.admin_set_ban(p_user uuid, p_banned boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo admin'; end if;
  if p_user = auth.uid() then raise exception 'No puedes suspender tu propia cuenta'; end if;
  if p_banned then
    if coalesce(trim(p_reason),'') = '' then raise exception 'Escribe el motivo de la suspensión'; end if;
    update public.profiles set banned_at = now(), ban_reason = left(trim(p_reason), 300) where id = p_user;
    update public.books set status = 'retirado' where owner_id = p_user and status = 'disponible';
  else
    update public.profiles set banned_at = null, ban_reason = null where id = p_user;
  end if;
end $$;

-- Copia la dirección predeterminada al perfil (la usan el admin y valores por defecto)
create or replace function public.sync_default_address(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.addresses;
begin
  select * into a from public.addresses where user_id = p_user order by is_default desc, created_at limit 1;
  if a.id is null then return; end if;
  update public.addresses set is_default = (id = a.id) where user_id = p_user;
  update public.profiles set district = a.district, address = concat_ws(', ', a.address, a.unit), reference = a.reference where id = p_user;
end $$;

-- Crear o editar una dirección (máximo 5 por usuario)
drop function if exists public.save_address(uuid, text, text, text, text, boolean);
drop function if exists public.save_address(uuid, text, text, text, text, boolean, text);
create or replace function public.save_address(
  p_id uuid, p_label text, p_district text, p_address text, p_reference text, p_default boolean, p_unit text default null,
  p_lat double precision default null, p_lng double precision default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count int;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'Completa tu perfil primero'; end if;
  if char_length(trim(coalesce(p_label,''))) = 0 then raise exception 'Ponle un nombre a la dirección (ej. Casa)'; end if;
  if char_length(trim(coalesce(p_address,''))) < 3 then raise exception 'Escribe la dirección completa'; end if;
  if coalesce(p_district,'') = '' then raise exception 'Elige el distrito'; end if;
  if p_id is null then
    select count(*) into v_count from public.addresses where user_id = auth.uid();
    if v_count >= 5 then raise exception 'Puedes guardar hasta 5 direcciones'; end if;
    insert into public.addresses (user_id, label, district, address, unit, reference, is_default, lat, lng)
    values (auth.uid(), left(trim(p_label),30), p_district, left(trim(p_address),160), nullif(left(trim(coalesce(p_unit,'')),30),''),
            nullif(left(trim(coalesce(p_reference,'')),160),''), coalesce(p_default,false) or v_count = 0, p_lat, p_lng)
    returning id into v_id;
  else
    update public.addresses set label = left(trim(p_label),30), district = p_district, address = left(trim(p_address),160),
      unit = nullif(left(trim(coalesce(p_unit,'')),30),''), lat = p_lat, lng = p_lng,
      reference = nullif(left(trim(coalesce(p_reference,'')),160),''), is_default = is_default or coalesce(p_default,false)
    where id = p_id and user_id = auth.uid() returning id into v_id;
    if v_id is null then raise exception 'Dirección no encontrada'; end if;
  end if;
  if coalesce(p_default,false) then
    update public.addresses set is_default = (id = v_id) where user_id = auth.uid();
  end if;
  perform public.sync_default_address(auth.uid());
  return v_id;
end $$;

create or replace function public.delete_address(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.addresses where user_id = auth.uid()) <= 1 then
    raise exception 'Debes tener al menos una dirección';
  end if;
  delete from public.addresses where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Dirección no encontrada'; end if;
  perform public.sync_default_address(auth.uid());
end $$;

-- ---------- Libros ----------
drop function if exists public.publish_book(text, text, text, text, text);
create or replace function public.publish_book(
  p_title text, p_author text, p_cover_url text, p_genre text, p_condition text, p_address uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare a public.addresses; v_id uuid; v_err text;
begin
  perform public.assert_active();
  v_err := public.contact_violation(p_title);
  if v_err is not null then raise exception 'El título %', v_err; end if;
  v_err := public.contact_violation(p_author);
  if v_err is not null then raise exception 'El autor %', v_err; end if;
  select * into a from public.addresses where user_id = auth.uid()
    order by (id = p_address) desc, is_default desc, created_at limit 1;
  if a.id is null then raise exception 'Agrega una dirección de recojo en tu perfil'; end if;
  if p_address is not null and a.id <> p_address then raise exception 'Elige una de tus direcciones'; end if;
  insert into public.books (owner_id, title, author, cover_url, genre, condition, district, pickup_label, pickup_address, pickup_reference, pickup_lat, pickup_lng)
  values (auth.uid(), trim(p_title), trim(p_author), nullif(p_cover_url,''), p_genre, p_condition, a.district, a.label, concat_ws(', ', a.address, a.unit), a.reference, a.lat, a.lng)
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
drop function if exists public.request_book(uuid);
create or replace function public.request_book(p_book uuid, p_address uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare b public.books; me public.profiles; s public.settings; a public.addresses; v_fee numeric; v_tariff numeric; v_id uuid;
begin
  perform public.assert_active();
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'Completa tu perfil antes de pedir libros'; end if;
  if me.credits < 1 then raise exception 'No tienes créditos. Dona un libro para ganar uno'; end if;
  select * into b from public.books where id = p_book for update;
  if b.id is null or b.status <> 'disponible' then raise exception 'Este libro ya no está disponible'; end if;
  if b.owner_id = me.id then raise exception 'No puedes pedir tu propio libro'; end if;
  select * into a from public.addresses where user_id = me.id
    order by (id = p_address) desc, is_default desc, created_at limit 1;
  if a.id is null then raise exception 'Agrega una dirección de entrega en tu perfil'; end if;
  if p_address is not null and a.id <> p_address then raise exception 'Elige una de tus direcciones'; end if;
  select * into s from public.settings where id = 1;
  v_fee := s.fee;
  v_tariff := public.delivery_fee_for(b.pickup_lat, b.pickup_lng, b.district, a.lat, a.lng, a.district);
  insert into public.requests (book_id, donor_id, requester_id, book_title, book_cover, from_district, to_district, delivery_fee, platform_fee, total,
    pickup_label, pickup_address, pickup_reference, delivery_label, delivery_address, delivery_reference,
    pickup_lat, pickup_lng, delivery_lat, delivery_lng)
  values (b.id, b.owner_id, me.id, b.title, b.cover_url, b.district, a.district, v_tariff, v_fee, v_tariff + v_fee,
    b.pickup_label, b.pickup_address, b.pickup_reference, a.label, concat_ws(', ', a.address, a.unit), a.reference,
    b.pickup_lat, b.pickup_lng, a.lat, a.lng)
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
    -- Quien lo recibió ya lo tiene: sale de su lista de deseos
    delete from public.wishes w using public.books b
     where b.id = r.book_id and w.user_id = r.requester_id and w.book_key = public.book_key(b.title, b.author);
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

-- ---------- Lista de deseos (v12) ----------
create table if not exists public.wishes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 160),
  author      text not null check (char_length(author) between 1 and 120),
  cover_url   text,
  book_key    text not null,
  created_at  timestamptz not null default now(),
  unique (user_id, book_key)
);
create index if not exists wishes_key_idx on public.wishes(book_key);
alter table public.wishes enable row level security;
drop policy if exists "deseos propios o admin" on public.wishes;
create policy "deseos propios o admin" on public.wishes for select using (user_id = auth.uid() or public.is_admin());

create or replace function public.add_wish(p_title text, p_author text, p_cover_url text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_err text; v_key text;
begin
  perform public.assert_active();
  if not exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'Completa tu perfil primero'; end if;
  if char_length(trim(coalesce(p_title,''))) = 0 or char_length(trim(coalesce(p_author,''))) = 0 then raise exception 'Escribe el título y el autor'; end if;
  v_err := public.contact_violation(p_title); if v_err is not null then raise exception 'El título %', v_err; end if;
  v_err := public.contact_violation(p_author); if v_err is not null then raise exception 'El autor %', v_err; end if;
  if (select count(*) from public.wishes where user_id = auth.uid()) >= 5 then raise exception 'Puedes tener hasta 5 libros en tu lista de deseos'; end if;
  v_key := public.book_key(p_title, p_author);
  if exists (select 1 from public.wishes where user_id = auth.uid() and book_key = v_key) then raise exception 'Ese libro ya está en tu lista'; end if;
  insert into public.wishes (user_id, title, author, cover_url, book_key)
  values (auth.uid(), left(trim(p_title),160), left(trim(p_author),120), nullif(left(coalesce(p_cover_url,''),500),''), v_key)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.remove_wish(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.wishes where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Deseo no encontrado'; end if;
end $$;

-- Cotización para la página Pedir: solo devuelve el monto (no expone la ubicación del donante)
create or replace function public.quote_delivery(p_book uuid, p_address uuid) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare b public.books; a public.addresses;
begin
  select * into b from public.books where id = p_book and status = 'disponible';
  if b.id is null then raise exception 'Este libro ya no está disponible'; end if;
  select * into a from public.addresses where id = p_address and user_id = auth.uid();
  if a.id is null then raise exception 'Elige una de tus direcciones'; end if;
  return public.delivery_fee_for(b.pickup_lat, b.pickup_lng, b.district, a.lat, a.lng, a.district);
end $$;

-- ---------- Compra de créditos ----------
create or replace function public.buy_credits(p_quantity int, p_method text, p_operation text, p_proof text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_price numeric; v_id uuid;
begin
  perform public.assert_active();
  if not exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'Completa tu perfil primero'; end if;
  select credit_price into v_price from public.settings where id = 1;
  if v_price is null then raise exception 'La compra de créditos aún no está disponible'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 10 then raise exception 'Puedes comprar de 1 a 10 créditos'; end if;
  if p_method not in ('yape','transferencia') then raise exception 'Elige Yape o transferencia'; end if;
  if coalesce(p_proof,'') = '' or split_part(p_proof, '/', 1) <> auth.uid()::text then raise exception 'Adjunta tu comprobante'; end if;
  if (select count(*) from public.credit_purchases where user_id = auth.uid() and status = 'pago_en_revision') >= 3 then
    raise exception 'Tienes compras en revisión. Espera a que las validemos';
  end if;
  insert into public.credit_purchases (user_id, quantity, unit_price, total, payment_method, operation_code, proof_path)
  values (auth.uid(), p_quantity, v_price, v_price * p_quantity, p_method, nullif(left(trim(coalesce(p_operation,'')),40),''), p_proof)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.admin_review_credit_purchase(p_purchase uuid, p_approve boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare c public.credit_purchases;
begin
  if not public.is_admin() then raise exception 'Solo admin'; end if;
  select * into c from public.credit_purchases where id = p_purchase for update;
  if c.id is null or c.status <> 'pago_en_revision' then raise exception 'Esta compra ya fue revisada'; end if;
  update public.credit_purchases
     set status = case when p_approve then 'aprobado' else 'rechazado' end,
         admin_note = nullif(trim(coalesce(p_note,'')),''), reviewed_at = now()
   where id = c.id;
  if p_approve then
    update public.profiles set credits = credits + c.quantity where id = c.user_id;
  end if;
end $$;

-- ---------- Correos al solicitante cuando cambia el estado del pedido (v13) ----------
-- Envía con la API de Brevo usando pg_net (asíncrono: si el correo falla, el cambio de estado no se afecta).
-- La API key de Brevo se guarda UNA vez en Supabase Vault, fuera de este archivo:
--   select vault.create_secret('xkeysib-…', 'brevo_api_key');
create extension if not exists pg_net;
alter table public.settings add column if not exists site_url text not null default 'https://sitisbooks.com';
alter table public.settings add column if not exists mail_from text not null default 'sitisbooks@gmail.com';

create table if not exists public.email_log (
  id          bigint generated always as identity primary key,
  request_id  uuid references public.requests(id) on delete set null,
  status      text,
  to_email    text,
  subject     text,
  queued      boolean not null default false,
  error       text,
  created_at  timestamptz not null default now()
);
alter table public.email_log enable row level security;
drop policy if exists "log solo admin" on public.email_log;
create policy "log solo admin" on public.email_log for select using (public.is_admin());

-- Fecha legible en hora de Lima: "jueves 27 de noviembre, 3:30 p. m."
create or replace function public.fmt_lima(t timestamptz) returns text language sql stable as $$
  select case when t is null then null else
    (array['domingo','lunes','martes','miércoles','jueves','viernes','sábado'])[extract(dow from t at time zone 'America/Lima')::int + 1]
    || ' ' || extract(day from t at time zone 'America/Lima')::int || ' de '
    || (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'])[extract(month from t at time zone 'America/Lima')::int]
    || ', ' || ltrim(to_char(t at time zone 'America/Lima', 'HH12:MI'), '0')
    || case when extract(hour from t at time zone 'America/Lima') < 12 then ' a. m.' else ' p. m.' end
  end
$$;

create or replace function public.html_esc(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;')
$$;

create or replace function public.send_status_email(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.requests; p public.profiles; s public.settings; v_key text;
        v_subject text; v_title text; v_body text; v_html text; v_link text;
begin
  select * into r from public.requests where id = p_request;
  if r.id is null then return; end if;
  select * into p from public.profiles where id = r.requester_id;
  if p.email is null then return; end if;
  select * into s from public.settings where id = 1;
  v_link := s.site_url || '/mis-intercambios/' || r.id;

  case r.status
    when 'pendiente_pago' then
      v_subject := 'Revisa el pago de tu pedido'; v_title := 'Necesitamos revisar tu pago';
      v_body := 'No pudimos validar el comprobante de tu pedido de <b>' || public.html_esc(r.book_title) || '</b>.'
        || coalesce(' Motivo: ' || nullif(public.html_esc(r.admin_note),'') || '.', '') || ' Sube un nuevo comprobante desde tu pedido.';
    when 'pago_en_revision' then
      v_subject := 'Tu pedido está en “Pago en revisión”'; v_title := 'Recibimos tu comprobante';
      v_body := 'Estamos validando el pago de <b>' || public.html_esc(r.book_title) || '</b>. Te avisaremos apenas lo confirmemos.';
    when 'pagado' then
      v_subject := 'Pago confirmado: entrega por coordinar'; v_title := '¡Pago confirmado!';
      v_body := 'Confirmamos el pago de <b>' || public.html_esc(r.book_title) || '</b>. Ahora coordinamos el recojo con quien lo dona y te avisaremos la fecha.';
    when 'coordinando' then
      v_subject := 'Recojo programado para tu libro'; v_title := 'Recojo programado';
      v_body := 'Recogeremos <b>' || public.html_esc(r.book_title) || '</b> el <b>' || coalesce(public.fmt_lima(r.pickup_at), 'día por confirmar') || '</b>. Luego te lo llevamos.';
    when 'en_camino' then
      v_subject := 'Tu libro está en camino'; v_title := '¡Tu libro está en camino!';
      v_body := 'Entregaremos <b>' || public.html_esc(r.book_title) || '</b> en ' || coalesce(public.html_esc(r.delivery_label) || ': ', '') || coalesce(public.html_esc(r.delivery_address), 'tu dirección')
        || ' el <b>' || coalesce(public.fmt_lima(r.delivery_at), 'día por confirmar') || '</b>. Por favor, que alguien esté para recibirlo.';
    when 'entregado' then
      v_subject := 'Tu libro fue entregado'; v_title := '¡Que lo disfrutes!';
      v_body := 'Entregamos <b>' || public.html_esc(r.book_title) || '</b>. Si tienes libros que ya leíste, dónalos y gana créditos para tu próximo pedido.';
    when 'cancelado' then
      v_subject := 'Tu pedido fue cancelado'; v_title := 'Pedido cancelado';
      v_body := 'Tu pedido de <b>' || public.html_esc(r.book_title) || '</b> fue cancelado y te devolvimos 1 crédito.'
        || coalesce(' Motivo: ' || nullif(public.html_esc(r.admin_note),'') || '.', '') || ' Si ya habías pagado, te escribiremos para coordinar la devolución.';
    else return;
  end case;

  v_html := '<div style="font-family:Arial,Helvetica,sans-serif;background:#F7F9FC;padding:24px">'
    || '<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #E3E8F0;border-radius:12px;padding:28px">'
    || '<p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#16213A">Sitisbooks</p>'
    || '<h1 style="margin:0 0 12px;font-size:22px;color:#16213A">' || v_title || '</h1>'
    || '<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3B4A66">Hola ' || public.html_esc(p.first_name) || ', ' || v_body || '</p>'
    || '<a href="' || v_link || '" style="display:inline-block;background:#2F6BDB;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Ver mi pedido</a>'
    || '<p style="margin:24px 0 0;font-size:12px;color:#5B6478">Recibes este correo porque hiciste un pedido en Sitisbooks.</p>'
    || '</div></div>';

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'brevo_api_key' limit 1;
  if v_key is null then
    insert into public.email_log (request_id, status, to_email, subject, queued, error) values (r.id, r.status, p.email, v_subject, false, 'Falta la API key de Brevo en Vault');
    return;
  end if;

  perform net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', v_key, 'content-type', 'application/json', 'accept', 'application/json'),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', 'Sitisbooks', 'email', s.mail_from),
      'to', jsonb_build_array(jsonb_build_object('email', p.email, 'name', trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')))),
      'subject', v_subject,
      'htmlContent', v_html)
  );
  insert into public.email_log (request_id, status, to_email, subject, queued) values (r.id, r.status, p.email, v_subject, true);
exception when others then
  -- Un problema con el correo nunca debe bloquear el cambio de estado
  insert into public.email_log (request_id, status, to_email, subject, queued, error) values (p_request, r.status, p.email, v_subject, false, left(sqlerrm, 300));
end $$;

create or replace function public.on_request_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then perform public.send_status_email(new.id); end if;
  return new;
end $$;
drop trigger if exists request_status_email on public.requests;
create trigger request_status_email after update of status on public.requests
  for each row execute function public.on_request_status_change();

-- ---------- Storage ----------
insert into storage.buckets (id, name, public) values ('comprobantes','comprobantes', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('portadas','portadas', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatares','avatares', true) on conflict (id) do nothing;

drop policy if exists "subir comprobante propio" on storage.objects;
create policy "subir comprobante propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprobantes' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "ver comprobante propio o admin" on storage.objects;
create policy "ver comprobante propio o admin" on storage.objects for select to authenticated
  using (bucket_id = 'comprobantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "subir portada propia" on storage.objects;
create policy "subir portada propia" on storage.objects for insert to authenticated
  with check (bucket_id = 'portadas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "subir avatar propio" on storage.objects;
create policy "subir avatar propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "borrar avatar propio" on storage.objects;
create policy "borrar avatar propio" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Permisos de ejecución ----------
revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_admin to anon, authenticated;
grant execute on function public.save_profile, public.publish_book, public.withdraw_book, public.request_book,
  public.submit_payment, public.cancel_my_request, public.admin_review_payment, public.admin_update_request,
  public.admin_set_credits, public.update_contact, public.save_address, public.delete_address,
  public.buy_credits, public.admin_review_credit_purchase, public.quote_delivery,
  public.accept_terms, public.admin_set_ban, public.set_avatar, public.add_wish, public.remove_wish to authenticated;

-- ---------- Permisos de tablas (proyectos Supabase desde mayo 2026 no exponen tablas por defecto) ----------
-- RLS sigue limitando qué filas ve cada usuario.
grant select on public.profiles to authenticated;
grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;
grant select on public.requests to authenticated;
grant select on public.addresses to authenticated;
grant select on public.credit_purchases to authenticated;
grant select on public.wishes to authenticated;
grant select on public.email_log to authenticated;
alter table public.district_centroids enable row level security;
drop policy if exists "centros publicos" on public.district_centroids;
create policy "centros publicos" on public.district_centroids for select using (true);
grant select on public.district_centroids to anon, authenticated;

-- ---------- Privacidad: vistas seguras para usuarios ----------
-- Los usuarios NUNCA leen las tablas books/requests directamente: solo estas vistas,
-- que no exponen quién dona, quién recibe, distritos ni datos de otros usuarios.
revoke select on public.books from anon, authenticated;

-- v7: clave para agrupar ejemplares del mismo libro (título + autor, sin tildes ni mayúsculas)
create or replace function public.book_key(p_title text, p_author text) returns text
language sql immutable as $$
  select trim(regexp_replace(translate(lower(coalesce(p_title,'')), 'áéíóúüñàèìòùâêîôû', 'aeiouunaeiouaeiou'), '[^a-z0-9]+', ' ', 'g'))
      || '|' ||
         trim(regexp_replace(translate(lower(coalesce(p_author,'')), 'áéíóúüñàèìòùâêîôû', 'aeiouunaeiouaeiou'), '[^a-z0-9]+', ' ', 'g'))
$$;

create or replace view public.catalog as
  select id, title, author, cover_url, genre, condition, created_at,
         (owner_id = auth.uid()) as is_mine,
         public.book_key(title, author) as book_key
  from public.books
  where status = 'disponible';

-- Catálogo agrupado: una tarjeta por libro con la cantidad de ejemplares disponibles.
-- request_id = el ejemplar a pedir (de otra persona, mejor estado primero).
create or replace view public.catalog_groups as
  with b as (
    select id, title, author, cover_url, genre, condition, created_at, owner_id,
           public.book_key(title, author) as book_key,
           case condition when 'Nuevo' then 1 when 'Como nuevo' then 2 when 'Buen estado' then 3 else 4 end as rank
    from public.books where status = 'disponible'
  ), g as (
    select book_key, count(*)::int as copies,
           count(*) filter (where owner_id = auth.uid())::int as my_copies,
           max(created_at) as created_at
    from b group by book_key
  )
  select g.book_key, g.copies, g.my_copies, g.created_at,
         rep.title, rep.author, rep.genre, rep.condition,
         coalesce(rep.cover_url, (select b2.cover_url from b b2 where b2.book_key = g.book_key and b2.cover_url is not null order by b2.created_at desc limit 1)) as cover_url,
         (select b3.id from b b3 where b3.book_key = g.book_key and b3.owner_id is distinct from auth.uid() order by b3.rank, b3.created_at limit 1) as request_id
  from g
  cross join lateral (
    select b1.* from b b1 where b1.book_key = g.book_key
    order by (b1.owner_id is distinct from auth.uid()) desc, b1.rank, (b1.cover_url is not null) desc, b1.created_at
    limit 1
  ) rep;

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
         case when r.donor_id = auth.uid() then r.pickup_at end as pickup_at,
         -- v4: cada uno ve solo SU dirección (entrega para quien recibe, recojo para quien dona)
         case when r.requester_id = auth.uid() then r.delivery_label else r.pickup_label end as my_address_label,
         case when r.requester_id = auth.uid() then r.delivery_address else r.pickup_address end as my_address,
         case when r.requester_id = auth.uid() then r.to_district else r.from_district end as my_district
  from public.requests r
  where r.requester_id = auth.uid() or r.donor_id = auth.uid();

-- Catálogo de deseos: libros que la gente quiere (sin datos de quién). Oculta los que su autor ya pidió y están en curso.
create or replace view public.wish_catalog as
  with active as (
    select w.* from public.wishes w
    where not exists (
      select 1 from public.requests r join public.books b on b.id = r.book_id
      where r.requester_id = w.user_id and r.status not in ('entregado','cancelado')
        and public.book_key(b.title, b.author) = w.book_key)
      and not exists (select 1 from public.profiles p where p.id = w.user_id and p.banned_at is not null)
  )
  select a.book_key,
         (array_agg(a.title order by a.created_at))[1] as title,
         (array_agg(a.author order by a.created_at))[1] as author,
         (array_agg(a.cover_url order by (a.cover_url is null), a.created_at))[1] as cover_url,
         count(*)::int as wanted,
         bool_or(a.user_id = auth.uid()) as is_mine,
         max(a.created_at) as created_at,
         (select count(*)::int from public.books b where b.status = 'disponible' and public.book_key(b.title, b.author) = a.book_key) as available
  from active a
  group by a.book_key;

grant select on public.catalog, public.catalog_groups, public.wish_catalog to anon, authenticated;
revoke execute on function public.book_key from public;
grant execute on function public.book_key to anon, authenticated;
grant select on public.my_books, public.my_requests to authenticated;

-- ---------- Primer admin (ejecutar DESPUÉS de crear tu perfil en la web) ----------
-- update public.profiles set is_admin = true where email = 'tu-correo@dominio.com';
