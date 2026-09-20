"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  FileText,
  Bell,
  Loader2,
  ArrowRight,
  BookOpen,
  Paperclip,
  Users,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import { formatDateTime, formatDDMMYYYY } from "@/lib/validation";
import { formatPersonName, toTitleCase, capitalizeFirst } from "@/lib/utils";

function getGradeInfo(pct: number) {
  if (pct >= 90) return { grade: "A+", label: "Outstanding", bg: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  if (pct >= 80) return { grade: "A", label: "Excellent", bg: "bg-sky-100 text-sky-800 border-sky-200" };
  if (pct >= 70) return { grade: "B+", label: "Very Good", bg: "bg-indigo-100 text-indigo-800 border-indigo-200" };
  if (pct >= 60) return { grade: "B", label: "Good", bg: "bg-purple-100 text-purple-800 border-purple-200" };
  if (pct >= 50) return { grade: "C", label: "Satisfactory", bg: "bg-amber-100 text-amber-800 border-amber-200" };
  if (pct >= 35) return { grade: "D", label: "Pass", bg: "bg-orange-100 text-orange-800 border-orange-200" };
  return { grade: "F", label: "Needs Improvement", bg: "bg-rose-100 text-rose-800 border-rose-200" };
}

export default function ParentDashboard() {
  const { user, loading } = useAuth(["PARENT"]);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [marksList, setMarksList] = useState<any[]>([]);
  const [examsList, setExamsList] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [childLoading, setChildLoading] = useState(true);

  // 1. Fetch parent's children
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
          if (userChildrenIds.has(String(s.id))) return true;
          return false;
        });

        setChildren(kids);
        if (kids.length > 0) {
          setSelectedChildId((prev) => (prev && kids.some((k: any) => k.id === prev) ? prev : kids[0].id));
        }
      })
      .catch((err) => console.error("Error loading children:", err))
      .finally(() => setDataLoading(false));
  }, [user]);

  // Selected child object
  const selectedChild = useMemo(() => {
    return children.find((c) => c.id === selectedChildId) || children[0] || null;
  }, [children, selectedChildId]);

  // 2. Fetch selected child's stats (Attendance, Homework, Exams/Marks, Announcements)
  useEffect(() => {
    if (!selectedChild) {
      setChildLoading(false);
      return;
    }

    setChildLoading(true);
    // Clear stale data immediately so old child's data is never displayed during switch
    setAttendanceRecords([]);
    setHomeworkList([]);
    setMarksList([]);
    setExamsList([]);

    const hwParams = new URLSearchParams();
    if (selectedChild.className) hwParams.set("className", selectedChild.className);
    if (selectedChild.section) hwParams.set("section", selectedChild.section);

    Promise.all([
      fetch(`/api/attendance/student?studentId=${encodeURIComponent(selectedChild.id)}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch(`/api/homework?${hwParams.toString()}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/exams?studentId=${encodeURIComponent(selectedChild.id)}`).then((r) =>
        r.ok ? r.json() : null
      ),
      fetch("/api/announcements").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([attData, hwData, examData, aData]) => {
        if (attData) {
          setAttendanceRecords(attData.records || []);
        } else {
          setAttendanceRecords([]);
        }
        if (hwData) {
          const raw = hwData.homeworks || hwData.list || [];
          setHomeworkList(raw);
        } else {
          setHomeworkList([]);
        }
        if (examData) {
          setMarksList(examData.marks || []);
          setExamsList(examData.exams || []);
        } else {
          setMarksList([]);
          setExamsList([]);
        }
        if (aData) {
          setAnnouncements((aData.announcements || []).slice(0, 6));
        }
      })
      .catch((err) => console.error("Error loading child data:", err))
      .finally(() => {
        setChildLoading(false);
      });
  }, [selectedChild]);

  // Attendance stats for selected child
  const attStats = useMemo(() => {
    if (!selectedChild) return { present: 0, absent: 0, late: 0, total: 0, rate: 0, todayStatus: "NOT_MARKED" };

    let classRecords = attendanceRecords.filter((r: any) => {
      if (selectedChild.className && r.className && r.className !== selectedChild.className) return false;
      if (selectedChild.section && r.section && r.section !== selectedChild.section) return false;
      return true;
    });

    if (classRecords.length === 0 && attendanceRecords.length > 0) {
      classRecords = attendanceRecords;
    }

    const present = classRecords.filter((r) => r.status === "PRESENT").length;
    const absent = classRecords.filter((r) => r.status === "ABSENT").length;
    const late = classRecords.filter((r) => r.status === "LATE").length;
    const total = classRecords.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRec = classRecords.find((r) => (r.date || "").slice(0, 10) === todayStr);
    const todayStatus = todayRec ? String(todayRec.status).toUpperCase() : "NOT_MARKED";

    return { present, absent, late, total, rate, todayStatus };
  }, [attendanceRecords, selectedChild]);

  // Recent Homework: prioritize today & yesterday, then recent
  const recentHomework = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

    const sorted = [...homeworkList].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return sorted.slice(0, 6).map((h) => {
      const createdDateStr = (h.createdAt || "").slice(0, 10);
      let dayBadge = "";
      if (createdDateStr === todayStr) dayBadge = "Today";
      else if (createdDateStr === yesterdayStr) dayBadge = "Yesterday";
      return {
        ...h,
        dayBadge,
      };
    });
  }, [homeworkList]);

  // Recent Marks & Exams
  const recentMarksAndExams = useMemo(() => {
    const list: any[] = [];
    const seenExamIds = new Set<string>();

    for (const m of marksList) {
      const marksVal = m.marks != null ? Number(m.marks) : null;
      const maxM = Number(m.maxMarks) || 100;
      const pct = marksVal != null && maxM > 0 ? Math.round((marksVal / maxM) * 100) : 0;
      const grade = getGradeInfo(pct);

      list.push({
        id: m.id || `${m.examId}_${m.subjectId || "main"}`,
        examId: m.examId,
        title: m.examName || m.subject || "Exam",
        subject: m.subject || (m.subjects && m.subjects[0]?.subjectName) || "General",
        type: m.examType || "TEST",
        date: m.examDate || m.dateFrom || m.createdAt,
        marksVal,
        maxM,
        pct,
        grade,
        isPublished: m.published !== false,
      });
      seenExamIds.add(m.examId);
    }

    for (const ex of examsList) {
      if (!seenExamIds.has(ex.id) && (ex.type !== "EXAM" || ex.published)) {
        list.push({
          id: ex.id,
          examId: ex.id,
          title: ex.name,
          subject: ex.subject || (ex.subjects && ex.subjects[0]?.subjectName) || "General",
          type: ex.type || "TEST",
          date: ex.date || ex.dateFrom || ex.createdAt,
          marksVal: null,
          maxM: Number(ex.maxMarks) || 100,
          pct: null,
          grade: null,
          isPublished: !!ex.published,
        });
      }
    }

    return list.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6);
  }, [marksList, examsList]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";
  const childRoll = selectedChild ? (selectedChild.rollNumber || (selectedChild as any).rollNo || "") : "";
  const childLabel = selectedChild
    ? `${formatPersonName(selectedChild.firstName, selectedChild.lastName)} (Class ${selectedChild.className || ""}${selectedChild.section ? `-${selectedChild.section}` : ""}${childRoll ? ` · Roll: ${childRoll}` : ""})`
    : "Child";

  return (
    <div className="min-h-screen bg-slate-50/70">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 max-w-7xl min-h-screen">
        {/* Child Selector Tabs (ONLY displayed when parent has more than 1 child) */}
        {children.length > 1 && (
          <div className="flex gap-2.5 mb-6 overflow-x-auto pb-2 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Child:
            </span>
            {children.map((c) => {
              const isSelected = selectedChild?.id === c.id;
              const roll = c.rollNumber || (c as any).rollNo || "";
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl text-xs font-bold border transition-all shadow-2xs ${
                    isSelected
                      ? "text-white border-transparent shadow-md scale-[1.02]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  style={isSelected ? { backgroundColor: theme } : undefined}
                >
                  <Avatar name={c.firstName} photoUrl={c.photoUrl} size={22} />
                  <span>{formatPersonName(c.firstName, c.lastName)}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    Class {c.className}
                    {c.section ? `-${c.section}` : ""}
                    {roll ? ` · Roll ${roll}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {children.length === 0 && !dataLoading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No children linked</h3>
            <p className="text-xs text-slate-400 mt-1">
              Please contact the school administration to link your student profile
            </p>
          </div>
        ) : (
          <>
            {/* 1. ATTENDANCE COUNT CARDS (Clickable -> /parent/attendance) */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Attendance Summary · {childLabel}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Current academic records for your child
                  </p>
                </div>
                <Link
                  href={selectedChild ? `/parent/attendance?child=${selectedChild.id}` : "/parent/attendance"}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group"
                >
                  View Full Attendance <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Present Count Card */}
                <Link href={selectedChild ? `/parent/attendance?child=${selectedChild.id}` : "/parent/attendance"}>
                  <motion.div
                    whileHover={{ y: -3, transition: { duration: 0.15 } }}
                    className="bg-white rounded-3xl p-5 border border-emerald-100/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition group cursor-pointer relative overflow-hidden h-full"
                  >
                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-20 h-20 rounded-full bg-emerald-50 pointer-events-none" />
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Total Present
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-emerald-600 relative z-10">
                      {childLoading || dataLoading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-500" /> : attStats.present}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-2 flex items-center justify-between relative z-10">
                      <span>Days attended</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                </Link>

                {/* Absent Count Card */}
                <Link href={selectedChild ? `/parent/attendance?child=${selectedChild.id}` : "/parent/attendance"}>
                  <motion.div
                    whileHover={{ y: -3, transition: { duration: 0.15 } }}
                    className="bg-white rounded-3xl p-5 border border-rose-100/90 shadow-xs hover:shadow-md hover:border-rose-300 transition group cursor-pointer relative overflow-hidden h-full"
                  >
                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-20 h-20 rounded-full bg-rose-50 pointer-events-none" />
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                        Total Absent
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <XCircle className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-rose-600 relative z-10">
                      {childLoading || dataLoading ? <Loader2 className="w-6 h-6 animate-spin text-rose-500" /> : attStats.absent}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-2 flex items-center justify-between relative z-10">
                      <span>Days absent</span>
                      <ArrowRight className="w-3.5 h-3.5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                </Link>

                {/* Late Count Card */}
                <Link href={selectedChild ? `/parent/attendance?child=${selectedChild.id}` : "/parent/attendance"}>
                  <motion.div
                    whileHover={{ y: -3, transition: { duration: 0.15 } }}
                    className="bg-white rounded-3xl p-5 border border-amber-100/90 shadow-xs hover:shadow-md hover:border-amber-300 transition group cursor-pointer relative overflow-hidden h-full"
                  >
                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-20 h-20 rounded-full bg-amber-50 pointer-events-none" />
                    <div className="flex items-center justify-between mb-3 relative z-10">
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                        Total Late
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-amber-600 relative z-10">
                      {childLoading || dataLoading ? <Loader2 className="w-6 h-6 animate-spin text-amber-500" /> : attStats.late}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-2 flex items-center justify-between relative z-10">
                      <span>Late arrivals</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                </Link>

                {/* Today's Status & Total Days Card */}
                <Link href={selectedChild ? `/parent/attendance?child=${selectedChild.id}` : "/parent/attendance"}>
                  <motion.div
                    whileHover={{ y: -3, transition: { duration: 0.15 } }}
                    className="bg-white rounded-3xl p-5 border border-indigo-100/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition group cursor-pointer relative overflow-hidden h-full"
                  >
                    <div className="absolute right-0 top-0 translate-x-3 -translate-y-3 w-20 h-20 rounded-full bg-indigo-50 pointer-events-none" />
                    <div className="flex items-center justify-between mb-2 relative z-10">
                      <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
                        Today&apos;s Status
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Calendar className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="relative z-10 mt-1">
                      {childLoading || dataLoading ? (
                        <div className="py-1">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                        </div>
                      ) : attStats.todayStatus === "PRESENT" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Present Today
                        </span>
                      ) : attStats.todayStatus === "LATE" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" /> Late Today
                        </span>
                      ) : attStats.todayStatus === "ABSENT" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" /> Absent Today
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Not Marked Yet
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-3 relative z-10 flex items-center justify-between">
                      <span>Total {attStats.total} school days</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                </Link>
              </div>
            </div>

            {/* 2 & 3. MAIN CONTENT GRID: RECENT HOMEWORK & RECENT MARKS & EXAMS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* RECENT HOMEWORK (Clickable -> /parent/homework) */}
              <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-2xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">Recent Homework</h2>
                      <p className="text-xs text-slate-400 font-medium">Assigned by teachers for {selectedChild?.firstName}</p>
                    </div>
                  </div>
                  <Link
                    href={selectedChild ? `/parent/homework?child=${selectedChild.id}` : "/parent/homework"}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group"
                  >
                    View all <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                {childLoading || dataLoading ? (
                  <div className="py-12 flex justify-center items-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  </div>
                ) : recentHomework.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center">
                    <FileText className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No homework assigned yet</p>
                    <p className="text-xs text-slate-400 mt-1">Teachers will post assignments here.</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {recentHomework.map((h) => {
                      const hasAttachments =
                        (Array.isArray(h.attachments) && h.attachments.length > 0) || !!h.attachmentUrl;

                      return (
                        <Link
                          key={h.id}
                          href={selectedChild ? `/parent/homework?child=${selectedChild.id}&highlight=${h.id}` : `/parent/homework?highlight=${h.id}`}
                          className="block p-4 rounded-2xl bg-slate-50/80 hover:bg-amber-50/60 border border-slate-200/70 hover:border-amber-300/80 transition shadow-2xs group"
                        >
                          <div className="flex items-start justify-between gap-3 mb-1.5 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800">
                                {capitalizeFirst(h.subject || "General")}
                              </span>
                              {h.dayBadge && (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                    h.dayBadge === "Today"
                                      ? "bg-emerald-100 text-emerald-800 animate-pulse"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {h.dayBadge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              {h.createdAt ? formatDateTime(h.createdAt) : ""}
                            </span>
                          </div>

                          <div className="text-sm font-bold text-slate-900 group-hover:text-amber-950 transition line-clamp-1">
                            {capitalizeFirst(h.title)}
                          </div>

                          {h.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium">
                              {h.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/50 text-[11px] text-slate-400">
                            <div className="flex items-center gap-2">
                              {hasAttachments && (
                                <span className="flex items-center gap-1 text-slate-600 font-medium">
                                  <Paperclip className="w-3 h-3 text-indigo-500" /> Attachment
                                </span>
                              )}
                              {h.dueDate && <span>Due: {formatDDMMYYYY(h.dueDate)}</span>}
                            </div>
                            <span className="font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                              Open Details →
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RECENT MARKS & EXAMS (Clickable -> /parent/marks) */}
              <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 text-base">Recent Marks &amp; Exams</h2>
                      <p className="text-xs text-slate-400 font-medium">Scores and test outcomes for {selectedChild?.firstName}</p>
                    </div>
                  </div>
                  <Link
                    href={selectedChild ? `/parent/marks?child=${selectedChild.id}` : "/parent/marks"}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group"
                  >
                    View all <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                {childLoading || dataLoading ? (
                  <div className="py-12 flex justify-center items-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  </div>
                ) : recentMarksAndExams.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center">
                    <Award className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No marks or exams published</p>
                    <p className="text-xs text-slate-400 mt-1">Exam results and test marks will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1">
                    {recentMarksAndExams.map((item) => {
                      return (
                        <Link
                          key={item.id}
                          href={selectedChild ? `/parent/marks?child=${selectedChild.id}&highlight=${item.id}` : `/parent/marks?highlight=${item.id}`}
                          className="block p-4 rounded-2xl bg-slate-50/80 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-300/80 transition shadow-2xs group"
                        >
                          <div className="flex items-start justify-between gap-3 mb-1.5 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                                  item.type === "EXAM"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-indigo-100 text-indigo-800"
                                }`}
                              >
                                {item.type}
                              </span>
                              <span className="text-xs font-bold text-slate-700">{capitalizeFirst(item.subject)}</span>
                            </div>
                            {item.date && (
                              <span className="text-[11px] font-mono text-slate-400">
                                {formatDDMMYYYY(item.date)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3 mt-1">
                            <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-950 transition line-clamp-1">
                              {capitalizeFirst(item.title)}
                            </div>

                            {item.marksVal != null ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-sm font-black text-slate-900">
                                  {item.marksVal}
                                  <span className="text-xs text-slate-400 font-normal"> / {item.maxM}</span>
                                </span>
                                {item.grade && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-black border ${item.grade.bg}`}
                                  >
                                    {item.grade.grade}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                                Marks Pending
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/50 text-[11px]">
                            <span className="text-slate-400 font-medium">
                              {item.marksVal != null
                                ? item.marksVal >= Math.round(item.maxM * 0.35)
                                ? "Status: PASSED"
                                : "Status: FAIL"
                                : "Scheduled / Conducted"}
                            </span>
                            <span className="font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                              View Marksheet →
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 4. NOTICES / ANNOUNCEMENTS SECTION (Clickable -> /parent/announcements) */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600 border border-pink-100 flex items-center justify-center shadow-2xs">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">School Notices</h2>
                    <p className="text-xs text-slate-400 font-medium">Latest announcements and updates</p>
                  </div>
                </div>
                <Link
                  href="/parent/announcements"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group"
                >
                  View all <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {dataLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : announcements.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center">No notices at this time.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {announcements.map((a) => (
                    <Link
                      key={a.id}
                      href={`/parent/announcements?highlight=${a.id}`}
                      className="p-4 rounded-2xl bg-slate-50 hover:bg-pink-50/60 border border-slate-200/70 hover:border-pink-200 transition shadow-2xs group flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-pink-950 transition line-clamp-1 mb-1">
                          {capitalizeFirst(a.title)}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {a.content}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-3 text-right">
                        {a.createdAt ? formatDateTime(a.createdAt) : ""}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
