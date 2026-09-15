"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  ArrowRight,
  Users,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import ProgressCardModal from "@/components/marks/ProgressCardModal";
import Pagination from "@/components/shared/Pagination";
import { formatPersonName, capitalizeFirst } from "@/lib/utils";
import { formatDDMMYYYY } from "@/lib/validation";

function getGradeBadge(pct: number) {
  if (pct >= 90) return { grade: "A+", label: "Outstanding", bg: "bg-emerald-100 text-emerald-800" };
  if (pct >= 80) return { grade: "A", label: "Excellent", bg: "bg-sky-100 text-sky-800" };
  if (pct >= 70) return { grade: "B+", label: "Very Good", bg: "bg-indigo-100 text-indigo-800" };
  if (pct >= 60) return { grade: "B", label: "Good", bg: "bg-purple-100 text-purple-800" };
  if (pct >= 50) return { grade: "C", label: "Satisfactory", bg: "bg-amber-100 text-amber-800" };
  if (pct >= 35) return { grade: "D", label: "Pass", bg: "bg-orange-100 text-orange-800" };
  return { grade: "F", label: "Needs Improvement", bg: "bg-rose-100 text-rose-800" };
}

export default function ParentMarksPage() {
  const { user, loading } = useAuth(["PARENT"]);
  const [children, setChildren] = useState<any[]>([]);
  const [childId, setChildId] = useState("");
  const [marks, setMarks] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [marksLoading, setMarksLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [highlightId, setHighlightId] = useState("");
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const h = sp.get("highlight") || "";
      if (h) {
        setHighlightId(h);
        const t = setTimeout(() => setHighlightId(""), 5000);
        return () => clearTimeout(t);
      }
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    const initialParamChild = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("child") || "") : "";
    (async () => {
      try {
        const [usersRes, badgeRes] = await Promise.all([
          fetch("/api/users/list?role=STUDENT").catch(() => null),
          fetch("/api/badges").catch(() => null),
        ]);
        if (usersRes && usersRes.ok) {
          const users = (await usersRes.json()).users || [];
          const uEmail = user.email?.trim().toLowerCase();
          const uUsername = user.username?.trim().toLowerCase();
          const userChildrenIds = new Set((user.childrenIds || []).map(String));

          const kids = users.filter((u: any) => {
            if (u.role !== "STUDENT" || u.isActive === false) return false;
            const pEmail = u.parentEmail?.trim().toLowerCase();
            if (pEmail && (pEmail === uEmail || pEmail === uUsername)) return true;
            if (userChildrenIds.has(String(u.id))) return true;
            return false;
          });
          setChildren(kids);
          if (initialParamChild && kids.some((k: any) => k.id === initialParamChild)) {
            setChildId(initialParamChild);
          } else if (kids[0]) {
            setChildId(kids[0].id);
          }

          if (badgeRes && badgeRes.ok) {
            const bData = await badgeRes.json();
            const bMap: Record<string, number> = {};
            for (const k of kids) {
              bMap[k.id] = bData.childBadges?.[k.id]?.marks || 0;
            }
            setBadges(bMap);
          }
        }
      } finally {
        setBusy(false);
      }
    })();
  }, [user?.id]);

  const loadMarks = async (targetChildId = childId, currentPage = page, query = debouncedQuery) => {
    if (!targetChildId) return;
    setMarksLoading(true);
    try {
      let url = `/api/exams?studentId=${encodeURIComponent(targetChildId)}&page=${currentPage}&limit=20`;
      if (query.trim()) {
        url += `&q=${encodeURIComponent(query.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        const rawMarks = d.marks || [];
        const rawExams = d.exams || [];
        setMarks(rawMarks);
        setExams(rawExams);
        setTotal(d.total || rawExams.length);
        setTotalPages(d.totalPages || 1);

        // Mark as read
        for (const m of rawMarks) {
          const mid = m.id || `${targetChildId}-${m.examId || m.subject || ""}`;
          fetch("/api/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "MARKS", itemId: String(mid) }),
          }).catch(() => {});
        }
        for (const ex of rawExams) {
          fetch("/api/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "MARKS", itemId: String(ex.id) }),
          }).catch(() => {});
        }
        setBadges((b) => ({ ...b, [targetChildId]: 0 }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMarksLoading(false);
    }
  };

  useEffect(() => {
    if (childId) {
      loadMarks(childId, page, debouncedQuery);
    }
  }, [childId, page, debouncedQuery]);

  const child = children.find((c) => c.id === childId);

  const examGroups = useMemo(() => {
    const map = new Map<string, any>();
    for (const ex of exams) {
      if (ex.type === "EXAM" && !ex.published) continue;
      const examMarks = marks.filter((m) => m.examId === ex.id);
      const subList = ex.subjects?.length ? ex.subjects : [];
      let rows: any[] = [];

      if (subList.length > 0) {
        rows = subList.map((s: any) => {
          const m = examMarks.find((mk) => mk.subjectId === s.id);
          const maxM = Number(s.maxMarks) || 100;
          const passM = s.passMarks != null ? Number(s.passMarks) : Math.round(maxM * 0.35);
          return {
            id: m?.id || `${ex.id}-${s.id}`,
            examId: ex.id,
            subjectId: s.id,
            subject: s.subjectName,
            date: s.date || ex.date || ex.dateFrom,
            maxMarks: maxM,
            passMarks: passM,
            marks: m?.marks != null ? m.marks : "",
            splits: m?.splits || {},
          };
        });
      } else {
        const m = examMarks[0];
        const maxM = Number(ex.maxMarks) || 100;
        const passM = ex.passMarks != null ? Number(ex.passMarks) : Math.round(maxM * 0.35);
        rows = [
          {
            id: m?.id || ex.id,
            examId: ex.id,
            subjectId: "main",
            subject: ex.subject || ex.name || "Subject",
            date: ex.date || ex.dateFrom,
            maxMarks: maxM,
            passMarks: passM,
            marks: m?.marks != null ? m.marks : "",
            splits: m?.splits || {},
          },
        ];
      }

      map.set(ex.id, {
        examId: ex.id,
        examName: ex.name,
        examType: ex.type || "TEST",
        dateFrom: ex.dateFrom || ex.date,
        dateTo: ex.dateTo || ex.date,
        subjects: ex.subjects || [],
        rows,
      });
    }

    // Include any orphan marks
    for (const m of marks) {
      if (!map.has(m.examId)) {
        map.set(m.examId, {
          examId: m.examId,
          examName: m.examName || "Examination",
          examType: m.examType || "TEST",
          dateFrom: m.dateFrom || m.examDate,
          dateTo: m.dateTo || m.examDate,
          subjects: m.subjects || [],
          rows: [
            {
              id: m.id || m.examId,
              examId: m.examId,
              subjectId: m.subjectId || "main",
              subject: m.subject || m.examName || "Subject",
              date: m.subjectDate || m.examDate || m.dateFrom,
              maxMarks: m.maxMarks || 100,
              passMarks: m.passMarks || 35,
              marks: m.marks != null ? m.marks : "",
              splits: m.splits || {},
            },
          ],
        });
      }
    }

    return Array.from(map.values());
  }, [marks, exams]);

  const filteredExamGroups = examGroups;
  const paginatedExamGroups = examGroups;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";

  return (
    <div className="min-h-screen bg-slate-50/70">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        {/* Page Header */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Exams &amp; Marks</h1>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search exams, subjects..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Children Selector Tabs (ONLY displayed when children.length > 1) */}
        {children.length > 1 && (
          <div className="flex gap-2.5 mb-6 overflow-x-auto pb-2 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Child:
            </span>
            {children.map((c) => {
              const isSelected = childId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setChildId(c.id);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl text-xs font-bold border transition-all shadow-2xs ${
                    isSelected
                      ? "text-white border-transparent shadow-md scale-[1.02]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  style={isSelected ? { backgroundColor: theme } : undefined}
                >
                  <Avatar name={c.firstName} photoUrl={c.photoUrl} size={22} />
                  <span>{formatPersonName(c.firstName, c.lastName)}</span>
                  {c.className && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                      Class {c.className}{c.section ? `-${c.section}` : ""}
                    </span>
                  )}
                  {badges[c.id] > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                      {badges[c.id] > 9 ? "9+" : badges[c.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {busy || marksLoading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading academic records...</span>
          </div>
        ) : filteredExamGroups.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No published results found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? "Try refining your search filter" : "No examination results published for this student yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-5">
              {paginatedExamGroups.map((g) => {
              // Calculate metrics
              let totalObtained = 0;
              let totalMax = 0;
              let hasMarks = false;
              let anyFailed = false;

              for (const r of g.rows) {
                if (r.marks != null && r.marks !== "") {
                  hasMarks = true;
                  const obt = Number(r.marks) || 0;
                  const mx = Number(r.maxMarks) || 100;
                  const pass = r.passMarks != null ? Number(r.passMarks) : Math.round(mx * 0.35);
                  totalObtained += obt;
                  totalMax += mx;
                  if (obt < pass) anyFailed = true;
                }
              }

              const percentage = hasMarks && totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
              const gradeBadge = getGradeBadge(percentage);
              const isPass = hasMarks && !anyFailed && totalObtained >= totalMax * 0.35;
              const isHighlighted =
                highlightId &&
                (highlightId === g.examId || g.rows?.some((r: any) => String(r.id) === highlightId));

              return (
                <motion.div
                  key={g.examId}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.18 }}
                  className={`bg-white rounded-3xl border p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between ${
                    isHighlighted
                      ? "ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20"
                      : "border-slate-200/90 hover:border-indigo-200"
                  }`}
                >
                  <div>
                    {/* Card Top: Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          g.examType === "EXAM"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        {g.examType || "EXAM"}
                      </span>

                      {g.dateFrom && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-mono font-medium">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {formatDDMMYYYY(g.dateFrom)}
                          {g.dateTo && g.dateTo !== g.dateFrom ? ` → ${formatDDMMYYYY(g.dateTo)}` : ""}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {capitalizeFirst(g.examName)}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {g.subjects?.length || g.rows.length} Subjects Evaluated
                    </p>

                    {/* Quick Metrics Grid */}
                    {hasMarks ? (
                      <div className="grid grid-cols-3 gap-2 mt-4 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Total Score</span>
                          <span className="text-base font-black text-slate-900">
                            {totalObtained}
                            <span className="text-[11px] text-slate-400 font-semibold font-mono"> / {totalMax}</span>
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Percentage</span>
                          <span className="text-base font-black text-indigo-600">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Grade</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${gradeBadge.bg}`}>
                            {gradeBadge.grade}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        Marks compilation in progress
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      {isPass ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                        </span>
                      ) : hasMarks ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" /> Needs Improvement
                        </span>
                      ) : (
                        <span className="text-slate-400">Published</span>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelected(g)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition shadow-sm hover:opacity-95 hover:gap-2"
                      style={{ backgroundColor: theme }}
                    >
                      <span>View Progress Card</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
            </div>

            {total > 0 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={pageSize}
                onPageChange={setPage}
                themeColor={theme}
                loading={marksLoading}
              />
            )}
          </div>
        )}
      </main>

      {/* Progress Card Modal Dialog */}
      {child && (
        <ProgressCardModal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          examGroup={selected}
          student={child}
          schoolName={user.schoolName}
          schoolLogo={user.schoolLogo}
          themeColor={theme}
        />
      )}
    </div>
  );
}
