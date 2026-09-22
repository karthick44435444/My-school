"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Loader2, Users, GraduationCap, Menu, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Pagination from "@/components/shared/Pagination";
import ExportAttendanceModal from "@/components/attendance/ExportAttendanceModal";
import { downloadAttendanceReport } from "@/lib/attendanceExportClient";

const COLORS = ["#6366F1", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6"];

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PrincipalAnalyticsPage() {
  const { user, loading } = useAuth(["ADMIN", "PRINCIPAL"]);
  const [stats, setStats] = useState<any>(null);
  const [att, setAtt] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<"students" | "teachers">("students");
  const [preset, setPreset] = useState("today");
  const [from, setFrom] = useState(() => fmt(new Date()));
  const [to, setTo] = useState(() => fmt(new Date()));
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [teacherRep, setTeacherRep] = useState<any>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [studentPage, setStudentPage] = useState(1);
  const [teacherPage, setTeacherPage] = useState(1);
  const pageSize = 20;

  const filterRef = useRef({ from, to, className, section });
  filterRef.current = { from, to, className, section };

  const handleQuickDownload = async (format: "excel" | "pdf") => {
    setDownloadingFormat(format);
    try {
      await downloadAttendanceReport({
        format,
        type: tab === "students" ? "student" : "teacher",
        from,
        to,
        className: tab === "students" ? (className || undefined) : undefined,
        section: tab === "students" ? (section || undefined) : undefined,
        schoolName: user?.schoolName || "SchoolVajo",
        themeColor: user?.themeColor || "#6366F1",
      });
      toast.success(
        `${tab === "students" ? "Student attendance" : "Teacher check-in"} (${format.toUpperCase()}) downloaded successfully!`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || `Failed to download ${format.toUpperCase()}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const applyPreset = (p: string) => {
    setPreset(p);
    setStudentPage(1);
    setTeacherPage(1);
    const today = new Date();
    const t = fmt(today);
    if (p === "today") {
      setFrom(t);
      setTo(t);
    } else if (p === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const ys = fmt(y);
      setFrom(ys);
      setTo(ys);
    } else if (p === "last5") {
      const s = new Date();
      s.setDate(s.getDate() - 4);
      setFrom(fmt(s));
      setTo(t);
    } else if (p === "last30") {
      const s = new Date();
      s.setDate(s.getDate() - 29);
      setFrom(fmt(s));
      setTo(t);
    }
  };

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { from: curFrom, to: curTo, className: curClass, section: curSection } = filterRef.current;
      const params = new URLSearchParams({ from: curFrom, to: curTo });
      if (curClass) params.set("className", curClass);
      if (curSection) params.set("section", curSection);

      const expParams = new URLSearchParams({
        type: "student",
        format: "json",
        from: curFrom,
        to: curTo,
      });
      if (curClass) expParams.set("className", curClass);
      if (curSection) expParams.set("section", curSection);

      const [s, a, c, tr, exp] = await Promise.all([
        fetch("/api/dashboard/stats").then((r) => r.json()),
        fetch(`/api/attendance/stats?${params}`).then((r) => r.json()),
        fetch("/api/classes").then((r) => r.json()),
        fetch(`/api/attendance/teachers?from=${curFrom}&to=${curTo}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/attendance/export?${expParams}`).then((r) => r.json()).catch(() => ({ records: [] })),
      ]);
      setStats(s.stats);
      setAtt(a);
      setClasses(c.classes || []);
      setTeacherRep(tr);
      setStudentRecords(exp.records || []);
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const isMultiDay = from !== to;

  const studentSummaries = useMemo(() => {
    if (!isMultiDay) return [];
    const map = new Map<string, {
      studentId: string;
      studentName: string;
      className: string;
      section: string;
      rollNo: string;
      photoUrl?: string | null;
      present: number;
      late: number;
      absent: number;
      leave: number;
      total: number;
    }>();

    for (const r of studentRecords) {
      const key = r.studentId || r.studentName || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          studentId: r.studentId,
          studentName: r.studentName || "Student",
          className: r.className || "",
          section: r.section || "",
          rollNo: r.rollNumber || r.rollNo || "",
          photoUrl: r.photoUrl || null,
          present: 0,
          late: 0,
          absent: 0,
          leave: 0,
          total: 0,
        });
      }
      const entry = map.get(key)!;
      entry.total += 1;
      const st = String(r.status || "PRESENT").toUpperCase();
      if (st.includes("ABSENT")) entry.absent += 1;
      else if (st.includes("LATE")) entry.late += 1;
      else if (st.includes("LEAVE")) entry.leave += 1;
      else entry.present += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [isMultiDay, studentRecords]);

  const studentTotalItems = isMultiDay ? studentSummaries.length : studentRecords.length;
  const studentTotalPages = Math.ceil(studentTotalItems / pageSize) || 1;

  const paginatedStudentSummaries = useMemo(() => {
    return studentSummaries.slice((studentPage - 1) * pageSize, studentPage * pageSize);
  }, [studentSummaries, studentPage, pageSize]);

  const paginatedStudentRecords = useMemo(() => {
    return studentRecords.slice((studentPage - 1) * pageSize, studentPage * pageSize);
  }, [studentRecords, studentPage, pageSize]);

  const teachersList = teacherRep?.teachers || [];
  const teacherTotalPages = Math.ceil(teachersList.length / pageSize) || 1;
  const paginatedTeachers = useMemo(() => {
    return teachersList.slice((teacherPage - 1) * pageSize, teacherPage * pageSize);
  }, [teachersList, teacherPage, pageSize]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";
  const pieData = [
    { name: "Teachers", value: stats?.totalTeachers || 0 },
    { name: "Students", value: stats?.totalStudents || 0 },
    { name: "Parents", value: stats?.totalParents || 0 },
  ].filter((d) => d.value > 0);

  const series = (att?.series || att?.last30Days || []).map((d: any) => ({
    date: String(d.date).slice(5),
    present: d.present,
    absent: d.absent,
  }));

  const classNames = Array.from(new Set(classes.map((c: any) => c.name)));
  const sectionsForClass = classes
    .filter((c: any) => !className || c.name === className)
    .map((c: any) => c.section);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold">Analytics</h1>
            <p className="text-slate-500 text-xs">Student attendance & teacher check-in</p>
          </div>
          {/* Tabs */}
          <div className="flex p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setTab("students");
                setStudentPage(1);
                setTeacherPage(1);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === "students" ? "text-white shadow" : "text-slate-600 hover:bg-slate-50"
              }`}
              style={tab === "students" ? { backgroundColor: theme } : undefined}
            >
              <Users className="w-4 h-4" /> Students
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("teachers");
                setStudentPage(1);
                setTeacherPage(1);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === "teachers" ? "text-white shadow" : "text-slate-600 hover:bg-slate-50"
              }`}
              style={tab === "teachers" ? { backgroundColor: theme } : undefined}
            >
              <GraduationCap className="w-4 h-4" /> Teachers
            </button>
          </div>
        </div>

        {/* Top filters */}
        <div className="bg-white rounded-xl border p-3 mb-4 flex flex-wrap gap-2 items-end">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-nowrap whitespace-nowrap">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last5", label: "Last 5" },
              { id: "last30", label: "Last 30" },
              { id: "custom", label: "Custom" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border shrink-0 ${
                  preset === p.id ? "text-white border-transparent" : "bg-slate-50"
                }`}
                style={preset === p.id ? { backgroundColor: theme } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setPreset("custom");
                setFrom(e.target.value);
                setStudentPage(1);
                setTeacherPage(1);
              }}
              className="block mt-0.5 px-2 py-1 rounded-lg border text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setPreset("custom");
                setTo(e.target.value);
                setStudentPage(1);
                setTeacherPage(1);
              }}
              className="block mt-0.5 px-2 py-1 rounded-lg border text-xs"
            />
          </div>
          {tab === "students" && (
            <>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Class</label>
                <select
                  value={className}
                  onChange={(e) => {
                    setClassName(e.target.value);
                    setSection("");
                    setStudentPage(1);
                  }}
                  className="block mt-0.5 px-2 py-1 rounded-lg border text-xs min-w-[100px]"
                >
                  <option value="">All</option>
                  {classNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold">Section</label>
                <select
                  value={section}
                  onChange={(e) => {
                    setSection(e.target.value);
                    setStudentPage(1);
                  }}
                  className="block mt-0.5 px-2 py-1 rounded-lg border text-xs min-w-[80px]"
                >
                  <option value="">All</option>
                  {Array.from(new Set(sectionsForClass)).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              type="button"
              onClick={() => {
                setStudentPage(1);
                setTeacherPage(1);
                load();
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-2xs transition hover:opacity-90"
              style={{ backgroundColor: theme }}
            >
              Apply
            </button>

            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 shadow-2xs hover:border-slate-300"
              title="Export Attendance"
            >
              <Menu className="w-4 h-4 text-slate-600" />
              <span>Export Attendance</span>
            </button>
          </div>
        </div>

        {busy ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          </div>
        ) : tab === "students" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Attendance %",
                  value: `${att?.percentage ?? att?.attendanceRate ?? 0}%`,
                  color: "text-indigo-600",
                },
                {
                  label: "Present",
                  value: att?.present ?? att?.presentStudents ?? 0,
                  color: "text-emerald-600",
                },
                {
                  label: "Absent",
                  value: att?.absent ?? att?.absentStudents ?? 0,
                  color: "text-rose-600",
                },
                {
                  label: "Unmarked",
                  value: att?.unmarked ?? att?.unmarkedStudents ?? 0,
                  color: "text-slate-600",
                },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-xl border p-3">
                  <div className={`text-xl font-black ${c.color}`}>{c.value}</div>
                  <div className="text-[11px] text-slate-500 font-semibold mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-extrabold text-sm text-slate-900">Attendance Trend</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Daily present and absent distribution</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent
                    </span>
                  </div>
                </div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series}>
                      <defs>
                        <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748B" }} stroke="#cbd5e1" />
                      <YAxis tick={{ fontSize: 11, fill: "#64748B" }} stroke="#cbd5e1" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="present"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#presentGrad)"
                        name="Present"
                      />
                      <Area
                        type="monotone"
                        dataKey="absent"
                        stroke="#F43F5E"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#absentGrad)"
                        name="Absent"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900 mb-1">School Composition</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Overview of user demographics</p>
                </div>
                <div className="h-48 my-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        cornerRadius={6}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "14px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 20px -5px rgba(0,0,0,0.1)",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-4 flex-wrap pt-2 border-t border-slate-100">
                  {pieData.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{p.name}: {p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Student Attendance Records Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-bold text-sm text-slate-900">
                  Student Attendance Records ({isMultiDay ? `${studentSummaries.length} Students` : `${studentRecords.length} Records`})
                </h2>
                <span className="text-xs font-semibold text-slate-500">
                  Showing: {from} → {to}
                </span>
              </div>
              <div className="overflow-x-auto">
                {isMultiDay ? (
                  studentSummaries.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                        <tr>
                          <th className="px-4 py-2.5">#</th>
                          <th className="px-4 py-2.5">Student</th>
                          <th className="px-4 py-2.5">Class</th>
                          <th className="px-4 py-2.5">Roll No</th>
                          <th className="px-4 py-2.5 text-emerald-600">Present</th>
                          <th className="px-4 py-2.5 text-amber-600">Late</th>
                          <th className="px-4 py-2.5 text-rose-600">Absent</th>
                          <th className="px-4 py-2.5">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-700 font-medium">
                        {paginatedStudentSummaries.map((s: any, idx: number) => {
                          const rate = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
                          return (
                            <tr key={s.studentId || idx} className="hover:bg-slate-50/80">
                              <td className="px-4 py-2.5 text-slate-400">{(studentPage - 1) * pageSize + idx + 1}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-2">
                                {s.photoUrl ? (
                                  <img src={s.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                                    {s.studentName[0]}
                                  </div>
                                )}
                                <span>{s.studentName}</span>
                              </td>
                              <td className="px-4 py-2.5">{s.className}{s.section ? `-${s.section}` : ""}</td>
                              <td className="px-4 py-2.5 text-slate-500">{s.rollNo || "—"}</td>
                              <td className="px-4 py-2.5 font-bold text-emerald-600">{s.present}</td>
                              <td className="px-4 py-2.5 font-bold text-amber-600">{s.late}</td>
                              <td className="px-4 py-2.5 font-bold text-rose-600">{s.absent}</td>
                              <td className="px-4 py-2.5 font-bold text-indigo-600">{rate}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                      No student attendance records for selected range
                    </div>
                  )
                ) : studentRecords.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                      <tr>
                        <th className="px-4 py-2.5">#</th>
                        <th className="px-4 py-2.5">Student</th>
                        <th className="px-4 py-2.5">Class</th>
                        <th className="px-4 py-2.5">Roll No</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Marked At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700 font-medium">
                      {paginatedStudentRecords.map((r: any, idx: number) => {
                        const isPresent = r.status === "PRESENT";
                        const isLate = r.status === "LATE";
                        const isAbsent = r.status === "ABSENT";
                        return (
                          <tr key={r.id || idx} className="hover:bg-slate-50/80">
                            <td className="px-4 py-2.5 text-slate-400">{(studentPage - 1) * pageSize + idx + 1}</td>
                            <td className="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-2">
                              {r.photoUrl ? (
                                <img src={r.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-600">
                                  {(r.studentName || "S")[0]}
                                </div>
                              )}
                              <span>{r.studentName}</span>
                            </td>
                            <td className="px-4 py-2.5">{r.className}{r.section ? `-${r.section}` : ""}</td>
                            <td className="px-4 py-2.5 text-slate-500">{r.rollNumber || r.rollNo || "—"}</td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPresent
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isLate
                                    ? "bg-amber-100 text-amber-800"
                                    : isAbsent
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {r.status || "PRESENT"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-400">
                              {r.markedAt ? String(r.markedAt).slice(11, 16) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                    No student attendance records for selected date
                  </div>
                )}
              </div>
              {studentTotalItems > 0 && !busy && (
                <div className="p-4 border-t border-slate-100">
                  <Pagination
                    currentPage={studentPage}
                    totalPages={studentTotalPages}
                    totalItems={studentTotalItems}
                    pageSize={pageSize}
                    onPageChange={setStudentPage}
                    themeColor={theme}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
                <div className="text-2xl font-black text-indigo-600">{teacherRep?.totalTeachers || 0}</div>
                <div className="text-xs text-slate-500 font-bold mt-0.5">Total teachers</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
                <div className="text-2xl font-black text-emerald-600">{teacherRep?.checkedInToday || 0}</div>
                <div className="text-xs text-slate-500 font-bold mt-0.5">Checked in today</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
                <div className="text-2xl font-black text-rose-600">{teacherRep?.notCheckedInToday || 0}</div>
                <div className="text-xs text-slate-500 font-bold mt-0.5">Not checked in</div>
              </div>
            </div>
            {teacherRep?.series?.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-extrabold text-sm text-slate-900">Check-In Trend</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Daily teacher check-in activity</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Checked In
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> Not Checked In
                    </span>
                  </div>
                </div>
                <div className="flex items-end gap-2.5 h-32 overflow-x-auto pb-2">
                  {teacherRep.series.slice(-21).map((s: any) => {
                    const max = Math.max(s.checkedIn || 0, s.notCheckedIn || 0, 1);
                    return (
                      <div key={s.date} className="flex flex-col items-center gap-1.5 min-w-[32px]">
                        <div className="flex items-end gap-1 h-20">
                          <div
                            className="w-2.5 rounded-full bg-emerald-500 shadow-2xs"
                            style={{ height: `${Math.max(6, ((s.checkedIn || 0) / max) * 76)}px` }}
                          />
                          <div
                            className="w-2.5 rounded-full bg-rose-400 shadow-2xs"
                            style={{ height: `${Math.max(6, ((s.notCheckedIn || 0) / max) * 76)}px` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">{String(s.date).slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {teacherRep?.teachers?.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="font-extrabold text-sm text-slate-900">Teachers</div>
                  <span className="text-xs font-semibold text-slate-500">
                    {teacherRep.teachers.length} Faculty Members
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {paginatedTeachers.map((t: any) => (
                    <div key={t.id} className="px-5 py-3.5 flex items-center justify-between text-sm hover:bg-slate-50/80 transition">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-2xl overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                          {t.photoUrl ? (
                            <img src={t.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                              {(t.firstName?.[0] || "T").toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">
                            {t.firstName} {t.lastName || ""}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {t.classLabel ? `Class ${t.classLabel}` : t.email || "Teacher"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {t.markedAt && (
                          <span className="text-xs text-slate-400 font-medium hidden sm:inline-block">
                            {String(t.markedAt).slice(11, 16)}
                          </span>
                        )}
                        <span
                          className={`text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 ${
                            t.checkedIn
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${t.checkedIn ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {t.checkedIn ? "Checked In" : "Not Checked In"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {teachersList.length > 0 && !busy && (
                  <div className="p-4 border-t border-slate-100">
                    <Pagination
                      currentPage={teacherPage}
                      totalPages={teacherTotalPages}
                      totalItems={teachersList.length}
                      pageSize={pageSize}
                      onPageChange={setTeacherPage}
                      themeColor={theme}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <ExportAttendanceModal
          open={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          theme={theme}
          schoolName={user?.schoolName}
          schoolLogo={user?.schoolLogo}
          classes={classes}
          defaultFromDate={from}
          defaultToDate={to}
          defaultDate={from}
          defaultClassName={className}
          defaultSection={section}
          defaultType={tab === "teachers" ? "teacher" : "student"}
        />
      </main>
    </div>
  );
}
