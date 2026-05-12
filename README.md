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

Crear un archivo `.env` (no se commitea, está en `.gitignore`):

```env
PORT=3000
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=development
JWT_SECRET=replace-me
CORS_ORIGIN=http://localhost:5173
MERCADO_PAGO_ACCESS_TOKEN=your_mercadopago_access_token
```

> ⚠️ Las credenciales actuales de Cloudinary están hardcodeadas en
> `src/services/cloudinary.ts`. Antes de pasar a producción rotarlas y
> moverlas a variables de entorno — ver "Mejoras recomendadas" en la
> documentación.

### MercadoPago Payment Method IDs

- `debit_card` — débito genérico
- `debvisa` / `debmaster` — Visa Débito / Mastercard Débito
- `visa` / `master` / `amex` — solo para referencia (el backend solo acepta
  payment methods cuyo ID empieza por `deb`).

## Endpoints destacados

- `POST /api/auth` — login (JWT).
- `POST /api/account` — registro de usuario.
- `GET  /api/scheduleday/court/:courtId?date=YYYY-MM-DD` — slots disponibles.
- `POST /api/reservation` — reservar (con `is_match` opcional para partidos).
- `POST /api/match/join` / `/leave` / `/message` — gestión de partidos.
- `POST /api/payment/pay` / `/cash` / `/bank-transfer` — pagos por canal.
- `GET  /api/reservation/account/me`, `/api/match/player/me`,
  `/api/payment/account/me` — historial del usuario autenticado.

Listado completo: [`DOCUMENTATION.md#tabla-de-endpoints`](./DOCUMENTATION.md#tabla-de-endpoints).

## Tests

```bash
npm test
```

15 suites · 122 tests. Usan Jest + supertest con `pg`, `mercadopago`,
`cloudinary` y `services/webSocket` mockeados — no requieren base de datos.
