"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Check,
  X,
  Clock,
  Save,
  Lock,
  Calendar,
  History,
  ArrowRight,
  Users,
  Percent,
  CheckCircle2,
  XCircle,
  Filter,
  School,
  Search,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import Pagination from "@/components/shared/Pagination";
import { formatDDMMYYYY } from "@/lib/validation";
import { getLocalDateString } from "@/lib/utils";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
type GenderFilter = "ALL" | "BOYS" | "GIRLS";

export default function TeacherAttendancePage() {
  const { user, loading: authLoading } = useAuth(["TEACHER"]);
  const [classOpts, setClassOpts] = useState<any[]>([]);
  const [selected, setSelected] = useState({ className: "", section: "" });
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  // Date is locked to local today date on daily attendance page
  const date = getLocalDateString();

  const loadClasses = useCallback(async () => {
    const res = await fetch("/api/teacher-classes");
    if (!res.ok) return;
    const d = await res.json();
    const opts = (d.classes || []).filter((c: any) => c.role === "CLASS_TEACHER");
    setClassOpts(opts);
    if (opts[0] && !selected.className) {
      setSelected({ className: opts[0].className, section: opts[0].section || "" });
    }
  }, [selected.className]);

  const loadStudents = useCallback(async () => {
    if (!selected.className) {
      setStudents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        className: selected.className,
        date,
      });
      if (selected.section) params.set("section", selected.section);
      const res = await fetch(`/api/attendance/class?${params}`);
      if (res.ok) {
        const d = await res.json();
        const list = d.students || [];
        setStudents(list);
        const map: Record<string, AttendanceStatus> = {};
        list.forEach((s: any) => {
          if (s.status === "PRESENT" || s.status === "ABSENT" || s.status === "LATE") {
            map[s.studentId] = s.status;
          }
        });
        setAttendance(map);
      }
    } finally {
      setLoading(false);
    }
  }, [selected.className, selected.section, date]);

  useEffect(() => {
    if (user) loadClasses();
  }, [user, loadClasses]);

  useEffect(() => {
    if (user && selected.className) loadStudents();
    else if (user && classOpts.length === 0) setLoading(false);
  }, [user, selected, loadStudents, classOpts.length]);

  const setStudentStatus = (id: string, status: AttendanceStatus) => {
    setAttendance((prev) => ({
      ...prev,
      [id]: status,
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    const map: Record<string, AttendanceStatus> = {};
    students.forEach((s) => {
      map[s.studentId] = status;
    });
    setAttendance(map);
  };

  const save = async () => {
    const unmarked = students.filter((s) => !attendance[s.studentId]);
    if (unmarked.length > 0) {
      toast.error(`Please mark attendance for all students (${unmarked.length} remaining) or click 'All Present'`);
      return;
    }
    const records = students.map((s) => ({
      studentId: s.studentId,
      status: attendance[s.studentId] as AttendanceStatus,
    }));
    if (records.length === 0) {
      toast.error("No students to mark");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, records }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(data.message || "Attendance saved successfully!");
      await loadStudents();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isMale = (gender?: string) => {
    const g = String(gender || "").toUpperCase().trim();
    return g === "MALE" || g === "BOY" || g === "M";
  };

  const isFemale = (gender?: string) => {
    const g = String(gender || "").toUpperCase().trim();
    return g === "FEMALE" || g === "GIRL" || g === "F";
  };

  const boysCount = useMemo(
    () => students.filter((s) => isMale(s.gender)).length,
    [students]
  );

  const girlsCount = useMemo(
    () => students.filter((s) => isFemale(s.gender)).length,
    [students]
  );

  const filteredStudents = useMemo(() => {
    let list = students;
    if (genderFilter === "BOYS") {
      list = list.filter((s) => isMale(s.gender));
    } else if (genderFilter === "GIRLS") {
      list = list.filter((s) => isFemale(s.gender));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const roll = String(s.rollNumber || s.rollNo || "").toLowerCase();
        const email = String(s.email || "").toLowerCase();
        const studentId = String(s.studentId || "").toLowerCase();
        return name.includes(q) || roll.includes(q) || email.includes(q) || studentId.includes(q);
      });
    }
    return list;
  }, [students, genderFilter, searchQuery]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredStudents, page, pageSize]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";
  const total = students.length;
  const present = students.filter((s) => s.status === "PRESENT").length;
  const late = students.filter((s) => s.status === "LATE").length;
  const absent = students.filter((s) => s.status === "ABSENT").length;
  const ratePct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-4 border-b border-slate-200 pb-2.5">
          <Link
            href="/teacher/attendance"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition"
            style={{ backgroundColor: theme }}
          >
            Today&apos;s Attendance
          </Link>
          <Link
            href="/teacher/attendance/history"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            Attendance History &amp; Reports
            <ArrowRight className="w-3 h-3 text-slate-400 ml-0.5" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Daily Attendance</h1>
          </div>
          {classOpts.length > 0 && (
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Locked Today Date Display */}
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium shadow-2xs"
                title="Date is locked to today for daily attendance"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  Today: <strong className="text-slate-900 font-mono">{formatDDMMYYYY(date)}</strong>
                </span>
                <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold ml-1">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              </div>

              <button
                onClick={save}
                disabled={saving || !selected.className}
                className="px-3.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-sm transition hover:opacity-95"
                style={{ backgroundColor: theme }}
              >
                <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          )}
        </div>

        {classOpts.length > 1 && (
          <div className="flex gap-2 flex-wrap mb-5">
            {classOpts.map((c) => {
              const active =
                selected.className === c.className && (selected.section || "") === (c.section || "");
              const label = `${c.className}${c.section ? `-${c.section}` : ""}`;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setSelected({ className: c.className, section: c.section || "" });
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
                    active
                      ? "text-white border-transparent shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                  }`}
                  style={active ? { backgroundColor: theme } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {classOpts.length === 1 && (
          <div className="mb-4 text-sm text-slate-600">
            Class:{" "}
            <strong>
              {classOpts[0].className}
              {classOpts[0].section ? `-${classOpts[0].section}` : ""}
            </strong>
          </div>
        )}

        {classOpts.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
              <School className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No classes allocated for you</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You have not been assigned to any classes or subjects yet. Please contact the administrator.
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {/* KPI Metrics Cards - Space-saving & Responsive */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4">
              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Total
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 mt-1">{total}</div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Rate
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Percent className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-emerald-600 mt-1">{ratePct}%</div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Present
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-emerald-600 mt-1">{present}</div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Late
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-amber-600 mt-1">{late}</div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Absent
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                    <XCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-rose-600 mt-1">{absent}</div>
              </div>
            </div>

            {/* Quick Actions, Search & Gender Filters */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
              {/* Search Bar & Gender Filters */}
              <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">
                {/* Search Field */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search name, roll no..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Gender Filter Pills with Counts */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setGenderFilter("ALL");
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                      genderFilter === "ALL"
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    All ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGenderFilter(genderFilter === "BOYS" ? "ALL" : "BOYS");
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                      genderFilter === "BOYS"
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    👦 Boys ({boysCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGenderFilter(genderFilter === "GIRLS" ? "ALL" : "GIRLS");
                      setPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
                      genderFilter === "GIRLS"
                        ? "bg-pink-600 text-white border-pink-600 shadow-2xs"
                        : "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100"
                    }`}
                  >
                    👧 Girls ({girlsCount})
                  </button>
                </div>
              </div>

              {/* Batch Actions: All Present Only */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
                  Mark All:
                </span>
                <button
                  type="button"
                  onClick={() => markAll("PRESENT")}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" /> All Present
                </button>
              </div>
            </div>

            {/* Students List */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                {filteredStudents.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">
                    {students.length === 0
                      ? "No students in this class"
                      : searchQuery.trim()
                      ? `No students match "${searchQuery}"`
                      : `No ${genderFilter.toLowerCase()} found in this class`}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {paginatedStudents.map((s) => {
                      const st = attendance[s.studentId];
                      const isBoy = isMale(s.gender);
                      const isGirl = isFemale(s.gender);

                      return (
                        <div
                          key={s.studentId}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition flex-wrap sm:flex-nowrap gap-3"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Avatar
                              name={`${s.firstName} ${s.lastName || ""}`}
                              photoUrl={s.photoUrl}
                              size={40}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                                <span>
                                  {s.firstName} {s.lastName || ""}
                                </span>
                                {isBoy && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                    Boy
                                  </span>
                                )}
                                {isGirl && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-100">
                                    Girl
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                <span>
                                  {s.className}
                                  {s.section ? `-${s.section}` : ""}
                                </span>
                                <span>•</span>
                                <span className="font-semibold text-slate-600">Roll: {s.rollNumber || s.rollNo || "-"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Status Toggle Buttons: Present, Late, Absent */}
                          <div className="flex items-center gap-1.5 shrink-0 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
                            <button
                              type="button"
                              onClick={() => setStudentStatus(s.studentId, "PRESENT")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                st === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-emerald-700 hover:bg-white/60"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Present
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentStatus(s.studentId, "LATE")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                st === "LATE"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "text-slate-600 hover:text-amber-700 hover:bg-white/60"
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" /> Late
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentStatus(s.studentId, "ABSENT")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                                st === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-rose-700 hover:bg-white/60"
                              }`}
                            >
                              <X className="w-3.5 h-3.5 stroke-[2.5]" /> Absent
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {filteredStudents.length > 0 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={filteredStudents.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  themeColor={theme}
                />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
