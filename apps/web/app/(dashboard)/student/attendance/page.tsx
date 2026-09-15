"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Pagination from "@/components/shared/Pagination";
import { formatDDMMYYYY } from "@/lib/validation";

function getStatusBadge(status: string) {
  switch (status) {
    case "PRESENT":
      return { label: "Present", bg: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 };
    case "ABSENT":
      return { label: "Absent", bg: "bg-rose-100 text-rose-800", icon: XCircle };
    case "LATE":
      return { label: "Late", bg: "bg-amber-100 text-amber-800", icon: Clock };
    case "HALF_DAY":
      return { label: "Half Day", bg: "bg-purple-100 text-purple-800", icon: Clock };
    default:
      return { label: status || "—", bg: "bg-slate-100 text-slate-700", icon: CheckCircle2 };
  }
}

export default function StudentAttendancePage() {
  const { user, loading } = useAuth(["STUDENT"]);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [listBusy, setListBusy] = useState(false);
  const [searchDate, setSearchDate] = useState("");
  const [debouncedDate, setDebouncedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDate(searchDate);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDate]);

  useEffect(() => {
    if (!user) return;
    setListBusy(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      status: statusFilter,
    });
    if (debouncedDate.trim()) {
      params.set("q", debouncedDate.trim());
    }

    fetch(`/api/attendance/student?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
      })
      .catch((err) => {
        console.error("Failed to load attendance", err);
      })
      .finally(() => {
        setBusy(false);
        setListBusy(false);
      });
  }, [user, page, debouncedDate, statusFilter]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";
  const records: any[] = data?.records || [];
  const presentCount = data?.presentOnly ?? 0;
  const absentCount = data?.absent ?? 0;
  const lateCount = data?.late ?? 0;
  const totalDays = data?.total ?? 0;
  const percentage = data?.percentage ?? 0;
  const totalRecords = data?.totalRecords ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="min-h-screen bg-slate-50/70">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-7 h-7 text-indigo-600" /> My Attendance
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Your official academic attendance logs and monthly summary
            </p>
          </div>

          {/* Search by day & date */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search day or date (e.g. Monday, DD-MM-YYYY)..."
                value={searchDate}
                onChange={(e) => {
                  setSearchDate(e.target.value);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-2xs"
              />
            </div>
          </div>
        </div>

        {busy ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading attendance history...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Clickable KPI Summary Cards for Filtering */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Attendance Rate (All Records) */}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setPage(1);
                }}
                className={`text-left bg-white rounded-3xl p-5 shadow-xs transition-all cursor-pointer border ${
                  statusFilter === "ALL"
                    ? "border-indigo-500 ring-2 ring-indigo-200 shadow-md scale-[1.02]"
                    : "border-slate-200/90 hover:border-indigo-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</div>
                  {statusFilter === "ALL" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                      All
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black text-indigo-600 mt-1">{percentage}%</div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, percentage)}%` }} />
                </div>
              </button>

              {/* Days Present */}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter((prev) => (prev === "PRESENT" ? "ALL" : "PRESENT"));
                  setPage(1);
                }}
                className={`text-left bg-white rounded-3xl p-5 shadow-xs transition-all cursor-pointer border ${
                  statusFilter === "PRESENT"
                    ? "border-emerald-500 ring-2 ring-emerald-200 shadow-md scale-[1.02]"
                    : "border-slate-200/90 hover:border-emerald-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Days Present</div>
                  {statusFilter === "PRESENT" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black text-emerald-600 mt-1">{presentCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">Out of {totalDays} total days</div>
              </button>

              {/* Days Absent */}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter((prev) => (prev === "ABSENT" ? "ALL" : "ABSENT"));
                  setPage(1);
                }}
                className={`text-left bg-white rounded-3xl p-5 shadow-xs transition-all cursor-pointer border ${
                  statusFilter === "ABSENT"
                    ? "border-rose-500 ring-2 ring-rose-200 shadow-md scale-[1.02]"
                    : "border-slate-200/90 hover:border-rose-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Days Absent</div>
                  {statusFilter === "ABSENT" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black text-rose-600 mt-1">{absentCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">Unexcused / Leave</div>
              </button>

              {/* Late Check-ins */}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter((prev) => (prev === "LATE" ? "ALL" : "LATE"));
                  setPage(1);
                }}
                className={`text-left bg-white rounded-3xl p-5 shadow-xs transition-all cursor-pointer border ${
                  statusFilter === "LATE"
                    ? "border-amber-500 ring-2 ring-amber-200 shadow-md scale-[1.02]"
                    : "border-slate-200/90 hover:border-amber-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Late Check-ins</div>
                  {statusFilter === "LATE" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black text-amber-600 mt-1">{lateCount}</div>
                <div className="text-[11px] text-slate-400 mt-1">Recorded late</div>
              </button>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 overflow-x-auto shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800">
                    Attendance Records ({totalRecords})
                  </h2>
                  {statusFilter !== "ALL" && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Showing: {statusFilter}
                    </span>
                  )}
                </div>
                {(searchDate || statusFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchDate("");
                      setStatusFilter("ALL");
                      setPage(1);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <table className="w-full text-xs text-left min-w-[450px]">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Day</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listBusy ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                        <span className="text-xs font-medium">Loading attendance...</span>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">
                        No attendance records matching your search
                      </td>
                    </tr>
                  ) : (
                    records.map((r: any) => {
                      const badge = getStatusBadge(r.status);
                      const Icon = badge.icon;
                      const d = new Date(r.date + "T00:00:00");
                      const dayName = !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { weekday: "long" }) : "—";

                      return (
                        <tr key={r.id || r.date} className="hover:bg-slate-50/70 transition">
                          <td className="px-6 py-3.5 font-bold font-mono text-slate-900 text-xs">
                            {formatDDMMYYYY(r.date)}
                          </td>
                          <td className="px-6 py-3.5 text-slate-500 font-medium">{dayName}</td>
                          <td className="px-6 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${badge.bg}`}>
                              <Icon className="w-3.5 h-3.5" />
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalRecords > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalRecords}
                pageSize={pageSize}
                onPageChange={setPage}
                themeColor={theme}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
