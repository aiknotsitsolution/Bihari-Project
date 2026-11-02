# E-commerce backend – NestJS microservices + PostgreSQL

Rewrite of the Express + MongoDB backend from `aiknotsitsolution/E-commerce-project` as a NestJS monorepo of
microservices (TCP transport) with **PostgreSQL** (TypeORM). The existing React frontend keeps talking to one
HTTP API (the gateway).

```
 React app ──HTTP──▶  gateway :8080 (host) → :8000 (container; JWT check, roles, validation, REST → messages)
                          │ TCP
      ┌───────────────┬───┴────────────┬────────────────┐
 auth-service     catalog-service   order-service   payment-service
   :8001             :8002            :8003            :8004
   auth_db           catalog_db       order_db         payment_db        (one PostgreSQL server, DB per service)
```

| Service | Owns | Old modules covered |
|---|---|---|
| **gateway** | REST API under `/api`, JWT verification, RBAC | routes of all modules |
| **auth-service** | users, addresses, sellers, refresh tokens, admin seed | auth, users, sellers, sellerVerification, adminUser |
| **catalog-service** | categories (3-level tree), brands, products + variants, **inventory**, reviews, wishlist, moderation | products, productModeration, categories, brands, reviews, wishlist |
| **order-service** | cart, coupons, orders (split per seller), status history, reservation-expiry job | cart, orders, adminOrder, coupons, sellerCoupon, adminCoupon |
| **payment-service** | payment orders, refunds, transactions, pluggable gateway provider | payments, transactions, refunds |

## How the services work together

* **Checkout** (`POST /api/orders/checkout`): order-service reads the cart → re-prices every line from catalog-service
  (never trusts stored prices) → applies the coupon → **reserves stock** (row-locked transaction in catalog) → creates one
  order per seller → asks payment-service for a payment link. COD / zero-amount orders are confirmed immediately.
* **Payment result**: payment-service emits `payment.succeeded` / `payment.failed` events; order-service confirms (stock is
  committed) or cancels (stock is released). Status changes are compare-and-set, so duplicate events or a payment racing the
  15-minute expiry job cannot double-process. A payment arriving after expiry is auto-refunded.
* **Cancel**: paid online orders are refunded first, then stock is released (PENDING) or restocked (CONFIRMED).
* Errors thrown in a service (`NotFoundException`, `ConflictException`, …) travel back over TCP and come out of the
  gateway with the same HTTP status.

## Run it

### Docker (recommended)
```bash
cp .env.example .env          # change the secrets
docker compose up --build
# API:  http://localhost:8080/api/health
```
If host port `8080` is already in use, set `GATEWAY_HOST_PORT` in `.env` to a free port.
The gateway still listens on port `8000` inside the container. When running services locally
without Docker, the gateway remains available at `http://localhost:8000`.

### Local
```bash
cp .env.example .env
docker compose up -d postgres          # or any PostgreSQL 14+ with the 4 DBs from docker/postgres/init.sql
npm install
npm run start:all                      # gateway + 4 services in watch mode
```
To use Neon, set `DATABASE_URL` in `.env` to your PostgreSQL connection string; each service's schema is created
automatically inside that database at startup. Without it, services use the local PostgreSQL settings and separate databases from
`docker/postgres/init.sql`. Tables are created automatically (`DB_SYNC=true`). **For production set `DB_SYNC=false`
and add TypeORM migrations; service schemas must then be created by your migration/deployment process.**
The admin user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` is created on first start of auth-service.

## Try it (curl)
```bash
API=http://localhost:8080/api
# admin + seller + customer
ADMIN=$(curl -s $API/auth/signin -H 'content-type: application/json' -d '{"email":"admin@example.com","password":"Admin@12345"}' | jq -r .accessToken)
curl -s $API/sellers -H 'content-type: application/json' -d '{"sellerName":"Acme","email":"seller@acme.com","mobile":"9999999999","password":"Passw0rd!","businessDetails":{"businessName":"Acme","GSTIN":"22AAAAA0000A1Z5","businessAddress":"Mumbai"},"bankDetails":{"accountNumber":"1234567890","accountHolderName":"Acme","IFSC":"HDFC0001234"},"pickupAddress":{"streetAddress":"1 Main","city":"Mumbai","state":"MH","pinCode":"400001"}}'
# admin approves the seller:  PATCH /api/admin/sellers/:id/verification {"action":"APPROVE"}
# admin creates categories: POST /api/categories {"name":"Men","categoryId":"men"} then a child with parentId
# seller creates product: POST /api/products  → admin approves: PATCH /api/admin/products/:id/moderation {"action":"APPROVE"}
#   → seller publishes: PATCH /api/products/:id/publish {"status":"PUBLISHED"}
# customer: signup → POST /api/users/addresses → POST /api/cart/items → POST /api/orders/checkout {"addressId","paymentMethod":"ONLINE"}
# complete the mock payment:
curl -s $API/payments/confirm -H "x-webhook-secret: $PAYMENT_WEBHOOK_SECRET" -H 'content-type: application/json' \
  -d '{"paymentLinkId":"<from checkout response>","success":true}'
```

## API summary (all under `/api`)
`auth/*` · `sellers` (register/login/me) · `users/me`, `users/addresses` · `categories` · `brands` · `products` (+ `mine`,
`:id/publish`, `:id/variants`, `:id/reviews`) · `wishlist` · `cart` (+ `items`, `coupon`) · `orders`
(`checkout`, `seller`, `:id/cancel`, `:id/status`) · `coupons` (+ `manage`) · `payments` (+ `confirm` webhook) ·
`admin/users|sellers|products|orders|refunds|transactions`.

## What is NOT migrated yet
The old backend has 46 modules; this covers the core commerce flow. Still to port (each is a natural new service or an
addition to an existing one): returns, commissions / settlements / payouts / ledger (RazorpayX), invoices (PDF/Excel),
notifications + Socket.IO, AI chatbot (Groq), deals / home sections / referrals, customer & seller segmentation,
reports & dashboards, system settings, cookie consent, Cloudinary uploads, email/OTP login.
Also: Stripe/Razorpay adapters (implement `PaymentProvider` in `apps/payment-service/src/providers.ts`; only a mock exists),
data migration script from MongoDB, rate limiting, automated tests.

## Layout
```
apps/<service>/src      each service: entities, services, controller (message patterns), module, main
libs/common/src         shared: enums, message-pattern names (MSG), DTOs, RPC helpers, DB helpers
```
