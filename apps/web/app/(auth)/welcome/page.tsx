"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getGreeting, getRandomQuote } from "@myschool/shared";
import { clearAuthCache } from "@/hooks/useAuth";

const ROLE_PATH: Record<string, string> = {
  ADMIN: "/admin",
  PRINCIPAL: "/principal",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
};

export default function WelcomePage() {
  const router = useRouter();
  const [quote] = useState(getRandomQuote());
  const [greeting] = useState(getGreeting());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("myschool_user");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUser(u);
        return;
      } catch {}
    }
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          sessionStorage.setItem("myschool_user", JSON.stringify(d.user));
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    if (!user?.role) return;
    const path = ROLE_PATH[user.role] || "/admin";
    clearAuthCache();
    window.location.replace(path);
  }, [user]);

  const name = user?.firstName || "User";

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 4, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 text-center text-white px-6">
        <div className="w-28 h-28 mx-auto mb-6 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center text-4xl font-bold overflow-hidden">
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            name[0]
          )}
        </div>
        <h1 className="text-4xl font-bold mb-3">{greeting}, {name}!</h1>
        <p className="text-lg text-white/90 max-w-lg mx-auto mb-4 italic">&ldquo;{quote}&rdquo;</p>
        <p className="text-white/80">Have a nice day! ✨</p>
        <p className="text-white/50 text-sm mt-6">Opening dashboard...</p>
        <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2.5, ease: "linear" }}
          className="mt-4 h-1 bg-white/30 rounded-full max-w-xs mx-auto overflow-hidden">
          <div className="h-full bg-white rounded-full w-full" />
        </motion.div>
      </motion.div>
    </div>
  );
}
