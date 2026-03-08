# ErrandGo Mobile App

Native iOS & Android app built with **Expo SDK 52** (React Native). Connects to the existing ErrandGo backend.

## Features
- Sign up / Sign in
- Browse open errands with category filters
- Post errands (3-step form + camera/gallery photo upload)
- Submit offers, counter-negotiate prices
- Real-time chat with poster/runner
- Pay via Stripe (opens in browser)
- My Errands & My Runs dashboards
- Runner earnings tracker
- Profile with stats and ratings

---

## Prerequisites
- **Node.js** 18+
- **Expo CLI**: `npm install -g expo-cli eas-cli`
- **Expo Go** app installed on your phone (for development)

---

## Quick Start (Development)

```bash
cd /app/mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS) or the **Camera app** (Android).

---

## Environment

The backend URL is set in `.env`:
```
EXPO_PUBLIC_API_URL=https://ride-delivery-8.preview.emergentagent.com
```

Update this URL if you deploy the backend to a different host.

---

## Build for App Stores (Expo EAS)

### 1. Create an Expo account
Sign up at https://expo.dev — free tier available.

### 2. Configure your project
```bash
eas init   # links to your Expo account, generates projectId
```

Update `app.json` → `extra.eas.projectId` with your project ID.

### 3. Build

**Android APK (for sideloading / testing):**
```bash
eas build --platform android --profile preview
```

**Android AAB (for Play Store):**
```bash
eas build --platform android --profile production
```

**iOS IPA (for App Store):**
```bash
eas build --platform ios --profile production
```
> iOS builds require an Apple Developer account ($99/year).

**Both platforms:**
```bash
eas build --platform all --profile production
```

### 4. Submit to stores
```bash
eas submit --platform android   # Play Store
eas submit --platform ios        # App Store
```

---

## Project Structure

```
app/
├── _layout.tsx          # Root stack (auth check)
├── index.tsx            # Redirects to auth or tabs
├── (auth)/
│   └── index.tsx        # Login + Register
├── (tabs)/
│   ├── _layout.tsx      # Bottom tab bar
│   ├── index.tsx        # Dashboard (Discover)
│   ├── post.tsx         # Post Errand
│   ├── my-errands.tsx   # My Errands
│   ├── my-runs.tsx      # My Runs
│   └── profile.tsx      # Profile + Earnings
└── errand/
    └── [id].tsx         # Errand Detail + Chat + Offers

components/
├── ErrandCard.tsx       # Errand list item
├── CategoryChips.tsx    # Horizontal category filter
└── StatusBadge.tsx      # Status pill

context/
└── AuthContext.tsx      # Auth state + JWT storage

constants/
└── theme.ts             # Colors, spacing, typography
```

---

## Push Notifications

Push notifications use **Expo Push Service**.  
In production, set your Expo project ID in `app.json` and the backend will route notifications through Expo's infrastructure.

---

## Tech Stack
- Expo SDK 52 / React Native 0.76
- Expo Router 4 (file-based navigation)
- TypeScript
- Axios for API calls
- AsyncStorage for token persistence
- expo-image-picker for photo uploads
- expo-web-browser for Stripe payment redirect
