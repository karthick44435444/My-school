/**
 * Push notifications via Firebase Cloud Messaging HTTP v1 (service account)
 * or OneSignal / legacy FCM server key.
 *
 * Env:
 *   PUSH_ENABLED=true
 *   PUSH_PROVIDER=fcm|onesignal
 *   FIREBASE_PROJECT_ID=...
 *   FIREBASE_SERVICE_ACCOUNT_JSON='{...}'   // full service account JSON string
 *   // or FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
 *   FCM_SERVER_KEY=...                     // legacy fallback
 *   ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function readDB(): any {
  if (!fs.existsSync(DB_FILE)) return { pushTokens: [] };
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return { pushTokens: [] };
  }
}

function writeDB(data: any) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  let full: any = {};
  if (fs.existsSync(DB_FILE)) {
    try {
      full = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch {
      full = {};
    }
  }
  full.pushTokens = data.pushTokens || full.pushTokens || [];
  fs.writeFileSync(DB_FILE, JSON.stringify(full, null, 2));
}

export function isPushEnabled() {
  if (process.env.PUSH_ENABLED === "false") return false;
  if (process.env.PUSH_ENABLED === "true") return true;
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      fs.existsSync(path.join(process.cwd(), "firebase-service-account.json"))
  );
}

export function savePushToken(userId: string, token: string, platform?: string) {
  if (!token || !userId) return { success: false };
  const db = readDB();
  if (!db.pushTokens) db.pushTokens = [];
  // Ensure token is assigned ONLY to the active user (remove from any previous session on same device/browser)
  db.pushTokens = db.pushTokens.filter((t: any) => t.token !== token);
  db.pushTokens.push({
    userId,
    token,
    platform: platform || "web",
    updatedAt: new Date().toISOString(),
  });
  writeDB(db);
  return { success: true };
}

export function removePushToken(userId: string, token?: string) {
  const db = readDB();
  if (!db.pushTokens) db.pushTokens = [];
  db.pushTokens = db.pushTokens.filter(
    (t: any) => t.userId !== userId || (token ? t.token !== token : false)
  );
  writeDB(db);
  return { success: true };
}

export function getTokensForUser(userId: string): string[] {
  const db = readDB();
  const list = (db.pushTokens || [])
    .filter((t: any) => t.userId === userId)
    .map((t: any) => t.token);
  return Array.from(new Set(list.filter(Boolean)));
}

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function loadServiceAccount(): any | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.error("[push] invalid FIREBASE_SERVICE_ACCOUNT_JSON", e);
    }
  }
  const p =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(process.cwd(), "firebase-service-account.json");
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (e) {
      console.error("[push] failed reading service account file", e);
    }
  }
  return null;
}

let cachedAccessToken: { token: string; exp: number } | null = null;

async function getFcmAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.exp > now + 60) {
    return cachedAccessToken.token;
  }
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const sig = signer
    .sign(sa.private_key)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const jwt = `${unsigned}.${sig}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent(
      "urn:ietf:params:oauth:grant-type:jwt-bearer"
    )}&assertion=${jwt}`,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    console.error("[push] OAuth token error", data);
    throw new Error(data.error_description || data.error || "FCM OAuth failed");
  }
  cachedAccessToken = {
    token: data.access_token,
    exp: now + (data.expires_in || 3600),
  };
  return data.access_token;
}

async function sendFcmV1(
  token: string,
  payload: { title: string; body: string; data?: Record<string, string> },
  sa: any
) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || sa.project_id || "my-school-1980d";
  const accessToken = await getFcmAccessToken(sa);
  const appBase = (
    process.env.NEXT_PUBLIC_APP_URL || "https://myschool-web.onrender.com"
  ).replace(/\/+$/, "");
  const iconUrl = `${appBase}/logo.png`;
  const targetLink = payload.data?.webUrl || appBase || "/";

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body,
            image: iconUrl,
          },
          data: Object.fromEntries(
            Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])
          ),
          android: {
            priority: "high",
            notification: {
              channelId: "default",
              sound: "default",
              notificationPriority: "PRIORITY_MAX",
              defaultVibrateTimings: true,
              defaultLightSettings: true,
              icon: "notification_icon",
              color: "#6366F1",
            },
          },
          webpush: {
            headers: {
              Urgency: "high",
            },
            notification: {
              title: payload.title,
              body: payload.body,
              icon: iconUrl,
              badge: iconUrl,
              image: iconUrl,
            },
            fcm_options: {
              link: targetLink,
            },
          },
        },
      }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[push:fcm-v1]", data);
    return { ok: false, data };
  }
  return { ok: true, data };
}

async function sendFcmLegacy(
  token: string,
  payload: { title: string; body: string; data?: Record<string, string> },
  serverKey: string
) {
  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${serverKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      notification: { title: payload.title, body: payload.body },
      data: payload.data || {},
    }),
  });
  return { ok: res.ok };
}

function isExpoPushToken(token: string) {
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[")
  );
}

/** Send via Expo Push API (works with Expo Go + standalone) */
async function sendExpoPush(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> }
) {
  const messages = tokens.map((to) => ({
    to,
    sound: "default" as const,
    title: payload.title,
    body: payload.body,
    data: payload.data || {},
    priority: "high" as const,
    channelId: "default",
    badge: 1,
    _displayInForeground: true,
  }));
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("[push:expo]", data);
  }
  return { ok: res.ok, data };
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> }
) {
  const tokens = getTokensForUser(userId);
  if (!tokens.length) {
    return { success: true, sent: 0, reason: "no tokens" };
  }

  if (!isPushEnabled()) {
    console.log("[push:demo]", { userId, tokens: tokens.length, ...payload });
    return { success: true, demo: true, sent: tokens.length };
  }

  const expoTokens = tokens.filter(isExpoPushToken);
  const fcmTokens = tokens.filter((t) => !isExpoPushToken(t));
  let sent = 0;
  const errors: any[] = [];

  // Expo Go / Expo push tokens
  if (expoTokens.length) {
    try {
      const r = await sendExpoPush(expoTokens, payload);
      if (r.ok) sent += expoTokens.length;
      else errors.push(r.data);
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  if (!fcmTokens.length) {
    return { success: sent > 0 || errors.length === 0, sent, errors };
  }

  const provider = (process.env.PUSH_PROVIDER || "fcm").toLowerCase();

  if (provider === "onesignal") {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (!appId || !apiKey) {
      return { success: false, error: "OneSignal env missing", sent, errors };
    }
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        include_player_ids: fcmTokens,
        headings: { en: payload.title },
        contents: { en: payload.body },
        data: payload.data || {},
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) sent += fcmTokens.length;
    else errors.push(data);
    return { success: res.ok || sent > 0, sent, errors, data };
  }

  // FCM HTTP v1 (service account) for web / native FCM tokens
  const sa = loadServiceAccount();
  if (sa) {
    for (const token of fcmTokens) {
      try {
        const r = await sendFcmV1(token, payload, sa);
        if (r.ok) sent++;
        else errors.push(r.data);
      } catch (e: any) {
        errors.push(e.message);
      }
    }
    return { success: sent > 0 || errors.length === 0, sent, errors };
  }

  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) {
    return {
      success: sent > 0,
      sent,
      errors,
      error:
        sent > 0
          ? undefined
          : "No FIREBASE_SERVICE_ACCOUNT_JSON / firebase-service-account.json or FCM_SERVER_KEY",
    };
  }
  for (const token of fcmTokens) {
    const r = await sendFcmLegacy(token, payload, serverKey);
    if (r.ok) sent++;
  }
  return { success: true, sent, errors };
}

