# ReachInbox Cold Email Scheduling & Distributed Delivery Engine

A robust, enterprise-grade multi-tenant cold email scheduling and delivery platform designed for high-throughput batch execution, sender-specific rate limiting, crash-resilient delayed scheduling via BullMQ and Redis, and real-time observability.

---

## 1. Monorepo Architecture

```
reachinbox-monorepo/
├── backend/            # Express.js REST API & BullMQ Worker Daemon (TypeScript)
├── frontend/           # React 18 + Vite SPA UI (TypeScript + Tailwind CSS - Milestone 4)
├── shared/             # Shared DTOs, Enums, and TypeScript interfaces
├── docker-compose.yml  # Local development stack (PostgreSQL, Redis, Elasticsearch)
├── .env.example        # Environment configuration template
└── README.md           # Documentation
```

---

## 2. Milestone 1 Implemented Foundations

* **Persistence Layer**: PostgreSQL 15+ relational schema managed via Prisma ORM (`users`, `sender_accounts`, `email_campaigns`, `email_deliveries`, `outbox_events`, `slack_integrations`, `rate_limit_events`).
* **Transactional Outbox Foundation**: Durable `outbox_events` table for resilient event publishing without distributed transaction failure risks.
* **Redis Client Infrastructure**: `ioredis` connection lifecycle management, healthcheck probes, and BullMQ-compliant options (`maxRetriesPerRequest: null`).
* **Express Skeleton**: Clean layered architecture with Helmet security headers, CORS origin protection, 10MB payload size limits, request correlation IDs, and centralized error handling.
* **Configuration Validation**: Fail-fast environment variable validation using Zod with secret masking for diagnostic logs.
* **Credential Protection**: AES-256-GCM encryption/decryption utilities for sensitive tokens and passwords at rest.
* **Observability**: Structured JSON logger (Pino) with automated secret redaction for sensitive fields.
* **Truthful Health Endpoint**: `GET /health` with parallel database and Redis connection probing and memory statistics.

---

## 3. Future Milestones (Planned)

* **Milestone 2**: BullMQ Delayed Queue, Dedicated Worker Process, Redis Lua Rate Limiter, and Ethereal SMTP Connection Pool.
* **Milestone 3**: Google OAuth 2.0, Slack OAuth 2.0 Integration & Rate-Limit Alerts, and Elasticsearch 8.x Ingestion Pipeline.
* **Milestone 4**: React 18 Dashboard, CSV Recipient Parser, Campaign Composer, Scheduled/Sent Tables, and Bull Board UI.
* **Milestone 5**: 1,000+ Recipient End-to-End Stress Test, Chaos Recovery Verification, and Demo Video.

---

## 4. Prerequisites

* **Node.js**: `v20.x` or `v22.x` or `v24.x` (Tested on `v24.16.0`)
* **npm**: `v10.x` or `v11.x`
* **Docker & Docker Compose** (Optional for containerized PostgreSQL, Redis, Elasticsearch)

---

## 5. Getting Started & Installation

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL`, `JWT_SECRET`, and `ENCRYPTION_KEY` are configured.

### Step 3: Run Infrastructure (Docker)
```bash
docker compose up -d
```

### Step 4: Generate Prisma Client & Migrate Database
```bash
npm run prisma:generate
# To apply migrations against active PostgreSQL instance:
npm run prisma:migrate --workspace=backend
```

### Step 5: Build Packages
```bash
npm run build
```

### Step 6: Run Automated Tests
```bash
npm run test
```

### Step 7: Start Development Server
```bash
npm run dev:backend
```

---

## 6. Health Check API

`GET /health`

**Sample Response (200 OK / 503 Degraded):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-08-29T10:15:00.000Z",
    "version": "1.0.0",
    "uptimeSeconds": 124,
    "services": {
      "database": {
        "status": "up",
        "latencyMs": 4
      },
      "redis": {
        "status": "up",
        "latencyMs": 2
      }
    },
    "memory": {
      "rssMb": 42.5,
      "heapUsedMb": 18.2,
      "heapTotalMb": 24.1
    }
  },
  "requestId": "6a9e14a2-5813-4318-97a6-38448ec8c812"
}
```

---

## 7. Known Environment Limitations

* When running in an environment without an active Docker daemon or running PostgreSQL/Redis instances, the `/health` endpoint truthy status reports `services.database.status: "down"` and `services.redis.status: "down"` and returns `status: "unhealthy"` with HTTP 503 while the Express application remains fully operational.
