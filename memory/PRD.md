# ErrandGo - Neighborhood Errand App PRD

## Problem Statement
Build an errand app similar to Uber but for running errands. A User on the app who lives in neighborhood 1 would be able to post where they need an item to be delivered at in neighborhood 2. Another User on the app who lives in same neighborhood 1 and is going to the same neighborhood 2 location can offer to pick up the item and take it along. Users on the app would be able to determine and agree on how much they would charge/pay to have the item picked up and delivered.

## User Choices
- Authentication: Email & password (JWT-based)
- Pricing: Poster sets price + runners can negotiate
- Payment: Stripe integration
- Real-time: Chat + live status updates
- Design: Modern & clean (light theme, emerald green)

## Architecture
- **Backend**: FastAPI + MongoDB (Motor) + JWT Auth + WebSockets + Stripe
- **Frontend**: React + Tailwind CSS + Shadcn UI + Sonner toast
- **Database**: MongoDB collections: users, errands, offers, messages, payment_transactions
- **Real-time**: WebSocket at /api/ws/{errand_id}?token={jwt}

## User Personas
1. **Poster**: Resident needing items picked up/delivered, willing to pay
2. **Runner**: Neighbor heading to the same area, earning money on trips they're already making

## Core Requirements (Static)
1. User registration/login with neighborhood
2. Post errands (item, pickup neighborhood, delivery neighborhood, delivery address, price)
3. Browse open errands on dashboard
4. Submit offer to run an errand (with custom price)
5. Poster accepts/rejects offers
6. Chat between poster and accepted runner (WebSocket)
7. Stripe payment from poster to app
8. Errand status tracking: open → matched → in_progress → completed
9. My Errands (by poster) and My Runs (by runner) views

## Implemented Features (Feb 2026)
### Backend
- All original endpoints (auth, errands, offers, messages, payments, profile)
- `GET /api/notifications`, `PATCH /api/notifications/read-all`, `PATCH /api/notifications/{id}/read`
- `WS /api/ws/notifications?token={jwt}` - Per-user real-time notification channel
- `POST /api/errands/{id}/rate`, `GET /api/errands/{id}/my-rating`, `GET /api/users/{user_id}/rating`
- Errand schema: `pickup_lat`, `pickup_lng`, `image_url`
- `POST /api/upload`, `GET /api/images/{filename}` - Image upload and serving
- `POST /api/payments/checkout`, `GET /api/payments/status/{session_id}`, `POST /api/webhook/stripe`
- `POST /api/errands/{id}/messages`, `GET /api/errands/{id}/messages`
- `WS /api/ws/{errand_id}?token={jwt}` - Per-errand real-time chat

### Frontend Features Added
- **Real-time Notifications**: Bell icon in Navbar, polling fallback (15s), WebSocket best-effort
- **Rating System**: Post-completion star rating, average rating on Profile page
- **Map View**: Leaflet/OpenStreetMap in Dashboard + PostErrand map pin picker
- **Stripe Payment**: Pay button on ErrandDetail → Stripe checkout → status polling → success banner
- **Real-time Chat**: Chat panel in ErrandDetail, REST + WebSocket (best-effort) + 5s polling fallback
- **PWA**: manifest.json, service-worker.js (cache-first static, network-first API), icons (192/512px), apple-touch-icon, SW registration in index.js — app installable on iOS/Android/desktop

### Known Issues
- WebSocket connections (`wss://`) may fail in preview environment (Kubernetes ingress 403). Polling fallback handles both notifications (15s) and chat (5s).

### Frontend Pages
- `/` - Landing page with hero, how it works, benefits, CTA
- `/auth` - Login/Register tabs
- `/dashboard` - Browse open errands with search and neighborhood filter
- `/post-errand` - Multi-step wizard (4 steps: item, location, price, review)
- `/errands/:id` - Errand detail with offers, chat, payment, status
- `/my-errands` - Posted errands list
- `/my-runs` - Running errands list with status update
- `/profile` - Profile edit with stats

## Prioritized Backlog

### P0 (Critical - done)
- [x] Auth flow
- [x] Post errand
- [x] Browse/filter errands
- [x] Offer submission and negotiation
- [x] Accept/reject offers
- [x] Stripe payment
- [x] Real-time chat

### P1 (High Priority - next)
- [ ] Push/email notifications for new offers and status changes
- [ ] Offer counter-proposal (runner proposes different price, poster counter-proposes)
- [ ] Rating/review system after errand completion
- [ ] In-app map showing neighborhoods

### P2 (Nice to Have)
- [ ] Runner verification/ratings profile
- [ ] Errand categories (food, pharmacy, grocery, misc)
- [ ] Recurring errands
- [ ] Group errands (multiple items from same area)
- [ ] Admin dashboard

## Next Tasks / Backlog
1. AI-powered item description from uploaded image (user deferred)
2. Stripe Connect for direct runner payouts (complex - needs user's own Stripe account)
3. Admin dashboard
4. Email notifications (Resend/SendGrid) for offer and status changes
5. Errand expiry / auto-cancel after N hours

## Completed (Feb 2026 - Session 3)
- Full Expo React Native mobile app at /app/mobile (iOS + Android)
- 7 screens: Auth, Dashboard, PostErrand, ErrandDetail, MyErrands, MyRuns, Profile
- All features from web app ported: offers, counter-proposal, chat (5s polling), Stripe payment (WebBrowser), earnings, categories
- Push notifications: expo-notifications + backend POST /api/push/expo-token + Expo Push Service
- Backend: added ExpoPushTokenCreate model, expo-token endpoints, send_expo_push() fires alongside VAPID
- PWA conversion (manifest, service worker, icons)
- Stripe payment frontend flow (checkout → success polling)
- Real-time chat (REST + polling fallback)
- Price counter-proposal (poster counters → runner accepts counter)
- Push notifications (VAPID keys, pywebpush, SW push handler, frontend subscribe)
- Errand categories (chips in PostErrand, filter chips in Dashboard)
- Runner earnings tracker (Profile page with total earned + pending payout)
- Backend refactoring (models/__init__.py, auth.py - extracted from server.py)
