import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { api, registerPushToken } from "./api";

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  /* ignore */
}

const DEFAULT_EAS_PROJECT_ID = "1f2602b9-fc02-42a1-9323-5c8f22be9885";

function resolveProjectId(): string {
  const extra = Constants.expoConfig?.extra as any;
  const id =
    extra?.eas?.projectId ||
    (Constants as any).easConfig?.projectId ||
    process.env.EXPO_PUBLIC_PROJECT_ID;
  if (id && typeof id === "string") {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id) && !id.includes("a1b2c3d4")) return id;
  }
  return DEFAULT_EAS_PROJECT_ID;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  try {
    if (!Device.isDevice) {
      console.log("[push] Running on simulator/emulator — physical device recommended for remote push notifications");
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== "granted") return false;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "SchoolVajo Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#156afd",
        sound: "notification_sound.wav",
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });
    }
    return true;
  } catch (e) {
    console.warn("[push] permission error", e);
    return false;
  }
}

/** Instantly triggers a local system pop-up banner with sound */
export async function triggerLocalNotification(payload: {
  title: string;
  body: string;
  data?: Record<string, any>;
}) {
  try {
    await ensureNotificationPermissions();
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        sound: Platform.OS === "ios" ? "notification_sound_ios.wav" : "notification_sound.wav",
        data: payload.data || {},
        badge: 1,
        color: "#156afd",
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("[push:mobile] triggerLocalNotification error", err);
    return null;
  }
}

export async function getExpoPushToken(): Promise<string | null> {
  const ok = await ensureNotificationPermissions();
  if (!ok) return null;

  const projectId = resolveProjectId();
  // 1. Get Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    if (tokenData?.data) return tokenData.data;
  } catch (e) {
    console.log("[push] Expo push token fetch info:", e);
  }

  // 2. Native Device Push Token (Firebase FCM on Android / APNs on iOS)
  try {
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    if (deviceToken?.data) return String(deviceToken.data);
  } catch (e) {
    console.log("[push] Native device token info:", e);
  }

  return null;
}

export async function setupPushForUser(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    const ok = await ensureNotificationPermissions();
    if (!ok) {
      return { success: false, error: "Notification permission not granted" };
    }

    const tokensToRegister: string[] = [];

    // 1. Prioritize Expo Push Token (Guaranteed to route via Expo delivery network)
    const projectId = resolveProjectId();
    try {
      const expoToken = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      if (expoToken?.data && !tokensToRegister.includes(expoToken.data)) {
        tokensToRegister.push(expoToken.data);
      }
    } catch (err) {
      console.log("[push] Expo token fetch error:", err);
    }

    // 2. Native Device Push Token (Firebase FCM / APNs)
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      if (deviceToken?.data && !tokensToRegister.includes(String(deviceToken.data))) {
        tokensToRegister.push(String(deviceToken.data));
      }
    } catch (err) {
      console.log("[push] Device token fetch error:", err);
    }

    if (tokensToRegister.length === 0) {
      return {
        success: false,
        error: "Push token unavailable (physical device recommended).",
      };
    }

    for (const t of tokensToRegister) {
      await registerPushToken(t, Platform.OS).catch((err) => {
        console.warn("[push] failed registering token:", err);
      });
    }

    return { success: true, token: tokensToRegister[0] };
  } catch (e: any) {
    return { success: false, error: e?.message || "Push setup failed" };
  }
}

/** Route resolution when notification is tapped */
export function resolveRouteFromNotification(data: Record<string, any>): {
  path: string;
  params?: Record<string, string>;
} {
  const type = String(data.type || data.notifType || "").toUpperCase();
  const explicitRoute = data.route;
  const itemId = String(data.itemId || data.examId || data.homeworkId || "");
  const childId = String(data.studentId || data.childId || "");

  if (explicitRoute && explicitRoute.startsWith("/(app)")) {
    const params: Record<string, string> = {};
    if (itemId) params.highlightId = itemId;
    if (childId) params.childId = childId;
    return { path: explicitRoute, params: Object.keys(params).length ? params : undefined };
  }

  if (type.includes("MARK") || type.includes("EXAM") || type.includes("TEST")) {
    const params: Record<string, string> = {};
    if (itemId) params.highlightId = itemId;
    if (childId) params.childId = childId;
    return { path: "/(app)/marks", params: Object.keys(params).length ? params : undefined };
  }

  if (type.includes("HOMEWORK") || type.includes("HW")) {
    return { path: "/(app)/homework", params: itemId ? { highlightId: itemId } : undefined };
  }

  if (type.includes("ANNOUNCE") || type.includes("NOTICE") || type.includes("NEWS")) {
    return { path: "/(app)/announcements", params: itemId ? { highlightId: itemId } : undefined };
  }

  if (type.includes("LEAVE") || type.includes("ATTEND") || type.includes("ABSENT")) {
    return { path: "/(app)/attendance" };
  }

  return { path: "/(app)/notifications" };
}

/** Process notification tap, mark as read, and navigate to target screen */
export async function processNotificationResponse(
  response: Notifications.NotificationResponse
) {
  try {
    const data = (response.notification.request.content.data || {}) as Record<string, any>;
    const notifId = data.notificationId || data.id;
    const itemId = data.itemId || data.highlightId;
    const type = String(data.type || "").toUpperCase();

    // 1. Mark notification as read on the backend
    if (notifId) {
      api("/api/notifications", {
        method: "POST",
        body: { id: notifId },
      }).catch(() => {});
    }

    // 2. If it's a specific entity (HOMEWORK, ANNOUNCEMENT, MARKS), also mark read receipt
    if (itemId) {
      if (type.includes("HOMEWORK") || type.includes("HW")) {
        api("/api/read", { method: "POST", body: { type: "HOMEWORK", itemId: String(itemId) } }).catch(() => {});
      } else if (type.includes("ANNOUNCE") || type.includes("NOTICE")) {
        api("/api/read", { method: "POST", body: { type: "ANNOUNCEMENT", itemId: String(itemId) } }).catch(() => {});
      } else if (type.includes("MARK") || type.includes("EXAM") || type.includes("TEST")) {
        api("/api/read", { method: "POST", body: { type: "MARKS", itemId: String(itemId) } }).catch(() => {});
      }
    }

    // 3. Clear system notifications / badge
    try {
      Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
      Notifications.setBadgeCountAsync(0).catch(() => {});
    } catch {}

    // 4. Navigate to destination screen
    const target = resolveRouteFromNotification(data);
    if (target.path) {
      if (target.params) {
        router.push({ pathname: target.path as any, params: target.params });
      } else {
        router.push(target.path as any);
      }
    }
  } catch (e) {
    console.warn("[push] processNotificationResponse error", e);
  }
}

/** Attach listeners for notification received & tapped */
export function addNotificationListeners(opts?: {
  onReceive?: (n: Notifications.Notification) => void;
  onResponse?: (r: Notifications.NotificationResponse) => void;
}) {
  try {
    const sub1 = Notifications.addNotificationReceivedListener((n) => {
      opts?.onReceive?.(n);
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener((r) => {
      processNotificationResponse(r);
      opts?.onResponse?.(r);
    });

    // Check cold-launch notification response after navigation tree mounts
    setTimeout(() => {
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) {
            processNotificationResponse(response);
          }
        })
        .catch(() => {});
    }, 1000);

    return () => {
      sub1.remove();
      sub2.remove();
    };
  } catch {
    return () => {};
  }
}
