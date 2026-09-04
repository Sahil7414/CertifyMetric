# CertifyMetric — Production Deployment Runbook

Comprehensive deployment guide for **CertifyMetric** (Online Verification System for Weighing and Measuring Instruments — SIH 26036).

---

## 1. System Architecture

```
                                    +-----------------------------------------+
                                    |         Client Browser / Mobile          |
                                    +--------------------+--------------------+
                                                         |
                                 HTTPS (TLS)             |   Direct QR Verification
                                 Vite SPA Assets         |   GET /api/public/verify/:token
                                                         v
                                    +-----------------------------------------+
                                    |               Reverse Proxy             |
                                    |         (Nginx / Cloudflare / Caddy)    |
                                    +---------+---------------------+---------+
                                              |                     |
                             / (Static files) |                     | /api/* & /uploads/*
                                              v                     v
                                    +-------------------+ +-------------------+
                                    | Static Frontend   | | Node.js Express   |
                                    | (Vite dist build) | | Backend (Port 4000|
                                    +-------------------+ +---------+---------+
                                                                    |
                                              +---------------------+---------------------+
                                              |                                           |
                                              v                                           v
                                    +-------------------+                       +-------------------+
                                    | Persistent SQLite |                       | Persistent Volume |
                                    | WAL Mode (or PG)  |                       | Multi-part Uploads|
                                    | metrology.db      |                       | /uploads/evidence |
                                    +-------------------+                       +-------------------+
```

---

## 2. Environment Variables Specification

### Server Environment (`server/.env`)

| Variable | Required | Default | Production Value / Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | `development` | Set to `production` for live deployments. Enforces strict security and disables dev auth bypasses. |
| `PORT` | No | `4000` | Port on which the Express backend listens (assigned by cloud host, e.g., Render/Railway/Heroku). |
| `HOST` | No | `0.0.0.0` | Network interface to bind (`0.0.0.0` for containers/cloud, `127.0.0.1` for local proxies). |
| `DATABASE_PATH` | No | `./metrology.db` | Absolute or relative path to the persistent SQLite database file on a mounted volume. |
| `STORAGE_DIR` | No | `./uploads` | Absolute or relative path to persistent file storage for evidence images and seals. |
| `FRONTEND_URL` | **Yes** | `http://localhost:5173` | Comma-separated list of allowed frontend origins for CORS (e.g. `https://certifymetric.gov.in,https://app.certifymetric.in`). |
| `SESSION_SECRET` | **Yes** | `CHANGE_ME_...` | High-entropy random key for cryptographic session tokens. |
| `ALLOW_DEV_AUTH_BYPASS`| No | `false` | Must be `false` or unset in production. If `true` and not in production, allows `x-user-id` header bypass. |
| `SEED_DEMO_USERS` | No | `false` | Set to `true` on initial deployment if demo accounts are needed for staging review. |

### Client Environment (`client/.env.production`)

| Variable | Required | Default | Production Value / Description |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | No | `/api` | Base URL of the backend API. When frontend is served from the same domain or behind reverse proxy, leave empty or `/api`. If decoupled, specify `https://api.yourdomain.com/api`. |

---

## 3. Database Persistence & Pragma Configuration

CertifyMetric ships with an embedded SQLite database engine configured with production-grade reliability PRAGMAs:

- **Write-Ahead Logging (`journal_mode = WAL`)**: Enables non-blocking concurrent readers while writes occur.
- **Busy Timeout (`busy_timeout = 10000`)**: Prevents `SQLITE_BUSY` lock errors by queuing transactions up to 10 seconds.
- **Synchronous Mode (`synchronous = NORMAL`)**: Guarantees durability across crashes while maximizing disk I/O throughput.
- **Foreign Key Constraints (`foreign_keys = ON`)**: Enforces relational data integrity.

### PostgreSQL Migration Path
For multi-node autoscaling clusters requiring an external managed database (e.g., AWS RDS, Supabase, Neon):
1. Execute the production schema migration script:
   ```bash
   psql -h <POSTGRES_HOST> -U <USER> -d certifymetric -f server/migrations/postgresql-schema.sql
   ```
