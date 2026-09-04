# CertifyMetric (SIH 26036)

> **Online Verification System for Weighing and Measuring Instruments**  
> Developed for the Department of Consumer Affairs (Legal Metrology Division), Government of India.

---

## Overview

CertifyMetric is a statutory verification platform digitizing the lifecycle of weighing and measuring instruments under the Legal Metrology Act and General Rules 2011.

- **Role-Based Workspaces**: Trader / Commercial User, Legal Metrology Officer (Authority), Field Verifier (Inspector), Government Approved Test Centre (GATC), and Platform Administrator.
- **Statutory Workflow**: Instrument registration, verification request submission, automated inspector workload assignment, standardized field inspection checklist, measurement error calculation against MPE (Maximum Permissible Error), tamper-seal photographic evidence logging, and statutory Form 6 certificate issuance with cryptographic QR verification.

---

## Quick Start (Development)

```bash
# 1. Install dependencies (root, client, server)
npm install
npm --prefix client install
npm --prefix server install

# 2. Start full-stack development environment (Frontend on :5173, Backend on :4000)
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser. Demo user credentials can be found in `DEMO_CREDENTIALS.md`.

---

## Production Deployment Readiness

### Environment Setup

Create `.env` configuration files from provided templates:

```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env.production
```

Key environment variables:
- `NODE_ENV`: `production`
- `PORT`: Server port (e.g. `4000` or assigned by cloud hosting provider)
- `HOST`: `0.0.0.0`
- `DATABASE_PATH`: Path to persistent SQLite database (e.g., `/data/metrology.db`)
- `STORAGE_DIR`: Path to persistent evidence file storage (e.g., `/data/uploads`)
- `FRONTEND_URL`: Allowed CORS origin(s) (e.g., `https://your-frontend-domain.com`)
- `SESSION_SECRET`: Secret key for session hashing
- `VITE_API_URL`: Backend API base URL for the client (e.g., `https://your-api-domain.com/api` or `/api`)

### Production Build & Verification

```bash
# 1. Build optimized frontend production bundle
npm run build

# 2. Run automated production simulation & security audit
npm run test:prod

# 3. Seed production database with baseline statutory reference data & initial accounts
npm run seed:prod
```

For complete cloud deployment architectures (Docker, Vercel + Render/Railway, PostgreSQL migration), refer to [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

---

## Project Structure

```
├── client/                     # Vite + React Frontend SPA
│   ├── src/
│   │   ├── api.js              # Centralized API layer with dynamic baseURL & file URLs
│   │   ├── App.jsx             # Main router & role switching
│   │   ├── components/         # StatusBadge, Navbar, MetricCard
│   │   └── views/              # Role dashboards & verification workspaces
│   ├── .env.example            # Frontend environment variable template
│   └── package.json
│
├── server/                     # Express.js REST API Backend
│   ├── server.js               # API routes, CORS hardening, health probe, graceful shutdown
│   ├── db.js                   # SQLite database configuration with WAL mode & busy timeout
│   ├── storage.js              # Persistent storage abstraction, MIME validation & Multer
│   ├── auth-utils.js           # Cryptographic scrypt password hashing & verification
│   ├── permissions.js          # Role-Based Access Control (RBAC) definitions
│   ├── seed-demo-users.js      # Production & demo user seeding script
│   ├── migrations/             # PostgreSQL production migration schema
│   ├── .env.example            # Backend environment variable template
│   └── package.json
│
├── docs/
│   └── DEPLOYMENT.md           # Production deployment runbook & cloud architectures
│
├── scripts/
│   └── verify-production.js    # Automated 9-step production readiness simulation
│
├── start-dev.js                # Concurrent local development orchestrator
└── package.json                # Monorepo root scripts (dev, build, seed, test:prod)
```

---

## Verification Endpoints

- **Health Probe**: `GET /api/health` — Confirms server responsiveness, DB connection, and environment.
- **Public Certificate Verification**: `GET /api/public/verify/:token` — Unauthenticated statutory QR code verification for field inspectors and consumers.
