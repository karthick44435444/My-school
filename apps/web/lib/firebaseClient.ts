"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { toast } from "sonner";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBPrGdM9Ty9j_e0IcGGAjn0DL1U_Iqhcjk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "my-school-1980d.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "my-school-1980d",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "my-school-1980d.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "680196974047",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:680196974047:web:d7d70f8967c0678e41d06a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-150P1KCNV1",
};

const VAPID_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
  "BMZpgE2BhvnBh2B8AvhDYfVNZ_GqjSiLWxfjc4p3wFEJ0MBidlGD16RfonqPFMrgMcm8TT_LPQQkE8ZdjEUuxNc";

export function getFirebaseApp() {
  if (typeof window === "undefined") return null;
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirestoreDb() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

/** Google Sign-In via Firebase Auth */
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not available");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  const idToken = await credential.user.getIdToken();
  return { user: credential.user, idToken };
}

/** Email/Password Sign-In via Firebase Auth */
export async function signInWithEmail(email: string, pass: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not available");
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  const idToken = await credential.user.getIdToken();
  return { user: credential.user, idToken };
}

/** Email/Password Sign-Up via Firebase Auth */
export async function signUpWithEmail(email: string, pass: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth is not available");
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  const idToken = await credential.user.getIdToken();
  return { user: credential.user, idToken };
}

/** Sign out from Firebase Auth */
export async function signOutFirebase() {
  const auth = getFirebaseAuth();
  if (auth) {
    await fbSignOut(auth);
  }
}

/** Listen to Firebase auth state changes */
export function onFirebaseAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

/** Register browser push token with the backend */
export async function registerWebPushToken(): Promise<{ success: boolean; token?: string; error?: string }> {
  if (typeof window === "undefined") return { success: false, error: "SSR" };
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { success: false, error: "Push notifications not supported in this browser" };
  }

  try {
    const supported = await isSupported().catch(() => false);
    if (!supported) {
      return { success: false, error: "Firebase messaging is not supported in this environment" };
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await navigator.serviceWorker.ready;

    // Check permission
    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
    }
    if (perm !== "granted") {
      return { success: false, error: "Notification permission denied" };
    }

    const app = getFirebaseApp();
    if (!app) return { success: false, error: "Firebase app not initialized" };

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      return { success: false, error: "Failed to generate FCM web token" };
    }

    // Send token to server
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register",
        token,
        platform: "web",
      }),
    });

    return { success: true, token };
  } catch (err: any) {
    console.warn("[push:web] registration error", err);
    return { success: false, error: err?.message || "Failed to register push token" };
  }
}

/** Listen for foreground FCM messages and show rich in-app toast */
export function setupForegroundPushListener(onReceived?: (payload: any) => void) {
  if (typeof window === "undefined") return () => {};
  let unsubscribe: (() => void) | null = null;

  (async () => {
    try {
      const supported = await isSupported().catch(() => false);
      if (!supported) return;

      const app = getFirebaseApp();
      if (!app) return;

      const messaging = getMessaging(app);
      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title || payload.data?.title || "My School Notification";
        const body = payload.notification?.body || payload.data?.body || "";
        const targetUrl = payload.data?.url || payload.fcmOptions?.link || "/";
        const notifId = payload.data?.notificationId;

        toast(title, {
          description: body,
          action: {
            label: "View",
            onClick: async () => {
              if (notifId) {
                try {
                  await fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: notifId }),
                  });
                } catch {}
              }
              if (targetUrl && targetUrl !== "#") {
                window.location.href = targetUrl;
              }
            },
          },
        });

        // Dispatch global event for instant in-app badge updates without refresh
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("myschool:badges-updated", { detail: payload }));
        }

        onReceived?.(payload);
      });
    } catch (e) {
      console.warn("[push:web] foreground listener error", e);
    }
  })();

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

/** Checks URL on page load for ?markRead=<notificationId>, marks it read and cleans the URL */
export async function checkAndMarkNotificationReadFromUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const notifId = params.get("markRead");
    if (notifId) {
      // Mark read via API
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notifId }),
      }).catch(() => {});

      // Clean the query parameter from URL without reloading
      params.delete("markRead");
      const cleanSearch = params.toString();
      const newUrl =
        window.location.pathname + (cleanSearch ? `?${cleanSearch}` : "") + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
      return notifId;
    }
  } catch (e) {
    console.warn("[push:web] markRead URL check error", e);
  }
  return null;
}
