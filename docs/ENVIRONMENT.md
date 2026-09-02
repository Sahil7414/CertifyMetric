# Environment Configuration

This document outlines the environment variables and configuration settings required to run the CertifyMetric platform (SIH 26036).

> [!IMPORTANT]
> Never commit actual passwords, API keys, private tokens, or sensitive production secrets to version control. Use `.env` files for local overrides (which must remain in `.gitignore`).

---

## 1. Backend Server Environment Variables (`server/`)

The backend server is an Express.js application running on Node.js. It reads configuration from process environment variables or falls back to standard local development defaults.

| Variable Name | Purpose | Required / Optional | Default Value (Dev) | Example Format |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Network port on which the Express REST API listens | Optional | `4000` | `PORT=4000` |
| `NODE_ENV` | Runtime environment mode (`development`, `test`, `production`) | Optional | `development` | `NODE_ENV=development` |
| `DB_PATH` | Absolute or relative file path to the SQLite database file | Optional | `./metrology.db` | `DB_PATH=./metrology.db` |
| `UPLOAD_DIR` | Directory path for storing uploaded physical verification evidence | Optional | `./uploads` | `UPLOAD_DIR=./uploads` |
| `CORS_ORIGIN` | Allowed CORS origin for browser client requests | Optional | `*` (or `http://localhost:5173`) | `CORS_ORIGIN=http://localhost:5173` |
| `SESSION_SECRET` | Secret key used to sign session tokens (production transition) | Optional (Dev) | Internal crypto random generator | `SESSION_SECRET=<random-64-char-hex-string>` |

---

## 2. Frontend Client Environment Variables (`client/`)

The frontend is a Vite + React SPA. Any environment variables exposed to Vite must be prefixed with `VITE_`.

| Variable Name | Purpose | Required / Optional | Default Value (Dev) | Example Format |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_API_BASE` | Base URL of the backend REST API endpoints | Optional | `http://localhost:4000/api` | `VITE_API_BASE=http://localhost:4000/api` |
| `VITE_APP_NAME` | Public application branding name | Optional | `CertifyMetric` | `VITE_APP_NAME=CertifyMetric` |

---

## 3. Local Development Configuration Template

Create a `.env` file in `server/` (optional):
```env
PORT=4000
NODE_ENV=development
DB_PATH=./metrology.db
UPLOAD_DIR=./uploads
```

Create a `.env` file in `client/` (optional):
```env
VITE_API_BASE=http://localhost:4000/api
```
