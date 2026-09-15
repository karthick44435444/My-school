"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  Download,
  Calendar,
  Users,
  GraduationCap,
  FileSpreadsheet,
  FileText,
  FileCode,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { downloadAttendanceReport, formatDDMMYYYY } from "@/lib/attendanceExportClient";

export interface ExportAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  theme?: string;
  schoolName?: string;
  schoolLogo?: string | null;
  classes?: Array<{ id: string; name: string; section: string }>;
  defaultDate?: string;
  defaultFromDate?: string;
  defaultToDate?: string;
  defaultClassName?: string;
  defaultSection?: string;
  defaultFormat?: "excel" | "pdf";
  defaultType?: "student" | "teacher";
  allowTeacherType?: boolean;
  allowCsv?: boolean;
  showCancel?: boolean;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ExportAttendanceModal({
  open,
  onClose,
  theme = "#6366F1",
  schoolName,
  schoolLogo,
  classes = [],
  defaultDate,
  defaultClassName = "",
  defaultSection = "",
  defaultFromDate,
  defaultToDate,
  defaultFormat = "excel",
  defaultType = "student",
  allowTeacherType = true,
  allowCsv = false,
  showCancel = false,
}: ExportAttendanceModalProps) {
  const todayStr = useMemo(() => fmtDate(new Date()), []);
  const [type, setType] = useState<"student" | "teacher">(allowTeacherType ? defaultType : "student");
  const [preset, setPreset] = useState<string>("today");
  const [fromDate, setFromDate] = useState<string>(() => defaultFromDate || defaultDate || todayStr);
  const [toDate, setToDate] = useState<string>(() => defaultToDate || defaultDate || todayStr);
  const [className, setClassName] = useState<string>(defaultClassName);
  const [section, setSection] = useState<string>(defaultSection);
  const [status, setStatus] = useState<string>("ALL");
  const [format, setFormat] = useState<"excel" | "pdf">("excel");
  const [downloading, setDownloading] = useState(false);

  // Unique class names from mapped classes
  const uniqueClassNames = useMemo(() => {
    return Array.from(new Set(classes.map((c) => c.name))).filter(Boolean);
  }, [classes]);

  // Sections for the selected class from mapped classes
  const availableSections = useMemo(() => {
    if (!className) return [];
    return Array.from(
      new Set(classes.filter((c) => c.name === className).map((c) => c.section))
    ).filter(Boolean);
  }, [classes, className]);

  // Sync type, dates, class and section selection when modal opens
  useEffect(() => {
    if (open) {
      if (allowTeacherType && defaultType) {
        setType(defaultType);
      }
      const initialFrom = defaultFromDate || defaultDate || todayStr;
      const initialTo = defaultToDate || defaultDate || todayStr;
      setFromDate(initialFrom);
      setToDate(initialTo);
      if (initialFrom === todayStr && initialTo === todayStr) {
        setPreset("today");
      } else {
        setPreset("custom");
      }
      const initialClass = defaultClassName || (!allowTeacherType && uniqueClassNames.length === 1 ? uniqueClassNames[0] : "");
      setClassName(initialClass);
      if (initialClass) {
        const secs = Array.from(
          new Set(classes.filter((c) => c.name === initialClass).map((c) => c.section))
        ).filter(Boolean);
        setSection(defaultSection || (!allowTeacherType && secs.length === 1 ? secs[0] : ""));
      } else {
        setSection(defaultSection || "");
      }
    }
  }, [open, defaultType, defaultDate, defaultFromDate, defaultToDate, defaultClassName, defaultSection, classes, allowTeacherType, uniqueClassNames, todayStr]);

  const applyPreset = (p: string) => {
    setPreset(p);
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

  const handleDownload = async () => {
    if (!fromDate || !toDate) {
      toast.error("Please select a valid date range");
      return;
    }

    if (fromDate > toDate) {
      toast.error("From date cannot be after To date");
      return;
    }

    setDownloading(true);
    try {
      await downloadAttendanceReport({
        format,
        type,
        from: fromDate,
        to: toDate,
        className: type === "student" ? className : undefined,
        section: type === "student" ? section : undefined,
        status: type === "student" && status !== "ALL" ? status : undefined,
        themeColor: theme,
        schoolName,
        schoolLogo,
      });

      toast.success(
        `${type === "student" ? "Student" : "Teacher"} attendance (${format.toUpperCase()}) downloaded successfully!`
      );
      onClose();
    } catch (err: any) {
      console.error("Attendance export error:", err);
      toast.error(err.message || "Failed to download attendance report");
    } finally {
      setDownloading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0"
              style={{ backgroundColor: theme }}
            >
              <Download className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">Export Attendance</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Download filtered attendance records with custom date ranges
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Target Audience Tabs */}
          {allowTeacherType && (
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
                Audience Type
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setType("student")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    type === "student"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-4 h-4 text-indigo-500" />
                  Student Attendance
                </button>
                <button
                  type="button"
                  onClick={() => setType("teacher")}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    type === "teacher"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-purple-500" />
                  Teacher Check-in
                </button>
              </div>
            </div>
          )}

          {/* Date Filter & Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date Range Filter
              </label>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "last7", label: "Last 7 Days" },
                { id: "thisMonth", label: "This Month" },
                { id: "last30", label: "Last 30 Days" },
                { id: "custom", label: "Custom" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    preset === p.id
                      ? "text-white border-transparent shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                  style={preset === p.id ? { backgroundColor: theme } : undefined}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* From / To Date Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">From Date</span>
                <input
                  type="date"
                  value={fromDate}
                  max={todayStr}
                  onChange={(e) => {
                    setPreset("custom");
                    setFromDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1">To Date</span>
                <input
                  type="date"
                  value={toDate}
                  max={todayStr}
                  onChange={(e) => {
                    setPreset("custom");
                    setToDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Student Specific Filters: Class, Section, Status */}
          {type === "student" && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Class
                  </label>
                  <select
                    value={className}
                    onChange={(e) => {
                      const newClass = e.target.value;
                      setClassName(newClass);
                      const secs = Array.from(
                        new Set(classes.filter((c) => c.name === newClass).map((c) => c.section))
                      ).filter(Boolean);
                      setSection(!allowTeacherType && secs.length === 1 ? secs[0] : "");
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                  >
                    {allowTeacherType ? (
                      <option value="">All Classes</option>
                    ) : uniqueClassNames.length > 1 ? (
                      <option value="">All Mapped Classes</option>
                    ) : uniqueClassNames.length === 0 ? (
                      <option value="">No Mapped Classes</option>
                    ) : null}
                    {uniqueClassNames.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Section
                  </label>
                  <select
                    value={section}
                    disabled={!className && allowTeacherType}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {allowTeacherType ? (
                      <option value="">All Sections</option>
                    ) : availableSections.length > 1 ? (
                      <option value="">All Mapped Sections</option>
                    ) : availableSections.length === 0 ? (
                      <option value="">No Mapped Sections</option>
                    ) : null}
                    {availableSections.map((s) => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Attendance Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                >
                  <option value="ALL">All Statuses (Present, Absent, Late, Half Day)</option>
                  <option value="PRESENT">Present Only</option>
                  <option value="ABSENT">Absent Only</option>
                  <option value="LATE">Late Only</option>
                  <option value="HALF_DAY">Half Day Only</option>
                </select>
              </div>
            </div>
          )}

          {/* Export File Format */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">
              File Format
            </label>
            <div className={`grid gap-2.5 ${allowCsv ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
              <button
                type="button"
                onClick={() => setFormat("excel")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  format === "excel"
                    ? "border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">Excel (.xls)</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Formatted spreadsheet</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  format === "pdf"
                    ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">PDF Document</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Printable report with tables</div>
                </div>
              </button>

              {allowCsv && (
                <button
                  type="button"
                  onClick={() => setFormat("csv" as any)}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                    (format as any) === "csv"
                      ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">CSV File</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Raw CSV data format</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          <div className="text-[11px] sm:text-xs text-slate-500">
            Exporting <span className="font-semibold text-slate-700">{formatDDMMYYYY(fromDate)}</span> to{" "}
            <span className="font-semibold text-slate-700">{formatDDMMYYYY(toDate)}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {showCancel && (
              <button
                type="button"
                onClick={onClose}
                disabled={downloading}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xs flex items-center gap-2 transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: theme }}
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
