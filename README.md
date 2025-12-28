
# Membership Subscription Service

NestJS microservices for authentication, wallets, and memberships. The system exposes an HTTP gateway backed by RabbitMQ RPC to Auth and Core services, Prisma/PostgreSQL for persistence, and Redis caching for public catalog endpoints.

---

## Architecture

```
Gateway (HTTP + Swagger)
  ├─ Auth service (RMQ RPC)
  ├─ Core service (RMQ RPC)
  └─ Shared libs (DTOs, constants, Prisma, i18n, guards)
```

* **Gateway**: HTTP surface, Swagger at `/docs`, caches public catalog responses.
* **Auth**: JWT issuance/verification for consumer/admin roles.
* **Core**: Membership plans, subscriptions, wallet, and top-ups.

---

## Prerequisites

* Node.js 18+
* npm
* PostgreSQL
* RabbitMQ
* Redis (for cache; optional but recommended in local dev)

---

## Environment

Copy `.env.example` to `.env` and set values:

```env
PORT=8080

DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://user:password@host:6379

RABBIT_MQ_URI=amqp://user:password@host:5672
RABBIT_MQ_CORE_QUEUE=core.queue
RABBIT_MQ_AUTH_QUEUE=auth.queue
PING_TIMEOUT_MS=1000

CONSUMER_ACCESS_JWT_SECRET=change-me
ADMIN_ACCESS_JWT_SECRET=change-me
ACCESS_JWT_EXPIRATION=1d
REFRESH_JWT_EXPIRATION=31d
```

---

## Install & Database

```bash
npm install

# Apply migrations
npx prisma migrate deploy

# Seed demo data (plans, payment methods, sample users)
npx prisma db seed
```

---

## Run (Development)

Start backing services (PostgreSQL, RabbitMQ, Redis) first.

```bash
# Auth microservice (RMQ)
npx nest start auth --watch

# Core microservice (RMQ)
npx nest start core --watch

# Gateway HTTP API
npx nest start gateway --watch
```

The gateway listens on `PORT` (default 8080). Swagger is available at `/docs`.

---

## Run (Production)

```bash
npm run build

node dist/apps/auth/main.js
node dist/apps/core/main.js
npm run start:prod   # gateway
```

Share the same `.env` (or environment variables) across all three processes. Place Redis close to the gateway for low-latency caching.

---

## Caching & Pagination

* Redis cache is enabled in the gateway via `REDIS_URL`.
* Cached for 60s per distinct query string.
* Public catalog endpoints now support pagination and caching:
  * `GET /membership/plans?page=1&limit=10`
  * `GET /wallet/payment-methods?page=1&limit=10`
* Responses include `pagination: { page, limit, total, pageCount }`.
* Limits are capped at 50 per request to keep cache entries small.

---

## API Notes

* **Consumer flows:** subscribe, change plan, request wallet top-ups, view own summary/top-ups.
* **Admin flows:** manage plans, payment methods, and approve/reject top-ups.
* **Localization:** `Accept-Language` header supports `en`, `km`, and `zh`; translations live under `i18n/`.
* **Auth:** Consumer/Admin JWT secrets are independent; public catalog endpoints do not require auth.

---

## Useful Commands

```bash
npm run lint          # eslint
npm run format        # prettier
npm run test          # unit tests
npx prisma studio     # browse DB data (after setting DATABASE_URL)
```

---

## Deployment Checklist

- [ ] Provide PostgreSQL, RabbitMQ, and Redis URLs.
- [ ] Run `npm run build` on CI and ship `dist/` artifacts.
- [ ] Share identical `.env` across gateway, auth, and core processes.
- [ ] Expose only the gateway publicly; keep RMQ and DB inside the network.
- [ ] Monitor Redis TTL hit rate on catalog endpoints for cache sizing tweaks.

---

## Support

If something breaks, start by checking message broker connectivity and Prisma migrations. Swagger `/docs` is the quickest way to validate deployed endpoints.
