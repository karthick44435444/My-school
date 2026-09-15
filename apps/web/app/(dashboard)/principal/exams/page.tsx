"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import Pagination from "@/components/shared/Pagination";

export default function PrincipalExamsPage() {
  const { user, loading } = useAuth(["PRINCIPAL"]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [show, setShow] = useState(false);
  const [marksMode, setMarksMode] = useState<any>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", className: "", section: "", subject: "", maxMarks: "100", passMarks: "35", date: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const tmr = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(tmr);
  }, [searchQuery]);

  const load = useCallback(async (targetPage = page, query = debouncedSearch) => {
    setBusy(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "20",
      });
      if (query.trim()) params.set("q", query.trim());

      const [eRes, sRes] = await Promise.all([
        fetch(`/api/exams?${params}`),
        fetch("/api/users/list?role=STUDENT"),
      ]);
      if (eRes.ok) {
        const d = await eRes.json();
        setExams(d.exams || []);
        setTotal(d.total ?? (d.exams || []).length);
        setTotalPages(d.totalPages ?? 1);
      }
      if (sRes.ok) setStudents((await sRes.json()).users || []);
    } finally {
      setBusy(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, className: user.className || "", section: user.section || "", date: new Date().toISOString().slice(0, 10) }));
      load(page, debouncedSearch);
    }
  }, [user, page, debouncedSearch, load]);

  if (loading || !user) {
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Exams &amp; Marks</h1>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-2xs"
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
            <button onClick={() => setShow(true)} className="px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-2 shadow-xs transition hover:opacity-95 shrink-0" style={{ backgroundColor: theme }}>
              <Plus className="w-4 h-4" /> Create Exam
            </button>
          </div>
        </div>
        {busy ? (
          <Loader2 className="animate-spin text-indigo-600" />
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl border p-10 text-center text-slate-400">
            {searchQuery ? "No exams match your search" : "No exams yet"}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {exams.map((ex) => (
                <div key={ex.id} className="bg-white rounded-2xl border p-5 flex justify-between items-center">
                  <div>
                    <div className="font-bold">{ex.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {ex.className}{ex.section ? `-${ex.section}` : ""} · {ex.subject || "General"} · Max {ex.maxMarks} · Pass {ex.passMarks != null ? ex.passMarks : Math.round((Number(ex.maxMarks) || 100) * 0.35)} · {ex.date}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setMarksMode(ex);
                      const res = await fetch(`/api/exams?examId=${ex.id}`);
                      const d = await res.json();
                      const map: Record<string, string> = {};
                      (d.marks || []).forEach((m: any) => { map[m.studentId] = String(m.marks); });
                      setMarks(map);
                    }}
                    className="px-3 py-1.5 rounded-xl border text-sm font-medium"
                  >
                    Enter marks
                  </button>
                </div>
              ))}
            </div>

            {total > 0 && (
              <Pagination
                page={page}
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

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10 backdrop-blur-xs">
              <h2 className="font-bold text-lg text-slate-900">Create Exam</h2>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const maxM = Number(form.maxMarks) || 100;
                  const passM = form.passMarks !== "" && form.passMarks != null ? Number(form.passMarks) : Math.round(maxM * 0.35);
                  const res = await fetch("/api/exams", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...form, maxMarks: maxM, passMarks: passM }),
                  });
                  const data = await res.json();
                  if (!res.ok) toast.error(data.error);
                  else {
                    toast.success("Exam created");
                    setShow(false);
                    load();
                  }
                }}
                className="space-y-3.5"
              >
                <input required placeholder="Exam name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500" />
                <div className="grid grid-cols-2 gap-2">
                  <input required placeholder="Class" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500" />
                  <input placeholder="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500" />
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Total Marks</label>
                    <input
                      type="number"
                      placeholder="Total"
                      value={form.maxMarks}
                      onChange={(e) => {
                        const nextMax = e.target.value;
                        const numMax = Number(nextMax) || 0;
                        const autoPass = String(numMax === 100 ? 35 : Math.round(numMax * 0.35));
                        setForm({ ...form, maxMarks: nextMax, passMarks: autoPass });
                      }}
                      className="w-full mt-0.5 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Pass Mark</label>
                    <input
                      type="number"
                      placeholder="Pass (35)"
                      value={form.passMarks}
                      onChange={(e) => setForm({ ...form, passMarks: e.target.value })}
                      className="w-full mt-0.5 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600">Date</label>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full mt-0.5 px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 rounded-xl text-white font-semibold transition hover:opacity-95" style={{ backgroundColor: theme }}>Create</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {marksMode && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10 backdrop-blur-xs">
              <h2 className="font-bold text-lg text-slate-900">Marks — {marksMode.name} (Max {marksMode.maxMarks})</h2>
              <button
                type="button"
                onClick={() => setMarksMode(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
              <div className="space-y-2">
                {students
                  .filter((s) => s.className === marksMode.className && (!marksMode.section || s.section === marksMode.section))
                  .map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <Avatar name={s.firstName} photoUrl={s.photoUrl} size={32} />
                      <span className="flex-1 text-sm font-medium text-slate-800">{s.firstName} {s.lastName}</span>
                      <input
                        type="number"
                        min="0"
                        max={marksMode.maxMarks || 100}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={marks[s.id] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const maxAllowed = Number(marksMode.maxMarks) || 100;
                          if (val !== "") {
                            const num = Number(val);
                            if (num > maxAllowed) {
                              toast.error(`Marks cannot exceed ${maxAllowed}`);
                              return;
                            }
                            if (num < 0) return;
                          }
                          setMarks({ ...marks, [s.id]: val });
                        }}
                        placeholder="0"
                      />
                    </div>
                  ))}
              </div>
              <button
                onClick={async () => {
                  const maxAllowed = Number(marksMode.maxMarks) || 100;
                  for (const [sid, m] of Object.entries(marks)) {
                    if (m !== "" && Number(m) > maxAllowed) {
                      toast.error(`Marks cannot exceed ${maxAllowed}`);
                      return;
                    }
                  }
                  const records = Object.entries(marks).map(([studentId, m]) => ({ studentId, marks: Number(m) }));
                  const res = await fetch("/api/exams", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "marks", examId: marksMode.id, records }),
                  });
                  const data = await res.json();
                  if (!res.ok) toast.error(data.error);
                  else {
                    toast.success("Marks saved");
                    setMarksMode(null);
                  }
                }}
                className="w-full py-3 rounded-xl text-white font-semibold transition hover:opacity-95"
                style={{ backgroundColor: theme }}
              >
                Save marks
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
