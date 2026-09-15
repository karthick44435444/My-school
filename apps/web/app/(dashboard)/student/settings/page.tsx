"use client";

import { useEffect, useState } from "react";
import {
  Loader2, LogOut, User, Mail, Phone,
  Lock, Building2, GraduationCap, Info, Calendar, Hash
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import LogoutModal from "@/components/profile/LogoutModal";
import { formatPersonName, formatDDMMYYYY } from "@/lib/utils";

export default function StudentSettingsPage() {
  const { user, loading: authLoading } = useAuth(["STUDENT"]);
  const [mounted, setMounted] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const u = user as any;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Student Profile &amp; Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              View your student academic profile and account information
            </p>
          </div>
        </div>

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
                <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 border-white shadow-xl bg-white ring-4 ring-slate-100/90 overflow-hidden relative flex items-center justify-center">
                  <Avatar
                    name={user.firstName}
                    photoUrl={user.photoUrl}
                    size={144}
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Name & Badges */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight text-center">
                {formatPersonName(user.firstName, user.lastName)}
              </h2>
              {user.className && (
                <div className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs sm:text-sm font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Class {user.className}{user.section ? ` · Section ${user.section}` : ""}</span>
                </div>
              )}
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 text-center">
                @{user.username}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                  <GraduationCap className="w-3.5 h-3.5 text-cyan-600" />
                  Student
                </span>
                {(u.rollNumber || u.rollNo) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    Roll #{u.rollNumber || u.rollNo}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {user.schoolName || user.schoolCode}
                </span>
              </div>
            </div>
          </div>

          {/* Read-Only Notice */}
          <div className="w-full flex items-center gap-3 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Student details and class enrollments are managed by teachers and administrators. Contact your school if changes are needed.
            </span>
          </div>

          {/* Student Profile Information Grid */}
          <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900">Academic &amp; Personal Profile</h3>
                <p className="text-xs text-slate-500">Official student records</p>
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
                  <Hash className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Class &amp; Section</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                    {user.className ? `${user.className}${user.section ? ` - ${user.section}` : ""}` : "—"}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <Hash className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Roll Number</div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5 truncate">
                    {u.rollNumber || u.rollNo || "—"}
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
                  <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={u.phone || ""}>
                    {u.phone || "—"}
                  </div>
                </div>
              </div>

              {u.dateOfBirth && (
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                      {formatDDMMYYYY(u.dateOfBirth)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Logout Action */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowLogout(true)}
              className="w-full py-3.5 rounded-2xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Student Account</span>
            </button>
          </div>
        </div>

        {/* Logout Modal */}
        <LogoutModal open={showLogout} onClose={() => setShowLogout(false)} />
      </main>
    </div>
  );
}
