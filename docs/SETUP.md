# Local Setup & Installation Manual

This guide walks through configuring, seeding, and running the **CertifyMetric** Legal Metrology Verification Platform (`SIH26036`) on a local machine.

---

## 1. System Requirements

* **Node.js**: `v20.0.0` or higher
  * Check version: `node -v`
* **npm**: `v10.0.0` or higher
  * Check version: `npm -v`
* **MongoDB**: A running local MongoDB daemon (`mongodb://127.0.0.1:27017/certifymetric`) or a MongoDB Atlas cloud URI.
* **Operating System**: Windows 10/11, macOS, or Linux.

---

## 2. Clone Repository & Install Dependencies

```bash
# Clone repository
git clone https://github.com/Sahil7414/CertifyMetric.git
cd CertifyMetric

# 1. Install root dependencies
npm install

# 2. Install server backend dependencies
npm --prefix server install

# 3. Install client frontend dependencies
npm --prefix client install
```

---

## 3. Environment Setup

Copy the example environment templates:

```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env.local
```

### Key Environment Settings

**`server/.env`**:
* `PORT`: `4000`
* `MONGODB_URI`: `mongodb+srv://...` (or `mongodb://localhost:27017/certifymetric`)
* `SESSION_SECRET`: Random secure string

**`client/.env.local`**:
* `VITE_API_URL`: `http://localhost:4000/api`

---

## 4. Initialize Database & Seed Demo Accounts

Seed statutory reference categories, standard NAWI rule sets, sample applications, and 5 pre-configured demo role accounts:

```bash
node server/scripts/seedDemoUsers.js
```

This seeds the 5 standard demo accounts:
* **Trader**: `demo.trader@certifymetric.local` (`DemoTrader@2026`)
* **Authority**: `demo.authority@certifymetric.local` (`DemoAuthority@2026`)
* **Verifier**: `demo.verifier@certifymetric.local` (`DemoVerifier@2026`)
* **GATC**: `demo.gatc@certifymetric.local` (`DemoGatc@2026`)
* **Admin**: `demo.admin@certifymetric.local` (`DemoAdmin@2026`)

---

## 5. Running Development Servers

Start both Frontend and Backend concurrently with one command:

```bash
node start-dev.js
```

Or start them individually in separate terminals:

```bash
# Terminal 1: Backend API (Port 4000)
cd server
npm start

# Terminal 2: Frontend SPA (Port 5173)
cd client
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)**.

---

## 6. Verification & Health Probes

* **API Health**: `GET http://localhost:4000/api/health`
* **Public QR Verification**: `GET http://localhost:4000/api/public/verify/<token>`
* **Frontend Build Check**: `npm --prefix client run build`
