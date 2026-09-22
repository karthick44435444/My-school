# SchoolVajo – Complete School Management System

Modern multi-tenant SaaS School Management Platform with **Web (Next.js)** + **Mobile (Expo)** apps, shared APIs, push notifications, and email OTP.

## What’s included

### Web (`apps/web`)
- Marketing + school registration
- Auth (login, forgot password OTP)
- Role dashboards: Admin, Principal, Teacher, Student, Parent
- Classes, teachers, students, attendance, homework, exams, announcements
- In-app notifications + FCM / OneSignal push
- File-based demo store (Prisma schema ready for production Postgres)

### Mobile (`apps/mobile`) – full Expo app
- Login with same credentials
- Home dashboard, notifications, homework, attendance, profile
- Push token registration + test against `/api/push`
- JWT Bearer auth (works with the same backend)

## Tech stack

| Layer | Stack |
|-------|--------|
| Web | Next.js 14 App Router, TypeScript, Tailwind, Framer Motion |
| Mobile | Expo 51, Expo Router, React Native |
| Data | File JSON store (demo) + Prisma schema (Postgres ready) |
| Auth | JWT (cookie web + Bearer mobile) |
| Push | FCM HTTP v1 / OneSignal + Expo Notifications |
| Email | Resend (OTP, credentials) |

## Monorepo layout

```
myschool/
├── apps/
│   ├── web/                 # Next.js
│   └── mobile/              # Expo
├── packages/
│   ├── database/            # Prisma schema
│   ├── shared/              # Types, plans, quotes, auth utils
│   └── ui/
├── EMAIL-PUSH-SETUP.md
├── MOBILE.md
└── README.md
```

## Getting started

### 1. Install

```bash
cd myschool
npm install
```

### 2. Environment (web)

```bash
cp apps/web/.env.example apps/web/.env
# Edit JWT_SECRET, optional EMAIL_*, PUSH_*
```

For local demo without real email/push:

```env
EMAIL_ENABLED="false"
PUSH_ENABLED="false"
JWT_SECRET="dev-secret-change-me-in-production-32c"
```

### 3. Run web

```bash
npm run dev:web
# → http://localhost:3000
```

### 4. Run mobile

```bash
cd apps/mobile
npx expo start
```

See **[MOBILE.md](./MOBILE.md)** for device API URL, push testing, and builds.

### 5. Database (optional Prisma)

```bash
# When ready to use Postgres instead of file store:
# set DATABASE_URL in env, then:
npm run db:generate
npm run db:push
```

(Current runtime uses `apps/web/.data/db.json` for zero-setup demo.)

## Roles

| Role | Access |
|------|--------|
| **Admin** | Full school control |
| **Principal** | Almost full control |
| **Teacher** | Attendance, marks, homework, announcements |
| **Student** | View own data |
| **Parent** | View linked children |

## Push & email

Full setup: **[EMAIL-PUSH-SETUP.md](./EMAIL-PUSH-SETUP.md)**

Quick test (logged in web):

```bash
curl -X POST http://localhost:3000/api/push \
  -H "Content-Type: application/json" \
  -H "Cookie: myschool_token=..." \
  -d '{"action":"test"}'
```

Mobile: **More → Register + Test Push**.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Next.js dev server |
| `npm run dev:mobile` | Expo start |
| `npm run build:web` | Production web build |
| `npm run db:generate` | Prisma generate |
| `npm run db:push` | Prisma db push |

## Notes

- Web UI and APIs were **not stripped**; only additive auth support for mobile Bearer tokens was added so the same APIs work from Expo.
- Replace Firebase keys / Resend key for production.
- Never commit real service-account JSON to public repos.

---

Built with ❤️ for modern schools.
