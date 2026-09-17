"use client";

// Keep track of recently displayed notification IDs to prevent duplicates
const recentlyShownIds = new Set<string>();

export function playNotificationSound() {
  // Sound removed per user preference - native OS/browser push sound is used instead
}

export type NotificationPopupOptions = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  notificationId?: string;
};

/**
 * Standard Web Push notification display:
 * 1. Shows exactly ONE clean native browser push notification (with school logo icon & click-to-open).
 * 2. Deduplicates incoming real-time events to avoid double alerts.
 * 3. Updates in-app badge count in the header.
 */
export function displayNotificationAlert(opts: NotificationPopupOptions) {
  if (typeof window === "undefined") return;

  const notifId = opts.notificationId || `${opts.title}_${opts.body}`;
  
  // Deduplicate: If this notification was already shown in the last 8 seconds, ignore
  if (recentlyShownIds.has(notifId)) {
    return;
  }
  recentlyShownIds.add(notifId);
  setTimeout(() => {
    recentlyShownIds.delete(notifId);
  }, 8000);

  const title = opts.title || "🔔 My School Notification";
  const body = opts.body || "";
  const icon = opts.icon || "/logo.png";
  const url = opts.url || (opts.notificationId ? `/?markRead=${opts.notificationId}` : undefined);

  // Native OS / Browser Web Push Notification
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notif = new Notification(title, {
        body,
        icon,
        badge: "/logo.png",
        tag: opts.notificationId || "myschool-notif",
      });
      notif.onclick = () => {
        window.focus();
        if (url && url !== "#") {
          window.location.href = url;
        }
      };
    } catch (e) {
      console.warn("[push:desktop] Notification error", e);
    }
  }

  // Update in-app badge count
  window.dispatchEvent(new CustomEvent("myschool:badges-updated", { detail: opts }));
}
