"use client";

import { formatPersonName, toTitleCase } from "@/lib/utils";

import PushRegistrar from "@/components/shared/PushRegistrar";
import SubscriptionExpiredBlocker from "@/components/shared/SubscriptionExpiredBlocker";
import { clearAuthCache } from "@/hooks/useAuth";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Users, GraduationCap, UserPlus, BookOpen,
  ClipboardList, Megaphone, School, Calendar, BarChart3, FileText, Bell,
  X, Loader2, MapPin, Mail, Phone, Edit3, Building2, Sparkles, Menu, CreditCard
} from "lucide-react";

interface SidebarProps {
  user: {
    id?: string;
    firstName: string;
    lastName?: string;
    role: string;
    schoolName?: string;
    schoolCode: string;
    themeColor?: string;
    schoolLogo?: string | null;
    photoUrl?: string | null;
    plan?: string;
    planStatus?: string;
    planExpiresAt?: string | null;
    isSubscriptionExpired?: boolean;
  };
}

const MENUS: Record<string, { label: string; href: string; icon: any; badgeKey?: string }[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Classes", href: "/admin/classes", icon: School },
    { label: "Principals", href: "/admin/principals", icon: UserPlus },
    { label: "Teachers", href: "/admin/teachers", icon: GraduationCap },
    { label: "Students", href: "/admin/students", icon: Users },
    { label: "Notices", href: "/admin/announcements", icon: Megaphone, badgeKey: "announcements" },
    { label: "Subscription", href: "/admin/subscription", icon: CreditCard },
  ],
  PRINCIPAL: [
    { label: "Dashboard", href: "/principal", icon: LayoutDashboard },
    { label: "Analytics", href: "/principal/analytics", icon: BarChart3 },
    { label: "Classes", href: "/principal/classes", icon: School },
    { label: "Teachers", href: "/principal/teachers", icon: GraduationCap },
    { label: "Students", href: "/principal/students", icon: Users },
    { label: "Notices", href: "/principal/announcements", icon: Megaphone, badgeKey: "announcements" },
  ],
  TEACHER: [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { label: "My Classes", href: "/teacher/students", icon: Users },
    { label: "Attendance", href: "/teacher/attendance", icon: ClipboardList },
    { label: "Homework", href: "/teacher/homework", icon: FileText },
    { label: "Exams & Marks", href: "/teacher/exams", icon: BookOpen },
    { label: "Notices", href: "/teacher/announcements", icon: Megaphone, badgeKey: "announcements" },
  ],
  STUDENT: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "Attendance", href: "/student/attendance", icon: Calendar },
    { label: "Marks & Rank", href: "/student/marks", icon: BarChart3 },
    { label: "Homework", href: "/student/homework", icon: FileText, badgeKey: "homework" },
    { label: "Notices", href: "/student/announcements", icon: Bell, badgeKey: "announcements" },
  ],
  PARENT: [
    { label: "Dashboard", href: "/parent", icon: LayoutDashboard },
    { label: "Attendance", href: "/parent/attendance", icon: Calendar },
    { label: "Marks & Rank", href: "/parent/marks", icon: BarChart3 },
    { label: "Homework", href: "/parent/homework", icon: FileText, badgeKey: "homework" },
    { label: "Notices", href: "/parent/announcements", icon: Bell, badgeKey: "announcements" },
  ],
};

