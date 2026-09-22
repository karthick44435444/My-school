"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import {
  checkAndMarkNotificationReadFromUrl,
  registerWebPushToken,
  setupForegroundPushListener,
} from "@/lib/firebaseClient";

export default function PushNotificationManager() {
  const pathname = usePathname();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // 1. Check & mark read from URL whenever route changes or on initial load
  useEffect(() => {
    checkAndMarkNotificationReadFromUrl();
  }, [pathname]);

  // 2. Set up foreground FCM listener, live Socket.IO listener, and auto-registration
  useEffect(() => {
    const unsubFCM = setupForegroundPushListener();
    let unsubSocket: (() => void) | null = null;

    import("@/lib/socketClient").then(({ subscribeNewNotification }) => {
      import("@/lib/notificationPopups").then(({ displayNotificationAlert }) => {
        unsubSocket = subscribeNewNotification((n) => {
          const title = n.title || "🔔 SchoolVajo Notification";
          const body = n.body || n.message || "";
          const notifId = n.id;
          const meta = n.meta || n.data || {};
          const url = meta.url || (notifId ? `/?markRead=${notifId}` : undefined);

          displayNotificationAlert({
            title,
            body,
            url,
            notificationId: notifId,
            icon: "/logo.png",
          });
        });
      });
    });

    // Check if session user exists
    let hasUser = false;
    try {
      hasUser = Boolean(
        sessionStorage.getItem("myschool_user") || localStorage.getItem("myschool_user")
      );
    } catch {}

    if (hasUser && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        registerWebPushToken().then((res) => {
          if (res.success) {
            console.log("[push:web] Registered FCM token successfully");
          }
        });
      } else if (
        Notification.permission === "default" &&
        !sessionStorage.getItem("myschool_notif_dismissed") &&
        !["/login", "/register-school", "/forgot-password"].includes(pathname)
      ) {
        // Show gentle permission banner after a 2s delay
        const t = setTimeout(() => setShowPrompt(true), 2000);
        return () => {
          clearTimeout(t);
          unsubFCM();
          if (unsubSocket) unsubSocket();
        };
      }
    }

    return () => {
      unsubFCM();
      if (unsubSocket) unsubSocket();
    };
  }, [pathname]);

  const handleEnable = async () => {
    setIsRegistering(true);
    try {
      const res = await registerWebPushToken();
      if (res.success) {
        toast.success("Push notifications enabled successfully!");
        setShowPrompt(false);
      } else {
        toast.error(res.error || "Could not enable notifications.");
      }
    } catch {
      toast.error("Failed to enable notifications.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      sessionStorage.setItem("myschool_notif_dismissed", "1");
    } catch {}
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-indigo-100 bg-white p-4 shadow-2xl animate-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-900">Enable Push Notifications</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Get instant alerts for new homework, exam marks, attendance, and school announcements.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleEnable}
              disabled={isRegistering}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {isRegistering ? "Enabling…" : "Enable Notifications"}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-600 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
