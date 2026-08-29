# Outlabs — Cold Email Scheduling & Distributed Delivery Engine

A full-stack, multi-tenant cold email scheduling and distributed delivery platform built with **Node.js, Express, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, React, Vite, and Elasticsearch**.

Outlabs is designed around reliable scheduled delivery, transactional consistency, sender-aware processing, rate limiting, failure recovery, credential protection, and operational observability.

---

## 1. Architecture

```text
outlabs-fullstack/
│
├── backend/                 # Express REST API, services, workers & integrations
│   ├── prisma/              # Prisma database schema
│   ├── src/
│   │   ├── auth/            # Google OAuth integration
│   │   ├── controllers/     # HTTP controllers
│   │   ├── email/           # SMTP infrastructure
│   │   ├── integrations/    # External integrations
│   │   ├── middleware/      # Authentication, errors, correlation IDs
│   │   ├── queues/          # BullMQ queues
│   │   ├── rate-limit/      # Rate limiting infrastructure
│   │   ├── repositories/    # Database & Redis access
│   │   ├── routes/          # API routes
│   │   ├── search/          # Elasticsearch integration
│   │   ├── services/        # Application services
│   │   ├── utils/           # Crypto, errors, logging
│   │   └── workers/         # Delivery workers & transports
│   └── tests/               # Backend automated tests
│
├── frontend/                # React + Vite frontend application
│   ├── src/
│   │   ├── api/             # Backend API clients
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Application state/context
│   │   ├── pages/           # Application pages
│   │   ├── types/           # Frontend TypeScript types
│   │   └── utils/           # Frontend utilities
│   └── tests/               # Frontend automated tests
│
├── shared/                  # Shared TypeScript types & enums
├── docker-compose.yml       # Local infrastructure services
├── .env.example             # Environment configuration template
├── package.json              # Workspace configuration
├── tsconfig.base.json        # Shared TypeScript configuration
├── vitest.workspace.ts       # Test workspace configuration
└── README.md                 # Project documentation
```

---

## 2. Core Capabilities

### Persistence

- PostgreSQL relational database
- Prisma ORM
- Multi-tenant data model
- Campaign and delivery persistence
- Sender account persistence
- Transactional outbox persistence
- Rate-limit event persistence
- Slack integration persistence

### Transactional Outbox

Outlabs uses a transactional outbox architecture to reliably persist application events before asynchronous processing.

This helps prevent inconsistencies where database state is committed but an associated asynchronous event is lost.

### Distributed Delivery

- BullMQ-based asynchronous processing
- Redis-backed queues
- Delayed/scheduled jobs
- Dedicated delivery worker
- Worker lifecycle management
- SMTP transport abstraction
- Delivery state management
- Failure and recovery handling

### Rate Limiting

- Redis-backed rate limiting
- Sender-aware processing
- Rate-limit event tracking
- Protection against excessive delivery throughput

### Authentication & Security

- Authentication middleware
- Google OAuth 2.0 integration
- JWT-based application authentication
- Environment configuration validation
- AES-256-GCM credential encryption
- Structured error handling
- Helmet security headers
- CORS protection
- Request correlation IDs
- Sensitive-value logging redaction

### Integrations

- Google OAuth
- Slack OAuth
- Slack notifications/integration
- SMTP delivery
- Redis
- PostgreSQL
- Elasticsearch

### Search & Observability

- Elasticsearch client infrastructure
- Email indexing pipeline
- Structured JSON logging using Pino
- Correlation IDs
- Health monitoring
- Database and Redis health probes
- Delivery monitoring
- Failure-injection testing

### Frontend

The React frontend provides application interfaces for:

- Authentication
- Dashboard
- Campaign management
- Campaign composition
- Recipient CSV upload and preview
- Scheduling configuration
- Monitoring
- Sender management
- Slack settings

---

## 3. Project Structure

### Backend

The backend follows a layered architecture:

```text
HTTP Request
     │
     ▼
   Routes
     │
     ▼
Controllers
     │
     ▼
  Services
     │
     ├──────────────► Repositories ─────► PostgreSQL
     │
     ├──────────────► Redis / BullMQ
     │
     └──────────────► External Integrations
```

Asynchronous delivery follows a separate worker path:

```text
Campaign
   │
   ▼
Transactional Outbox
   │
   ▼
BullMQ / Redis
   │
   ▼
Delivery Worker
   │
   ▼
SMTP Transport
   │
   ▼
Recipient
```

---

## 4. Technology Stack

