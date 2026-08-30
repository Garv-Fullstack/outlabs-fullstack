# Outlabs — Cold Email Scheduling, Delivery \u0026 Engagement Tracking Engine

A full-stack, multi-tenant cold email platform with **scheduled delivery**, **transactional consistency**, **real-time open \u0026 click tracking**, **engagement analytics**, and **operational observability**.

Built with **Node.js, Express, TypeScript, PostgreSQL, Prisma, Redis, BullMQ, React, Vite, and Elasticsearch**.

---

## 1. Architecture

```text
outlabs-fullstack/
│
├── backend/                 # Express REST API, services, workers \u0026 integrations
│   ├── prisma/              # Prisma database schema \u0026 migrations
│   ├── src/
│   │   ├── auth/            # Google OAuth integration
│   │   ├── config/          # Environment validation
│   │   ├── controllers/     # HTTP controllers (incl. tracking)
│   │   ├── email/           # SMTP infrastructure
│   │   ├── integrations/    # External integrations (Slack)
│   │   ├── middleware/      # Authentication, errors, correlation IDs
│   │   ├── queues/          # BullMQ queues \u0026 job types
│   │   ├── rate-limit/      # Sender-aware rate limiting
│   │   ├── repositories/    # Database \u0026 Redis access
│   │   ├── routes/          # API routes (incl. public tracking)
│   │   ├── search/          # Elasticsearch integration
│   │   ├── services/        # Application services \u0026 analytics
│   │   ├── tracking/        # Email HTML instrumentation (open pixel, click rewriting)
│   │   ├── utils/           # Crypto, errors, structured logging
│   │   └── workers/         # Delivery workers \u0026 SMTP transports
│   └── tests/               # Backend automated tests (129 tests)
│
├── frontend/                # React + Vite frontend application
│   ├── src/
│   │   ├── api/             # Backend API clients
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # Application state/context
│   │   ├── pages/           # Application pages
│   │   ├── styles/          # CSS styling
│   │   ├── types/           # Frontend TypeScript types
│   │   └── utils/           # Frontend utilities
│   └── tests/               # Frontend automated tests (41 tests)
│
├── shared/                  # Shared TypeScript types \u0026 enums
├── docker-compose.yml       # Local infrastructure services
├── .env.example             # Environment configuration template
├── package.json             # Workspace configuration
├── tsconfig.base.json       # Shared TypeScript configuration
├── vitest.workspace.ts      # Test workspace configuration
└── README.md
```

---

## 2. Key Features

### Email Delivery Engine

- **Campaign creation** with recipient CSV upload, scheduling, and staggered send times
- **Transactional outbox** — atomic PostgreSQL transaction commits campaign, deliveries, and outbox events in a single ACID operation
- **BullMQ-based** asynchronous processing with Redis-backed queues
- **SMTP transport abstraction** — pluggable transport layer (Ethereal for dev, production SMTP configurable)
- **Delivery state machine** — `SCHEDULED → PROCESSING → SENT / FAILED / CANCELLED / RATE_LIMITED_DELAYED`
- **Sender-aware rate limiting** — per-sender hourly limits with Redis tracking and Slack notifications
- **Idempotency** — deterministic SHA-256 delivery keys prevent duplicate sends across retries

### Email Engagement Tracking

Outlabs instruments every outgoing HTML email with engagement tracking before SMTP dispatch:

```text
Campaign Creation
  → EmailDelivery created with unique trackingToken (UUID)
    → HTML Instrumentation (email.instrumenter.ts)
      → 1×1 open tracking pixel injected before </body>
      → Anchor href rewriting for click tracking (http/https only)
        → Public tracking endpoints (no authentication required)
          → GET /api/track/open/:token  →  200 + 1×1 GIF + OPENED event
          → GET /api/track/click/:token?url=  →  302 redirect + CLICKED event
            → EngagementEvent persisted to PostgreSQL
              → Analytics aggregation with deduplication
                → Dashboard live binding (Open Rate, Click Rate)
```