export function getRoleBasedRoutes(
  role: string,
  type: string = "GENERAL",
  itemId?: string,
  extra?: Record<string, string>
): { webUrl: string; mobileRoute: string } {
  const normRole = (role || "").toUpperCase();
  const normType = (type || "").toUpperCase();

  let webUrl = "/";
  let mobileRoute = "/(app)/notifications";

  if (normType.includes("HOMEWORK") || normType.includes("HW")) {
    mobileRoute = "/(app)/homework";
    if (normRole === "STUDENT") webUrl = "/student/homework";
    else if (normRole === "PARENT") webUrl = "/parent/homework";
    else if (normRole === "TEACHER") webUrl = "/teacher/homework";
    else if (normRole === "PRINCIPAL") webUrl = "/principal/homework";
    else webUrl = "/admin/homework";
  } else if (normType.includes("ANNOUNCE") || normType.includes("NOTICE")) {
    mobileRoute = "/(app)/announcements";
    if (normRole === "STUDENT") webUrl = "/student/announcements";
    else if (normRole === "PARENT") webUrl = "/parent/announcements";
    else if (normRole === "TEACHER") webUrl = "/teacher/announcements";
    else if (normRole === "PRINCIPAL") webUrl = "/principal/announcements";
    else webUrl = "/admin/announcements";
  } else if (normType.includes("ATTEND") || normType.includes("LEAVE") || normType.includes("ABSENT")) {
    mobileRoute = "/(app)/attendance";
    if (normRole === "STUDENT") webUrl = "/student/attendance";
    else if (normRole === "PARENT") webUrl = "/parent/attendance";
    else if (normRole === "TEACHER") webUrl = "/teacher/attendance";
    else if (normRole === "PRINCIPAL") webUrl = "/principal/attendance";
    else webUrl = "/admin/attendance";
  } else if (normType.includes("MARK") || normType.includes("EXAM") || normType.includes("TEST")) {
    mobileRoute = "/(app)/marks";
    if (normRole === "STUDENT") webUrl = "/student/marks";
    else if (normRole === "PARENT") webUrl = "/parent/marks";
    else if (normRole === "TEACHER") webUrl = "/teacher/exams";
    else if (normRole === "PRINCIPAL") webUrl = "/principal/exams";
    else webUrl = "/admin/exams";
  } else {
    mobileRoute = "/(app)/notifications";
    if (normRole === "STUDENT") webUrl = "/student/notifications";
    else if (normRole === "PARENT") webUrl = "/parent/notifications";
    else if (normRole === "TEACHER") webUrl = "/teacher";
    else if (normRole === "PRINCIPAL") webUrl = "/principal";
    else webUrl = "/admin";
  }

  return { webUrl, mobileRoute };
}

