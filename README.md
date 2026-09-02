# ServeKaro — Backend API

Backend for **ServeKaro**, a service-booking platform connecting customers with local
service providers. Built with Express + MongoDB (Mongoose) + JWT auth.

Workflow: Customer registers → browses providers → submits a booking → provider
accepts/rejects → accepted moves to In Progress → then Completed → customer leaves
a 1–5 star review.

## Roles

| Role | Can do |
|---|---|
| `user` | Register, browse/search providers, create bookings, track status, leave a review after completion |
| `provider` | Manage own profile, view incoming bookings, accept/reject, move accepted → in-progress → completed |
| `admin` | Verify/approve new providers, moderate all bookings |
| `superadmin` | Everything Admin can do, plus create new Admin accounts |

## 1. Setup

```bash
npm install
cp .env.example .env
# then edit .env: set MONGO_URI to your MongoDB Atlas connection string
# and set JWT_SECRET to any long random string
```

## 2. Create the first Super Admin (demo credentials)

```bash
npm run seed
```

This creates a Super Admin using `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` from
`.env` (defaults: `superadmin@servekaro.com` / `SuperAdmin@123`). Use this account
to log in and create Admins via `POST /api/admin/create-admin`.

Regular customers and providers sign up themselves through `POST /api/auth/register`.

## 3. Run

```bash
npm run dev     # nodemon, auto-restart
npm start        # plain node
```

Server starts on `http://localhost:5000` (or `PORT` from `.env`).
Health check: `GET /api/health`.

## API Routes

**Auth** — `/api/auth`
- `POST /register` — body: `{ name, email, password, role? ('user'|'provider'), phone?, serviceCategory*, experience?, price?, location?, bio? }` (*required if role=provider)
- `POST /login` — body: `{ email, password }`
- `GET /me` — 🔒 any logged-in role

**Providers** — `/api/providers`
- `GET /` — public, query: `?category=&search=`
- `GET /meta/categories` — public, list of distinct categories
- `GET /:id` — public, provider detail
- `PUT /profile` — 🔒 provider only, update own profile

**Bookings** — `/api/bookings`
- `POST /` — 🔒 user only, body: `{ provider, service, date, time, location, description? }`
- `GET /my` — 🔒 user only, own bookings
- `GET /provider` — 🔒 provider only, incoming bookings
- `GET /:id` — 🔒 booking's own customer/provider, or admin/superadmin
- `PATCH /:id/status` — 🔒 provider only, body: `{ status }`, must follow: `pending → accepted/rejected`, `accepted → in-progress`, `in-progress → completed`

**Reviews** — `/api/reviews`
- `POST /` — 🔒 user only, body: `{ booking, rating (1-5), comment? }`, booking must belong to the customer and be `completed`, one review per booking
- `GET /provider/:providerId` — public

**Admin** — `/api/admin` (🔒 admin or superadmin for all routes below)
- `GET /providers?status=pending|verified` — providers awaiting/already verified
- `PATCH /providers/:id/verify` — body: `{ approve: true|false }`
- `GET /bookings?status=` — all bookings, optional status filter
- `GET /users` — all customers + providers
- `POST /create-admin` — 🔒 superadmin only, body: `{ name, email, password }`

## Business rules enforced server-side

- Every booking gets a unique `bookingId` (retried on the rare collision).
- Required booking fields are validated (service, date, time, location).
- A booking can only be reviewed once it's `completed`, and only once ever
  (enforced both in the controller and via a unique DB index).
- `rejected` and `completed` are terminal states — the allowed-transitions map in
  `utils/constants.js` blocks any further status change from either.
- A new provider is `isVerified: false` until an Admin/Super Admin approves them,
  and only verified + active providers appear in search or can receive bookings.

## Tech stack

React + Vite + Tailwind (frontend, separate repo/folder) · Node.js + Express ·
MongoDB + Mongoose · JWT + bcrypt for auth · express-validator for input validation.

## AI tools used

Backend scaffolded with Claude (Anthropic).