| Layer                 | Technology             |
| --------------------- | ---------------------- |
| Backend               | Node.js + Express      |
| Language              | TypeScript             |
| Database              | PostgreSQL             |
| ORM                   | Prisma                 |
| Queue                 | BullMQ                 |
| Cache / Queue Backend | Redis                  |
| Search                | Elasticsearch          |
| Email                 | SMTP                   |
| Authentication        | JWT + Google OAuth 2.0 |
| Notifications         | Slack                  |
| Frontend              | React + Vite           |
| Testing               | Vitest                 |
| Logging               | Pino                   |
| Containerization      | Docker Compose         |

---

## 5. Prerequisites

- **Node.js:** v24.x recommended
- **npm:** v10.x or later
- **Docker Desktop:** recommended for local PostgreSQL, Redis, and Elasticsearch
- **Git**

The project has been tested with:

```text
Node.js v24.16.0
```

---

## 6. Installation

### Step 1 — Clone the repository

```bash
git clone https://github.com/Garv-Fullstack/outlabs-fullstack.git
cd outlabs-fullstack
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure environment variables

Create a local `.env` file from the provided template.

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the required environment variables, including database, authentication, encryption, Redis, SMTP, and integration credentials as required by the selected functionality.

**Never commit `.env` or real credentials to Git.**

### Step 4 — Start local infrastructure

```bash
docker compose up -d
```

This starts the infrastructure services defined by the project's Docker Compose configuration.

### Step 5 — Generate Prisma Client

```bash
npm run prisma:generate
```

### Step 6 — Apply the database schema/migrations

```bash
npm run prisma:migrate --workspace=backend
```

### Step 7 — Build the project

```bash
npm run build
```

### Step 8 — Run automated tests

```bash
npm run test
```

### Step 9 — Start the backend in development mode

```bash
npm run dev:backend
```

---

## 7. Health Check API

### Endpoint

```http
GET /health
```

The health endpoint reports application and infrastructure status, including:

- Application status
- Database connectivity
- Redis connectivity
- Service latency
- Process uptime
- Memory statistics
- Request correlation ID

### Example response

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

If required infrastructure is unavailable, the application can remain reachable while reporting degraded/unhealthy dependency status.

---

## 8. Testing

The repository contains automated backend and frontend tests covering areas such as:

- Authentication
- Campaign transactions
- Concurrency
- Configuration validation
- Credential encryption
- Delivery state transitions
- Elasticsearch integration
- Error handling
- Failure injection
- Google authentication
- Health checks
- Middleware
- Negative scenarios
- Outbox processing
- API prerequisites
- Rate limiting
- Redis infrastructure
- Scheduling
- Slack integration
- SMTP transport
- Tenant isolation
- Frontend authentication flows
- Campaign features
- CSV parsing
- Settings flows

Run the complete test suite with:

```bash
npm run test
```

---

## 9. Security

Outlabs is designed with security boundaries around credentials and tenant data.

Important security mechanisms include:

- Environment-based secrets
- AES-256-GCM credential encryption
- Secret redaction in logs
- JWT authentication
- Google OAuth integration
- Authentication middleware
- Tenant-isolation testing
- CORS protection
- Helmet security headers
- Request correlation IDs
- Centralized error handling

### Credential Safety

Never commit:

```text
.env
real API tokens
OAuth secrets
SMTP passwords
Slack tokens
database credentials
encryption keys
JWT secrets
```

Use `.env.example` as the public configuration template.

---

## 10. Development Principles

The project emphasizes:

- Clear separation of concerns
- Transactional consistency
- Reliable asynchronous processing
- Failure recovery
- Explicit delivery state transitions
- Tenant isolation
- Secure credential handling
- Observable infrastructure
- Automated testing
- Deterministic error handling

The architecture is intended to support reliable distributed email delivery rather than treating email sending as a simple synchronous HTTP operation.

---

## 11. Current Status

### Implemented

- [x] Monorepo structure
- [x] PostgreSQL + Prisma foundation
- [x] Redis infrastructure
- [x] Express REST API
- [x] Environment validation
- [x] Credential encryption
- [x] Structured logging
- [x] Health monitoring
- [x] Transactional outbox
- [x] BullMQ queues
- [x] Delivery worker
- [x] SMTP transport
- [x] Rate limiting
- [x] Google OAuth
- [x] Slack integration
- [x] Elasticsearch integration
- [x] React frontend
- [x] Campaign management
- [x] CSV recipient parsing
- [x] Scheduling configuration
- [x] Monitoring interface
- [x] Sender management
- [x] Automated backend tests
- [x] Automated frontend tests
- [x] Failure and negative-path testing

---

## 12. Repository

**GitHub:** `Garv-Fullstack/outlabs-fullstack`

The `main` branch contains the current project baseline.

---

## 13. License

This project is currently intended as a personal/educational full-stack engineering project.

License terms can be added here when the project is prepared for public distribution.
