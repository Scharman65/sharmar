# Sharmar Marketplace — Architecture

## Infrastructure

- Server: Hetzner (Ubuntu)
- Backend: Strapi (Docker, green container)
- Database: PostgreSQL
- Frontend: Next.js (Vercel)
- Payments: Stripe (manual capture)

## Backend

- Container: sharmar_strapi_green
- Port: 127.0.0.1:1338
- API: /api/*

## Database

- Postgres container: sharmar_pg
- Core tables:
  - booking_requests
  - payments
  - bookings

## Payment Flow

1. Create booking_request
2. Create Stripe PaymentIntent (manual capture)
3. Authorize payment
4. Owner approves
5. Capture executed inline
6. Booking created

## Key Guarantees

- No double capture
- No race conditions
- Idempotent operations
- Single active payment per request
- DB constraints enforce consistency

## Frontend

- Next.js (App Router)
- Owner actions via API proxy
- Payment page via Stripe Elements

## Deployment

- Frontend: Vercel
- Backend: Docker (manual deploy)
- Reverse proxy: Nginx (api.sharmar.me)

