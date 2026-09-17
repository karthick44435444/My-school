/**
 * Push notifications via Firebase Cloud Messaging HTTP v1 (Firebase Admin SDK)
 * with support for Web, Mobile, Expo Push, and OneSignal.
 */

import { getFirebaseAdminApp } from "./firebaseAdmin";
import { getMessaging as getAdminMessaging } from "firebase-admin/messaging";
import { readDB, writeDB, prisma } from "./store";

export function isPushEnabled() {
  if (process.env.PUSH_ENABLED === "false") return false;
  return true;
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

  // Sync to PostgreSQL if Prisma connected
  if (prisma && process.env.DATABASE_URL) {
    prisma.pushToken.upsert({
      where: {
        userId_token: {
          userId,
          token,
        },
      },
      create: {
        userId,
        token,
        platform: platform || "web",
        updatedAt: new Date(),
      },
      update: {
        platform: platform || "web",
        updatedAt: new Date(),
      },
    }).catch(() => {});
  }

  // Background sync to Firestore if configured
  (async () => {
    try {
      const { setDoc, COLLECTIONS } = await import("./firestore");
      // Use sanitized token string as doc ID
      const safeDocId = `${userId}_${token.slice(-16).replace(/[^a-zA-Z0-9]/g, "_")}`;
      await setDoc(COLLECTIONS.PUSH_TOKENS, safeDocId, {
        userId,
        token,
        platform: platform || "web",
        updatedAt: new Date().toISOString(),
      });
    } catch {
      /* ignore firestore sync errors if not configured */
    }
  })();

  return { success: true };
}

export function removePushToken(userId: string, token?: string) {
  const db = readDB();
  if (!db.pushTokens) db.pushTokens = [];
  db.pushTokens = db.pushTokens.filter(
    (t: any) => t.userId !== userId || (token ? t.token !== token : false)
  );
  writeDB(db);
  if (prisma && process.env.DATABASE_URL) {
    if (token) {
      prisma.pushToken.deleteMany({ where: { userId, token } }).catch(() => {});
    } else {
      prisma.pushToken.deleteMany({ where: { userId } }).catch(() => {});
    }
  }
  return { success: true };
}

export function removePushTokenByValue(token: string) {
  const db = readDB();
  if (!db.pushTokens) return;
  db.pushTokens = db.pushTokens.filter((t: any) => t.token !== token);
  writeDB(db);
  if (prisma && process.env.DATABASE_URL) {
    prisma.pushToken.deleteMany({ where: { token } }).catch(() => {});
  }
}

export function getTokensForUser(userId: string): string[] {
  const db = readDB();
  const list = (db.pushTokens || [])
    .filter((t: any) => t.userId === userId)
    .map((t: any) => t.token);
  return Array.from(new Set(list.filter(Boolean)));
}

function isExpoPushToken(token: string) {
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[")
  );
}

/** Send via Expo Push API (works with Expo Go + standalone Expo tokens) */
async function sendExpoPush(
  tokens: string[],
  payload: { title: string; body: string; data?: Record<string, string> }
) {
  const messages = tokens.map((to) => ({
    to,
    sound: "notification_sound.wav",
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

/** Send via Firebase Cloud Messaging HTTP v1 using Firebase Admin SDK */
async function sendFcmAdmin(
  token: string,
  payload: { title: string; body: string; data?: Record<string, string> }
) {
  try {
    const adminApp = getFirebaseAdminApp();
    const messaging = getAdminMessaging(adminApp);
    const appBase = (
      process.env.NEXT_PUBLIC_APP_URL || "https://myschool-web-had7.onrender.com"
    ).replace(/\/+$/, "");
    const iconUrl = `${appBase}/logo.png`;
    const targetLink = payload.data?.url || payload.data?.webUrl || appBase || "/";

    const stringData: Record<string, string> = {};
    for (const [k, v] of Object.entries(payload.data || {})) {
      if (v !== undefined && v !== null) {
        stringData[k] = String(v);
      }
    }

    const response = await messaging.send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          channelId: "default",
          sound: "notification_sound",
          priority: "max",
          defaultVibrateTimings: true,
          defaultSound: false,
          defaultLightSettings: true,
          color: "#4F46E5",
          icon: "notification_icon",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "notification_sound.wav",
            badge: 1,
          },
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
          requireInteraction: false,
        },
        fcmOptions: {
          link: targetLink,
        },
      },
    });

    return { ok: true, id: response };
  } catch (err: any) {
    console.error("[push:fcm-v1] Error sending to token:", token.slice(0, 15) + "...", err?.message || err);
    // Auto-prune dead/expired tokens
    if (
      err?.code === "messaging/registration-token-not-registered" ||
      err?.code === "messaging/invalid-registration-token" ||
      err?.code === "messaging/invalid-argument"
    ) {
      removePushTokenByValue(token);
    }
    return { ok: false, error: err?.message, code: err?.code };
  }
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> }
) {
  const tokens = getTokensForUser(userId);
  if (!tokens.length) {
    return { success: true, sent: 0, reason: "no tokens registered for this user" };
  }

  if (!isPushEnabled()) {
    console.log("[push:disabled]", { userId, tokens: tokens.length, ...payload });
    return { success: true, sent: 0, reason: "PUSH_ENABLED is false" };
  }

  const expoTokens = tokens.filter(isExpoPushToken);
  const fcmTokens = tokens.filter((t) => !isExpoPushToken(t));
  let sent = 0;
  const errors: any[] = [];

  // 1. Send to Expo push tokens (if any)
  if (expoTokens.length) {
    try {
      const r = await sendExpoPush(expoTokens, payload);
      if (r.ok) sent += expoTokens.length;
      else errors.push(r.data);
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  // 2. Send to native FCM tokens (Web & Android APK)
  if (fcmTokens.length) {
    const provider = (process.env.PUSH_PROVIDER || "fcm").toLowerCase();

    if (provider === "onesignal") {
      const appId = process.env.ONESIGNAL_APP_ID;
      const apiKey = process.env.ONESIGNAL_REST_API_KEY;
      if (appId && apiKey) {
        try {
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
        } catch (e: any) {
          errors.push(e.message);
        }
      }
    } else {
      // Default: Firebase FCM v1 via Admin SDK
      for (const token of fcmTokens) {
        try {
          const r = await sendFcmAdmin(token, payload);
          if (r.ok) sent++;
          else errors.push(r);
        } catch (e: any) {
          errors.push(e.message);
        }
      }
    }
  }

  return { success: sent > 0 || errors.length === 0, sent, totalTokens: tokens.length, errors };
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

