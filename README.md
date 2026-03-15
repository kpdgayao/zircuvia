# ZircuVia

Smart Circular Tourism Platform for Puerto Princesa City. A progressive web app (PWA) that helps tourists discover eco-certified businesses, pay environmental fees, and explore sustainable tourism in Palawan.

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS 4 with shadcn/ui (base-nova style)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT (jose) with httpOnly cookies
- **Maps:** React Leaflet with OpenStreetMap
- **Payments:** Xendit payment gateway (with mock mode)
- **Deployment:** Docker on Railway

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10.28+
- PostgreSQL database

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database URL and JWT secret

# Generate Prisma client
pnpm db:generate

# Push database schema
pnpm db:push

# Seed the database (optional)
pnpm db:seed

# Start development server
pnpm dev
```

The app runs at `http://localhost:3000`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the application |
| `XENDIT_MODE` | No | `mock` for testing, `live` for production |
| `XENDIT_SECRET_KEY` | No | Xendit API key (not needed in mock mode) |
| `XENDIT_WEBHOOK_TOKEN` | No | Xendit webhook verification token |

## Project Structure

```
app/
  (tourist)/       # Public tourist routes (home, listings, map, saved)
  (auth)/          # Authentication pages (login, register)
  (admin)/         # Admin dashboard (protected)
  (checker)/       # Verifier check-in app (protected)
  (standalone)/    # Standalone pages (payment checkout, onboarding)
  api/             # API route handlers
components/
  ui/              # shadcn/ui components
lib/               # Utilities, auth, Prisma client, constants
prisma/            # Schema and seed script
public/            # Static assets, PWA manifest, service worker
```

## Key Features

- **Tourist App:** Browse eco-certified hotels, restaurants, tours, and artisans. Save favorites, view on map, leave reviews.
- **Environmental Fee:** Online payment flow for eco-tourism fees with QR-based verification.
- **Admin Dashboard:** Manage businesses, eco-certifications, fee payments, visitor stats, and system logs.
- **Verifier App:** Check-in tourists at locations by scanning fee payment references.
- **PWA:** Installable with offline support for map tiles and business data.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed the database |

## Deployment

The app deploys via Docker on Railway.

```bash
# Build Docker image
docker build -t zircuvia .

# Run container
docker run -p 3000:3000 --env-file .env zircuvia
```

### Important: Standalone Output

The app uses `output: "standalone"` in `next.config.ts`. When deploying without Docker, you must manually copy static assets:

```bash
pnpm build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
node .next/standalone/server.js
```

The Dockerfile handles this automatically (see lines 26-28).

## User Roles

| Role | Access |
|------|--------|
| **Tourist** | Browse, save, pay fees, submit reviews |
| **Admin** | Full system management with granular permissions |
| **Verifier** | Check-in verification at assigned locations |

## Architecture Notes

- **Tailwind CSS 4** uses `@tailwindcss/postcss` via `postcss.config.mjs` — this file is required for styles to compile
- **Font:** Geist font is bundled locally (`public/fonts/`) to avoid build failures from Google Fonts network issues
- **Auth:** JWT tokens stored in `zircuvia_session` httpOnly cookie, 7-day expiry
- **PWA:** Service worker caches OpenStreetMap tiles (up to 500) and business API responses