**Open Tracking:**
- Transparent 1×1 GIF pixel injected into HTML email body
- Anti-cache headers (`no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, `Expires: 0`)
- `OPENED` event persisted with delivery, campaign, and user association
- Idempotent injection — duplicate pixels are never added
- Unknown tokens return the GIF silently without creating events

**Click Tracking:**
- Eligible anchor `href` attributes rewritten to route through `/api/track/click/:token?url=<encoded-destination>`
- `CLICKED` event persisted with the validated destination URL
- HTTP 302 redirect to the original destination
- Idempotent rewriting — already-tracked links are never double-wrapped
- Anchor attributes (`target`, `class`, `style`, `rel`) and inner HTML are preserved

**Security — Protocol Whitelist:**
Only `http://` and `https://` destination URLs are permitted. The following are explicitly rejected:

| Scheme | Status |
|--------|--------|
| `javascript:` | ❌ Rejected (400) |
| `data:` | ❌ Rejected (400) |
| `file:` | ❌ Rejected (400) |
| `mailto:` | ❌ Rejected (400) |
| `tel:` | ❌ Rejected (400) |
| Relative/fragment URLs | ❌ Rejected (400) |
| Unknown click token | ❌ Rejected (404) |

### Engagement Analytics

The analytics engine aggregates engagement events per user with proper deduplication:

| Metric | Calculation |
|--------|-------------|
| `sentCount` | Deliveries with status `SENT` |
| `trackedOpens` | Total raw `OPENED` events |
| `uniqueOpenedCount` | Distinct deliveries with ≥1 `OPENED` event |
| `openRate` | `(uniqueOpenedCount / sentCount) × 100` or `null` when `sentCount = 0` |
| `totalClicks` | Total raw `CLICKED` events |
| `uniqueClickedCount` | Distinct deliveries with ≥1 `CLICKED` event |
| `clickRate` | `(uniqueClickedCount / sentCount) × 100` or `null` when `sentCount = 0` |

**Deduplication:** Multiple opens/clicks on the same delivery count as 1 unique.
**Division-by-zero guard:** Rates return `null` (not `0` or `NaN`) when no emails have been sent.
**Tenant isolation:** All statistics are scoped by `userId`.

### Dashboard Integration

The React dashboard renders live engagement metrics from the backend API:

| Scenario | Open Rate Displayed |
|----------|-------------------|
| Sent emails with opens | `25.0%` (computed from real data) |
| Sent emails with zero opens | `0.0%` |
| Zero sent emails | `—` (em-dash) |
| Reply Rate | `—` (intentionally deferred) |

Open Rate is **not hardcoded** — it is dynamically bound to `stats.openRate` returned by `GET /api/emails/stats`.

### Authentication \u0026 Security

- Google OAuth 2.0 with JWT session tokens (httpOnly cookies)
- AES-256-GCM encryption for all stored credentials (SMTP passwords, Slack tokens)
- Helmet security headers, CORS protection
- Request correlation IDs on every response
- Sensitive-value redaction in structured logs
- Tenant-isolated data access on every query
- Zero credentials stored in `localStorage` or `sessionStorage`

### Integrations

- **Google OAuth** — SSO authentication
- **Slack** — OAuth integration with workspace notifications for rate-limit events
- **Elasticsearch** — full-text search indexing with PostgreSQL fallback
- **SMTP** — pluggable email delivery transport

### Observability

- **Health endpoint** (`GET /health`) — database, Redis, memory, uptime
- Structured JSON logging with Pino
- Request correlation IDs
- Delivery monitoring with real-time status
- Rate-limit event tracking and alerting

---

## 3. Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Language | TypeScript (strict) |
| Database | PostgreSQL |
| ORM | Prisma |
| Queue | BullMQ |
| Cache / Queue Backend | Redis (ioredis) |
| Search | Elasticsearch |
| Email | Nodemailer / SMTP |
| Authentication | JWT + Google OAuth 2.0 |
| Notifications | Slack Web API |
| Frontend | React 18 + Vite |
| Testing | Vitest + Testing Library + Supertest |
| Logging | Pino |
| Containerization | Docker Compose |

---

## 4. Data Model

### Core Entities

```text
User ─────┬──── SenderAccount ──── EmailCampaign ──── EmailDelivery
          │                                              │
          │                                              ├── EmailEngagementEvent
          │                                              │     eventType: OPENED | CLICKED
          │                                              │     destinationUrl (for CLICKED)
          │                                              │     trackingToken (on delivery)
          │
          ├──── SlackIntegration
          ├──── RateLimitEvent
          └──── OutboxEvent
```

### EmailDelivery

Each delivery is assigned a unique `trackingToken` (UUID) at creation time. This token is used as the public identifier for open and click tracking endpoints, ensuring that tracking URLs are unguessable but do not require authentication.

### EmailEngagementEvent

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `deliveryId` | UUID | FK → EmailDelivery |
| `campaignId` | UUID | FK → EmailCampaign |
| `userId` | UUID | FK → User |
| `eventType` | Enum | `OPENED` or `CLICKED` |
| `trackedAt` | Timestamptz | When the event occurred |
| `destinationUrl` | Text (nullable) | Click destination (null for opens) |

Indexed on `(deliveryId)`, `(campaignId, eventType)`, and `(userId, trackedAt)`.

---

## 5. Email Delivery Workflow

```text
┌────────────────────────────────┐
│     Campaign Creation          │
│  (POST /api/emails/schedule)   │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│    PostgreSQL Transaction      │
│  • EmailCampaign row           │
│  • N × EmailDelivery rows      │
│    (each with trackingToken)   │
│  • N × OutboxEvent rows        │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│    Outbox Dispatcher           │
│  Polls PENDING → enqueues      │
│  into BullMQ                   │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│    Delivery Worker             │
│  • Idempotency guard           │
│  • HTML instrumentation        │
│    (open pixel + click links)  │
│  • SMTP transport dispatch     │
│  • State transition → SENT     │
└────────────┬───────────────────┘
             │
             ▼
┌────────────────────────────────┐
│    Recipient Opens Email       │
│  → GET /api/track/open/:token  │
│  → 1×1 GIF + OPENED event     │
└────────────────────────────────┘
             │
             ▼
┌────────────────────────────────┐
│    Recipient Clicks Link       │
│  → GET /api/track/click/:token │
│  → 302 redirect + CLICKED     │
└────────────────────────────────┘
             │
             ▼
┌────────────────────────────────┐
│    Analytics Aggregation       │
│  → Open Rate, Click Rate       │
│  → Dashboard live binding      │
└────────────────────────────────┘
```

---

## 6. API Reference

### Health

```http
GET /health
```

Returns application and infrastructure status (database, Redis, memory, uptime).

### Authentication

```http
GET  /api/auth/google          # Redirect to Google OAuth
GET  /api/auth/google/callback  # OAuth callback
GET  /api/auth/me               # Current session
POST /api/auth/logout           # Logout
```

### Campaigns

```http
GET  /api/campaigns                    # Paginated campaigns with stats
POST /api/emails/schedule              # Create campaign with recipients
GET  /api/emails/stats                 # Aggregate delivery + engagement stats
GET  /api/emails/timeline?range=7d     # Time-series delivery data
GET  /api/emails/activities            # Recent activity feed
GET  /api/emails/scheduled             # Scheduled deliveries
GET  /api/emails/sent                  # Sent deliveries
POST /api/emails/:deliveryId/cancel    # Cancel a scheduled delivery
```

### Senders

```http
GET  /api/senders     # List sender accounts
POST /api/senders     # Register sender account
```

### Tracking (Public — No Authentication)

```http
GET /api/track/open/:trackingToken                 # Open tracking pixel
GET /api/track/click/:trackingToken?url=<target>   # Click tracking redirect
```

### Search

```http
GET /api/search?q=<query>   # Full-text search (Elasticsearch with PostgreSQL fallback)
```

### Slack

```http
GET  /api/slack/authorize        # Slack OAuth redirect
GET  /api/slack/callback         # Slack OAuth callback
GET  /api/slack/status           # Connection status
POST /api/slack/disconnect       # Disconnect workspace
POST /api/slack/test             # Send test notification
```

---

## 7. Prerequisites

- **Node.js:** v24.x recommended
- **npm:** v10.x or later
- **Docker Desktop:** recommended for local PostgreSQL, Redis, and Elasticsearch
- **Git**

Tested with:

```text
Node.js v24.16.0
```

---

## 8. Installation

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

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure database, Redis, authentication, encryption, and integration credentials. See `.env.example` for all supported variables.

**Never commit `.env` or real credentials to Git.**

### Step 4 — Start local infrastructure

```bash
docker compose up -d
```

Starts PostgreSQL, Redis, and Elasticsearch containers.

### Step 5 — Generate Prisma Client

```bash
npm run prisma:generate
```

### Step 6 — Apply database migrations

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

### Step 9 — Start in development mode

```bash
npm run dev:backend     # Backend (tsx watch on port 5000)
npm run dev:frontend    # Frontend (Vite dev server on port 5173)
```

---

## 9. Health Check

```http
GET /health
```

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-08-30T10:30:00.000Z",
    "version": "1.0.0",
    "uptimeSeconds": 124,
    "services": {
      "database": { "status": "up", "latencyMs": 4 },
      "redis": { "status": "up", "latencyMs": 2 }
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

Status values: `healthy` (all services up), `degraded` (partial), `unhealthy` (critical services down).

---

## 10. Testing

### Current Verification Results

```text
Backend:   129 tests passed  (24 test files)
Frontend:   41 tests passed  ( 5 test files)
─────────────────────────────────────────
Total:     170 tests passed, 0 failed, 0 skipped
```

**Build verification:** `tsc --noEmit` passes with zero errors on both backend and frontend.

### Test Coverage Areas

**Backend (129 tests):**

| Test File | Coverage |
|-----------|----------|
| `tracking.api.test.ts` | Open tracking (GIF, headers, OPENED persistence), click tracking (302 redirect, CLICKED persistence), unsafe URL rejection, unknown token handling, analytics aggregation, deduplication, tenant isolation, zero-sent null rates |
| `email.instrumenter.test.ts` | Open pixel injection, click link rewriting, protocol whitelist, idempotency, full pipeline integration, edge cases |
| `prerequisites.api.test.ts` | Sender CRUD, campaign listing, stats endpoint, auth guards |
| `campaign.transaction.test.ts` | Validation, idempotency key generation |
| `d007.production-transport.test.ts` | SMTP transport selection, production config |
| `delivery.state-machine.test.ts` | State transitions, idempotency guard |
| `health.test.ts` | Health endpoint, correlation IDs |
| `redis.test.ts` | Redis config, health probes, disconnect |
| `negative.test.ts` | 404 routes, malformed JSON, request ID scrubbing |
| `middleware.test.ts` | Zod validation, error formatting |
| `config.test.ts` | Environment validation |
| `crypto.test.ts` | AES-256-GCM encrypt/decrypt |
| `elasticsearch.test.ts` | Search fallback, index formatting |
| `google.auth.test.ts` | OAuth flow, token verification |
| `slack.integration.test.ts` | OAuth URL, token encryption |
| `outbox*.test.ts` | Outbox dispatch, enum verification |
| `rate-limiter.test.ts` | Rate limiting logic |
| `scheduling.test.ts` | Scheduling mechanics |
| `concurrency.test.ts` | Concurrent operation safety |
| `tenant-isolation.test.ts` | Cross-tenant data isolation |
| `smtp.transport.test.ts` | Transport abstraction |
| `failure-injection.test.ts` | Resilience under failure |

**Frontend (41 tests):**

| Test File | Coverage |
|-----------|----------|
| `dashboard.engagement.test.tsx` | Live openRate binding, `0.0%` for zero opens, `—` for null rates |
| `auth.flow.test.tsx` | Login, logout, session hydration, protected routes, token storage audit |
| `campaign.features.test.tsx` | Composer validation, campaign listing, delivery monitoring, search, dashboard stats |
| `settings.flow.test.tsx` | Sender management, Slack integration, account profile, credential safety |
| `csv.parser.test.ts` | CSV parsing, validation, deduplication |

### Run Tests

```bash
# Full suite
npm run test

# Backend only
npm run test --workspace=backend

# Frontend only
npm run test --workspace=frontend

# Watch mode
npm run test:watch --workspace=backend
```

---

## 11. Security

### Application Security

- AES-256-GCM encryption for all stored credentials
- JWT-based authentication with httpOnly cookies
- Google OAuth 2.0 SSO
- Helmet security headers
- CORS whitelist
- Request correlation IDs
- Centralized error handling with no stack trace leakage
- Sensitive-value redaction in structured logs

### Tracking Endpoint Security

- Public tracking endpoints require no authentication (by design — email clients make the requests)
- Click tracking validates destination URLs against a strict `http://` and `https://` whitelist
- `javascript:`, `data:`, `file:`, `mailto:`, `tel:`, and relative URLs are rejected with HTTP 400
- Unknown tracking tokens return safe responses (200 GIF for opens, 404 for clicks) without creating events

### Credential Safety

Never commit:

```text
.env
API tokens / OAuth secrets
SMTP passwords
Slack tokens
Database credentials
Encryption keys / JWT secrets
```

---

## 12. Current Status

### Implemented

- [x] Monorepo structure (backend, frontend, shared)
- [x] PostgreSQL + Prisma data model \u0026 migrations
- [x] Redis infrastructure
- [x] Express REST API with structured routes
- [x] Environment validation
- [x] AES-256-GCM credential encryption
- [x] Structured JSON logging (Pino)
- [x] Health monitoring (database, Redis, memory)
- [x] Transactional outbox pattern
- [x] BullMQ queues \u0026 scheduled jobs
- [x] Delivery worker with state machine
- [x] SMTP transport abstraction
- [x] Sender-aware rate limiting
- [x] Google OAuth 2.0
- [x] Slack OAuth integration \u0026 notifications
- [x] Elasticsearch full-text search (with PostgreSQL fallback)
- [x] **Email open tracking** — 1×1 transparent GIF pixel with anti-cache headers
- [x] **Email click tracking** — anchor href rewriting with protocol whitelist \u0026 302 redirect
- [x] **HTML email instrumentation** — idempotent open pixel injection \u0026 click link rewriting
- [x] **Engagement event persistence** — `EmailEngagementEvent` model (`OPENED` / `CLICKED`)
- [x] **Analytics aggregation** — deduplication, open rate, click rate, division-by-zero guard
- [x] **Dashboard integration** — live backend binding for Open Rate (not hardcoded)
- [x] React frontend (Dashboard, Campaigns, Composer, Monitoring, Settings)
- [x] Campaign management with CSV recipient upload
- [x] Scheduling configuration
- [x] Delivery monitoring \u0026 cancellation
- [x] Sender account management
- [x] Automated backend tests (129 tests)
- [x] Automated frontend tests (41 tests)
- [x] Failure and negative-path testing
- [x] Tenant isolation testing

### Deferred

- [ ] **Reply tracking** — `REPLIED` event type is not yet implemented. Reply Rate displays `—` on the dashboard. This is an intentional deferral; the schema and analytics engine are designed to support it when added.

---

## 13. Repository

**GitHub:** `Garv-Fullstack/outlabs-fullstack`

The `main` branch contains the current project baseline.

---

## 14. License

This project is currently intended as a personal/educational full-stack engineering project.

License terms can be added here when the project is prepared for public distribution.
