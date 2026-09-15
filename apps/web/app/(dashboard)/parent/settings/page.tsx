"use client";

import { useEffect, useState } from "react";
import {
  Loader2, LogOut, User, Mail, Phone,
  Lock, ChevronRight, Building2, Users2, KeyRound, Info, HeartHandshake
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import ChangePasswordView from "@/components/profile/ChangePasswordView";
import LogoutModal from "@/components/profile/LogoutModal";
import { formatPersonName } from "@/lib/utils";

export default function ParentSettingsPage() {
  const { user, loading: authLoading } = useAuth(["PARENT"]);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"profile" | "password">("profile");
  const [showLogout, setShowLogout] = useState(false);
  const [firstChild, setFirstChild] = useState<any>(null);
  const [allChildren, setAllChildren] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigateToPassword = () => {
    window.scrollTo(0, 0);
    setView("password");
  };

  const navigateToProfile = () => {
    window.scrollTo(0, 0);
    setView("profile");
  };

  useEffect(() => {
    if (!user) return;
    fetch("/api/users/list?role=STUDENT")
      .then((r) => r.json())
      .then((d) => {
        const uEmail = user.email?.trim().toLowerCase();
        const uUsername = user.username?.trim().toLowerCase();
        const userChildrenIds = new Set((user.childrenIds || []).map(String));

        const kids = (d.users || []).filter((s: any) => {
          if (s.role !== "STUDENT" || s.isActive === false) return false;
          const pEmail = s.parentEmail?.trim().toLowerCase();
          if (pEmail && (pEmail === uEmail || pEmail === uUsername)) return true;
          if (s.parentId && s.parentId === user.id) return true;
          if (s.id && userChildrenIds.has(String(s.id))) return true;
          return false;
        });
        setAllChildren(kids);
        if (kids.length > 0) {
          setFirstChild(kids[0]);
        }
      })
      .catch(() => {});
  }, [user]);

  if (!mounted || authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";
  const displayPhone = firstChild?.phone || user.phone || (user as any).phone || "—";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {view === "password" ? "Security & Passwords" : "Parent Profile & Settings"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              View your parent account profile and manage your security
            </p>
          </div>
        </div>

        {/* Change Password Subview */}
        {view === "password" ? (
          <ChangePasswordView onBack={navigateToProfile} themeColor={theme} />
        ) : (
          <div className="w-full space-y-6">
            {/* Hero Profile Card with Cover & Floating Avatar */}
            <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              {/* Background Cover Image */}
              <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 w-full bg-slate-100 overflow-hidden">
                <img
                  src="/profile-cover.png"
                  alt="Profile Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
                <div className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-xs text-xs font-bold text-slate-800 shadow-xs">
                  {user.schoolCode}
                </div>
              </div>

              {/* Profile Header Information */}
              <div className="px-6 pb-6 pt-0 relative flex flex-col items-center">
                {/* Centered Half-Floating Profile Avatar */}
                <div className="relative -mt-16 sm:-mt-20 md:-mt-24 mb-3">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 border-white shadow-xl bg-amber-50 ring-4 ring-slate-100/90 overflow-hidden relative flex items-center justify-center p-2">
                    <img
                      src="/parent-avatar.png"
                      alt="Parent"
                      className="w-full h-full object-contain rounded-full"
                    />
                  </div>
                </div>

                {/* Name & Badges */}
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight text-center">
                  {formatPersonName(user.firstName, user.lastName)}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 text-center">
                  @{user.username}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <HeartHandshake className="w-3.5 h-3.5 text-amber-600" />
                    Parent / Guardian
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    {user.schoolName || user.schoolCode}
                  </span>
                  {allChildren.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Users2 className="w-3.5 h-3.5" />
                      {allChildren.length} {allChildren.length === 1 ? "Child Linked" : "Children Linked"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Read-Only Notice */}
            <div className="w-full flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Personal contact details are managed by the school administration. To request an update, please reach out to your school admin.
              </span>
            </div>

            {/* Personal Details Information Grid */}
            <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">Parent Profile Details</h3>
                  <p className="text-xs text-slate-500">Official linked profile information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={formatPersonName(user.firstName, user.lastName)}>
                      {formatPersonName(user.firstName, user.lastName)}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Username</div>
                    <div className="text-sm font-bold font-mono text-slate-900 mt-0.5 truncate" title={user.username}>
                      {user.username}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={user.email || ""}>
                      {user.email || "—"}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={displayPhone}>
                      {displayPhone}
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked Children List */}
              {allChildren.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Users2 className="w-4 h-4 text-indigo-500" />
                    <span>Linked Student(s)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allChildren.map((child: any) => (
                      <div
                        key={child.id || child.username}
                        className="p-3.5 rounded-2xl border border-slate-200/80 bg-white flex items-center gap-3 shadow-2xs"
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-100 shrink-0">
                          {(child.firstName || "?")[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">
                            {formatPersonName(child.firstName, child.lastName)}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            Class: {child.className}{child.section ? `-${child.section}` : ""} · Roll #{child.rollNumber || child.rollNo || "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings and Passwords Section */}
            <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">Settings and passwords</h3>
                  <p className="text-xs text-slate-500">Manage account credentials and login security</p>
                </div>
              </div>

              <button
                type="button"
                onClick={navigateToPassword}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-amber-50/40 hover:border-amber-200 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-amber-600 transition">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 group-hover:text-amber-600 transition">
                      Change Password
                    </div>
                    <div className="text-xs text-slate-500">
                      Update your login password to keep your account secure
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
                  <span>Change</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </button>
            </div>

            {/* Logout Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowLogout(true)}
                className="w-full py-3.5 rounded-2xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Parent Account</span>
              </button>
            </div>
          </div>
        )}

        {/* Logout Modal */}
        <LogoutModal open={showLogout} onClose={() => setShowLogout(false)} />
      </main>
    </div>
  );
}
