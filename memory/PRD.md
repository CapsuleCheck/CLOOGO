# Cloogo (formerly ErrandGo) - Product Requirements Document

## Original Problem Statement
Build an errand-running application similar to Uber but for errands. A full-stack web application + React Native mobile app for iOS and Android.

## App URL
- Preview: https://ride-delivery-8.preview.emergentagent.com
- Demo account: mefe1grand@gmail.com / Mummys007s101

## Core Requirements
1. Authentication — email/password signup & login, account deletion
2. Errand Posting & Pricing — pickup/delivery locations, price setting, negotiation
3. Payments — Stripe integration
4. Real-time Chat — between poster and runner
5. Live Status Updates — errand progress tracking
6. Live Location Tracking — runner shares GPS, poster sees on map
7. Image Uploads — item photos
8. Map View — errand locations on dashboard + per-card previews
9. Ratings — post-errand star ratings
10. Mobile App — React Native (Expo) for iOS and Android
11. Push Notifications — web (VAPID) + mobile (Expo)
12. Errand Categories — filter by category

## What's Been Implemented

### Web App (React + FastAPI + MongoDB)
- [x] JWT Authentication (register, login, logout)
- [x] Account deletion (Profile → Danger Zone, requires typing DELETE)
- [x] Errand CRUD (create, read, update, cancel)
- [x] Offer system (submit, accept, reject, counter-propose)
- [x] Price negotiation (counter-offer flow)
- [x] Stripe payments (Checkout)
- [x] Real-time chat (WebSocket + polling fallback)
- [x] Push notifications (VAPID web + Expo mobile)
- [x] Image uploads (item photos on errands)
- [x] Map view on dashboard (list + full map toggle)
- [x] Mini map previews on each errand card
- [x] Live GPS tracking (runner shares location, poster sees live map)
  - Runner: "Share Tracking" button + auto-prompt on page load
  - Poster: "Track Runner" button opens live Leaflet map, polls every 5s
- [x] Ratings system (post-completion star ratings)
- [x] Errand categories + filter chips
- [x] Runner earnings tracker
- [x] PWA support (installable)

### Legal & Support Pages
- [x] Privacy Policy — /privacy-policy
- [x] Terms of Service — /terms
- [x] Support Center — /support (with FAQs)

### App Store Compliance
- [x] Account deletion (Apple requirement)
- [x] Privacy policy URL
- [x] Support URL
- [x] Camera/photo permission strings (specific + example)
- [x] RECORD_AUDIO permission removed
- [x] supportsTablet: true (iPad support)
- [x] Demo account active (mefe1grand@gmail.com)
- [x] Health endpoint (/api/health)
- [x] Keepalive service (30s pings to prevent sleep)

### Mobile App (Expo React Native)
- [x] Full React Native app at /app/mobile
- [x] iOS + Android configs
- [x] Push notifications (Expo)
- [x] EAS build configuration

### Rebranding
- [x] App renamed from ErrandGo → Cloogo everywhere
  - Web frontend, backend, mobile app.json (display name)
  - Expo owner/slug kept as "errandgo" (Expo account requirement)

## Copyright
© 2026 Irhimefe Otuburun. All rights reserved.

## Architecture
```
/app/
├── backend/
│   ├── server.py         # All FastAPI routes
│   ├── auth.py           # JWT utilities
│   ├── models/__init__.py # Pydantic models
│   ├── keepalive.py      # Keep-alive service (30s pings)
│   └── .env              # MONGO_URL, JWT_SECRET, STRIPE_API_KEY, VAPID keys
├── frontend/
│   ├── public/           # index.html, manifest.json, service-worker.js
│   └── src/
│       ├── App.js
│       ├── pages/        # Landing, Auth, Dashboard, ErrandDetail, Profile,
│       │                 # PrivacyPolicy, Terms, Support
│       └── context/      # AuthContext, NotificationContext
└── mobile/               # Expo React Native app
    ├── app.json          # name: Cloogo, owner: errandgo, slug: errandgo
    ├── eas.json
    └── app/              # Screens (auth, tabs, errand detail)
```

## Key API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- DELETE /api/users/me (account deletion)
- GET/POST /api/errands
- POST /api/errands/{id}/offers
- POST /api/errands/{id}/offers/{oid}/accept|reject|counter|accept-counter
- PATCH /api/errands/{id}/runner-location (runner updates GPS)
- GET /api/errands/{id}/runner-location (poster polls GPS)
- GET /api/users/me/earnings
- GET /api/health
- POST /api/push/subscribe, /api/push/subscribe-expo

## Android EAS Builds (Cloogo)
- AAB (Play Store): https://expo.dev/accounts/errandgo/projects/errandgo/builds/1ab776cf-5485-4280-9f66-015115a01ec1
- APK (testing): https://expo.dev/accounts/errandgo/projects/errandgo/builds/ddf81c04-1b40-42e3-a133-519d82a8fc89

## iOS Build
- BLOCKED: Needs Apple Developer Distribution Certificate linked at expo.dev/credentials

## Pending / Backlog
- P0: iOS EAS build (user must link Apple credentials at expo.dev)
- P1: Deploy to permanent URL (user to click Deploy button)
- P2: Admin Dashboard
- P3: Backend router refactoring (/routers directory)
- P3: Email notifications (Resend/SendGrid)
