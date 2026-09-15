"use client";

import { useEffect, useRef } from "react";

/**
 * Registers the browser for FCM when NEXT_PUBLIC_FIREBASE_* is configured.
 * Safe no-op if config / permission is missing.
 */
export default function PushRegistrar({ userId }: { userId?: string }) {
  const done = useRef(false);

  useEffect(() => {
    if (!userId || done.current) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const senderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    const vapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!apiKey || !projectId || !senderId || !appId || !vapid) {
      // Server-side FCM still works once a token is registered via API.
      return;
    }

    (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Dynamic import so build works without firebase installed until needed
        let firebaseApp: any;
        let messaging: any;
        try {
          const { initializeApp, getApps } = await import("firebase/app");
          const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
          if (!(await isSupported())) return;
          const cfg = {
            apiKey,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId,
            messagingSenderId: senderId,
            appId,
          };
          firebaseApp = getApps().length ? getApps()[0] : initializeApp(cfg);
          messaging = getMessaging(firebaseApp);
          const token = await getToken(messaging, {
            vapidKey: vapid,
            serviceWorkerRegistration: await navigator.serviceWorker.register(
              "/firebase-messaging-sw.js"
            ),
          });
          if (token) {
            await fetch("/api/push", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "register", token, platform: "web" }),
            });
            done.current = true;
          }
        } catch (e) {
          console.warn("[PushRegistrar]", e);
        }
      } catch (e) {
        console.warn("[PushRegistrar permission]", e);
      }
    })();
  }, [userId]);

  return null;
}
