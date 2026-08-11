# Production-Ready Express + Prisma + Valkey Auth API

## 🚀 Tech Stack & Architecture
*   **Runtime & Framework:** Node.js (v24 Alpine) + Express.js + TypeScript (Strict NodeNext)
*   **Database & Cache:** MySQL 8.0 + Prisma ORM (Isolated client) + Valkey 7.2 (Session store)
*   **Security:** Zod request validation + 15-min brute-force lock after 5 failures
*   **DevOps:** Multi-stage Docker running under non-root `node` user with DB healthchecks

## 🛠️ Getting Started

### Setup
```bash
git clone https://github.com/Tudovchanin/express-prisma-valkey-auth.git
cd express-prisma-valkey-auth
cp .env.example .env
```

### 🟢 Local Development Mode
Enables hot-reloading, auto-generates Prisma types, and exposes ports `3306`/`6379` for GUI tools.
```bash
cp docker-compose.override.example.yml docker-compose.override.yml
sudo docker compose up --build
````

### 🔴 Production Mode
Compiles TS into clean JS inside `/dist`, excludes tests, drops devDependencies, and locks DB ports.
```bash
sudo docker compose -f docker-compose.yml up --build -d
```

### 🧪 Running Tests
Runs local unit tests via Jest in full isolation without requiring active Docker containers:
```bash
npm ci && npm run test
```

## 📋 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Register a new user account (Default CLIENT role) | No |
| **POST** | `/api/auth/login` | Authenticate user & issue HttpOnly Refresh token | No |
| **POST** | `/api/auth/refresh` | Renew Access JWT using active Refresh cookie | No |
| **POST** | `/api/auth/logout` | Invalidate current session and clear tokens | No |
| **GET** | `/api/auth/me` | Retrieve profile metadata of the current user | Yes (Bearer JWT) |
| **POST** | `/api/auth/change-password`| Update account password & revoke all active sessions | Yes (Bearer JWT) |
