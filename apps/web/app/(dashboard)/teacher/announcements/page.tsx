"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader2, Plus, X, Megaphone, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/validation";
import { getDayWiseLabel } from "@/lib/utils";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import Pagination from "@/components/shared/Pagination";

export default function TeacherAnnouncementsPage() {
  const { user, loading } = useAuth(["TEACHER"]);
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [myClasses, setMyClasses] = useState<any[]>([]);

  const classOptions = useMemo(() => {
    return Array.from(
      new Map(myClasses.map((c) => [`${c.className}||${c.section}`, c])).values()
    );
  }, [myClasses]);
  const [busy, setBusy] = useState(true);
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    target: "CLASS",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (targetPage = page, q = search) => {
    try {
      setBusy(true);
      let url = `/api/announcements?page=${targetPage}&limit=${pageSize}`;
      if (q.trim()) url += `&q=${encodeURIComponent(q.trim())}`;
      const [feedRes, cRes] = await Promise.all([
        fetch(url),
        fetch("/api/teacher-classes"),
      ]);
      if (feedRes.ok) {
        const d = await feedRes.json();
        const items = d.announcements || [];
        setList(items);
        setTotal(d.total ?? items.length);
        setTotalPages(d.totalPages || 1);
        setPage(d.page || targetPage);
        for (const a of items) {
          fetch("/api/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "ANNOUNCEMENT", itemId: a.id }),
          }).catch(() => {});
        }
      }
      if (cRes.ok) {
        const classes = (await cRes.json()).classes || [];
        setMyClasses(classes);
        if (classes[0] && selectedClasses.length === 0) {
          setSelectedClasses([`${classes[0].className}||${classes[0].section || ""}`]);
        }
      }
    } finally {
      setBusy(false);
    }
  }, [page, search, pageSize, selectedClasses.length]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      load(1, search);
    }, 250);
    return () => clearTimeout(timer);
  }, [user, search]);

  const toggleClass = (key: string) => {
    setSelectedClasses((prev) =>
      prev.includes(key) ? (prev.length === 1 ? prev : prev.filter((k) => k !== key)) : [...prev, key]
    );
  };

  const selectAllClasses = () => {
    const allKeys = classOptions.map((c) => `${c.className}||${c.section || ""}`);
    if (selectedClasses.length === allKeys.length) {
      if (allKeys[0]) setSelectedClasses([allKeys[0]]);
    } else {
      setSelectedClasses(allKeys);
    }
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Notice title is required";
    if (!form.content.trim()) errs.content = "Notice message is required";
    if (selectedClasses.length === 0) errs.classes = "Please select at least one class";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const clsPayload = selectedClasses.map((k) => {
        const [className, section] = k.split("||");
        return { className, section: section || undefined };
      });
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          classes: clsPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Notice posted successfully");
      setShow(false);
      setForm({ title: "", content: "", target: "CLASS" });
      setErrors({});
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/announcements?id=${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Deleted");
      setDeleteId(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };



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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6" /> Notices
          </h1>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notices..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              onClick={() => {
                setErrors({});
                setShow(true);
              }}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 shrink-0 transition hover:opacity-95"
              style={{ backgroundColor: theme }}
            >
              <Plus className="w-4 h-4" /> New Notice
            </button>
          </div>
        </div>

        {busy ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border p-10 text-center text-slate-400">
            {search ? "No notices match your search" : "No notices yet"}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {list.map((a, index) => {
                const currDay = getDayWiseLabel(a.createdAt);
                const prevDay = index > 0 ? getDayWiseLabel(list[index - 1]?.createdAt) : null;
                const showDayHeader = currDay !== prevDay;

                const isMine = a.createdById === user.id;
                const roleLabel = a.createdByRole || "";
                return (
                  <div key={a.id}>
                    {showDayHeader && (
                      <div className="flex items-center justify-center my-5 gap-3">
                        <div className="h-px bg-slate-200 flex-1 max-w-[80px]" />
                        <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500 shadow-xs">
                          {currDay}
                        </span>
                        <div className="h-px bg-slate-200 flex-1 max-w-[80px]" />
                      </div>
                    )}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between relative">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-bold text-slate-900 text-base">{a.title}</div>
                            {roleLabel && (
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  roleLabel === "ADMIN"
                                    ? "bg-purple-100 text-purple-700"
                                    : roleLabel === "PRINCIPAL"
                                      ? "bg-indigo-100 text-indigo-700"
                                      : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {roleLabel}
                              </span>
                            )}
                            {a.target && a.target !== "ALL" && (
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                {a.target.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {a.createdByName || "School"}
                            {a.className ? ` · Class ${a.className}${a.section ? `-${a.section}` : ""}` : ""}
                          </div>
                        </div>
                        {isMine && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(a.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete announcement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap leading-relaxed">{a.content}</p>
                      <div className="flex justify-end items-center mt-3 pt-2 border-t border-slate-50">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatDateTime(a.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 px-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={20}
                onPageChange={(newPage) => {
                  setPage(newPage);
                  load(newPage, search);
                }}
                themeColor={theme}
              />
            </div>
          </div>
        )}
      </main>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10">
              <h2 className="text-lg font-bold text-slate-900">New Notice</h2>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form onSubmit={create} className="space-y-3.5" noValidate>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Notice Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    placeholder="e.g. Sports Day Announcement"
                    value={form.title}
                    onChange={(e) => {
                      setForm({ ...form, title: e.target.value });
                      setErrors((er) => ({ ...er, title: "" }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      errors.title ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  />
                  {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    placeholder="Write your announcement details here..."
                    value={form.content}
                    onChange={(e) => {
                      setForm({ ...form, content: e.target.value });
                      setErrors((er) => ({ ...er, content: "" }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      errors.content ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  />
                  {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content}</p>}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Select Classes (Multi-select) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={selectAllClasses}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: theme }}
                    >
                      {selectedClasses.length === classOptions.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div
                    className={`flex flex-wrap gap-2 p-2.5 rounded-xl border bg-slate-50/50 max-h-36 overflow-y-auto ${
                      errors.classes ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  >
                    {classOptions.map((c) => {
                      const key = `${c.className}||${c.section || ""}`;
                      const isSelected = selectedClasses.includes(key);
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => {
                            toggleClass(key);
                            setErrors((er) => ({ ...er, classes: "" }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                            isSelected
                              ? "text-white border-transparent shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                          style={isSelected ? { backgroundColor: theme } : undefined}
                        >
                          <span>{isSelected ? "✓" : "+"}</span>
                          <span>
                            {c.className}
                            {c.section ? `-${c.section}` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.classes && <p className="mt-1 text-xs text-red-600">{errors.classes}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Who Can Receive *
                  </label>
                  <select
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="CLASS">Students & Parents</option>
                    <option value="STUDENTS_ONLY">Students only</option>
                    <option value="PARENTS_ONLY">Parents only</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  style={{ backgroundColor: theme }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Posting Notice...
                    </>
                  ) : (
                    "Post Notice"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteId}
        title="Delete notice?"
        description="Are you sure you want to delete this notice? This action cannot be undone."
        loading={deleting}
        onClose={() => !deleting && setDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
