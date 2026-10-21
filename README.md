# Sitisbooks

Plataforma para intercambiar libros en Lima Metropolitana. Cada libro donado y entregado da **1 crédito** para pedir otro. Quien pide paga el **delivery a su distrito + una comisión fija** por Yape o transferencia.

**Stack:** Next.js 15 (App Router) · Supabase (Auth con OTP al correo, Postgres con RLS, Storage) · Vercel.

## Funcionalidades

- **Registro e ingreso con OTP:** el usuario escribe su correo, recibe un código y activa su cuenta. Luego completa su perfil (nombres, apellidos, celular, distrito, dirección y referencia) y recibe 1 crédito de bienvenida.
- **Donar un libro:** el usuario escribe título y autor y la web busca portadas en Open Library y Google Books. El usuario confirma cuál es la correcta. Si ninguna coincide, puede subir una foto o publicar sin portada.
- **Catálogo público:** búsqueda por título y autor, filtro por género y distrito.
- **Pedir un libro:** usa 1 crédito y reserva el libro. El usuario ve el total, paga por Yape o transferencia y sube su comprobante.
- **Admin:**
  - Valida u observa comprobantes.
  - Coordina recojo y entrega: fechas, estados y WhatsApp con mensaje prellenado.
  - Cancela intercambios (el crédito se devuelve).
  - Edita créditos de cada usuario.
  - Configura la comisión, la tarifa por distrito y los datos de Yape y transferencia.
- **Estados de un intercambio:** Pendiente de pago → Pago en revisión → Pagado → Recojo programado → En camino → Entregado (o Cancelado). Al marcar "Entregado", el donante recibe su crédito automáticamente.

Las reglas de créditos y estados viven en funciones de Postgres (`supabase/schema.sql`). Así no se pueden alterar desde el navegador.

---

## Puesta en marcha (≈20 minutos)

### 1. Supabase

1. Crea una cuenta en https://supabase.com y luego un proyecto nuevo. Elige la región más cercana a Perú (São Paulo).
2. Ve a **SQL Editor → New query**, pega todo el contenido de `supabase/schema.sql` y presiona **Run**.
3. Configura el correo del OTP en **Authentication → Emails → Templates**. Edita las plantillas **Magic Link** y **Confirm signup** para que muestren el código en lugar de un enlace. Por ejemplo:
   ```html
   <h2>Tu código de Sitisbooks</h2>
   <p>Ingresa este código para entrar: <strong>{{ .Token }}</strong></p>
   <p>Vence en 1 hora. Si no lo pediste, ignora este correo.</p>
   ```
4. En **Authentication → URL Configuration**, pon en **Site URL** la URL de Vercel (puedes hacerlo después del paso 2).
5. En **Project Settings → API**, copia la **Project URL** y la **anon / publishable key**.

> **Límite del correo por defecto:** el servidor de correo incluido en Supabase tiene un límite bajo de envíos por hora y está pensado solo para pruebas. Antes de abrir al público, configura un SMTP propio en **Authentication → Emails → SMTP Settings** (por ejemplo Resend con un dominio propio). El código de la web no cambia.

### 2. Vercel

1. Crea una cuenta en https://vercel.com con tu GitHub e importa el repo `sitisbooks`.
2. En **Environment Variables**, agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`: la Project URL de Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: la anon / publishable key.
   - `GOOGLE_BOOKS_API_KEY` (opcional): una API key de Google Books para tener más cuota en la búsqueda de portadas.
3. Presiona **Deploy**.

### 3. Activar tu usuario admin

1. Entra a la web, regístrate con tu correo y completa tu perfil.
2. En Supabase, ve a **SQL Editor** y ejecuta:
   ```sql
   update public.profiles set is_admin = true where email = 'tu-correo@dominio.com';
   ```
3. Recarga la web. Verás la pestaña **Admin**.
4. Entra a **Admin → Tarifas y pagos** y configura:
   - El número y titular de Yape.
   - Los datos bancarios para transferencia.
   - Las tarifas por distrito. Vienen todas en S/ 12 como valor **referencial**; reemplázalas por las de tu operador.

## Desarrollo local

```bash
cp .env.example .env.local   # completa las dos variables
npm install
npm run dev                  # http://localhost:3000
```

## Pendientes conocidos (siguientes fases)

- Pasarela de pago automática (Culqi o Mercado Pago) en lugar de la validación manual del comprobante.
- Cancelación automática de pedidos que no se pagan en X horas. Hoy se cancelan a mano desde el admin.
- Notificaciones por correo o WhatsApp cuando cambia el estado de un intercambio.
- SMTP propio (ver nota en el paso 1).
