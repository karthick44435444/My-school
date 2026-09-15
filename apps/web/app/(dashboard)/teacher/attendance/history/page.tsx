"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Loader2,
  Calendar,
  Download,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  X,
  ChevronDown,
  School,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import Pagination from "@/components/shared/Pagination";
import {
  exportStudentAttendancePDF,
  exportStudentAttendanceExcel,
  AttendanceExportRecord,
  formatDDMMYYYY,
} from "@/lib/attendanceExportClient";

function fmtDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TeacherAttendanceHistoryPage() {
  const { user, loading: authLoading } = useAuth(["TEACHER"]);
  const [classOpts, setClassOpts] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<{ className: string; section: string }>({
    className: "",
    section: "",
  });

  const todayStr = useMemo(() => fmtDate(new Date()), []);
  const [preset, setPreset] = useState<string>("today");
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(todayStr);
  const [submittedFromDate, setSubmittedFromDate] = useState<string>(todayStr);
  const [submittedToDate, setSubmittedToDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [records, setRecords] = useState<AttendanceExportRecord[]>([]);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Load school info for logo & branding
  useEffect(() => {
    fetch("/api/school")
      .then((r) => r.json())
      .then((d) => {
        if (d.school) setSchool(d.school);
      })
      .catch(() => {});
  }, []);

  // Load teacher classes (restricted to Class Teacher classes)
  const loadClasses = useCallback(async () => {
    const res = await fetch("/api/teacher-classes");
    if (!res.ok) return;
    const d = await res.json();
    const rawClasses = d.classes || [];
    // Only show what are the classes of the teacher as a Class Teacher
    const ctClasses = rawClasses.filter((c: any) => c.role === "CLASS_TEACHER");
    const finalOpts = ctClasses.length > 0 ? ctClasses : rawClasses;
    setClassOpts(finalOpts);
    if (finalOpts[0] && !selectedClass.className) {
      setSelectedClass({ className: finalOpts[0].className, section: finalOpts[0].section || "" });
    }
  }, [selectedClass.className]);

  // Load attendance records based on filters
  const loadRecords = useCallback(async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    try {
      const activeCls = selectedClass.className ? selectedClass : classOpts[0];
      const q = new URLSearchParams({
        type: "student",
        format: "json",
        from: fromDate,
        to: toDate,
      });
      if (activeCls?.className) {
        q.set("className", activeCls.className);
        if (activeCls.section) q.set("section", activeCls.section);
      }
      if (statusFilter && statusFilter !== "ALL") q.set("status", statusFilter);

      const res = await fetch(`/api/attendance/export?${q.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setRecords(d.records || []);
        setSubmittedFromDate(fromDate);
        setSubmittedToDate(toDate);
      } else {
        setRecords([]);
        setSubmittedFromDate(fromDate);
        setSubmittedToDate(toDate);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, selectedClass, statusFilter, classOpts]);

  useEffect(() => {
    if (user) {
      loadClasses();
    }
  }, [user, loadClasses]);

  useEffect(() => {
    if (user) {
      loadRecords();
    }
  }, [user, selectedClass.className, selectedClass.section, fromDate, toDate, statusFilter, loadRecords]);

  // Handle Preset Date Range Changes
  const applyPreset = (p: string) => {
    setPreset(p);
    setPage(1);
    const now = new Date();
    const today = fmtDate(now);

    switch (p) {
      case "today":
        setFromDate(today);
        setToDate(today);
        break;
      case "yesterday": {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = fmtDate(y);
        setFromDate(yStr);
        setToDate(yStr);
        break;
      }
      case "last7": {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        setFromDate(fmtDate(d));
        setToDate(today);
        break;
      }
      case "thisMonth": {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        setFromDate(fmtDate(firstDay));
        setToDate(today);
        break;
      }
      case "last30": {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        setFromDate(fmtDate(d));
        setToDate(today);
        break;
      }
      default:
        break;
    }
  };

  const isMultiDay = submittedFromDate !== submittedToDate;

  // Filter single-day records by search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase().trim();
    return records.filter((r) => {
      const nameMatch = r.studentName?.toLowerCase().includes(q);
      const rollMatch = r.rollNumber?.toLowerCase().includes(q) || r.username?.toLowerCase().includes(q);
      const classMatch = `${r.className || ""}-${r.section || ""}`.toLowerCase().includes(q);
      const statusMatch = r.status?.toLowerCase().includes(q);
      const dateMatch = r.date?.includes(q);
      return nameMatch || rollMatch || classMatch || statusMatch || dateMatch;
    });
  }, [records, searchQuery]);

  // Multi-day aggregated student summaries (Total Present, Late, Absent, Attendance %)
  const aggregatedStudents = useMemo(() => {
    const map = new Map<string, {
      studentId: string;
      studentName: string;
      rollNumber?: string;
      photoUrl?: string | null;
      className: string;
      section: string;
      totalPresent: number;
      totalLate: number;
      totalAbsent: number;
      totalHalfDay: number;
      totalDays: number;
      attendanceRate: number;
    }>();

    records.forEach((r) => {
      const key = r.studentId || r.studentName || `${r.className}-${r.rollNumber}`;
      if (!key) return;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          studentId: r.studentId || key,
          studentName: r.studentName || "Student",
          rollNumber: r.rollNumber || (r as any).rollNo || "",
          photoUrl: r.photoUrl || null,
          className: r.className || "",
          section: r.section || "",
          totalPresent: 0,
          totalLate: 0,
          totalAbsent: 0,
          totalHalfDay: 0,
          totalDays: 0,
          attendanceRate: 0,
        };
        map.set(key, entry);
      }
      const st = String(r.status || "").toUpperCase();
      if (st === "PRESENT") entry.totalPresent += 1;
      else if (st === "ABSENT") entry.totalAbsent += 1;
      else if (st === "LATE") entry.totalLate += 1;
      else if (st === "HALF_DAY") entry.totalHalfDay += 1;
      entry.totalDays += 1;
    });

    const list = Array.from(map.values()).map((s) => {
      const rate = s.totalDays > 0 ? Math.round(((s.totalPresent + s.totalLate * 0.5) / s.totalDays) * 100) : 0;
      return { ...s, attendanceRate: rate };
    });

    const q = searchQuery.toLowerCase().trim();
    const filtered = q
      ? list.filter((s) => {
          const nameMatch = s.studentName.toLowerCase().includes(q);
          const rollMatch = s.rollNumber?.toLowerCase().includes(q);
          const classMatch = `${s.className}-${s.section}`.toLowerCase().includes(q);
          return nameMatch || rollMatch || classMatch;
        })
      : list;

    return filtered.sort((a, b) => {
      const rollA = parseInt(a.rollNumber || "0", 10);
      const rollB = parseInt(b.rollNumber || "0", 10);
      if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB && rollA > 0 && rollB > 0) {
        return rollA - rollB;
      }
      return a.studentName.localeCompare(b.studentName);
    });
  }, [records, searchQuery]);

  const activeTotalItems = isMultiDay ? aggregatedStudents.length : filteredRecords.length;
  const totalPages = Math.ceil(activeTotalItems / pageSize) || 1;

  const paginatedAggregatedStudents = useMemo(() => {
    return aggregatedStudents.slice((page - 1) * pageSize, page * pageSize);
  }, [aggregatedStudents, page, pageSize]);

  const paginatedFilteredRecords = useMemo(() => {
    return filteredRecords.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredRecords, page, pageSize]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === "PRESENT").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const halfDay = records.filter((r) => r.status === "HALF_DAY").length;
    const rate = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;
    return { total, present, absent, late, halfDay, rate };
  }, [records]);

  // PDF Export
  const handleExportPDF = async () => {
    if (records.length === 0) {
      toast.error("No attendance records to export");
      return;
    }
    setExportingPdf(true);
    try {
      await exportStudentAttendancePDF({
        schoolName: school?.name || user?.schoolName || "School",
        schoolLogo: school?.logoUrl || user?.schoolLogo || null,
        themeColor: school?.themeColor || user?.themeColor || "#6366F1",
        records: filteredRecords.length > 0 ? filteredRecords : records,
        from: fromDate,
        to: toDate,
        className: selectedClass.className,
        section: selectedClass.section,
        status: statusFilter,
        teacherName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || undefined,
      });
      toast.success("Attendance PDF report downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to export PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  // Excel Export
  const handleExportExcel = () => {
    if (records.length === 0) {
      toast.error("No attendance records to export");
      return;
    }
    setExportingExcel(true);
    try {
      exportStudentAttendanceExcel({
        schoolName: school?.name || user?.schoolName || "School",
        themeColor: school?.themeColor || user?.themeColor || "#6366F1",
        records: filteredRecords.length > 0 ? filteredRecords : records,
        from: fromDate,
        to: toDate,
        className: selectedClass.className,
        section: selectedClass.section,
        status: statusFilter,
      });
      toast.success("Attendance Excel spreadsheet downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to export Excel");
    } finally {
      setExportingExcel(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-slate-200 pb-3">
          <Link
            href="/teacher/attendance"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            Today&apos;s Attendance
          </Link>
          <Link
            href="/teacher/attendance/history"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-xs transition"
            style={{ backgroundColor: theme }}
          >
            Attendance History &amp; Reports
          </Link>
        </div>

        {/* Header and Export Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Attendance History &amp; Reports</h1>
            <p className="text-slate-500 text-sm mt-1">
              Filter student attendance by date range and download formatted PDF / Excel reports.
            </p>
          </div>
          {classOpts.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportPDF}
                disabled={exportingPdf || loading || records.length === 0}
                className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-sm font-semibold flex items-center gap-2 transition shadow-2xs disabled:opacity-50"
              >
                {exportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 text-rose-600" />
                )}
                Export PDF
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exportingExcel || loading || records.length === 0}
                className="px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-semibold flex items-center gap-2 transition shadow-2xs disabled:opacity-50"
              >
                {exportingExcel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                )}
                Export Excel
              </button>
            </div>
          )}
        </div>

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
        ) : (
          <>
            {/* Filter Controls Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-xs space-y-4">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Period:</span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last7", label: "Last 7 Days" },
              { id: "thisMonth", label: "This Month" },
              { id: "last30", label: "Last 30 Days" },
              { id: "custom", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  preset === p.id
                    ? "text-white shadow-2xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
                style={preset === p.id ? { backgroundColor: theme } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Form Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setPreset("custom");
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setPreset("custom");
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Class &amp; Section</label>
              <select
                value={`${selectedClass.className}||${selectedClass.section}`}
                onChange={(e) => {
                  const [c, s] = e.target.value.split("||");
                  setSelectedClass({ className: c || "", section: s || "" });
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="||">All My Class-Teacher Classes</option>
                {classOpts.map((c, i) => (
                  <option key={i} value={`${c.className}||${c.section || ""}`}>
                    Class {c.className}{c.section ? `-${c.section}` : ""} (Class Teacher)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present Only</option>
                <option value="ABSENT">Absent Only</option>
                <option value="LATE">Late Only</option>
                <option value="HALF_DAY">Half Day Only</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Search Student</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Name / Roll..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  setPage(1);
                  loadRecords();
                }}
                disabled={loading}
                className="w-full py-2 px-4 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: theme }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Filter className="w-4 h-4" />
                )}
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* KPI Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Total Records</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-2xs bg-emerald-50/20">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-semibold">Present</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-700">{stats.present}</div>
          </div>

          <div className="bg-white rounded-2xl border border-rose-100 p-4 shadow-2xs bg-rose-50/20">
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-xs font-semibold">Absent</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-700">{stats.absent}</div>
          </div>

          <div className="bg-white rounded-2xl border border-amber-100 p-4 shadow-2xs bg-amber-50/20">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-xs font-semibold">Late / Half Day</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700">{stats.late + stats.halfDay}</div>
          </div>

          <div className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-2xs bg-indigo-50/20 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-indigo-700 mb-1">
              <span className="text-xs font-semibold">Attendance Rate</span>
              <span className="text-xs font-bold text-indigo-600">%</span>
            </div>
            <div className="text-2xl font-bold text-indigo-700">{stats.rate}%</div>
          </div>
        </div>

        {/* Student Records List Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              {isMultiDay
                ? `Student Attendance Summary (${aggregatedStudents.length} Students)`
                : `Student Attendance Records (${filteredRecords.length})`}
            </div>
            {submittedFromDate && submittedToDate && (
              <div className="text-xs text-slate-500 font-mono">
                Showing: {formatDDMMYYYY(submittedFromDate)} {submittedFromDate !== submittedToDate ? `→ ${formatDDMMYYYY(submittedToDate)}` : ""}
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <span className="text-sm">Loading attendance records...</span>
            </div>
          ) : (isMultiDay ? aggregatedStudents.length === 0 : filteredRecords.length === 0) ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <p className="font-medium text-slate-600">No attendance records found for this period</p>
              <p className="text-xs text-slate-400 mt-1">Try changing the date range or class filter and click Submit</p>
            </div>
          ) : isMultiDay ? (
            /* Multi-Day Summary Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class &amp; Section</th>
                    <th className="px-4 py-3 text-center">Total Present</th>
                    <th className="px-4 py-3 text-center">Total Late</th>
                    <th className="px-4 py-3 text-center">Total Absent</th>
                    <th className="px-4 py-3 text-center">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAggregatedStudents.map((s, idx) => (
                    <tr key={s.studentId || idx} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.studentName} photoUrl={s.photoUrl} size={34} />
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{s.studentName}</div>
                            <div className="text-[11px] text-slate-500 font-mono font-medium">
                              Roll: {s.rollNumber || "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {s.className}{s.section ? `-${s.section}` : ""}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          {s.totalPresent}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                          {s.totalLate + s.totalHalfDay}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-8 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                          {s.totalAbsent}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                            s.attendanceRate >= 75
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                              : s.attendanceRate >= 50
                              ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                              : "bg-rose-50 text-rose-700 border border-rose-200/80"
                          }`}
                        >
                          {s.attendanceRate}%
                          <span className="text-[10px] font-normal text-slate-500">
                            ({s.totalPresent + s.totalLate}/{s.totalDays}d)
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Single-Day Records Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">#</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class &amp; Section</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Time / Marked At</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedFilteredRecords.map((r, idx) => (
                    <tr key={`${r.studentId || idx}-${r.date}`} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.studentName} photoUrl={r.photoUrl} size={32} />
                          <div>
                            <div className="font-semibold text-slate-900 text-sm">{r.studentName}</div>
                            <div className="text-[11px] text-slate-500 font-mono font-medium">
                              Roll: {r.rollNumber || (r as any).rollNo || "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {r.className}{r.section ? `-${r.section}` : ""}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {formatDDMMYYYY(r.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            r.status === "PRESENT"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "ABSENT"
                              ? "bg-rose-100 text-rose-800"
                              : r.status === "LATE"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {r.status === "PRESENT" && <CheckCircle2 className="w-3 h-3" />}
                          {r.status === "ABSENT" && <XCircle className="w-3 h-3" />}
                          {r.status === "LATE" && <Clock className="w-3 h-3" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                        {r.markedAt ? r.markedAt.slice(11, 16) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 italic max-w-xs truncate">
                        {r.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTotalItems > 0 && !loading && (
            <div className="p-4 border-t border-slate-100">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={activeTotalItems}
                pageSize={pageSize}
                onPageChange={setPage}
                themeColor={theme}
              />
            </div>
          )}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
