# Frontend canonical booking status endpoint

## Use this only
GET /api/booking-requests/:token/status

## Full local diagnostic URL through Strapi host port
http://127.0.0.1:1338/api/booking-requests/:token/status

## Do not use in new frontend code
GET /api/request/:token/status
GET /api/booking-request-status/:token

## Owner actions
POST /api/booking-requests/:token/owner-confirm
POST /api/booking-requests/:token/owner-decline
POST /api/booking-requests/:token/owner-refund

These require:
X-Owner-Action-Token

## Important
From the host machine, Strapi is exposed on port 1338.
Port 1337 is internal to the container and must not be used from the host.
