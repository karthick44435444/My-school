"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  Plus,
  Loader2,
  Award,
  Download,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Trophy,
  Medal,
  School,
  ChevronRight,
  User,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import CreateUserForm, { type CreateUserRole } from "@/components/forms/CreateUserForm";
import ExportAttendanceModal from "@/components/attendance/ExportAttendanceModal";

export default function PrincipalDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(["PRINCIPAL"]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [navigatingTopStudents, setNavigatingTopStudents] = useState(false);
  const [navigatingAttendance, setNavigatingAttendance] = useState(false);
  const [showCreate, setShowCreate] = useState<CreateUserRole | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [topStudents, setTopStudents] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadData = async () => {
    try {
      const [res, cRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/classes"),
      ]);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
        setTopStudents(data.topStudents || data.topStudentsByClass || []);
      }
      if (cRes.ok) {
        const cd = await cRes.json();
        setClasses(cd.classes || []);
      }
    } finally {
      setLoading(false);
    }
  };

  // Extract top 1st rank students (one per class, sorted descending)
  const top1stRankers = useMemo(() => {
    return topStudents
      .map((cls) => {
        const first = cls.students?.[0];
        if (!first) return null;
        return {
          ...first,
          classLabel: cls.classLabel,
          className: cls.className,
          section: cls.section,
        };
      })
      .filter(Boolean) as any[];
  }, [topStudents]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";

  // App Order Count Cards for Principal
  const overviewCards = [
    {
      label: "Present Today",
      value: stats?.presentToday ?? stats?.presentStudents ?? 0,
      subText: "",
      icon: UserCheck,
      href: "/principal/analytics",
      bg: "bg-[#F0FDF4]",
      border: "border-[#BBF7D0]",
      textCol: "text-[#15803D]",
      iconBg: "bg-[#16A34A]/15 text-[#16A34A]",
      shapeCol: "bg-[#16A34A]/10",
      badge: "Active",
    },
    {
      label: "Teachers",
      value: `${stats?.presentTeachers ?? stats?.checkedInTeachers ?? 0}/${stats?.totalTeachers ?? (typeof stats?.teachers === "number" ? stats?.teachers : 0)}`,
      subText: "Today check-in / Total",
      icon: GraduationCap,
      href: "/principal/teachers",
      bg: "bg-[#FDF2F8]",
      border: "border-[#FBCFE8]",
      textCol: "text-[#DB2777]",
      iconBg: "bg-[#EC4899]/15 text-[#EC4899]",
      shapeCol: "bg-[#EC4899]/10",
      badge: "Manage",
    },
    {
      label: "Students",
      value: `${stats?.presentToday ?? stats?.presentStudents ?? 0}/${stats?.totalStudents ?? 0}`,
      subText: "Today present / Total",
      icon: Users,
      href: "/principal/students",
      bg: "bg-[#F0F9FF]",
      border: "border-[#BAE6FD]",
      textCol: "text-[#0284C7]",
      iconBg: "bg-[#0EA5E9]/15 text-[#0EA5E9]",
      shapeCol: "bg-[#0EA5E9]/10",
      badge: "Roster",
    },
    {
      label: "Parents",
      value: stats?.totalParents ?? 0,
      subText: "Registered guardians",
      icon: BookOpen,
      href: undefined,
      bg: "bg-[#FAF5FF]",
      border: "border-[#E9D5FF]",
      textCol: "text-[#7C3AED]",
      iconBg: "bg-[#8B5CF6]/15 text-[#8B5CF6]",
      shapeCol: "bg-[#8B5CF6]/10",
      badge: "Registered",
    },
  ];

  // Attendance Analytics Metrics
  const totalStudentsCount = stats?.totalStudents || 1;
  const presentCount = Number(stats?.present ?? stats?.presentToday ?? 0);
  const absentCount = Number(stats?.absent ?? 0);
  const lateCount = Number(stats?.late ?? 0);
  const halfDayCount = Number(stats?.halfDay ?? 0);
  const unmarkedCount = Number(stats?.unmarked ?? Math.max(0, totalStudentsCount - (presentCount + absentCount + lateCount + halfDayCount)));
  const attendanceRate = stats?.rate ?? stats?.percentage ?? (totalStudentsCount > 0 ? Math.round(((presentCount + lateCount * 0.8) / totalStudentsCount) * 100) : 0);

  const maxChartVal = Math.max(presentCount, absentCount, lateCount, unmarkedCount, 1);

  const chartBars = [
    {
      label: "Present",
      count: presentCount,
      color: "#10B981",
      bgTrack: "bg-emerald-50",
      bgFill: "bg-emerald-500",
      textCol: "text-emerald-700",
    },
    {
      label: "Absent",
      count: absentCount,
      color: "#F43F5E",
      bgTrack: "bg-rose-50",
      bgFill: "bg-rose-500",
      textCol: "text-rose-700",
    },
    {
      label: "Late / Half",
      count: lateCount + halfDayCount,
      color: "#F59E0B",
      bgTrack: "bg-amber-50",
      bgFill: "bg-amber-500",
      textCol: "text-amber-700",
    },
    {
      label: "Unmarked",
      count: unmarkedCount,
      color: "#94A3B8",
      bgTrack: "bg-slate-100",
      bgFill: "bg-slate-400",
      textCol: "text-slate-600",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Principal Dashboard
            </h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              School overview, student performance rankings & attendance analytics
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowExport(true)}
              className="px-3.5 sm:px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition shadow-2xs text-slate-700 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export Attendance</span>
            </button>
            <button
              onClick={() => setShowCreate("TEACHER")}
              className="px-3.5 sm:px-4 py-2.5 rounded-2xl text-white text-xs font-bold flex items-center gap-2 shadow-2xs hover:opacity-95 transition cursor-pointer"
              style={{ backgroundColor: theme }}
            >
              <Plus className="w-4 h-4" />
              <span>Add Teacher</span>
            </button>
            <button
              onClick={() => setShowCreate("STUDENT")}
              className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition shadow-2xs text-slate-700"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        {/* 1. School Overview Count Cards (App Order & Colorful Background Shapes) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {overviewCards.map((item, i) => {
            const CardContent = (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`relative overflow-hidden rounded-3xl p-5 border ${item.border} ${item.bg} shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[140px]`}
              >
                {/* Background Shapes & Blobs */}
                <div
                  className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full ${item.shapeCol} blur-xs pointer-events-none`}
                />
                <div
                  className={`absolute -right-2 top-2 w-12 h-12 rounded-full ${item.shapeCol} opacity-50 pointer-events-none`}
                />
                <div
                  className={`absolute left-1/2 -top-8 w-20 h-20 rounded-full ${item.shapeCol} opacity-30 pointer-events-none`}
                />

                <div className="flex items-center justify-between relative z-10">
                  <div
                    className={`w-11 h-11 rounded-2xl ${item.iconBg} flex items-center justify-center shadow-2xs`}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  {item.href ? (
                    <div className="w-7 h-7 rounded-full bg-white/80 border border-slate-200/50 flex items-center justify-center text-slate-500 group-hover:text-slate-800 transition shadow-2xs">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 border border-slate-200/50 text-slate-600">
                      {item.badge}
                    </span>
                  )}
                </div>

                <div className="relative z-10 mt-3">
                  <div className="flex items-baseline gap-2 min-h-[36px] items-center">
                    {loading ? (
                      <Loader2 className={`w-6 h-6 animate-spin ${item.textCol} my-1`} />
                    ) : (
                      <span className={`text-3xl font-black ${item.textCol} tracking-tight`}>
                        {item.value}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-slate-800">{item.label}</span>
                    <span className="text-[11px] font-medium text-slate-500 truncate max-w-[120px]">
                      {item.subText}
                    </span>
                  </div>
                </div>
              </motion.div>
            );

            if (item.href) {
              return (
                <Link key={i} href={item.href} className="group block">
                  {CardContent}
                </Link>
              );
            }
            return <div key={i}>{CardContent}</div>;
          })}
        </div>

        {/* 2. Today Attendance Analytics Card with Rounded Corner Bar Chart */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-slate-900 text-base">
                    Today Attendance Analytics
                  </h2>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                    {attendanceRate}% Overall Rate
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNavigatingAttendance(true);
                  router.push("/principal/analytics");
                }}
                disabled={navigatingAttendance}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1.5 bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-100 transition shadow-2xs disabled:opacity-70 cursor-pointer"
              >
                {navigatingAttendance ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>View Full Attendance</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* KPI Summary Cards */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Present
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="mt-3 min-h-[32px] flex items-center">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-600 my-0.5" />
                  ) : (
                    <>
                      <span className="text-2xl font-black text-emerald-900">{presentCount}</span>
                      <span className="text-[11px] text-emerald-700 font-medium ml-1.5">
                        ({totalStudentsCount > 0 ? Math.round((presentCount / totalStudentsCount) * 100) : 0}%)
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                    Absent
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                </div>
                <div className="mt-3 min-h-[32px] flex items-center">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-rose-600 my-0.5" />
                  ) : (
                    <>
                      <span className="text-2xl font-black text-rose-900">{absentCount}</span>
                      <span className="text-[11px] text-rose-700 font-medium ml-1.5">
                        ({totalStudentsCount > 0 ? Math.round((absentCount / totalStudentsCount) * 100) : 0}%)
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    Late / Half
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </div>
                <div className="mt-3 min-h-[32px] flex items-center">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-amber-600 my-0.5" />
                  ) : (
                    <>
                      <span className="text-2xl font-black text-amber-900">{lateCount + halfDayCount}</span>
                      <span className="text-[11px] text-amber-700 font-medium ml-1.5">students</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Unmarked
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                </div>
                <div className="mt-3 min-h-[32px] flex items-center">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500 my-0.5" />
                  ) : (
                    <>
                      <span className="text-2xl font-black text-slate-800">{unmarkedCount}</span>
                      <span className="text-[11px] text-slate-500 font-medium ml-1.5">pending</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Rounded Corner Analytics Bar Chart */}
            <div className="lg:col-span-7 bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-700">Attendance Distribution</span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Total Capacity: {totalStudentsCount} Students
                </span>
              </div>

              <div className="flex items-end justify-around gap-4 h-40 pt-4 pb-1">
                {chartBars.map((b) => {
                  const barHeightPct = Math.max(8, Math.round((b.count / maxChartVal) * 100));
                  return (
                    <div key={b.label} className="flex flex-col items-center flex-1 max-w-[90px] h-full justify-end">
                      <div className="min-h-[20px] flex items-center justify-center mb-1.5">
                        {loading ? (
                          <Loader2 className={`w-3.5 h-3.5 animate-spin ${b.textCol}`} />
                        ) : (
                          <span className={`text-xs font-black ${b.textCol}`}>
                            {b.count}
                          </span>
                        )}
                      </div>
                      {/* Vertical Track with Corner Radius Pill */}
                      <div className={`w-12 sm:w-14 h-24 rounded-2xl ${b.bgTrack} p-1 flex flex-col justify-end overflow-hidden border border-slate-200/50 shadow-2xs`}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${loading ? 15 : barHeightPct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`w-full rounded-xl ${b.bgFill} shadow-xs ${loading ? "opacity-60 animate-pulse" : ""}`}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 mt-2 truncate text-center w-full">
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Top Students (by Class) - 1st Rank Student in Descending Class Order */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/90 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-slate-900 text-base">
                    Top Students (by class)
                  </h2>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Rank #1 Champions
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  1st Rank top performers across classes (ordered 12 A, 12 B, 11 A ... Pre-KG A)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setNavigatingTopStudents(true);
                router.push("/principal/top-students");
              }}
              disabled={navigatingTopStudents}
              className="px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-70"
            >
              {navigatingTopStudents ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>View All ({top1stRankers.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-amber-500 mb-1" />
              <span className="text-xs font-bold text-slate-600">Calculating top rankers...</span>
            </div>
          ) : top1stRankers.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 p-12 text-center bg-slate-50/50">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-100">
                <Award className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">No exam marks published yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Class ranks and top student cards will automatically appear here once teachers record and publish exam marks.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {top1stRankers.slice(0, 12).map((s, idx) => (
                <Link
                  key={s.id || idx}
                  href={`/principal/students?highlight=${s.id}`}
                  className="block group cursor-pointer"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="relative bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-lg hover:border-amber-300 transition-all flex flex-col justify-between overflow-hidden h-full"
                  >
                    {/* Top Golden Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />
                    <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-500/10 rounded-full blur-lg pointer-events-none group-hover:scale-125 transition-transform" />

                    <div>
                      {/* Header: Class Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-extrabold flex items-center gap-1 border border-slate-200/60">
                          <School className="w-3.5 h-3.5 text-indigo-600" />
                          Class {s.classLabel}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                          <Trophy className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* 90% Width 1:1 Ratio Student Profile Showcase */}
                      <div className="flex flex-col items-center text-center my-2">
                        <div className="w-[90%] aspect-square mx-auto mb-3 rounded-2xl p-1 bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 shadow-md group-hover:scale-[1.02] transition-transform">
                          {s.photoUrl ? (
                            <img
                              src={s.photoUrl}
                              alt=""
                              className="w-full h-full rounded-[14px] object-cover bg-white"
                            />
                          ) : (
                            <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-4xl sm:text-5xl shadow-inner">
                              {(s.firstName?.[0] || "S").toUpperCase()}
                            </div>
                          )}
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight group-hover:text-indigo-600 transition-colors">
                          {s.firstName} {s.lastName || ""}
                        </h3>
                        {(s.rollNumber || s.rollNo) ? (
                          <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                            Roll: <strong>{s.rollNumber || s.rollNo}</strong>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Marks & Percentage Box */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Total Marks
                          </div>
                          <div className="text-xs font-black text-slate-800 mt-0.5">
                            {s.totalMarks} <span className="text-[10px] text-slate-400 font-normal">/ {s.maxMarks}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Percentage
                          </div>
                          <div className="text-xs font-black text-emerald-600">
                            {s.percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}

          {top1stRankers.length > 12 && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setNavigatingTopStudents(true);
                  router.push("/principal/top-students");
                }}
                disabled={navigatingTopStudents}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition disabled:opacity-70"
              >
                {navigatingTopStudents ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Loading top students...</span>
                  </>
                ) : (
                  <>
                    <span>View all {top1stRankers.length} Class Top Rankers</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      <CreateUserForm
        role={showCreate || "TEACHER"}
        theme={theme}
        classes={classes}
        open={!!showCreate}
        onClose={() => setShowCreate(null)}
        onCreated={() => {
          setShowCreate(null);
          loadData();
        }}
      />
      <ExportAttendanceModal
        open={showExport}
        onClose={() => setShowExport(false)}
        theme={theme}
        schoolName={user?.schoolName}
        schoolLogo={user?.schoolLogo}
        classes={classes}
      />
    </div>
  );
}