const SETTINGS_PATH: Record<string, string> = {
  ADMIN: "/admin/settings",
  PRINCIPAL: "/principal/settings",
  TEACHER: "/teacher/settings",
  STUDENT: "/student/settings",
  PARENT: "/parent/settings",
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = user.themeColor || "#6366F1";
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [school, setSchool] = useState<any>(null);
  const [schoolLoading, setSchoolLoading] = useState(false);

  // Preload school data in background for instant opening
  useEffect(() => {
    let active = true;
    fetch("/api/school")
      .then((r) => r.json())
      .then((d) => {
        if (active && d.school) setSchool(d.school);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const openSchool = () => {
    setSchoolOpen(true);
    if (!school) {
      setSchoolLoading(true);
      fetch("/api/school")
        .then((r) => r.json())
        .then((d) => {
          if (d.school) setSchool(d.school);
        })
        .catch(() => {})
        .finally(() => setSchoolLoading(false));
    }
  };

  const menu = MENUS[user.role] || MENUS.STUDENT;
  const settingsHref = SETTINGS_PATH[user.role] || "/student/settings";
  const notifHref = `/${user.role.toLowerCase()}/notifications`;
  const [badges, setBadges] = useState<{ announcements: number; homework: number; notifications: number }>({
    announcements: 0,
    homework: 0,
    notifications: 0,
  });
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isExpired = user.isSubscriptionExpired || (school && (school.planStatus === "EXPIRED" || (school.planExpiresAt && new Date(school.planExpiresAt).getTime() <= Date.now())));
  const shouldBlock = isExpired && (user.role !== "ADMIN" || pathname !== "/admin/subscription");

  // Pre-load all routes into client cache for 0ms transitions
  useEffect(() => {
    menu.forEach((item) => {
      if (item.href) router.prefetch(item.href);
    });
    router.prefetch(settingsHref);
    router.prefetch(notifHref);
  }, [menu, router, settingsHref, notifHref]);

  const startNavigation = (href: string) => {
    if (href === pathname) return;
    setPendingHref(href);
    setMobileMenuOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("startTopLoader"));
    }
  };

  useEffect(() => {
    setPendingHref(null);
    setMobileMenuOpen(false);
    if (pathname.includes("/notifications")) {
      setBadges((prev) => ({ ...prev, notifications: 0 }));
    }
    if (pathname.includes("/announcements")) {
      setBadges((prev) => ({ ...prev, announcements: 0 }));
    }
    if (pathname.includes("/homework")) {
      setBadges((prev) => ({ ...prev, homework: 0 }));
    }
  }, [pathname]);

  useEffect(() => {
    let active = true;
    let eventSource: EventSource | null = null;

    const loadInitial = async () => {
      try {
        const [bRes, nRes] = await Promise.all([
          fetch("/api/badges"),
          fetch("/api/notifications"),
        ]);
        const b = bRes.ok ? await bRes.json() : {};
        let notif = b.notifications || 0;
        if (nRes && nRes.ok) {
          const n = await nRes.json();
          if (n.unread != null) notif = n.unread;
        }
        if (active) {
          const isNotifPage = pathname.includes("/notifications");
          const isAnnPage = pathname.includes("/announcements");
          const isHwPage = pathname.includes("/homework");
          setBadges({
            announcements: isAnnPage ? 0 : (b.announcements || 0),
            homework: isHwPage ? 0 : (b.homework || 0),
            notifications: isNotifPage ? 0 : notif,
          });
        }
      } catch {}
    };

    // 1. Single initial load on mount
    loadInitial();

    // 2. Real-time Socket.IO subscriptions (0-latency, 0-polling)
    let unsubSocketBadges: (() => void) | null = null;
    let unsubSocketNotifs: (() => void) | null = null;

    import("@/lib/socketClient").then(({ subscribeBadges, subscribeNewNotification }) => {
      if (!active) return;
      unsubSocketBadges = subscribeBadges((data) => {
        if (active && data) {
          const isNotifPage = pathname.includes("/notifications");
          const isAnnPage = pathname.includes("/announcements");
          const isHwPage = pathname.includes("/homework");
          setBadges((prev) => ({
            announcements: isAnnPage ? 0 : (data.announcements !== undefined ? data.announcements : prev.announcements),
            homework: isHwPage ? 0 : (data.homework !== undefined ? data.homework : prev.homework),
            notifications: isNotifPage ? 0 : (data.notifications !== undefined ? data.notifications : prev.notifications),
          }));
        }
      });

      unsubSocketNotifs = subscribeNewNotification(() => {
        if (active && !pathname.includes("/notifications")) {
          setBadges((prev) => ({
            ...prev,
            notifications: prev.notifications + 1,
          }));
        }
      });
    });

    // 3. Fallback Event-driven stream via Server-Sent Events (SSE)
    if (typeof window !== "undefined" && window.EventSource) {
      eventSource = new EventSource("/api/badges/stream");

      eventSource.addEventListener("badges", (e) => {
        try {
          const data = JSON.parse(e.data);
          if (active && data) {
            setBadges((prev) => ({
              announcements: data.announcements !== undefined ? data.announcements : prev.announcements,
              homework: data.homework !== undefined ? data.homework : prev.homework,
              notifications: data.notifications !== undefined ? data.notifications : prev.notifications,
            }));
          }
        } catch (err) {
          console.warn("[sse:badges] parse error", err);
        }
      });

      eventSource.onerror = () => {};
    }

    // 4. Immediate update on push notification receipt
    const handlePushBadgeUpdate = () => {
      loadInitial();
    };
    window.addEventListener("myschool:badges-updated", handlePushBadgeUpdate);

    return () => {
      active = false;
      if (unsubSocketBadges) unsubSocketBadges();
      if (unsubSocketNotifs) unsubSocketNotifs();
      if (eventSource) {
        eventSource.close();
      }
      window.removeEventListener("myschool:badges-updated", handlePushBadgeUpdate);
    };
  }, [user.id, user.role]);

  const renderNavItems = () => (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      {menu.map((item) => {
        const base = `/${user.role.toLowerCase()}`;
        const active =
          pathname === item.href ||
          (item.href !== base && pathname.startsWith(item.href));
        const count = item.badgeKey ? (badges as any)[item.badgeKey] || 0 : 0;
        const isPending = pendingHref === item.href && !active;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={() => startNavigation(item.href)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active ? "text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
            }`}
            style={active ? { backgroundColor: theme } : undefined}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {isPending && (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />
            )}
            {count > 0 && !isPending && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const renderFooter = () => (
    <div className="p-4 border-t border-slate-100 space-y-2">
      {notifHref && (
        <Link
          href={notifHref}
          prefetch={true}
          onClick={() => startNavigation(notifHref)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname.includes("/notifications")
              ? "text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          style={pathname.includes("/notifications") ? { backgroundColor: theme } : undefined}
        >
          <Bell className="w-4 h-4 shrink-0" />
          <span className="flex-1">Notifications</span>
          {pendingHref === notifHref && !pathname.includes("/notifications") && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />
          )}
          {badges.notifications > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {badges.notifications > 9 ? "9+" : badges.notifications}
            </span>
          )}
        </Link>
      )}
      <Link
        href={settingsHref}
        prefetch={true}
        onClick={() => startNavigation(settingsHref)}
        className={`flex items-center gap-3 p-2 rounded-xl transition hover:bg-slate-50 ${
          pathname.includes("/settings") ? "bg-slate-100" : ""
        }`}
      >
        {user.role === "PARENT" ? (
          <img src="/parent-avatar.png" alt="Parent" className="w-9 h-9 rounded-full object-cover bg-slate-100" />
        ) : user.photoUrl ? (
          <img src={user.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: theme }}
          >
            {(user.firstName || "?")[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{formatPersonName(user.firstName, user.lastName)}</div>
          <div className="text-xs text-slate-500 capitalize">
            {user.role.toLowerCase()} · Profile
          </div>
        </div>
        {pendingHref === settingsHref && !pathname.includes("/settings") && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 shrink-0" />
        )}
      </Link>
    </div>
  );

  return (
    <>
    <PushRegistrar userId={user?.id} />

    {shouldBlock && (
      <SubscriptionExpiredBlocker
        role={user.role}
        schoolName={user.schoolName}
        onRefresh={() => {
          clearAuthCache();
          window.location.reload();
        }}
      />
    )}

    {/* Mobile Top Header */}
    <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 z-30 px-3 sm:px-4 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={openSchool}
          className="flex items-center gap-2 hover:opacity-90 transition text-left min-w-0"
        >
          {user.schoolLogo ? (
            <img
              src={user.schoolLogo}
              alt="logo"
              className="w-8 h-8 rounded-lg object-cover shadow-xs bg-white border border-slate-100 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white shadow-xs border border-slate-100 p-1 shrink-0">
              <img src="/logo.png" alt="logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-xs sm:text-sm truncate">
              {user.schoolName || "SchoolVajo"}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{user.schoolCode}</div>
          </div>
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {notifHref && (
          <Link
            href={notifHref}
            onClick={() => startNavigation(notifHref)}
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {badges.notifications > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {badges.notifications > 9 ? "9+" : badges.notifications}
              </span>
            )}
          </Link>
        )}
        <Link
          href={settingsHref}
          onClick={() => startNavigation(settingsHref)}
          className="p-1 rounded-full hover:ring-2 hover:ring-indigo-300 transition"
        >
          {user.role === "PARENT" ? (
            <img src="/parent-avatar.png" alt="Parent" className="w-8 h-8 rounded-full object-cover bg-slate-100" />
          ) : user.photoUrl ? (
            <img src={user.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
              style={{ backgroundColor: theme }}
            >
              {(user.firstName || "?")[0]?.toUpperCase()}
            </div>
          )}
        </Link>
      </div>
    </header>

    {/* Mobile Slide-Out Drawer Navigation */}
    <AnimatePresence>
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu Panel */}
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="relative w-72 max-w-[85vw] h-full bg-white flex flex-col z-10 shadow-2xl"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openSchool();
                }}
                className="flex items-center gap-2.5 text-left min-w-0 flex-1 hover:opacity-90 transition cursor-pointer"
              >
                {user.schoolLogo ? (
                  <img
                    src={user.schoolLogo}
                    alt="logo"
                    className="w-9 h-9 rounded-xl object-cover shadow-xs bg-white border border-slate-100 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-xs border border-slate-100 p-1 shrink-0">
                    <img src="/logo.png" alt="logo" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-sm truncate">
                    {user.schoolName || "SchoolVajo"}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{user.schoolCode}</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavItems()}
            {renderFooter()}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>

    {/* Desktop Fixed Sidebar */}
    <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-slate-200 z-20 flex-col">
      <div className="p-5 border-b border-slate-100">
        <button type="button" onClick={openSchool} className="flex items-center gap-3 w-full text-left hover:opacity-90 transition cursor-pointer">
          {user.schoolLogo ? (
            <img
              src={user.schoolLogo}
              alt="logo"
              className="w-10 h-10 rounded-xl object-cover shadow-sm bg-white border border-slate-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100 p-1.5 shrink-0">
              <img src="/logo.png" alt="logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-sm truncate">
              {user.schoolName || "SchoolVajo"}
            </div>
            <div className="text-xs text-slate-500">{user.schoolCode}</div>
          </div>
        </button>
      </div>

      {renderNavItems()}
      {renderFooter()}
    </aside>

    <AnimatePresence>
      {schoolOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Animated Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSchoolOpen(false)}
          />

          {/* Animated Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 z-10"
          >
            {/* Cover Banner Area */}
            <div className="relative w-full">
              {/* Top Banner Image with overflow-hidden */}
              <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                <img
                  src="/profile-cover.png"
                  alt="School Cover"
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

                {/* Frosted Glass Top Close Button */}
                <button
                  type="button"
                  onClick={() => setSchoolOpen(false)}
                  className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white/90 hover:text-white backdrop-blur-md transition border border-white/20 shadow-md cursor-pointer z-30"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Floating Centered School Logo (outside cover overflow-hidden so it never clips) */}
              <div className="absolute -bottom-12 sm:-bottom-14 left-1/2 -translate-x-1/2 z-20">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl border-4 border-white shadow-xl bg-white p-2.5 flex items-center justify-center overflow-hidden">
                  <img
                    src={school?.logoUrl || user.schoolLogo || "/logo.png"}
                    alt={school?.name || user.schoolName || "School Logo"}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* School Header & Badges */}
            <div className="pt-14 sm:pt-16 px-6 pb-2 text-center">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {school?.name || user.schoolName || "School Details"}
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-bold text-indigo-700 mt-2 shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>Code:</span>
                <span className="font-mono tracking-wider">{school?.schoolCode || user.schoolCode}</span>
              </div>
            </div>

            {/* Modal Body / Info Cards */}
            <div className="p-6 pt-3 space-y-3">
              {schoolLoading && !school ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-2.5">
                  <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
                  <span className="text-xs font-semibold text-slate-500">Loading school information...</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {school?.location && (
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-sm">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campus Address</div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-800 mt-0.5 leading-relaxed">
                          {school.location}
                        </div>
                      </div>
                    </div>
                  )}

                  {school?.phone && (
                    <a
                      href={`tel:${school.phone}`}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-sm hover:bg-indigo-50/40 hover:border-indigo-100 transition group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition truncate mt-0.5">
                          {school.phone}
                        </div>
                      </div>
                    </a>
                  )}

                  {school?.email && (
                    <a
                      href={`mailto:${school.email}`}
                      className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 text-sm hover:bg-indigo-50/40 hover:border-indigo-100 transition group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Email</div>
                        <div className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition truncate mt-0.5" title={school.email}>
                          {school.email}
                        </div>
                      </div>
                    </a>
                  )}

                  {!school?.location && !school?.phone && !school?.email && (
                    <div className="text-center py-6 px-4 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                      No additional contact details configured.
                    </div>
                  )}
                </div>
              )}

              {/* Admin Quick Action Button (if Admin) */}
              {user.role === "ADMIN" && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolOpen(false);
                      router.push("/admin/settings");
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold text-xs sm:text-sm hover:bg-indigo-100 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit School Details in Settings</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    </>
  );
}
