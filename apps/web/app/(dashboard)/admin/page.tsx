"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  Plus,
  Loader2,
  TrendingUp,
  Download,
  Calendar,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  X,
  Info,
  Heart,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import CreateUserForm, {
  type CreateUserRole,
} from "@/components/forms/CreateUserForm";
import ExportAttendanceModal from "@/components/attendance/ExportAttendanceModal";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(["ADMIN"]);
  const [stats, setStats] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [principals, setPrincipals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigatingAttendance, setNavigatingAttendance] = useState(false);
  const [showCreate, setShowCreate] = useState<CreateUserRole | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadData().finally(() => {});
    return () => {
      cancelled = true;
    };
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
        setTeachers(data.teachers || []);
        setStudents(data.students || []);
        setPrincipals(data.principals || []);
      }
      if (cRes.ok) {
        const cd = await cRes.json();
        setClasses(cd.classes || []);
      }
    } catch (e) {
      console.error("dashboard stats", e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";

  // Colourful overview cards with decorative background shapes
  const overviewCards = [
    {
      label: "Principals",
      value: stats?.totalPrincipals || 0,
      subText: "Active in school",
      icon: UserCheck,
      href: "/admin/principals",
      bg: "bg-[#FAF5FF]",
      border: "border-[#E9D5FF]",
      textCol: "text-[#7C3AED]",
      iconBg: "bg-[#8B5CF6]/15 text-[#8B5CF6]",
      shapeCol: "bg-[#8B5CF6]/10",
      badge: "Leadership",
    },
    {
      label: "Teachers",
      value: `${stats?.presentTeachers ?? stats?.checkedInTeachers ?? 0}/${stats?.totalTeachers ?? (typeof stats?.teachers === "number" ? stats?.teachers : 0)}`,
      subText: "Today check-in / Total",
      icon: GraduationCap,
      href: "/admin/teachers",
      bg: "bg-[#FDF2F8]",
      border: "border-[#FBCFE8]",
      textCol: "text-[#DB2777]",
      iconBg: "bg-[#EC4899]/15 text-[#EC4899]",
      shapeCol: "bg-[#EC4899]/10",
      badge: "Faculty",
    },
    {
      label: "Students",
      value: `${stats?.presentToday ?? stats?.presentStudents ?? 0}/${stats?.totalStudents || 0}`,
      subText: "Today present / Total",
      icon: Users,
      href: "/admin/students",
      bg: "bg-[#F0F9FF]",
      border: "border-[#BAE6FD]",
      textCol: "text-[#0284C7]",
      iconBg: "bg-[#0EA5E9]/15 text-[#0EA5E9]",
      shapeCol: "bg-[#0EA5E9]/10",
      badge: "Enrolled",
    },
    {
      label: "Parents",
      value: stats?.totalParents || 0,
      subText: "Registered guardians",
      icon: BookOpen,
      href: undefined,
      bg: "bg-[#F0FDF4]",
      border: "border-[#BBF7D0]",
      textCol: "text-[#15803D]",
      iconBg: "bg-[#16A34A]/15 text-[#16A34A]",
      shapeCol: "bg-[#16A34A]/10",
      badge: "Community",
    },
  ];

  // Attendance Analytics Metrics
  const totalStudentsCount = stats?.totalStudents || 1;
  const presentCount = Number(stats?.present ?? stats?.presentToday ?? 0);
  const absentCount = Number(stats?.absent ?? 0);
  const lateCount = Number(stats?.late ?? 0);
  const halfDayCount = Number(stats?.halfDay ?? 0);
  const unmarkedCount = Number(
    stats?.unmarked ??
      Math.max(
        0,
        totalStudentsCount -
          (presentCount + absentCount + lateCount + halfDayCount),
      ),
  );
  const attendanceRate =
    stats?.rate ??
    stats?.percentage ??
    (totalStudentsCount > 0
      ? Math.round(
          ((presentCount + lateCount * 0.8) / totalStudentsCount) * 100,
        )
      : 0);

  const chartBars = [
    {
      label: "Present",
      count: presentCount,
      bgFill: "bg-emerald-500",
      bgTrack: "bg-emerald-100/60",
      textCol: "text-emerald-700",
    },
    {
      label: "Absent",
      count: absentCount,
      bgFill: "bg-rose-500",
      bgTrack: "bg-rose-100/60",
      textCol: "text-rose-700",
    },
    {
      label: "Late / Half",
      count: lateCount + halfDayCount,
      bgFill: "bg-amber-500",
      bgTrack: "bg-amber-100/60",
      textCol: "text-amber-700",
    },
    {
      label: "Unmarked",
      count: unmarkedCount,
      bgFill: "bg-slate-400",
      bgTrack: "bg-slate-200/60",
      textCol: "text-slate-600",
    },
  ];
  const maxChartVal = Math.max(...chartBars.map((b) => b.count), 1);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />

      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Admin Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Full control of {user.schoolName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowExport(true)}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Attendance
            </button>
            <button
              onClick={() => setShowCreate("PRINCIPAL")}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 cursor-pointer shadow-sm"
              style={{ backgroundColor: theme }}
            >
              <Plus className="w-4 h-4" /> Principal
            </button>
            <button
              onClick={() => setShowCreate("TEACHER")}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium flex items-center gap-2 hover:bg-slate-50 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Teacher
            </button>
            <button
              onClick={() => setShowCreate("STUDENT")}
              className="px-3.5 sm:px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium flex items-center gap-2 hover:bg-slate-50 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Student
            </button>
          </div>
        </div>

        {/* 1. Colourful Overview Count Cards with Shapes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {overviewCards.map((item, i) => {
            const CardContent = (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`relative overflow-hidden rounded-3xl p-5 border shadow-2xs transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${item.bg} ${item.border}`}
              >
                {/* Decorative background shapes */}
                <div
                  className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full pointer-events-none transition-transform group-hover:scale-125 ${item.shapeCol}`}
                />
                <div
                  className={`absolute right-12 -top-4 w-12 h-12 rounded-full pointer-events-none opacity-40 ${item.shapeCol}`}
                />

                <div className="relative z-10 flex items-center justify-between mb-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-2xs ${item.iconBg}`}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/80 shadow-2xs text-slate-700">
                      {item.badge}
                    </span>
                    {item.href && (
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    )}
                  </div>
                </div>

                <div className="relative z-10">
                  <div className="text-xs font-bold text-slate-500">
                    {item.label}
                  </div>
                  <div className="min-h-[36px] flex items-center mt-1">
                    {loading ? (
                      <Loader2
                        className={`w-6 h-6 animate-spin ${item.textCol}`}
                      />
                    ) : (
                      <div
                        className={`text-2xl sm:text-3xl font-black tracking-tight ${item.textCol}`}
                      >
                        {item.value}
                      </div>
                    )}
                  </div>
                  {item.subText && (
                    <div className="text-[11px] font-semibold text-slate-400 mt-1 truncate">
                      {item.subText}
                    </div>
                  )}
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
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNavigatingAttendance(true);
                  router.push("/admin/analytics");
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
                      <span className="text-2xl font-black text-emerald-900">
                        {presentCount}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-medium ml-1.5">
                        (
                        {totalStudentsCount > 0
                          ? Math.round(
                              (presentCount / totalStudentsCount) * 100,
                            )
                          : 0}
                        %)
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
                      <span className="text-2xl font-black text-rose-900">
                        {absentCount}
                      </span>
                      <span className="text-[11px] text-rose-700 font-medium ml-1.5">
                        (
                        {totalStudentsCount > 0
                          ? Math.round((absentCount / totalStudentsCount) * 100)
                          : 0}
                        %)
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
                      <span className="text-2xl font-black text-amber-900">
                        {lateCount + halfDayCount}
                      </span>
                      <span className="text-[11px] text-amber-700 font-medium ml-1.5">
                        students
                      </span>
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
                      <span className="text-2xl font-black text-slate-800">
                        {unmarkedCount}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium ml-1.5">
                        pending
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Rounded Corner Analytics Bar Chart */}
            <div className="lg:col-span-7 bg-slate-50/80 rounded-2xl border border-slate-200/80 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-700">
                  Attendance Distribution
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Total Capacity: {totalStudentsCount} Students
                </span>
              </div>

              <div className="flex items-end justify-around gap-4 h-40 pt-4 pb-1">
                {chartBars.map((b) => {
                  const barHeightPct = Math.max(
                    8,
                    Math.round((b.count / maxChartVal) * 100),
                  );
                  return (
                    <div
                      key={b.label}
                      className="flex flex-col items-center flex-1 max-w-[90px] h-full justify-end"
                    >
                      <div className="min-h-[20px] flex items-center justify-center mb-1.5">
                        {loading ? (
                          <Loader2
                            className={`w-3.5 h-3.5 animate-spin ${b.textCol}`}
                          />
                        ) : (
                          <span className={`text-xs font-black ${b.textCol}`}>
                            {b.count}
                          </span>
                        )}
                      </div>
                      {/* Vertical Track with Corner Radius Pill */}
                      <div
                        className={`w-12 sm:w-14 h-24 rounded-2xl ${b.bgTrack} p-1 flex flex-col justify-end overflow-hidden border border-slate-200/50 shadow-2xs`}
                      >
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{
                            height: `${loading ? 15 : barHeightPct}%`,
                          }}
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

        <div className="grid md:grid-cols-3 gap-6">
          {/* Principals */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">Principals</h2>
              <Link
                href="/admin/principals"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                View all
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              </div>
            ) : principals.length === 0 ? (
              <p className="text-sm text-slate-400">No principals yet</p>
            ) : (
              <div className="space-y-3">
                {principals.slice(0, 10).map((p) => (
                  <Link
                    key={p.id}
                    href={`/admin/principals?highlight=${p.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-purple-50 transition cursor-pointer"
                  >
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                        {p.firstName[0]}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {p.firstName} {p.lastName}
                      </div>
                      <div className="text-xs text-slate-500">{p.username}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">
                Teachers ({teachers.length})
              </h2>
              <Link
                href="/admin/teachers"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                View all
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              </div>
            ) : teachers.length === 0 ? (
              <p className="text-sm text-slate-400">No teachers yet</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {teachers.slice(0, 10).map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/teachers?highlight=${t.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 transition cursor-pointer"
                  >
                    {t.photoUrl ? (
                      <img
                        src={t.photoUrl}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {t.firstName[0]}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {t.firstName} {t.lastName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {t.teacherType || "Teacher"} • {t.className || "-"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900">
                Students ({students.length})
              </h2>
              <Link
                href="/admin/students"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                View all
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-pink-600" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-sm text-slate-400">No students yet</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {students.slice(0, 10).map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/students?highlight=${s.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-pink-50 transition cursor-pointer"
                  >
                    {s.photoUrl ? (
                      <img
                        src={s.photoUrl}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold text-sm">
                        {s.firstName[0]}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium">
                        {s.firstName} {s.lastName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {s.className}-{s.section}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
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
