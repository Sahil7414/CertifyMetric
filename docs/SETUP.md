# Local Machine Setup & Installation Guide

This guide describes how to set up, configure, seed, and run the CertifyMetric Legal Metrology Platform (`SIH26036`) from scratch on a clean developer machine.

---

## 1. Prerequisites

Ensure your development environment meets the following minimum requirements:

* **Node.js**: `v22.5.0` or higher (Required for native `node:sqlite` `DatabaseSync` support without native compilation tools).
  * Check version: `node -v`
* **npm**: `v10.0.0` or higher (Bundled with Node.js).
  * Check version: `npm -v`
* **Git**: `v2.30.0` or higher.
* **Operating System**: Windows 10/11, macOS, or Linux.

---

## 2. Clone the Repository

```bash
git clone <repository-url>
cd SIH26036
```

---

## 3. Install Dependencies

The project is structured into a root coordinator, a React frontend (`client/`), and an Express backend (`server/`). Install dependencies in all three layers:

```bash
# 1. Install root dependencies (concurrent process manager)
npm install

# 2. Install backend dependencies
cd server
npm install
cd ..

# 3. Install frontend dependencies
cd client
npm install
cd ..
```

---

## 4. Initialize Database & Seed Demo Accounts

The SQLite database (`server/metrology.db`) is automatically initialized and migrated on server boot. To explicitly seed or reset the database and generate demo user credentials:

```bash
node server/seed-demo-users.js
```

This command will:
1. Create all 15 core database tables if they do not already exist.
2. Run non-destructive column migrations (e.g. `password_hash`, `is_demo`, verification timestamps).
3. Seed standard legal metrology organizations, instrument categories, MPE rules, and sample test applications.
4. Hash demo passwords using cryptographic `scrypt` and seed the 5 statutory roles:
   * **Trader**: `demo.trader@certifymetric.local` (`DemoTrader@2026`)
   * **Authority**: `demo.authority@certifymetric.local` (`DemoAuthority@2026`)
   * **Verifier**: `demo.verifier@certifymetric.local` (`DemoVerifier@2026`)
   * **GATC**: `demo.gatc@certifymetric.local` (`DemoGatc@2026`)
   * **Platform Admin**: `demo.admin@certifymetric.local` (`DemoAdmin@2026`)
5. Generate the local `DEMO_CREDENTIALS.md` file in your root workspace.

---

## 5. Start Development Servers

You can start both the backend API and frontend client concurrently using the root startup script:

```bash
# Starts backend on :4000 and frontend on :5173
node start-dev.js
```

Or run them individually in separate terminal windows:

### Terminal 1 — Backend API Server
```bash
cd server
npm start
# Server listens at http://localhost:4000
```

### Terminal 2 — Frontend Client (Vite Dev Server)
```bash
cd client
npm run dev
# Frontend runs at http://localhost:5173
```

---

## 6. Access the Application

* **Frontend Web Application**: Open [http://localhost:5173](http://localhost:5173) in any modern web browser.
* **1-Click Demo Login**: On the Sign In screen, click any of the 5 demo role buttons (**Trader**, **Authority**, **Verifier**, **GATC**, or **Admin**) to directly log in as that persona.
* **Public QR Verification Route**: Test unauthenticated public certificate lookup directly at:
  `http://localhost:5173/verify/<certificate-public-token>`
  (e.g. `http://localhost:5173/verify/CERT-2026-NAWI-849201`)

---

## 7. Run Verification & Integrity Tests

To verify that all backend authentication routes, RBAC rules, and API endpoints are working properly:

```bash
# Run server authentication & authorization test
node -e "
async function test() {
  const res = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo.trader@certifymetric.local', password: 'DemoTrader@2026' })
  });
  const data = await res.json();
  console.log('Login Test Status:', res.status, '| Role:', data.user?.role);
}
test();
"
```

---

## 8. Build Production Bundle

To validate the frontend for production packaging:

```bash
cd client
npm run build
```

This compiles optimized HTML, CSS, and JS bundles into `client/dist/`.
