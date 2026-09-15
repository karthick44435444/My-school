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

export default function PrincipalAnnouncementsPage() {
  const { user, loading } = useAuth(["PRINCIPAL", "PRINCIPAL", "TEACHER"]);
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [form, setForm] = useState({
    title: "",
    content: "",
    target: "ALL",
  });
  const [errors, setErrors] = useState<{ title?: string; content?: string; classes?: string }>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (targetPage = page, q = search) => {
    try {
      setBusy(true);
      let url = `/api/announcements?page=${targetPage}&limit=${pageSize}`;
      if (q.trim()) url += `&q=${encodeURIComponent(q.trim())}`;
      const [res, cRes] = await Promise.all([
        fetch(url),
        fetch("/api/classes?all=1"),
      ]);
      if (res.ok) {
        const d = await res.json();
        const items = d.announcements || [];
        setList(items);
        setTotal(d.total ?? items.length);
        setTotalPages(d.totalPages || 1);
        setPage(d.page || targetPage);
        // clear badge: mark all as read
        for (const a of items) {
          fetch("/api/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "ANNOUNCEMENT", itemId: a.id }),
          }).catch(() => {});
        }
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setClassesList(cData.classes || []);
      }
    } finally {
      setBusy(false);
    }
  }, [page, search, pageSize]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      load(1, search);
    }, 250);
    return () => clearTimeout(timer);
  }, [user, search]);

  const toggleClass = (key: string) => {
    setSelectedClasses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    if (errors.classes) setErrors((prev) => ({ ...prev, classes: undefined }));
  };

  const selectAllClasses = () => {
    const allKeys = classesList.map((c) => `${c.name || c.className}||${c.section || ""}`);
    if (selectedClasses.length === allKeys.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(allKeys);
      if (errors.classes) setErrors((prev) => ({ ...prev, classes: undefined }));
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { title?: string; content?: string; classes?: string } = {};
    if (!form.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!form.content.trim()) {
      newErrors.content = "Message content is required";
    }
    if (
      (form.target === "CLASS" || form.target === "STUDENTS_ONLY" || form.target === "PARENTS_ONLY") &&
      classesList.length > 0 &&
      selectedClasses.length === 0
    ) {
      newErrors.classes = "Please select at least one class";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      let payloadTarget = form.target;
      let targetClasses: { className: string; section?: string }[] | undefined = undefined;

      if (form.target === "CLASS" || form.target === "STUDENTS_ONLY" || form.target === "PARENTS_ONLY") {
        if (selectedClasses.length > 0) {
          targetClasses = selectedClasses.map((item) => {
            const [cn, sec] = item.split("||");
            return { className: cn, section: sec || undefined };
          });
        }
      }

      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          target: payloadTarget,
          targetClasses,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create announcement");
      toast.success("Notice posted successfully");
      setShow(false);
      setForm({ title: "", content: "", target: "ALL" });
      setSelectedClasses([]);
      load(1, search);
    } catch (e: any) {
      toast.error(e.message || "Failed to post notice");
    } finally {
      setSaving(false);
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
  const canCreate = user.role === "ADMIN" || user.role === "PRINCIPAL" || user.role === "TEACHER";

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Notices</h1>
            <p className="text-xs text-slate-500 mt-1">Important announcements and updates</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notices..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            {canCreate && (
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
            )}
          </div>
        </div>
        {busy ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border p-10 text-center text-slate-400">
            {search ? "No notices match your search" : "No notices"}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {list.map((a, index) => {
                const currDay = getDayWiseLabel(a.createdAt);
                const prevDay = index > 0 ? getDayWiseLabel(list[index - 1]?.createdAt) : null;
                const showDayHeader = currDay !== prevDay;

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
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-bold text-slate-900 text-base">{a.title}</div>
                            {a.target && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {a.target === "ALL" ? "Everyone" : a.target.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {a.createdByName} ({a.createdByRole})
                            {a.className ? ` · Class ${a.className}${a.section ? `-${a.section}` : ""}` : ""}
                          </div>
                        </div>
                        {a.createdById === user.id && a.createdByRole !== "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => setDeleteId(a.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete notice"
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
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10 backdrop-blur-xs">
              <h2 className="font-bold text-lg text-slate-900">New Notice</h2>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form onSubmit={create} className="space-y-4" noValidate>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    placeholder="Enter notice title"
                    value={form.title}
                    onChange={(e) => {
                      setForm({ ...form, title: e.target.value });
                      if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 ${
                      errors.title
                        ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/20"
                        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-xs font-semibold text-rose-500 mt-1">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    placeholder="Write announcement message..."
                    value={form.content}
                    onChange={(e) => {
                      setForm({ ...form, content: e.target.value });
                      if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm min-h-[110px] focus:ring-2 ${
                      errors.content
                        ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/20"
                        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  />
                  {errors.content && (
                    <p className="text-xs font-semibold text-rose-500 mt-1">{errors.content}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Audience / Target <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={form.target}
                    onChange={(e) => {
                      setForm({ ...form, target: e.target.value });
                      if (errors.classes) setErrors((prev) => ({ ...prev, classes: undefined }));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="ALL">Everyone</option>
                    <option value="CLASS">Specific Classes (Students & Parents)</option>
                    <option value="STUDENTS_ONLY">Students only</option>
                    <option value="PARENTS_ONLY">Parents only</option>
                    <option value="TEACHERS_ONLY">Teachers only</option>
                  </select>
                </div>

                {(form.target === "CLASS" || form.target === "STUDENTS_ONLY" || form.target === "PARENTS_ONLY") && classesList.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Select Classes <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={selectAllClasses}
                        className="text-xs font-semibold hover:underline"
                        style={{ color: theme }}
                      >
                        {selectedClasses.length === classesList.length ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div
                      className={`flex flex-wrap gap-2 p-2.5 rounded-xl border bg-slate-50/50 max-h-36 overflow-y-auto ${
                        errors.classes ? "border-rose-400 ring-1 ring-rose-400 bg-rose-50/20" : "border-slate-200"
                      }`}
                    >
                      {classesList.map((c) => {
                        const key = `${c.name || c.className}||${c.section || ""}`;
                        const isSelected = selectedClasses.includes(key);
                        return (
                          <button
                            type="button"
                            key={key}
                            onClick={() => toggleClass(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                              isSelected
                                ? "text-white border-transparent shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                            style={isSelected ? { backgroundColor: theme } : undefined}
                          >
                            <span>{isSelected ? "✓" : "+"}</span>
                            <span>{c.name || c.className}{c.section ? `-${c.section}` : ""}</span>
                          </button>
                        );
                      })}
                    </div>
                    {errors.classes && (
                      <p className="text-xs font-semibold text-rose-500 mt-1">{errors.classes}</p>
                    )}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl text-white font-semibold transition hover:opacity-95 disabled:opacity-60 shadow-xs"
                  style={{ backgroundColor: theme }}
                >
                  {saving ? "Posting..." : "Post Notice"}
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
        onConfirm={async () => {
          if (!deleteId) return;
          setDeleting(true);
          try {
            const res = await fetch(`/api/announcements?id=${deleteId}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            toast.success("Deleted");
            setDeleteId(null);
            load();
          } catch (e: any) {
            toast.error(e.message || "Failed to delete");
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}