/** Push + optional email to a user with role-based routing and auto DB notification record */
export async function notifyUser(
  userId: string,
  opts: {
    title: string;
    body: string;
    email?: string;
    type?: string;
    data?: Record<string, string>;
    createDbNotif?: boolean;
  }
) {
  const { sendEmail, notificationEmailHtml } = await import("./email");
  const { createNotification, getUserById } = await import("./store");

  const results: any = {};

  // 1. Resolve user for role-based URL resolution and school ID
  const recipient = getUserById(userId);
  const role = recipient?.role || "STUDENT";
  const schoolId = recipient?.schoolId || "";

  // 2. Create in-app notification record if not explicitly disabled or if notificationId not passed
  let notifId = opts.data?.notificationId;
  let createdNotif: any = null;
  if (!notifId && opts.createDbNotif !== false && schoolId) {
    try {
      createdNotif = createNotification({
        schoolId,
        userId,
        title: opts.title,
        body: opts.body,
        type: opts.type || "GENERAL",
        meta: opts.data || {},
      });
      notifId = createdNotif?.id;
    } catch (e) {
      console.warn("[push] createNotification failed in notifyUser", e);
    }
  }

  // 3. Resolve role-based web and mobile routes
  const routes = getRoleBasedRoutes(role, opts.type, opts.data?.itemId, opts.data);
  const webUrl = notifId
    ? `${routes.webUrl}${routes.webUrl.includes("?") ? "&" : "?"}markRead=${notifId}`
    : routes.webUrl;

  const pushData: Record<string, string> = {
    type: opts.type || "GENERAL",
    role,
    url: webUrl,
    route: routes.mobileRoute,
    ...(notifId ? { notificationId: notifId } : {}),
    ...(opts.data || {}),
  };

  try {
    results.push = await sendPushToUser(userId, {
      title: opts.title,
      body: opts.body,
      data: pushData,
    });
  } catch (e: any) {
    results.push = { success: false, error: e.message };
  }

  if (opts.email) {
    try {
      results.email = await sendEmail({
        to: opts.email,
        subject: opts.title,
        html: notificationEmailHtml(opts.title, opts.body),
        text: opts.body,
      });
    } catch (e: any) {
      results.email = { success: false, error: e.message };
    }
  }

  // Real-time notification and badge update pushed via Socket.IO & SSE
  try {
    const { emitNewNotification, emitBadgeUpdate } = await import("./realtime");
    if (createdNotif) {
      await emitNewNotification(userId, createdNotif);
    } else {
      await emitBadgeUpdate(userId);
    }
  } catch (e) {
    console.warn("[push] realtime emit failed in notifyUser", e);
  }

  return results;
}

