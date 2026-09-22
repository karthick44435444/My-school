# Email OTP + Push Notifications — Setup Guide

This project supports **real email** (OTP, credentials, leave/marks alerts) and **push notifications** via environment variables.

Without keys, everything still works in **demo mode** (emails/push logged in the terminal; OTP shown in API response for testing).

---

## 1. Email (OTP & other mails)

### What emails are sent

| Event | Recipient |
|--------|-----------|
| Forgot password OTP | User email |
| (Optional) New account credentials | User / parent email |
| Marks published | Student + parent (in-app + optional email) |
| Leave / absent | Student + parent (in-app + optional email) |

### Step A — Create a Resend account

1. Go to [https://resend.com](https://resend.com) and sign up.
2. Open **API Keys** → **Create API Key** → copy the key (`re_...`).
3. For production: **Domains** → add your domain (e.g. `mail.yourschool.com`) and verify DNS.
4. Until domain is verified, you can only send **to your own signup email** with `EMAIL_FROM=SchoolVajo <onboarding@resend.dev>`.
5. Once your domain is verified on Resend, you can send to any recipient with:
   ```env
   EMAIL_FROM="SchoolVajo <notifications@your-school-domain.com>"
   ```

For local testing before verifying a domain, you can also keep the default:
```env
EMAIL_FROM="SchoolVajo <onboarding@resend.dev>"
RESEND_API_KEY="re_xxxxxxxxxxxxxxxx"
```

### Step C — Restart the app

```bash
cd apps/web
# create .env from example if needed
cp .env.example .env
# edit .env with your keys
npm run dev
```

### Step D — Test OTP

1. Open `/forgot-password`
2. Enter school code + username or email
3. Check inbox for the 6-digit OTP
4. When `EMAIL_ENABLED=true`, OTP is **not** returned in the API body (security)
5. When `EMAIL_ENABLED=false`, check the API JSON for `demoCode` and the terminal log

### Troubleshooting email

| Problem | Fix |
|---------|-----|
| No email received | Confirm `EMAIL_ENABLED=true` and `RESEND_API_KEY` set; restart server |
| Resend 403 | Verify domain or send only to your Resend account email in test mode |
| OTP always fails | OTP expires in 15 minutes; request a new one |

---

## 2. Push notifications (FCM)

### Architecture

1. Browser/App gets an **FCM device token**
2. App calls `POST /api/push` with `{ action: "register", token }`
3. Server stores token in `.data/db.json`
4. On marks / leave / optional events, server calls FCM with that token

### Step A — Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/)
2. **Add project** → enable **Cloud Messaging**
3. **Project settings** → **Cloud Messaging**
   - Copy **Server key** (Cloud Messaging API Legacy) → `FCM_SERVER_KEY`
   - If legacy is disabled: enable “Cloud Messaging API (Legacy)” in Google Cloud Console, or use OneSignal instead
4. **Add app** → **Web** → register app → copy config (`apiKey`, `projectId`, etc.)
5. **Cloud Messaging** → **Web Push certificates** → generate **VAPID key** → `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

### Step B — `.env` for FCM

```env
PUSH_ENABLED="true"
PUSH_PROVIDER="fcm"
FCM_SERVER_KEY="AAAA...."

NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc"
NEXT_PUBLIC_FIREBASE_VAPID_KEY="BKxxxx..."
```

### Step C — Register token from the browser (after login)

In the browser console (or a small client helper):

```js
// After user is logged in
await fetch("/api/push", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "register",
    token: "DEVICE_FCM_TOKEN_HERE",
    platform: "web",
  }),
});
```

To obtain the token you need Firebase JS SDK in the client (web or Expo). Minimal web example:

```html
<!-- load firebase app + messaging, then -->
const messaging = firebase.messaging();
const token = await messaging.getToken({ vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
```

For **Expo / React Native**, use `expo-notifications` + FCM credentials and POST the token to the same `/api/push` endpoint.

### Step D — Test push

While logged in:

```bash
curl -X POST http://localhost:3000/api/push \
  -H "Content-Type: application/json" \
  -H "Cookie: <your session cookie>" \
  -d '{"action":"test"}'
```

Or from the browser after register:

```js
await fetch("/api/push", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "test" }),
});
```

### Alternative: OneSignal

```env
PUSH_ENABLED="true"
PUSH_PROVIDER="onesignal"
ONESIGNAL_APP_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
ONESIGNAL_REST_API_KEY="os_v2_app_...."
NEXT_PUBLIC_ONESIGNAL_APP_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Register OneSignal player IDs the same way via `POST /api/push` `{ action: "register", token: playerId }`.

---

## 3. When push + email fire automatically

| Action | In-app notification | Push (if token) | Email (if EMAIL_ENABLED) |
|--------|---------------------|-----------------|---------------------------|
| Teacher saves marks | Yes | Yes (student + parent) | Optional via notify helper |
| Mark student ABSENT | Yes | Yes | Optional |
| Forgot password | — | — | OTP email |

In-app list: **Student/Parent → Notifications** (above profile in sidebar).

---

## 4. Recommended production checklist

1. `JWT_SECRET` and `NEXTAUTH_SECRET` long random values  
2. `EMAIL_ENABLED=true` + verified Resend domain  
3. `PUSH_ENABLED=true` + FCM or OneSignal  
4. HTTPS only (required for web push)  
5. Do not log OTP or passwords in production  
6. Restart server after every `.env` change  

---

## 5. File reference

| File | Role |
|------|------|
| `apps/web/lib/email.ts` | Send email + templates |
| `apps/web/lib/push.ts` | Tokens + FCM/OneSignal |
| `apps/web/app/api/password/route.ts` | OTP request/reset |
| `apps/web/app/api/push/route.ts` | Register / test push |
| `apps/web/app/api/notifications/route.ts` | In-app notification list |
| `apps/web/.env.example` | All env keys |

---

## 6. Local demo without keys

```env
EMAIL_ENABLED="false"
PUSH_ENABLED="false"
```

- OTP appears in forgot-password API response as `demoCode`
- Email/push printed in the terminal with `[email:demo]` / `[push:demo]`
- In-app notifications still work for marks and leave