2. The schema mirrors the SQLite schema identically with `TIMESTAMPTZ`, `JSONB`, and indexed foreign keys.

---

## 4. Deployment Scenarios

### Option A: Decoupled Cloud Deployment (Vite on Vercel/Netlify + Backend on Render/Railway/Fly.io)

#### Step 1: Deploy Backend (Render / Railway / Fly.io)
1. Push repository to GitHub/GitLab.
2. Create a new Web Service pointing to root or `server/`.
3. Set build command: `npm install`
4. Set start command: `node server.js`
5. Attach a **Persistent Disk Volume** (e.g., 5GB mounted at `/var/data`).
6. Configure environment variables in dashboard:
   - `NODE_ENV=production`
   - `DATABASE_PATH=/var/data/metrology.db`
   - `STORAGE_DIR=/var/data/uploads`
   - `FRONTEND_URL=https://certifymetric.vercel.app`
   - `SESSION_SECRET=<generate-via-crypto-random-hex>`
7. Initialize seed data if required:
   ```bash
   node seed-demo-users.js --prod
   ```

#### Step 2: Deploy Frontend (Vercel / Netlify / Cloudflare Pages)
1. Create a new Project pointing to `client/`.
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Configure environment variables:
   - `VITE_API_URL=https://certifymetric-api.onrender.com/api`

---

### Option B: Single-Container Docker Deployment

CertifyMetric can run as an all-in-one container using Docker:

#### `Dockerfile`
```dockerfile
# Step 1: Build Frontend
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Step 2: Production Server
FROM node:22-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

COPY server/ ./server/
COPY --from=client-builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/data/metrology.db
ENV STORAGE_DIR=/data/uploads

VOLUME ["/data"]
EXPOSE 4000

CMD ["node", "server/server.js"]
```

#### `docker-compose.yml`
```yaml
version: '3.8'

services:
  certifymetric:
    build:
      context: .
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - PORT=4000
      - HOST=0.0.0.0
      - DATABASE_PATH=/data/metrology.db
      - STORAGE_DIR=/data/uploads
      - FRONTEND_URL=https://certifymetric.gov.in
      - SESSION_SECRET=c2e8a1b072d6f5194837dc9a1e0fb234918e7c6
    volumes:
      - certifymetric-data:/data

volumes:
  certifymetric-data:
```

---

## 5. Security & Hardening Checklist

- [x] **Strict Server-Side RBAC**: Authorization decisions are computed exclusively from database records via valid bearer tokens.
- [x] **Dev Header Bypass Disabled**: `x-user-id` impersonation is disabled in `NODE_ENV=production`.
- [x] **CORS Origin Whitelisting**: Strict origin matching via `FRONTEND_URL`.
- [x] **Public QR Verification Protection**: `GET /api/public/verify/:token` permits zero-auth statutory certificate authentication without exposing internal user/credential data.
- [x] **File Upload Restrictions**: Multer validates file types (JPEG, PNG, WEBP, PDF), enforces a 10MB limit, sanitizes file extensions, and guards against path traversal (`..`).
- [x] **Password Hashing**: Passwords stored as salted, computationally hardened `scrypt` hashes.

---

## 6. Verification & Health Monitoring

### Health Probe
```bash
curl -i https://your-server-domain.com/api/health
```
**Expected Output:**
```json
{
  "status": "ok",
  "timestamp": "2026-09-04T11:45:00.000Z",
  "database": "connected",
  "environment": "production"
}
```

### Run Local Production Verification Simulation
To verify production readiness locally before deploying to remote cloud servers:
```bash
npm run test:prod
```
This runs an automated end-to-end simulation covering:
1. Production server startup & health probe
2. Dev bypass denial (HTTP 403)
3. Cryptographic authentication & session issuance
4. Role-based access control (RBAC) enforcement
5. Complete statutory verification lifecycle (Instrument -> Application -> Assignment -> Field Verification -> Evidence Upload -> Determination)
6. Statutory Certificate generation & Public QR Verification
7. Structured 404 responses
8. Graceful shutdown on SIGTERM
