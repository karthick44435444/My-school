"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface AuthUser {
  id: string;
  role: string;
  firstName: string;
  lastName?: string;
  email: string;
  username: string;
  photoUrl?: string;
  schoolCode: string;
  schoolName?: string;
  themeColor?: string;
  schoolLogo?: string | null;
  phone?: string;
  gender?: string;
  education?: string;
  teacherType?: string;
  className?: string;
  section?: string;
  parentName?: string;
  parentEmail?: string;
  dateOfBirth?: string;
  plan?: string;
  planStatus?: string;
  planExpiresAt?: string | null;
  isSubscriptionExpired?: boolean;
  childrenIds?: string[];
}

export const ROLE_PATH: Record<string, string> = {
  ADMIN: "/admin",
  PRINCIPAL: "/principal",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
};

let cachedUser: AuthUser | null | undefined = undefined;
let authPromise: Promise<AuthUser | null> | null = null;

function readSessionUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      sessionStorage.getItem("myschool_user") ||
      localStorage.getItem("myschool_user");
    if (raw) return JSON.parse(raw) as AuthUser;
  } catch {}
  return null;
}

function fetchMe(): Promise<AuthUser | null> {
  if (cachedUser !== undefined) {
    return Promise.resolve(cachedUser);
  }
  if (authPromise) return authPromise;

  const promise = fetch("/api/auth/me", { credentials: "include" })
    .then((r) => {
      if (!r.ok) throw new Error("Unauthorized");
      return r.json();
    })
    .then((d) => {
      const u: AuthUser | null = d.user ? (d.user as AuthUser) : null;
      cachedUser = u;
      if (cachedUser && typeof window !== "undefined") {
        const str = JSON.stringify(cachedUser);
        sessionStorage.setItem("myschool_user", str);
        localStorage.setItem("myschool_user", str);
      }
      return u;
    })
    .catch(() => {
      cachedUser = null;
      return null;
    })
    .finally(() => {
      authPromise = null;
    });

  authPromise = promise;
  return promise;
}

export function clearAuthCache() {
  cachedUser = undefined;
  authPromise = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("myschool_user");
    localStorage.removeItem("myschool_user");
  }
}

export function useAuth(allowedRoles?: string[]) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;

    const quick = cachedUser !== undefined ? cachedUser : readSessionUser();
    if (quick) {
      if (allowedRoles && !allowedRoles.includes(quick.role)) {
        window.location.replace(ROLE_PATH[quick.role] || "/login");
        return;
      }
      setUser(quick);
      setLoading(false);
    }

    fetchMe().then((u) => {
      if (!active) return;

      if (!u) {
        setUser(null);
        setLoading(false);
        clearAuthCache();
        window.location.replace("/login");
        return;
      }

      if (allowedRoles && !allowedRoles.includes(u.role)) {
        setLoading(false);
        window.location.replace(ROLE_PATH[u.role] || "/login");
        return;
      }

      setUser(u);
      setLoading(false);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading };
}
