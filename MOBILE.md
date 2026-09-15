# My School – Expo Mobile App

Complete React Native (Expo) client that talks to the **same Next.js APIs** as the web app.

## Features

| Feature | Status |
|--------|--------|
| Login (school code + username + password) | ✅ |
| JWT Bearer auth (SecureStore) | ✅ |
| Role-aware Home dashboard | ✅ |
| In-app notifications | ✅ |
| Homework list | ✅ |
| Attendance view + teacher check-in | ✅ |
| Profile / settings / sign out | ✅ |
| Push registration + test | ✅ |
| Theme color from school | ✅ |

Roles supported: **ADMIN, PRINCIPAL, TEACHER, STUDENT, PARENT** (same backend rules).

## Prerequisites

1. Node.js 18+
2. Web backend running (`npm run dev:web` → http://localhost:3000)
3. Expo CLI / Expo Go app on phone
4. For **real push**: physical device + Firebase/Expo project configured

## Quick start

```bash
# From monorepo root
cd myschool
npm install

# Terminal 1 – web API
npm run dev:web

# Terminal 2 – mobile
cd apps/mobile
npx expo start
```

Scan the QR code with **Expo Go** (Android) or Camera (iOS).

### API URL for devices

| Environment | Set `EXPO_PUBLIC_API_URL` |
|-------------|--------------------------|
| iOS Simulator | `http://localhost:3000` (default) |
| Android Emulator | `http://10.0.2.2:3000` (default in code) |
| Physical phone | `http://YOUR_LAN_IP:3000` e.g. `http://192.168.1.10:3000` |

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000
```

Or edit `app.json` → `extra.apiUrl`.

Restart Expo after changing env.

## Push notifications

1. Log in on a **physical device**.
2. App requests permission and registers Expo push token via `POST /api/push`.
3. Open **More → Register + Test Push**.
4. Server must have `PUSH_ENABLED=true` and FCM credentials (see `EMAIL-PUSH-SETUP.md`).

Web push (browser) and mobile push share the same `/api/push` + token store.

### Demo without FCM

With `PUSH_ENABLED=false`, the API logs `[push:demo]` and still accepts token registration. In-app notifications continue to work.

## Auth notes (web ↔ mobile)

- Web continues to use **httpOnly cookie** `myschool_token`.
- Mobile uses **Authorization: Bearer &lt;jwt&gt;**.
- Login response includes `token` for mobile; cookie is still set for browsers.
- `getAuthUser()` accepts both cookie and Bearer (additive; web behaviour unchanged).

## Project layout

```
apps/mobile/
├── app/
│   ├── _layout.tsx          # Root + AuthProvider
│   ├── index.tsx            # Auth redirect
│   ├── (auth)/login.tsx
│   └── (app)/
│       ├── _layout.tsx      # Tabs
│       ├── index.tsx        # Home / stats
│       ├── notifications.tsx
│       ├── homework.tsx
│       ├── attendance.tsx
│       └── more.tsx         # Profile + push test
├── components/ui.tsx
├── constants/theme.ts
├── hooks/useAuth.tsx
├── lib/api.ts
├── lib/notifications.ts
├── app.json
└── package.json
```

## Build production APK / IPA

```bash
cd apps/mobile
npx eas-cli build --platform android
# or --platform ios
```

Configure `eas.json` and Expo account as needed. Point `extra.apiUrl` to your production API.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Network request failed | Use LAN IP; ensure phone & PC on same Wi‑Fi; disable firewall block on :3000 |
| Unauthorized after login | Confirm login returns `token`; JWT_SECRET same on server |
| No push token | Physical device only; grant notification permission |
| Empty lists | Seed data from web (register school, create users/classes/HW) |

---

Built to match the My School web design system and APIs end-to-end.
