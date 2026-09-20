/**
 * API client – uses AsyncStorage (works in Expo Go; SecureStore was failing).
 * API base URL can be set in-app on the login screen (saved permanently).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const TOKEN_KEY = "myschool_jwt";
const USER_KEY = "myschool_user";
const API_KEY = "myschool_api_base";

const DEFAULT_API = "https://myschool-web-had7.onrender.com";

function sanitizeApiUrl(url?: string): string {
  if (!url) return DEFAULT_API;
  let clean = url.trim().replace(/\/+$/, "");
  clean = clean.replace(/\/api$/, "");
  return clean || DEFAULT_API;
}

let _cachedApiBase: string = (() => {
  const fromEnv =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL
      : undefined;
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return sanitizeApiUrl(fromEnv || extra?.apiUrl || DEFAULT_API);
})();

// Immediately attempt async restore of user-configured API URL into memory cache
AsyncStorage.getItem(API_KEY).then((saved) => {
  if (saved && saved.trim()) {
    _cachedApiBase = sanitizeApiUrl(saved);
  }
}).catch(() => {});

/** Resolve API base: saved preference > env > app.json > platform default */
export async function getApiBase(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(API_KEY);
    if (saved && saved.trim()) {
      _cachedApiBase = sanitizeApiUrl(saved);
      return _cachedApiBase;
    }
  } catch {
    /* ignore */
  }
  const fromEnv =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL
      : undefined;
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  _cachedApiBase = sanitizeApiUrl(fromEnv || extra?.apiUrl || DEFAULT_API);
  return _cachedApiBase;
}

/** Sync helper for display only (always matches latest resolved api base) */
export function getApiBaseSync(): string {
  return _cachedApiBase;
}

export async function setApiBase(url: string) {
  const clean = sanitizeApiUrl(url);
  _cachedApiBase = clean;
  await AsyncStorage.setItem(API_KEY, clean);
}

export type MobileUser = {
  id: string;
  role: "ADMIN" | "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT";
  firstName: string;
  lastName?: string;
  email: string;
  username: string;
  photoUrl?: string;
  schoolCode: string;
  schoolName?: string;
  schoolLogo?: string;
  themeColor?: string;
  teacherType?: string;
  className?: string;
  section?: string;
  parentName?: string;
  phone?: string;
  plan?: string;
  planStatus?: string;
  planExpiresAt?: string | null;
  isSubscriptionExpired?: boolean;
  childrenIds?: string[];
};


/** Turn relative /uploads/... into absolute URL for <Image> */
export async function resolveMediaUrl(url?: string | null): Promise<string | undefined> {
  if (!url) return undefined;
  let u = String(url).trim().replace(/\\/g, "/").replace(/^['"]+|['"]+$/g, "");
  if (!u || u === "null" || u === "undefined") return undefined;
  if (u.startsWith("//")) return `https:${u}`;
  if (/^https?:\/\//i.test(u) || u.startsWith("data:") || u.startsWith("file:") || u.startsWith("blob:")) {
    return u;
  }
  const base = ((await getApiBase()) || DEFAULT_API).replace(/\/+$/, "");
  let cleanPath = u.replace(/^\/+/, "");
  if (cleanPath.startsWith("public/uploads/")) {
    cleanPath = cleanPath.replace(/^public\//, "");
  }
  if (!cleanPath.startsWith("uploads/") && !cleanPath.startsWith("api/uploads/")) {
    cleanPath = `uploads/${cleanPath}`;
  }
  return `${base}/${cleanPath}`;
}

export function resolveMediaUrlSync(url: string | null | undefined, apiBase?: string): string | undefined {
  if (!url) return undefined;
  let u = String(url).trim().replace(/\\/g, "/").replace(/^['"]+|['"]+$/g, "");
  if (!u || u === "null" || u === "undefined") return undefined;
  if (u.startsWith("//")) return `https:${u}`;
  if (/^https?:\/\//i.test(u) || u.startsWith("data:") || u.startsWith("file:") || u.startsWith("blob:")) {
    return u;
  }
  const base = (apiBase || getApiBaseSync() || DEFAULT_API).replace(/\/+$/, "");
  let cleanPath = u.replace(/^\/+/, "");
  if (cleanPath.startsWith("public/uploads/")) {
    cleanPath = cleanPath.replace(/^public\//, "");
  }
  if (!cleanPath.startsWith("uploads/") && !cleanPath.startsWith("api/uploads/")) {
    cleanPath = `uploads/${cleanPath}`;
  }
  return `${base}/${cleanPath}`;
}

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function saveUser(user: MobileUser) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function loadUser(): Promise<MobileUser | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

type RequestOpts = {
  method?: string;
  body?: any;
  auth?: boolean;
};

function networkHelp(base: string): string {
  return (
    `Cannot reach API at ${base}. ` +
    `On the login screen set "API Server URL" to http://YOUR_PC_IP:3000 ` +
    `(same Wi‑Fi, web must be running: npm run dev:web). ` +
    `Android emulator: http://10.0.2.2:3000`
  );
}

export async function api<T = any>(
  path: string,
  opts: RequestOpts = {}
): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const base = await getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(networkHelp(base));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function login(
  schoolCode: string,
  username: string,
  password: string
): Promise<{ user: MobileUser; token: string }> {
  const data = await api<{ success: boolean; token: string; user: MobileUser }>(
    "/api/auth/login",
    {
      method: "POST",
      body: { schoolCode, username, password },
      auth: false,
    }
  );
  if (!data.token) throw new Error("No token returned from server");
  await setToken(data.token);
  await saveUser(data.user);
  return { user: data.user, token: data.token };
}

export async function logout() {
  try {
    await unregisterPushToken();
  } catch {
    /* ignore */
  }
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  await clearToken();
}

export async function fetchMe(): Promise<MobileUser> {
  const data = await api<{ user: MobileUser }>("/api/auth/me");
  await saveUser(data.user);
  return data.user;
}

export async function registerPushToken(token: string, platform: string) {
  return api("/api/push", {
    method: "POST",
    body: { action: "register", token, platform },
  });
}

export async function unregisterPushToken(token?: string) {
  return api("/api/push", {
    method: "POST",
    body: { action: "unregister", token },
  });
}

export async function testPush() {
  return api("/api/push", { method: "POST", body: { action: "test" } });
}

export async function fetchSubscription(): Promise<any> {
  const data = await api<{ success: boolean; subscription: any }>("/api/subscription");
  return data.subscription;
}

export async function upgradeSubscription(planId: string): Promise<any> {
  const data = await api<{ success: boolean; message: string; subscription: any }>("/api/subscription", {
    method: "POST",
    body: { planId },
  });
  return data;
}

