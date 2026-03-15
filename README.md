# Zircuvia

Tourism and environmental fee management platform for Puerto Princesa City, Palawan. Built with Next.js, Prisma, and Tailwind CSS.

## Features

- **Environmental Fee Payments** — tourists can pay and track environmental fees with support for multiple payer types (Regular Tourist, Palaweno, Student, Senior Citizen, PWD)
- **Simulated Payment Gateway** — demo-ready checkout flow with payment method selection (Credit/Debit Card, GCash, Maya), card form, processing animation, and receipt generation
- **Visitor Check-in** — verifier role can scan and validate fee payments at checkpoints
- **Admin Dashboard** — manage businesses, eco-business processing, environmental fees, visitor stats, events, system logs, and settings
- **Business Directory** — browse and review local tourism businesses (hotels, resorts, restaurants, artisans, travel & tours)
- **Tourism Circuits** — curated tourism routes across Puerto Princesa
- **Interactive Maps** — Leaflet-based maps for tourism locations

## Tech Stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Database:** PostgreSQL + Prisma ORM
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Auth:** JWT (jose) + bcryptjs
- **Payments:** Xendit SDK (with mock mode for demos)
- **Maps:** Leaflet + react-leaflet
- **Charts:** Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+
- PostgreSQL database

### Setup

1. Clone the repository and install dependencies:

```bash
pnpm install
```

2. Copy the environment template and configure:

```bash
cp .env.example .env
```

Edit `.env` with your database URL and a JWT secret:

```
DATABASE_URL="postgresql://user:password@host:5432/zircuvia"
JWT_SECRET="your-secret-here"
XENDIT_MODE="mock"
```

3. Generate Prisma client and push the schema:

```bash
pnpm db:generate
pnpm db:push
```

4. Seed the database with demo data:

```bash
pnpm db:seed
```

5. Start the development server:

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

## Demo Accounts

After running `pnpm db:seed`, the following accounts are available:

| Role     | Email                        | Password    |
| -------- | ---------------------------- | ----------- |
| Tourist  | `tourist@demo.zircuvia.ph`   | `Demo2026!` |
| Tourist  | `tourist2@demo.zircuvia.ph`  | `Demo2026!` |
| Admin    | `admin@demo.zircuvia.ph`     | `Demo2026!` |
| Verifier | `verifier@demo.zircuvia.ph`  | `Demo2026!` |

### Demo Payment Flow

The app includes a simulated payment gateway (when `XENDIT_MODE="mock"`):

1. Log in as a tourist account
2. Navigate to **Fees** and select **Pay Environmental Fee**
3. Choose payer types and quantities, then click **Proceed to Payment**
4. The checkout page presents a simulated payment gateway with:
   - Order summary with line items
   - Payment method selection (Credit/Debit Card, GCash, Maya)
   - Card details form (any valid-format input works)
5. Click **Pay** to process — a 3-second animation simulates processing
6. On success, a receipt page shows the full fee breakdown, validity period, and a "PAID" stamp
7. View the detailed invoice from the success page or the fees list

No real charges are made in mock mode.

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `pnpm dev`        | Start dev server with Turbopack    |
| `pnpm build`      | Production build                   |
| `pnpm start`      | Start production server            |
| `pnpm lint`       | Run ESLint                         |
| `pnpm db:generate`| Generate Prisma client             |
| `pnpm db:push`    | Push schema to database            |
| `pnpm db:migrate` | Run database migrations            |
| `pnpm db:studio`  | Open Prisma Studio                 |
| `pnpm db:seed`    | Seed database with demo data       |

## Environment Variables

| Variable              | Required | Description                                      |
| --------------------- | -------- | ------------------------------------------------ |
| `DATABASE_URL`        | Yes      | PostgreSQL connection string                     |
| `JWT_SECRET`          | Yes      | Secret for JWT token signing                     |
| `NEXT_PUBLIC_APP_URL` | Yes      | Public URL of the app                            |
| `XENDIT_MODE`         | No       | Set to `"mock"` for demo mode (default: `"mock"`) |
| `XENDIT_SECRET_KEY`   | No       | Xendit API secret key (production only)          |
| `XENDIT_WEBHOOK_TOKEN`| No       | Xendit webhook verification token                |

## Project Structure

```
app/
├── (auth)/           # Login pages (tourist, admin)
├── (tourist)/        # Tourist-facing pages (fees, profile)
├── (admin)/          # Admin dashboard pages
├── (standalone)/     # Standalone pages (checkout)
├── (public)/         # Public pages (businesses, circuits, map)
├── api/              # API routes
components/           # Shared UI components
lib/                  # Utilities, auth, prisma, xendit, constants
prisma/               # Schema and seed file
```
