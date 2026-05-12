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

Crear un `.env` (no se commitea — está en `.gitignore`):

| Variable                      | Descripción                                                      |
|-------------------------------|------------------------------------------------------------------|
| `PORT`                        | Puerto HTTP (default 3000).                                      |
| `DATABASE_URL`                | Cadena de conexión Postgres (Supabase).                          |
| `NODE_ENV`                    | `development` / `production` / `test`. Activa SSL en producción. |
| `JWT_SECRET`                  | Secreto para firmar los JWTs.                                    |
| `CORS_ORIGIN`                 | Lista separada por comas con los orígenes permitidos.            |
| `MERCADO_PAGO_ACCESS_TOKEN`   | Token de acceso de MercadoPago.                                  |

> Las credenciales de Cloudinary están hardcodeadas en
> `src/services/cloudinary.ts`. **Esto debe migrarse a env vars** —
> ver sección [Mejoras recomendadas](#mejoras-recomendadas).

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

| Verb | Path      | Auth | Rol | Descripción                       |
|------|-----------|------|-----|-----------------------------------|
| POST | `/auth`   | —    | —   | Login. Body `{ email, password }` |

### Account

| Verb   | Path             | Auth | Rol           | Descripción                                    |
|--------|------------------|------|---------------|------------------------------------------------|
| POST   | `/account`       | —    | —             | Alta de usuario (registro público).            |
| GET    | `/account`       | ✓    | creator       | Lista todas las cuentas.                       |
| GET    | `/account/:id`   | ✓    | creator       | Cuenta por id.                                 |
| PUT    | `/account/:id`   | ✓    | user          | Edita nombre/email/birthdate/phone.            |
| DELETE | `/account/:id`   | ✓    | user, admin   | Borra cuenta.                                  |

### Complex

| Verb   | Path             | Auth | Rol     | Descripción                                |
|--------|------------------|------|---------|--------------------------------------------|
| GET    | `/complex`       | ✓    | any     | Lista complejos.                           |
| POST   | `/complex`       | ✓    | creator | Crea complejo (requiere admin_id válido).  |
| PUT    | `/complex/:id`   | ✓    | admin   | Edita un complejo.                         |
| DELETE | `/complex/:id`   | ✓    | admin   | Borra un complejo.                         |

### Court

| Verb   | Path             | Auth | Rol   | Descripción                |
|--------|------------------|------|-------|----------------------------|
| GET    | `/court`         | ✓    | any   | Lista canchas.             |
| POST   | `/court`         | ✓    | admin | Crea cancha.               |
| PUT    | `/court/:id`     | ✓    | admin | Actualiza nombre/imagen.   |
| DELETE | `/court/:id`     | ✓    | admin | Borra cancha.              |

### Sport

| Verb   | Path             | Auth | Rol     | Descripción                |
|--------|------------------|------|---------|----------------------------|
| GET    | `/sport`         | ✓    | any     | Lista deportes.            |
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
| POST | `/payment/pay`                           | ✓    | user          | Pago con tarjeta de débito vía MercadoPago.                  |
| POST | `/payment/bank-transfer`                 | ✓    | user          | Crea pago `pending` con `proof_url` (Cloudinary).            |
| POST | `/payment/bank-transfer/confirm`         | ✓    | admin         | Confirma/rechaza la transferencia.                           |
| POST | `/payment/cash`                          | ✓    | user          | Registra pago en efectivo (confirma reserva).                |
| POST | `/payment/proof`                         | ✓    | user          | PDF del comprobante MercadoPago.                             |
| POST | `/payment/refund`                        | ✓    | admin         | Marca el refund como `completed`/`failed` + sube comprobante.|
| GET  | `/payment/account/:accountId` (o `me`)   | ✓    | any           | Listado de pagos del usuario.                                |
| GET  | `/payment/reservation/:id`               | ✓    | admin, creator| Listado de pagos por reserva.                                |

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

15 suites · 122 tests · 100% verde. Cubre:

- Unit: `jwtService`, `bcrypService`, `addMinutes`, `authMiddleware`,
  `rolMiddleware`, `handleValidationErrors`.
- Integración (vía supertest): `auth`, `account`, `sport`, `complex`, `court`,
  `reservation`, `match`, `payment`, `scheduleDay`, `scheduleCourtWeek`,
  y endpoints nuevos.

### Cómo agregar más tests

1. Crear `tests/integration/<router>.test.ts`.
2. Encabezar con los 4 `jest.mock` (pg, webSocket, mercadoPago, cloudinary).
3. `import { buildApp } from "../helpers/buildApp";` y crear un `app` por
   archivo.
4. Antes de cada caso: `setupQueryStubs([...])` indicando los stubs en orden.
5. Usar `bearer(userId, rol)` para autenticar.

---

## Mejoras recomendadas

Estas son las mejoras que detecté revisando el código (no son críticas, pero
sí prioritarias).

### Seguridad

1. **Credenciales de Cloudinary hardcodeadas** en `src/services/cloudinary.ts`.
   El `api_secret` está en el repo y por lo tanto en el historial de Git. Hay
   que rotarlo y leerlo de `process.env.CLOUDINARY_*`.
2. **Variables sensibles en el README**: el README actual incluye una contraseña
   de Supabase de ejemplo. Aunque parezca un placeholder, conviene cambiarla y
   no documentar credenciales reales.
3. **Validación de propiedad en endpoints de pago/reserva.** Hoy un usuario
   autenticado puede pedir el comprobante (`/payment/proof`) o ver el detalle
   de la reserva de otro. Agregar checks contra `req.user.id`.
4. **`account_type` en `POST /account`** — actualmente cualquiera puede
   registrarse como `admin` enviando `account_type: "admin"`. Limitar a
   `"user"` y delegar la creación de admins a un endpoint con
   `rolMiddleware(["creator"])`.
5. **Rate limiting + helmet** — falta middleware básico de protección. Sugiero
   `express-rate-limit` para `/auth` y `helmet` global.
6. **JWT con `expiresIn: "30d"`** es muy largo para sesiones de usuario sin
   refresh token. Considerar tokens cortos + refresh.

### Calidad / mantenibilidad

7. **Transacciones SQL.** Operaciones como `createReservation` (que escribe en
   `Reservation`, `Match`, `PreRegistration`, `MatchPlayer` y actualiza dos
   `ScheduleCourt`) deberían ir dentro de una transacción `BEGIN/COMMIT` para
   evitar estados inconsistentes ante un fallo a mitad del flujo.
8. **`updatePaymentStatusQuery` ya filtra por `id`** (lo arreglé), pero la
   lógica de cancelación de un partido ahora usa
   `updatePaymentStatusByReservationQuery` que cancela TODOS los pagos. Validar
   manualmente que sea el comportamiento esperado.
9. **`Match.deleteMatchQuery`** y `deleteReservationQuery` no borran en cascada
   `Payment`, `Refund`, `MessageMatch`, etc. Si bien hoy no se llama
   directamente excepto en `leaveMatch` cuando `current_players=0`, conviene
   o bien usar `ON DELETE CASCADE` en el DDL o agregar borrado explícito.
10. **Búsqueda y paginación**: `GET /reservation`, `/match`, `/court`, etc.
    devuelven todo sin paginar. Cuando crezca el volumen, agregar `?limit`,
    `?offset` y filtros.
11. **Logging estructurado**: hoy todo es `console.log`. Sugiero `pino` o
    `winston` con niveles + un middleware HTTP (morgan).
12. **Sanitización del HTML del comprobante PDF**: los campos como
    `cardholder_name`, `email` o `description` se inyectan en el HTML sin
    escapar. Aunque venga de MercadoPago, conviene escapar para evitar HTML
    injection si en el futuro estos valores los controla el usuario.
13. **`generateScheduleCourtWeek`** genera 14 inserciones (siete fechas más el
    duplicado que estaba). Lo arreglé pero validar que la combinación de
    `INSERT` por cada día no triplique los slots en producción.
14. **Cron jobs en producción serverless (Vercel)**. `node-cron` requiere un
    proceso persistente; en Vercel funciona solo durante la vida útil de cada
    invocación. Para entornos serverless mover a Vercel Cron / GitHub Actions.

### UX / API

15. **`POST /account` debería devolver un token** además del registro
    creado, para evitar un segundo round-trip a `/auth`.
16. **Cancelación con motivo**: hoy `cancelReservation` (admin) no pide
    `reason` aunque el modelo lo permite. Sería útil agregarlo.
17. **`leaveMatch` cuando queda solo el creator**: si todos los demás se van
    y el creator no quiere seguir, no puede cancelar de forma directa. Hoy
    debe usar `/reservation/cancelprereservation`. Vale la pena documentarlo
    o exponer un endpoint específico `POST /match/:id/cancel`.
18. **WebSocket auth**: hoy el `io.on("connection", …)` no valida el JWT.
    Cualquier cliente puede unirse a las salas `admins`, `match_<id>`, etc.
    Agregar un middleware `io.use((socket, next) => verifyToken(...))`.
19. **Devolver fechas en UTC ISO 8601** en lugar del formato local
    Montevideo. Las cron jobs y comparaciones internas pueden quedar en
    Montevideo, pero la API debería ser timezone-agnostic.
20. **OpenAPI/Swagger**: con el contrato ya estable, generar un `openapi.yml`
    documenta y permite generar clients automáticos.

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