export type RecipientUser = {
  id: string;
  schoolId?: string;
  role?: string;
  email?: string;
  firstName?: string;
};

/**
 * High-performance batch notification dispatcher:
 * 1. Creates all database notification records in a single atomic write.
 * 2. Emits real-time Socket.IO notifications and badge updates instantly (<1ms).
 * 3. Dispatches FCM push notifications & emails asynchronously without blocking the HTTP request.
 */
export async function notifyUsersBatch(
  recipients: RecipientUser[],
  opts: {
    title: string;
    body: string;
    type?: string;
    data?: Record<string, string>;
  }
) {
  if (!Array.isArray(recipients) || recipients.length === 0) return;

  const { createNotificationsBulk, getUserById } = await import("./store");
  const { emitNewNotification } = await import("./realtime");
  const { sendEmail, notificationEmailHtml } = await import("./email");

  // Deduplicate recipients
  const uniqueRecipients: RecipientUser[] = [];
  const seenIds = new Set<string>();

  for (const r of recipients) {
    if (r && r.id && !seenIds.has(r.id)) {
      seenIds.add(r.id);
      const full = (r.schoolId && r.role) ? r : (getUserById(r.id) || r);
      uniqueRecipients.push({
        id: r.id,
        schoolId: full.schoolId || "",
        role: full.role || "STUDENT",
        email: r.email || full.email,
        firstName: full.firstName,
      });
    }
  }

  if (uniqueRecipients.length === 0) return;

  // 1. Bulk DB insert (single atomic write)
  const itemsToCreate = uniqueRecipients
    .filter((u) => u.schoolId)
    .map((u) => ({
      schoolId: u.schoolId!,
      userId: u.id,
      title: opts.title,
      body: opts.body,
      type: opts.type || "GENERAL",
      meta: opts.data || {},
    }));

  const createdNotifs = createNotificationsBulk(itemsToCreate);
  const notifMap = new Map<string, any>();
  for (const notif of createdNotifs) {
    notifMap.set(notif.userId, notif);
  }

  // 2. Real-time WebSocket emission (instant, non-blocking)
  for (const u of uniqueRecipients) {
    const notif = notifMap.get(u.id);
    if (notif) {
      emitNewNotification(u.id, notif).catch(() => {});
    }
  }

  // 3. Background asynchronous delivery for FCM Push and Email (does not block HTTP response)
  const backgroundTasks = uniqueRecipients.map(async (u) => {
    try {
      const notif = notifMap.get(u.id);
      const routes = getRoleBasedRoutes(u.role || "STUDENT", opts.type, opts.data?.itemId, opts.data);
      const webUrl = notif?.id
        ? `${routes.webUrl}${routes.webUrl.includes("?") ? "&" : "?"}markRead=${notif.id}`
        : routes.webUrl;

      const pushData: Record<string, string> = {
        type: opts.type || "GENERAL",
        role: u.role || "STUDENT",
        url: webUrl,
        route: routes.mobileRoute,
        ...(notif?.id ? { notificationId: notif.id } : {}),
        ...(opts.data || {}),
      };

      // FCM Push
      await sendPushToUser(u.id, {
        title: opts.title,
        body: opts.body,
        data: pushData,
      }).catch(() => {});

      // Email (if valid)
      if (u.email && !u.email.includes(".local")) {
        await sendEmail({
          to: u.email,
          subject: opts.title,
          html: notificationEmailHtml(opts.title, opts.body),
          text: opts.body,
        }).catch(() => {});
      }
    } catch {
      /* ignore individual background push errors */
    }
  });

  // Run in background without awaiting before response
  Promise.allSettled(backgroundTasks).catch(() => {});
}

