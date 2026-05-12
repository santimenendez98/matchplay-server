# matchplay-server

Backend Node.js + TypeScript + Express + PostgreSQL para **MatchPlay**, una
plataforma de reservas y gestión de partidos en complejos deportivos.

> Documentación completa en [`DOCUMENTATION.md`](./DOCUMENTATION.md):
> arquitectura, modelo de datos, listado de endpoints, flujos de negocio,
> cron jobs, WebSockets, tests y mejoras recomendadas.

## Quickstart

```bash
npm install
# crear un .env (ver más abajo)
npm run dev            # nodemon + ts-node-dev
```

### Scripts

| Script                 | Descripción                                       |
|------------------------|---------------------------------------------------|
| `npm run dev`          | Levanta el server en modo desarrollo con nodemon. |
| `npm run build`        | Compila TypeScript a `./dist`.                    |
| `npm start`            | Ejecuta el build compilado (producción).          |
| `npm test`             | Corre la suite de Jest.                           |
| `npm run test:watch`   | Tests en modo watch.                              |
| `npm run test:coverage`| Reporte de cobertura en `./coverage`.             |

## Variables de entorno

Copiar `.env.example` a `.env` y completar los valores. Variables principales:

```env
PORT=3000
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=development
LOG_LEVEL=debug

JWT_SECRET=replace-me
JWT_ACCESS_TTL=1h
JWT_REFRESH_TTL=30d

CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173        # base para back_urls de Checkout Pro
API_BASE_URL=http://localhost:3000        # base para notification_url del webhook

MERCADO_PAGO_ACCESS_TOKEN=your_mercadopago_access_token
MERCADO_PAGO_WEBHOOK_SECRET=replace-me

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CRON_SECRET=replace-with-strong-secret
# DISABLE_CRON=true   # serverless: cron via /api/cron/* endpoints
```

## Cron (Vercel Hobby)

Vercel Hobby solo permite crons diarios. El `vercel.json` declara
`/api/cron/daily-maintenance` a las 03:00 (corre los tres jobs en
secuencia). Para los jobs de alta frecuencia (cada 5 / 30 min) se incluye
un workflow de GitHub Actions en `.github/workflows/cron.yml` — solo hace
falta configurar dos secrets en el repo:

- `API_BASE_URL` — la URL pública del deploy (ej: `https://matchplay.vercel.app`).
- `CRON_SECRET` — el mismo valor que el env var del backend.

Detalles en [`DOCUMENTATION.md#cron`](./DOCUMENTATION.md#cron).

### MercadoPago Checkout Pro

El flujo es **preference + webhook**:

1. Frontend → `POST /api/payment/pay` con `{ reservation_id, email }`.
2. Backend valida, inserta `Payment` en `pending`, crea preference y devuelve
   `{ init_point, preference_id, payment_id }`.
3. Frontend redirige al usuario a `init_point` (checkout hosteado en MP).
4. MercadoPago llama al webhook `POST /api/payment/webhook` con la firma
   `x-signature` (HMAC SHA-256 con `MERCADO_PAGO_WEBHOOK_SECRET`).
5. Backend mapea el estado, actualiza `Payment` y, si fue aprobado, marca la
   `Reservation` como `confirmed` (o `MatchPlayer.payment_method=debit_card`
   si es partido).

En desarrollo local MercadoPago **no llega a `localhost`** — usar
[ngrok](https://ngrok.com) o el simulador de webhooks del dashboard.
`auto_return=approved` requiere HTTPS, por eso solo se setea cuando
`NODE_ENV=production`.

Ver [docs de MP sobre verificación de firma](https://www.mercadopago.com.uy/developers/es/docs/your-integrations/notifications/webhooks#editor_2).

## Endpoints destacados

- `POST /api/auth` — login (devuelve `token` y `refreshToken`).
- `POST /api/auth/refresh` — renueva el access token.
- `POST /api/auth/forgot-password` / `POST /api/auth/reset-password`.
- `POST /api/account` — registro de usuario (responde con token).
- `PATCH /api/account/me/password` — cambiar password autenticado.
- `GET  /api/scheduleday/court/:courtId?date=YYYY-MM-DD` — slots disponibles.
- `POST /api/reservation` — reservar (con `is_match` opcional para partidos).
- `POST /api/match/join` / `/leave` / `/message` — gestión de partidos.
- `POST /api/payment/pay` — crea preference de Checkout Pro (devuelve `init_point`).
- `POST /api/payment/webhook` — webhook firmado de MercadoPago.
- `POST /api/payment/cash` / `/bank-transfer` — pagos manuales.
- `GET  /api/payment/upload/sign` — firma para upload directo a Cloudinary.
- `GET  /api/reservation/account/me`, `/api/match/player/me`,
  `/api/payment/account/me` — historial del usuario autenticado.

Listado completo: [`DOCUMENTATION.md#tabla-de-endpoints`](./DOCUMENTATION.md#tabla-de-endpoints).

## Tests

```bash
npm test
```

20 suites · 175 tests. Usan Jest + supertest con `pg`, `mercadopago`,
`cloudinary` y `services/webSocket` mockeados — no requieren base de datos.
