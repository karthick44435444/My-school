"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const ROLE_PATH: Record<string, string> = {
  ADMIN: "/admin",
  PRINCIPAL: "/principal",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
};

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          router.replace(ROLE_PATH[d.user.role] || "/admin");
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}
