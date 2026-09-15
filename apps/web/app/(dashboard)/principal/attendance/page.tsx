"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Download, Search } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import Pagination from "@/components/shared/Pagination";
import ExportAttendanceModal from "@/components/attendance/ExportAttendanceModal";

export default function PrincipalAttendancePage() {
  const { user, loading: authLoading } = useAuth(["PRINCIPAL"]);
  const [stats, setStats] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [selected, setSelected] = useState({ className: "", section: "" });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Debounce search input
  useEffect(() => {
    const tmr = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(tmr);
  }, [search]);

  const loadMeta = useCallback(async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`/api/attendance/stats?date=${date}`),
        fetch("/api/classes"),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (cRes.ok) {
        const d = await cRes.json();
        setClasses(d.classes || []);
      }
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    if (user) loadMeta();
  }, [user, loadMeta]);

  const loadClass = useCallback(async (targetPage = page, query = debouncedSearch) => {
    if (!selected.className) {
      setStudents([]);
      setTotal(0);
      setTotalPages(1);
      return;
    }
    setClassLoading(true);
    try {
      const params = new URLSearchParams({
        className: selected.className,
        date,
        page: String(targetPage),
        limit: "20",
      });
      if (selected.section) params.set("section", selected.section);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/attendance/class?${params}`);
      if (res.ok) {
        const d = await res.json();
        setStudents(d.students || []);
        setTotal(d.total ?? (d.students || []).length);
        setTotalPages(d.totalPages ?? 1);
      }
    } finally {
      setClassLoading(false);
    }
  }, [selected.className, selected.section, date, page, debouncedSearch]);

  useEffect(() => {
    if (selected.className) {
      loadClass(page, debouncedSearch);
    }
  }, [selected.className, selected.section, date, page, debouncedSearch, loadClass]);

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Attendance</h1>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border text-sm bg-white"
            />
            <button
              onClick={() => setShowExport(true)}
              className="px-3.5 py-2 rounded-xl border text-sm flex items-center gap-2 bg-white hover:bg-slate-50 transition shadow-sm font-medium cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Attendance
            </button>
          </div>
        </div>

        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Students", value: stats?.totalStudents ?? 0 },
              { label: "Present", value: stats?.presentStudents ?? 0, color: "text-green-600" },
              { label: "Absent", value: stats?.absentStudents ?? 0, color: "text-red-600" },
              { label: "Unmarked", value: stats?.unmarkedStudents ?? 0, color: "text-amber-600" },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border p-4">
                <div className="text-xs text-slate-500">{c.label}</div>
                <div className={`text-2xl font-bold mt-1 ${c.color || ""}`}>{c.value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border p-4 mb-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <div className="flex gap-2">
            <select
              value={selected.className}
              onChange={(e) => {
                setSelected({ className: e.target.value, section: "" });
                setPage(1);
              }}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl border text-sm bg-white"
            >
              <option value="">Select class</option>
              {Array.from(new Set(classes.map((c) => c.name))).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <select
              value={selected.section}
              onChange={(e) => {
                setSelected({ ...selected, section: e.target.value });
                setPage(1);
              }}
              className="flex-1 sm:flex-none px-3 py-2 rounded-xl border text-sm bg-white"
            >
              <option value="">All sections</option>
              {classes.filter((c) => c.name === selected.className).map((c) => (
                <option key={c.id} value={c.section}>{c.section}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search student by name or status..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {classLoading ? (
          <div className="flex justify-center p-12 bg-white rounded-2xl border">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : selected.className && students.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center text-slate-400 text-xs">
            No students found in this class
          </div>
        ) : students.length > 0 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No students match your filter
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr key={s.studentId} className="border-t">
                        <td className="px-4 py-2">
                          <Avatar name={s.firstName} photoUrl={s.photoUrl} size={32} />
                        </td>
                        <td className="px-4 py-2 font-medium">{s.firstName} {s.lastName}</td>
                        <td className="px-4 py-2">{s.className}-{s.section}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            s.status === "PRESENT" ? "bg-green-100 text-green-700" :
                            s.status === "ABSENT" ? "bg-red-100 text-red-700" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {s.status || "Not marked"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {total > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
                themeColor={theme}
              />
            )}
          </div>
        )}
      </main>

      <ExportAttendanceModal
        open={showExport}
        onClose={() => setShowExport(false)}
        theme={theme}
        schoolName={user?.schoolName}
        schoolLogo={user?.schoolLogo}
        classes={classes}
        defaultDate={date}
        defaultClassName={selected.className}
        defaultSection={selected.section}
      />
    </div>
  );
}
