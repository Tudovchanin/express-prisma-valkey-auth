# Production-Ready Auth REST API (Node.js + TypeScript)

A robust, enterprise-grade backend REST API for a user authentication system. Built with code quality, security, and scalability in mind using modern backend tooling.

## 🚀 Tech Stack

*   **Runtime:** Node.js (v24 Alpine)
*   **Language:** TypeScript (Strict type-checking)
*   **Framework:** Express.js
*   **Database ORM:** Prisma ORM with MySQL
*   **Caching & Session Store:** Valkey (High-performance Redis drop-in replacement)
*   **Data Validation:** Zod
*   **Containerization:** Docker & Docker Compose

## ✨ Key Features

*   **Secure Authentication:** JWT-based Access and Refresh token mechanics.
*   **Advanced Valkey Integration:** 
    *   Session tracking and instant token blacklisting on password changes.
    *   IP-based global rate limiting (100 requests/min).
    *   Brute-force protection: Blocks login attempts for 15 minutes after 5 consecutive failures.
*   **Strict Validation:** Runtime request body sanitation via Zod schemas.
*   **Centralized Error Handling:** Uniform and secure API error response formats.
*   **DevOps Ready:** Multi-stage Docker setup with automated Prisma migrations.

## 📂 Project Architecture

The project follows a clean, modular layer-based architecture separating routing, business logic, data access, and infrastructure:

```text
src/
├── config/          # Database, Valkey, and environment variable configs
├── controllers/     # HTTP layer handling requests and formatting responses
├── middleware/      # Authentication, rate limiting, and error handling filters
├── routes/          # Express API route declarations
├── services/        # Core business logic (auth, tokens, caching)
├── utils/           # Shared helpers (crypto, jwt, logger)
└── validators/      # Zod schema definitions
```

## 🛠️ Getting Started

### Prerequisites

*   Docker and Docker Compose installed.
*   Alternatively: Node.js v24+, MySQL server, and Valkey/Redis instance installed locally.

### Installation & Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Tudovchanin/express-prisma-valkey-auth.git
   cd express-prisma-valkey-auth
   ```

2. Create a `.env` file based on the example configuration:
   ```bash
   cp .env.example .env
   ```

### Running with Docker (Recommended)

The entire infrastructure (App, MySQL, Valkey) spins up automatically with a single command. Database migrations will execute dynamically on startup.

```bash
docker-compose up --build
```

The API server will be available at `http://localhost:3000`.

### Running Locally for Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Spin up your local database and cache services, then apply Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```

3. Start the development server (with hot-reloading):
   ```bash
   npm run dev
   ```

## 🧪 API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Register a new user account | No |
| **POST** | `/api/auth/login` | Authenticate user and issue tokens | No |
| **POST** | `/api/auth/refresh` | Renew an expired Access Token using Refresh Token | No |
| **POST** | `/api/auth/logout` | Invalidate active user tokens and session | No |
| **GET** | `/api/auth/me` | Retrieve profile data of the current user | Yes (Bearer Token) |
| **POST** | `/api/auth/change-password` | Update account password and revoke all active sessions | Yes (Bearer Token) |
