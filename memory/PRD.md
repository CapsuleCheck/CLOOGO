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
- `GET /api/notifications` - Get user's notifications
- `PATCH /api/notifications/read-all` - Mark all read
- `PATCH /api/notifications/{id}/read` - Mark one read
- `WS /api/ws/notifications?token={jwt}` - Per-user real-time notification channel
- `POST /api/errands/{id}/rate` - Submit 1-5 star rating
- `GET /api/errands/{id}/my-rating` - Check if current user already rated
- `GET /api/users/{user_id}/rating` - Get user's average rating
- Errand schema: added `pickup_lat`, `pickup_lng` fields for map display, `image_url` for uploaded photos
- `POST /api/upload` - Upload image file (multipart/form-data, up to 8MB, image/* only)
- `GET /api/images/{filename}` - Serve uploaded images (public, no auth required)
- Notification triggers: new_offer, offer_accepted, payment_confirmed, errand_delivered, new_rating

### Frontend Features Added
- **Real-time Notifications**: Bell icon in Navbar with unread badge, Popover dropdown with notification list, mark-all-read, navigation to errand on click. WebSocket with 15s polling fallback.
- **Rating System**: Post-completion star rating form in ErrandDetail (1-5 stars + optional comment). Average rating displayed on Profile page with star visual. Prevents duplicate ratings.
- **Map View**: Dashboard list/map toggle using Leaflet/OpenStreetMap. Markers for errands with coordinates. Optional map pin picker in PostErrand step 2 (click to place pin, stores lat/lng with errand).

### Known Issues
- WebSocket connections (`wss://`) may fail in some environments (Kubernetes ingress config). Polling fallback (every 15s) ensures notifications still arrive.
- `POST /api/auth/login` - JWT login
- `GET /api/auth/me` - Get current user
- `GET /api/errands` - List errands (filter by status, pickup, delivery)
- `POST /api/errands` - Create errand
- `GET /api/errands/{id}` - Get single errand
- `PATCH /api/errands/{id}/status` - Update status
- `DELETE /api/errands/{id}` - Cancel open errand
- `GET /api/errands/{id}/offers` - List offers
- `POST /api/errands/{id}/offers` - Submit offer
- `PATCH /api/offers/{id}/accept` - Accept offer (sets errand to matched)
- `PATCH /api/offers/{id}/reject` - Reject offer
- `GET /api/errands/{id}/messages` - Get chat history
- `POST /api/errands/{id}/messages` - Send message
- `WS /api/ws/{errand_id}?token={jwt}` - WebSocket real-time channel
- `GET /api/my/errands` - My posted errands
- `GET /api/my/runs` - Errands I'm running
- `GET /api/my/stats` - User stats
- `POST /api/payments/checkout` - Create Stripe checkout session
- `GET /api/payments/status/{session_id}` - Poll payment status
- `POST /api/webhook/stripe` - Stripe webhook
- `GET /api/users/profile` - Get profile
- `PATCH /api/users/profile` - Update profile

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

## Next Tasks
1. Add email notifications (Resend/SendGrid) for new offers and status changes
2. Add rating system post-completion
3. Add errand categories for better filtering
4. Consider Stripe Connect for direct runner payouts
