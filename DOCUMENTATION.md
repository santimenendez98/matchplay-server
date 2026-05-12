# MatchPlay Server — Documentación técnica

Backend en **Node.js + TypeScript + Express** para la aplicación
**MatchPlay**, una plataforma de reserva y gestión de partidos en complejos
deportivos.

Permite:

- Registrar **canchas** organizadas por **complejo** y por **deporte**.
- Definir el **horario semanal** de cada cancha (`WeekScheduleCourt`) y a
  partir de él **materializar slots diarios** (`ScheduleCourt`) con precios
  por hora y media hora.
- **Reservar** un slot a nombre de un usuario, individualmente o como
  **partido** abierto a otros jugadores.
- **Pagar** la reserva con **tarjeta de débito** (MercadoPago), **transferencia
  bancaria** (con comprobante en Cloudinary) o **efectivo**.
- **Cancelar** reservas con o sin solicitud previa de aprobación por parte de
  un administrador, generando registros de **historial** y **reembolso**.
- Notificar a clientes en tiempo real vía **Socket.IO** (disponibilidad de
  cancha, mensajes de chat de partido, solicitudes de cancelación).

---

## Tabla de contenido

1. [Arquitectura](#arquitectura)
2. [Estructura del repositorio](#estructura-del-repositorio)
3. [Variables de entorno](#variables-de-entorno)
4. [Cómo correr el proyecto](#cómo-correr-el-proyecto)
5. [Modelo de datos](#modelo-de-datos)
6. [Roles y autorización](#roles-y-autorización)
7. [Flujos de negocio](#flujos-de-negocio)
8. [Tabla de endpoints](#tabla-de-endpoints)
9. [Cron jobs](#cron-jobs)
10. [WebSockets](#websockets)
11. [Tests](#tests)
12. [Mejoras recomendadas](#mejoras-recomendadas)

---

## Arquitectura

```
            ┌──────────────┐
   HTTP →   │   Express    │  ← CORS, JSON parsing
            │   Router     │
            └──────┬───────┘
                   ▼
        ┌────────────────────┐
        │  Controllers       │  ← Validación adicional, orquestación
        └─────┬──────────────┘
              ▼
        ┌────────────────────┐
        │  DB Queries (pg)   │  ← SQL directo con pool de Postgres
        └─────┬──────────────┘
              ▼
        ┌────────────────────┐
        │  PostgreSQL (Supabase)
        └────────────────────┘

  Socket.IO ───────────► clientes (web/móvil) en salas por cancha o partido
  Cron jobs ───────────► generan días/precios y limpian pre-reservas vencidas
  MercadoPago SDK ─────► pagos con tarjeta + generación de comprobante PDF
  Cloudinary ──────────► verificación de comprobantes / imágenes subidas
```

El servicio es **stateless**, autenticado por JWT (`Bearer <token>`). Las
sesiones tienen una duración de **30 días** (configurable en
`services/jwtService.ts`).

---

## Estructura del repositorio

```
src/
├── index.ts              # bootstrap del servidor (Express + Socket.IO + cron)
├── routes/               # un router por dominio (account, sport, court, …)
├── controllers/          # handlers HTTP — validan y orquestan
├── db/                   # connection.ts + *Queries.ts por dominio + ddl.sql
├── middleware/           # authMiddleware, rolMiddleware, handleValidationErrors
├── services/
│   ├── jwtService.ts     # firma y verifica JWTs
│   ├── bcrypService.ts   # hash/verify de passwords
│   ├── addMinutes.ts     # utilidades de fecha/hora (Montevideo)
│   ├── cloudinary.ts     # verifica que un asset existe en Cloudinary
│   ├── mercadoPago.ts    # crea pagos y arma el PDF con Puppeteer
│   ├── scheduleService.ts# genera slots diarios a partir del horario semanal
│   └── webSocket.ts      # handlers y emisores Socket.IO
├── cronjobs/
│   ├── scheduleGenerator.ts   # 00:00 diario y cada 30 min — disponibilidad
│   └── preReserveCronJob.ts   # cada 5 min — cancela pre-reservas vencidas
└── types/                # interfaces compartidas (DB + responses)

tests/
├── unit/                 # jwtService, bcrypService, addMinutes, middleware
├── integration/          # un archivo por router (supertest + mocks de pg)
├── mocks/                # pg, mercadoPago, cloudinary, webSocket
├── helpers/              # buildApp(), queryMock, auth bearer helper
└── setupEnv.ts           # setea env vars para Jest
```

---

## Variables de entorno

Crear un `.env` (no se commitea — está en `.gitignore`). Hay un
`.env.example` con todas las llaves.

| Variable                      | Descripción                                                                |
|-------------------------------|----------------------------------------------------------------------------|
| `PORT`                        | Puerto HTTP (default 3000).                                                |
| `DATABASE_URL`                | Cadena de conexión Postgres (Supabase).                                    |
| `NODE_ENV`                    | `development` / `production` / `test`. Activa SSL en producción.           |
| `LOG_LEVEL`                   | `debug` / `info` / `warn` / `error` (default según `NODE_ENV`).            |
| `JWT_SECRET`                  | Secreto para firmar los JWTs.                                              |
| `JWT_ACCESS_TTL`              | Vida del access token (default `1h`).                                      |
| `JWT_REFRESH_TTL`             | Vida del refresh token (default `30d`).                                    |
| `CORS_ORIGIN`                 | Lista separada por comas con los orígenes permitidos.                      |
| `MERCADO_PAGO_ACCESS_TOKEN`   | Token de acceso de MercadoPago.                                            |
| `CLOUDINARY_CLOUD_NAME`       | Nombre del cloud de Cloudinary.                                            |
| `CLOUDINARY_API_KEY`          | API key de Cloudinary.                                                     |
| `CLOUDINARY_API_SECRET`       | API secret de Cloudinary (usado para firmar uploads).                      |
| `CRON_SECRET`                 | Bearer secret para los endpoints `/api/cron/*` (Vercel Cron).              |
| `DISABLE_CRON`                | Si es `true`, no se inicia `node-cron` (modo serverless).                  |

---

## Cómo correr el proyecto

```bash
npm install
npm run dev      # nodemon + ts-node-dev
npm run build    # compila a ./dist
npm start        # ejecuta ./dist/index.js (producción)

# tests
npm test                 # corre Jest
npm run test:coverage    # cobertura
```

---

## Modelo de datos

Tablas (DDL completo en `src/db/ddl.sql`):

```
Account ────┬──< Complex (admin_id)
            ├──< Reservation (account_id)
            ├──< Payment (user_id, paid_by)
            ├──< Refund (refunded_by)
            ├──< Match (creator_id)
            ├──< MatchPlayer (player_id)
            ├──< CancelRequest (requested_by, reviewed_by)
            └──< HistoryCancelReservation (cancelled_by)

Complex ────< Court ────┬──< WeekScheduleCourt ──< WeekScheduleCourtPrice
                        └──< ScheduleCourt ─────┬──< ScheduleCourtPrice
                                                └──< Reservation
                                                       ├──< Match ───┬──< MatchPlayer
                                                       │             ├──< PreRegistration
                                                       │             └──< MessageMatch
                                                       ├──< Payment ──< Refund
                                                       └──< CancelRequest

Sport ──< Court
```

Tipos del modelo en TypeScript en `src/types/`.

### Estados clave

| Tabla              | Campo                  | Valores                                   |
|--------------------|------------------------|-------------------------------------------|
| `Account`          | `account_type`         | `user`, `admin`, `creator`                |
| `Reservation`      | `status`               | `pending`, `confirmed`, `cancelled`       |
| `Match`            | `status`               | `pending`, `completed`, `cancelled`       |
| `PreRegistration`  | `registration_status`  | `pending`, `completed`, `cancelled`       |
| `Payment`          | `payment_status`       | `pending`, `completed`, `failed`, `cancelled` |
| `Payment`          | `payment_method`       | `debit_card`, `cash`, `bank_transfer`     |
| `Refund`           | `refund_status`        | `pending`, `completed`, `failed`          |
| `CancelRequest`    | `cancel_status`        | `pending`, `approved`, `rejected`         |

---

## Roles y autorización

Tres roles:

- **`user`** — jugador final. Crea cuenta, reserva, pone pagos, se une a
  partidos, envía mensajes en el chat.
- **`admin`** — administrador de complejo. Define cancha, deporte (parcial),
  horarios y precios; aprueba cancelaciones y confirma transferencias.
- **`creator`** — superadmin del sistema. Da de alta a deportes, registra
  complejos y lista todas las cuentas. Existe únicamente por inserción manual
  en la base.

El middleware `authMiddleware` exige `Authorization: Bearer <token>` y
adjunta `{ id, rol }` al `req.user`. El middleware `rolMiddleware([roles])`
exige que el rol decodificado esté en la lista.

---

## Flujos de negocio

### 1. Reserva individual

1. El usuario consulta `GET /api/scheduleday/court/:courtId?date=YYYY-MM-DD`
   para ver slots disponibles.
2. `POST /api/reservation` con `time_reserved` 1 (hora) o 1.5 (hora y media)
   y `is_match: false`.
3. El controller:
   - busca el slot, verifica que existan los 2 o 3 sub-slots de 30 min
     necesarios y los marca como ocupados,
   - calcula precio según `ScheduleCourtPrice`,
   - crea la `Reservation` en estado `pending`.
4. El usuario paga: `POST /api/payment/pay` (débito), `/bank-transfer`
   (transferencia) o `/cash`. Al confirmar, la reserva queda `confirmed`.

### 2. Partido abierto

1. `POST /api/reservation` con `is_match: true`. El controller adicionalmente:
   - crea una `Match` (`current_players = 1`, jugador creador unido),
   - inserta una `PreRegistration` con `expiration_date = now + 1h`.
2. Otros jugadores hacen `POST /api/match/join`. Cuando `current_players ==
   total_players` (definido por `Sport.max_players`), la `Match` pasa a
   `completed`, la `PreRegistration` a `completed` y la `Reservation` a
   `confirmed`.
3. Si pasan 60 minutos y el partido no se llenó, el cron job
   `preReserveCronJob` lo **cancela automáticamente**, libera la cancha y
   borra a los jugadores unidos.
4. Una vez completado, cada jugador paga su parte por separado
   (`price_per_player`).

### 3. Cancelación

- **Plain reservation, > 24h:** el usuario crea una solicitud
  (`POST /api/reservation/cancelrequest`); un admin la aprueba ejecutando
  `POST /api/reservation/cancelreservation`. Eso marca la reserva como
  `cancelled`, libera los slots, marca el pago como `cancelled` y crea un
  `Refund` en `pending`.
- **Plain reservation, < 24h:** no se permite crear solicitud (error 400).
- **Partido (todavía no completado):** `POST /api/reservation/cancelprereservation`
  cancela `Match`, `PreRegistration`, `Reservation` y todos los pagos
  asociados, generando un `Refund` por cada pago.

### 4. Pagos

- **Débito (MercadoPago):** se envía el token de tarjeta tokenizado en
  frontend; el server crea el `Payment` en MP y, si se aprueba, marca la
  `Reservation` como `confirmed` y guarda el `mp_payment_id`. Solo se aceptan
  IDs que empiezan con `deb` (`debit_card`, `debvisa`, etc.).
- **Transferencia bancaria:** el usuario sube el comprobante a Cloudinary y
  manda la URL en `proof_url`. El payment queda `pending`; un admin lo confirma
  con `POST /api/payment/bank-transfer/confirm`.
- **Cash:** se registra directamente el pago como `completed` y la reserva
  pasa a `confirmed`.
- **Comprobante PDF:** `POST /api/payment/proof` con `mp_payment_id` retorna
  un PDF generado con Puppeteer.

---

## Tabla de endpoints

Prefijo base: `/api`.

### Health

| Verb | Path        | Auth | Rol   | Descripción          |
|------|-------------|------|-------|----------------------|
| GET  | `/health`   | —    | —     | `{ status, uptime }` |

### Auth

| Verb | Path                       | Auth | Rol | Descripción                                                              |
|------|----------------------------|------|-----|--------------------------------------------------------------------------|
| POST | `/auth`                    | —    | —   | Login. Body `{ email, password }`. Devuelve `token` + `refreshToken`.    |
| POST | `/auth/refresh`            | —    | —   | Refresh: `{ refreshToken }` → nuevo access + refresh.                    |
| POST | `/auth/forgot-password`    | —    | —   | `{ email }`. Responde siempre 200 (no email enumeration).                |
| POST | `/auth/reset-password`     | —    | —   | `{ token, new_password }`. Token recibido por email (>=8 chars).         |

### Account

| Verb   | Path                          | Auth | Rol           | Descripción                                                              |
|--------|-------------------------------|------|---------------|--------------------------------------------------------------------------|
| POST   | `/account`                    | —    | —             | Alta de usuario (registro público). Siempre crea `user`. Devuelve token. |
| POST   | `/account/admin`              | ✓    | creator       | Alta de cuenta `admin` por el creator.                                   |
| PATCH  | `/account/me/password`        | ✓    | any           | Cambia password propio: `{ current_password, new_password }`.            |
| GET    | `/account`                    | ✓    | creator       | Lista todas las cuentas.                                                 |
| GET    | `/account/:id`                | ✓    | creator       | Cuenta por id.                                                           |
| PUT    | `/account/:id`                | ✓    | user, admin   | Edita nombre/email/birthdate/phone.                                      |
| DELETE | `/account/:id`                | ✓    | user, admin   | Borra cuenta.                                                            |

### Complex

| Verb   | Path             | Auth | Rol     | Descripción                                |
|--------|------------------|------|---------|--------------------------------------------|
| GET    | `/complex`       | ✓    | any     | Lista complejos.                           |
| POST   | `/complex`       | ✓    | creator | Crea complejo (requiere admin_id válido).  |
| PUT    | `/complex/:id`   | ✓    | admin   | Edita un complejo.                         |
| DELETE | `/complex/:id`   | ✓    | admin   | Borra un complejo.                         |

### Court

| Verb   | Path                              | Auth | Rol   | Descripción                |
|--------|-----------------------------------|------|-------|----------------------------|
| GET    | `/court`                          | ✓    | any   | Lista canchas (paginado).  |
| GET    | `/court/:id`                      | ✓    | any   | Detalle de una cancha.     |
| GET    | `/court/complex/:complexId`       | ✓    | any   | Canchas de un complejo.    |
| POST   | `/court`                          | ✓    | admin | Crea cancha.               |
| PUT    | `/court/:id`                      | ✓    | admin | Actualiza nombre/imagen.   |
| DELETE | `/court/:id`                      | ✓    | admin | Borra cancha.              |

### Sport

| Verb   | Path             | Auth | Rol     | Descripción                |
|--------|------------------|------|---------|----------------------------|
| GET    | `/sport`         | ✓    | any     | Lista deportes.            |
| GET    | `/sport/:id`     | ✓    | any     | Detalle de un deporte.     |
| POST   | `/sport`         | ✓    | creator | Crea deporte.              |
| DELETE | `/sport/:id`     | ✓    | creator | Borra deporte.             |

### ScheduleDay (slots diarios)

| Verb   | Path                              | Auth | Rol   | Descripción                                                   |
|--------|-----------------------------------|------|-------|---------------------------------------------------------------|
| GET    | `/scheduleday`                    | —    | —     | Lista todos los slots (admin lo usa internamente).            |
| GET    | `/scheduleday/court/:courtId?date=YYYY-MM-DD` | — | — | Slots de una cancha en una fecha.                |
| POST   | `/scheduleday`                    | ✓    | admin | Crea slot manualmente.                                        |
| PUT    | `/scheduleday/:id`                | ✓    | admin | Edita slot.                                                   |
| DELETE | `/scheduleday/:id`                | ✓    | admin | Borra slot.                                                   |
| GET    | `/scheduleday/price`              | ✓    | any   | Lista precios por slot.                                       |
| POST   | `/scheduleday/price`              | ✓    | admin | Crea precio para un slot.                                     |
| PUT    | `/scheduleday/price/:id`          | ✓    | admin | Edita precio.                                                 |
| DELETE | `/scheduleday/price/:id`          | ✓    | admin | Borra precio.                                                 |

### ScheduleCourtWeek (plantilla semanal)

| Verb   | Path                                | Auth | Rol   | Descripción                                  |
|--------|-------------------------------------|------|-------|----------------------------------------------|
| GET    | `/schedulecourtweek`                | ✓    | admin | Lista plantillas semanales.                  |
| POST   | `/schedulecourtweek`                | ✓    | admin | Crea una franja semanal + genera 7 días.     |
| POST   | `/schedulecourtweek/generate`      | ✓    | admin | Genera franjas de 30 min en un rango horario.|
| PATCH  | `/schedulecourtweek/:id`            | ✓    | admin | Edita franja.                                 |
| DELETE | `/schedulecourtweek/:id`            | ✓    | admin | Borra franja.                                 |
| GET    | `/schedulecourtweek/price`          | ✓    | any   | Lista precios semanales.                     |
| POST   | `/schedulecourtweek/price`          | ✓    | admin | Crea precio para una franja.                 |
| PUT    | `/schedulecourtweek/price/:id`      | ✓    | admin | Edita precio semanal.                        |
| DELETE | `/schedulecourtweek/price/:id`      | ✓    | admin | Borra precio semanal.                        |

### Reservation

| Verb   | Path                                       | Auth | Rol           | Descripción                                                       |
|--------|--------------------------------------------|------|---------------|-------------------------------------------------------------------|
| GET    | `/reservation`                             | ✓    | admin, creator| Todas las reservas (vista admin).                                 |
| GET    | `/reservation/:id`                         | ✓    | any           | Detalle de reserva.                                               |
| GET    | `/reservation/account/:accountId` (o `me`) | ✓    | any           | Reservas de un usuario.                                           |
| POST   | `/reservation`                             | ✓    | user          | Crea reserva. Si `is_match=true`, también crea `Match`.           |
| POST   | `/reservation/cancelrequest`               | ✓    | user          | Solicita cancelación (no aplica a matches).                       |
| POST   | `/reservation/cancelreservation`           | ✓    | admin         | Aprueba/ejecuta cancelación.                                      |
| POST   | `/reservation/cancelprereservation`        | ✓    | any           | Cancela un partido (libera slots y refunds).                      |

### Match

| Verb | Path                                  | Auth | Rol  | Descripción                                          |
|------|---------------------------------------|------|------|------------------------------------------------------|
| GET  | `/match`                              | ✓    | any  | Lista de partidos.                                   |
| GET  | `/match/:id`                          | ✓    | any  | Detalle de un partido.                               |
| GET  | `/match/:id/players`                  | ✓    | any  | Lista de jugadores unidos.                           |
| GET  | `/match/player/:playerId` (o `me`)    | ✓    | any  | Partidos donde el jugador está unido.                |
| POST | `/match/join`                         | ✓    | user | Une al jugador al partido (no admins).               |
| POST | `/match/leave`                        | ✓    | user | Deja el partido (creator no puede; cancela si queda 0). |
| POST | `/match/message`                      | ✓    | any  | Manda un mensaje al chat del partido.                |
| GET  | `/match/message/history/:id`          | ✓    | any  | Histórico de mensajes (vacío = 200 con `[]`).        |

### Payment

| Verb | Path                                     | Auth | Rol           | Descripción                                                  |
|------|------------------------------------------|------|---------------|--------------------------------------------------------------|
| GET  | `/payment`                               | ✓    | admin, creator| Lista todos los pagos del sistema (paginado).                |
| GET  | `/payment/:id`                           | ✓    | admin, creator| Detalle de un pago.                                          |
| GET  | `/payment/account/:accountId` (o `me`)   | ✓    | owner/admin   | Listado de pagos del usuario (paginado).                     |
| GET  | `/payment/reservation/:id`               | ✓    | admin, creator| Listado de pagos por reserva.                                |
| GET  | `/payment/upload/sign?folder=...`        | ✓    | any           | Firma para upload directo a Cloudinary desde el frontend.    |
| POST | `/payment/pay`                           | ✓    | user          | Pago con tarjeta de débito vía MercadoPago.                  |
| POST | `/payment/bank-transfer`                 | ✓    | user          | Crea pago `pending` con `proof_url` (Cloudinary).            |
| POST | `/payment/bank-transfer/confirm`         | ✓    | admin         | Confirma/rechaza la transferencia.                           |
| POST | `/payment/cash`                          | ✓    | user          | Registra pago en efectivo (confirma reserva).                |
| POST | `/payment/proof`                         | ✓    | owner/admin   | PDF del comprobante MercadoPago.                             |
| POST | `/payment/refund`                        | ✓    | admin         | Marca el refund como `completed`/`failed` + sube comprobante.|

### Cron

Todos requieren `Authorization: Bearer <CRON_SECRET>`.

| Verb | Path                              | Descripción                                                |
|------|-----------------------------------|------------------------------------------------------------|
| POST | `/cron/daily-maintenance`         | Corre los tres jobs en secuencia (uso en Vercel Hobby).    |
| POST | `/cron/expired-pre-reserves`      | Cancela partidos cuya pre-reserva expiró.                  |
| POST | `/cron/generate-schedule`         | Materializa los slots para hoy + 6 días desde la plantilla.|
| POST | `/cron/check-schedule-status`     | Marca como no disponibles los slots ya pasados.            |

#### Plan de scheduling

**Vercel Hobby** solo permite crons diarios — por eso `vercel.json` solo
declara un cron diario a `/cron/daily-maintenance` (03:00) que dispara los
tres jobs en secuencia. Una vez al día queda todo limpio.

Para **alta frecuencia** (cancelar partidos cuya pre-reserva venció a la
hora) hay tres opciones:

1. **GitHub Actions** (gratis, sin tope diario). El repo trae
   `.github/workflows/cron.yml` que pega a `/cron/expired-pre-reserves`
   cada 5 min y `/cron/check-schedule-status` cada 30 min. Configurar dos
   GitHub Secrets:
   - `API_BASE_URL` — URL pública del backend desplegado.
   - `CRON_SECRET` — mismo valor que el env var del server.
2. **Servicios externos** como cron-job.org / EasyCron apuntando a los
   mismos endpoints.
3. **Vercel Pro** — desbloquea crons con cualquier expresión.

Si **no** estás en serverless (VPS, Render, Railway, etc.), dejá
`DISABLE_CRON` sin setear y `node-cron` corre los tres jobs in-process
con los intervalos originales (cada 5 min, 30 min y a la 00:00).

---

## Cron jobs

Definidos en `src/cronjobs/`:

- **`scheduleGenerator.ts`**
  - `0 0 * * *` (00:00 diario): genera los slots del día `today + 6` a partir
    de la plantilla semanal.
  - `0,30 * * * *` (cada 30 min): marca como no disponibles los slots cuya
    hora ya pasó.
  - Al iniciar el servidor también corre una verificación inmediata.
- **`preReserveCronJob.ts`**
  - `*/5 * * * *` (cada 5 min): busca `PreRegistration` con `expiration_date
    < now` y `pending`; cancela el partido, vacía los jugadores, libera los
    slots y cancela la `Reservation`.

---

## WebSockets

Servidor Socket.IO inicializado en `src/index.ts` con el mismo CORS que el
HTTP. Handlers en `src/services/webSocket.ts`.

### Eventos del cliente

| Evento                | Payload         | Descripción                                                  |
|-----------------------|-----------------|--------------------------------------------------------------|
| `subscribeCourt`      | `schedule_id`   | Une al cliente a la sala `schedule_<id>`.                    |
| `unsubscribeCourt`    | `schedule_id`   | Lo saca de la sala.                                          |
| `JoinAdmin`           | —               | Une al cliente a la sala `admins`.                           |
| `LeaveAdmin`          | —               | Lo saca de `admins`.                                         |
| `joinMatch`           | `match_id`      | Une al cliente al chat `match_<id>`.                         |
| `leaveMatch`          | `match_id`      | Lo saca del chat.                                            |
| `newMessage`          | `SendMessage`   | Emite a la sala `match_<id>`.                                |

### Eventos del servidor

| Evento                       | Disparado por                                  |
|------------------------------|------------------------------------------------|
| `notificationCourt`          | Cancelación de reserva libera la cancha.       |
| `notificationCancelRequest`  | Usuario crea/aprueba `CancelRequest`.          |
| `newMessage`                 | Nuevo mensaje en chat de partido.              |
| `payment_success`            | Hook helper (no usado todavía en backend).     |

---

## Tests

- **Framework:** Jest + ts-jest + supertest.
- **DB:** mock del paquete `pg` con queries stubbeadas por substring/regex.
  - Setup: `tests/mocks/pg.ts` + `tests/helpers/queryMock.ts`.
- **Servicios externos:** `mercadopago`, `cloudinary` y el módulo
  `services/webSocket.ts` están mockeados para no requerir red ni un
  servidor Socket.IO activo.

### Comandos

```bash
npm test                # corre toda la suite
npm test -- <pattern>   # corre un subset
npm run test:coverage   # cobertura HTML en ./coverage
```

### Cobertura actual

20 suites · 167 tests · 100% verde. Cubre:

- Unit: `jwtService`, `bcrypService`, `addMinutes`, `pagination`,
  `authMiddleware`, `rolMiddleware`, `handleValidationErrors`.
- Integración (vía supertest): `auth` (login + refresh + forgot/reset),
  `account` (signup + admin-create + change-password), `sport`, `complex`,
  `court` (+ get by id + by complex), `reservation` (+ ownership),
  `match`, `payment` (+ list-all + signed upload), `scheduleDay`,
  `scheduleCourtWeek`, `cron`, y nuevos endpoints.

### Cómo agregar más tests

1. Crear `tests/integration/<router>.test.ts`.
2. Encabezar con los 4 `jest.mock` (pg, webSocket, mercadoPago, cloudinary).
3. `import { buildApp } from "../helpers/buildApp";` y crear un `app` por
   archivo.
4. Antes de cada caso: `setupQueryStubs([...])` indicando los stubs en orden.
5. Usar `bearer(userId, rol)` para autenticar.

---

## Mejoras recomendadas

### Resueltas en esta PR

- **Credenciales de Cloudinary** migradas a env vars (`CLOUDINARY_*`).
- **`POST /account`** ya no permite escalar a `admin`; existe
  `POST /account/admin` solo para `creator`. La respuesta incluye `token` y
  `refreshToken`.
- **Ownership** en `/reservation/:id`, `/reservation/account/:id`,
  `/match/player/:id`, `/payment/account/:id`, `/payment/proof`: un usuario
  solo puede acceder a recursos propios; admin/creator pueden ver todo.
- **JWT corto + refresh**: `JWT_ACCESS_TTL=1h`, `JWT_REFRESH_TTL=30d` con
  `POST /auth/refresh`.
- **Reset de password**: `POST /auth/forgot-password` y
  `POST /auth/reset-password` con tabla `PasswordResetToken`. El controller
  loguea el token vía pino y, sólo cuando `NODE_ENV !== "production"`, lo
  retorna en la respuesta para facilitar testing. **En producción**
  conectar un proveedor de email (SendGrid, Resend, etc.) en
  `forgotPasswordController`.
- **PATCH `/account/me/password`** para cambiar password autenticado.
- **Cloudinary signed upload** vía `GET /payment/upload/sign` — el frontend
  obtiene `{ signature, timestamp, folder, api_key, cloud_name }` y sube
  directo a Cloudinary sin tocar el secret.
- **Paginación** (`?limit` / `?offset`, default 50, máximo 200) en
  `/reservation`, `/reservation/account`, `/match`, `/match/player`,
  `/payment`, `/payment/account`, `/court`.
- **Logging estructurado** con `pino` + `pino-http` y redacción de campos
  sensibles (`authorization`, `password`, `token`).
- **Socket.IO JWT auth**: `io.use(socketAuthMiddleware)` rechaza
  conexiones sin token. `JoinAdmin` además exige `rol in (admin, creator)`.
- **Cron compatible con Vercel**: endpoints `/api/cron/*` protegidos por
  `CRON_SECRET`. `vercel.json` declara un único cron diario a
  `/cron/daily-maintenance` (compatible con Hobby plan, que solo permite
  ejecuciones diarias). Para los jobs que necesitan correr cada 5 / 30
  min, el repo incluye `.github/workflows/cron.yml`. Setear
  `DISABLE_CRON=true` cuando se desplegue serverless.
- Nuevos GETs: `/court/:id`, `/court/complex/:complexId`, `/sport/:id`.

### Pendientes (no bloquean al frontend)

1. **Transacciones SQL** en `createReservation` (escribe en `Reservation`,
   `Match`, `PreRegistration`, `MatchPlayer`, `ScheduleCourt`). Hoy si una
   query a mitad falla quedan inconsistencias. Envolver en
   `BEGIN/COMMIT` usando un client del pool.
2. **`Match.deleteMatchQuery` / `deleteReservationQuery`** no borran en
   cascada `Payment`, `Refund`, `MessageMatch`. Agregar `ON DELETE CASCADE`
   al DDL o borrado explícito.
3. **Filtros** además de paginación (por status, court, fecha, etc.) en los
   listados grandes.
4. **Sanitización HTML** del comprobante PDF (`mercadoPago.ts`).
5. **Rate limiting + helmet** (`express-rate-limit` para `/auth`,
   `helmet` global).
6. **Email real para reset de password**: conectar SendGrid/Resend.
7. **Devolver fechas en UTC ISO-8601** en vez de Montevideo local en la
   API (mantener Montevideo internamente para comparar contra slots).
8. **OpenAPI/Swagger** para generar clientes tipados.
9. **Cancelación con motivo** en `cancelReservation` (admin).
10. **`POST /match/:id/cancel`** dedicado para el creador del partido.

### Bugs corregidos en esta rama

- `isWithin24Hours` daba `true` para fechas futuras lejanas (signo invertido
  en la resta). Arreglado.
- `accountRouter` y `scheduleDay` usaban `.isEmpty()` en vez de `.notEmpty()`
  en sus validaciones de `param/body`.
- `paymentRouter` corría `handleValidationErrors` después de `authMiddleware`,
  devolviendo 401 en vez de 400 para payloads inválidos sin token. Re-ordenado
  en todas las rutas.
- `updatePaymentStatusQuery` filtraba por `reservation_id` cuando recibía un
  `payment_id` y además no retornaba la promesa. Arreglado + agregado
  `updatePaymentStatusByReservationQuery` para el caso bulk.
- `updateStatusRefundQuery` no retornaba la promesa. Arreglado.
- `Match.historyChatMatch` devolvía 404 con chat vacío; ahora retorna `[]`.
  Además se quitó el `rolMiddleware(["admin"])` que impedía a los jugadores
  ver su propio chat.
- `Court.deleteCourt` y `Complex.deleteComplexData` ponían el resultado en el
  campo `error` con un mensaje confuso. Arreglado.
- `cancelReservationRequest` accedía a `reservation.rows[0]` antes de validar
  que existiera la reserva. Reordenado.
- `scheduleCourtWeek` PATCH: validación tras `authMiddleware`. Reordenado.
- `generateScheduleForDay` en `ScheduleCourtWeek` mutaba la fecha dos veces
  por iteración. Simplificado.

### Endpoints nuevos en esta rama

- `GET /api/health`
- `GET /api/reservation/:id`
- `GET /api/reservation/account/:accountId` (o `/me`)
- `GET /api/match/:id`
- `GET /api/match/:id/players`
- `GET /api/match/player/:playerId` (o `/me`)
- `GET /api/payment/account/:accountId` (o `/me`)
- `GET /api/payment/reservation/:id`
- `GET /api/scheduleday/court/:courtId?date=YYYY-MM-DD`

---

## Contacto

Backend mantenido por @santimenendez98.
