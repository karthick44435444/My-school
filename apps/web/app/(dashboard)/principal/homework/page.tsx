"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/validation";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import Pagination from "@/components/shared/Pagination";

export default function PrincipalHomeworkPage() {
  const { user, loading } = useAuth(["PRINCIPAL"]);
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", className: "", section: "", subject: "" });
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async (pageNum = page, query = searchQuery) => {
    try {
      setBusy(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "20",
      });
      if (user?.className) params.set("className", user.className);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/homework?${params}`);
      if (res.ok) {
        const d = await res.json();
        setList(d.homeworks || []);
        setTotalPages(d.totalPages || 1);
        setTotalItems(d.total ?? (d.homeworks || []).length);
        setPage(d.page || pageNum);
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (user) {
      setForm((f) => ({ ...f, className: user.className || "", section: user.section || "" }));
      load(1, searchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, searchQuery]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Homework created (auto-deletes in 7 days)");
      setShow(false);
      setForm({ title: "", description: "", className: user?.className || "", section: user?.section || "", subject: "" });
      load(1, searchQuery);
    } catch (err: any) {
      toast.error(err.message);
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Homework</h1>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search homework..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button onClick={() => setShow(true)} className="px-4 py-2 rounded-xl text-white text-sm flex items-center gap-2 shrink-0 shadow-xs" style={{ backgroundColor: theme }}>
              <Plus className="w-4 h-4" /> Create HW
            </button>
          </div>
        </div>
        {busy ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border p-10 text-center text-slate-400">No homework yet</div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {list.map((h) => (
                <div key={h.id} className="bg-white rounded-2xl border p-5 relative pb-9">
                  <div className="flex justify-between items-start">
                    <div className="pr-8">
                      <div className="font-bold text-slate-900">{h.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {h.className}{h.section ? `-${h.section}` : ""} · {h.subject || "General"} · by {h.createdByName}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">{h.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteItem(h)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg h-fit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-3 right-4 text-xs text-slate-400">
                    {formatDateTime(h.createdAt)}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 px-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={20}
                onPageChange={(p) => load(p, searchQuery)}
                themeColor={theme}
                loading={busy}
              />
            </div>
          </div>
        )}
      </main>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10 backdrop-blur-xs">
              <h2 className="font-bold text-lg text-slate-900">Create Homework</h2>
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
              <form onSubmit={create} className="space-y-3.5">
                <input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500" />
                <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm min-h-[80px] focus:ring-2 focus:ring-indigo-500" />
                <div className="grid grid-cols-2 gap-2">
                  <input required placeholder="Class" value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500" />
                  <input placeholder="Section" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500" />
                <button type="submit" disabled={saving} className="w-full py-3 rounded-xl text-white font-semibold transition hover:opacity-95 disabled:opacity-60" style={{ backgroundColor: theme }}>
                  {saving ? "Saving..." : "Create"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteItem}
        title="Delete Homework?"
        description={deleteItem ? `Are you sure you want to delete "${deleteItem.title}"?` : ""}
        loading={deleting}
        onClose={() => !deleting && setDeleteItem(null)}
        onConfirm={async () => {
          if (!deleteItem) return;
          setDeleting(true);
          try {
            const res = await fetch(`/api/homework?id=${deleteItem.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            toast.success("Homework deleted");
            setDeleteItem(null);
            load();
          } catch (e: any) {
            toast.error(e.message || "Failed to delete homework");
          } finally {
            setDeleting(false);
          }
        }}
      />
    </div>
  );
}
