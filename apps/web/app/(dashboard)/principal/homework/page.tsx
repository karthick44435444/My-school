"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, X, Search, Paperclip, Eye, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/validation";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import Pagination from "@/components/shared/Pagination";

function isImageUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  if (
    clean.startsWith("data:application/pdf") ||
    clean.endsWith(".pdf") ||
    clean.endsWith(".doc") ||
    clean.endsWith(".docx") ||
    clean.endsWith(".xls") ||
    clean.endsWith(".xlsx") ||
    clean.endsWith(".csv") ||
    clean.endsWith(".txt")
  ) {
    return false;
  }
  return (
    clean.startsWith("data:image/") ||
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".svg") ||
    clean.endsWith(".bmp") ||
    clean.endsWith(".heic") ||
    clean.endsWith(".avif") ||
    clean.includes(".jpg") ||
    clean.includes(".jpeg") ||
    clean.includes(".png") ||
    clean.includes(".webp") ||
    clean.includes("/image/upload/") ||
    clean.includes("/uploads/image") ||
    clean.includes("image_") ||
    clean.includes("photo") ||
    clean.includes("student") ||
    clean.includes("attachment")
  );
}

function getFileName(url: string): string {
  try {
    const clean = url.split("?")[0];
    let name = clean.split("/").pop() || "Attachment";
    name = decodeURIComponent(name);
    const rawMatch = name.match(/^(\d{10,15})_([a-z0-9]+)\.([a-z0-9]+)$/i);
    if (rawMatch) {
      const ext = rawMatch[3].toLowerCase();
      if (ext === "pdf") return "Document.pdf";
      if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return `Image.${ext}`;
      return `Attachment.${ext}`;
    }
    return name;
  } catch {
    return "Attachment";
  }
}

async function downloadAttachment(url: string, fileName?: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch file");
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName || getFileName(url);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  } catch {
    window.open(url, "_blank");
  }
}

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
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const handleDownload = async (url: string, fileName?: string) => {
    setDownloadingUrl(url);
    try {
      await downloadAttachment(url, fileName);
    } finally {
      setDownloadingUrl(null);
    }
  };

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

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/homework?id=${deleteItem.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Homework deleted");
      setDeleteItem(null);
      load(page, searchQuery);
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
              {list.map((h) => {
                const allAttachments: string[] = (
                  Array.isArray(h.attachments) && h.attachments.length > 0
                    ? h.attachments
                    : h.attachmentUrl
                    ? [h.attachmentUrl]
                    : []
                ).filter(Boolean);

                return (
                  <div key={h.id} className="bg-white rounded-3xl border border-slate-200/90 p-6 relative pb-10 shadow-xs hover:shadow-md transition">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                            {h.subject || "General"}
                          </span>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                            Class {h.className}{h.section ? `-${h.section}` : ""}
                          </span>
                          <span className="text-xs text-slate-400">
                            by {h.createdByName || "Teacher"}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-base mt-1">{h.title}</div>
                        {h.description && (
                          <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap leading-relaxed">
                            {h.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteItem(h)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Attachments Section */}
                    {allAttachments.length > 0 && (
                      <div className="mt-4 pt-3.5 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 block flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5" /> Attachments ({allAttachments.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {allAttachments.map((url, i) => {
                            const isImg = isImageUrl(url);
                            const fileName = getFileName(url);

                            if (isImg) {
                              return (
                                <div
                                  key={i}
                                  className="group relative bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-2.5 flex items-center gap-3 hover:border-indigo-300 transition"
                                >
                                  <div
                                    onClick={() => setPreviewImage(url)}
                                    className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden shrink-0 cursor-pointer relative"
                                  >
                                    <img
                                      src={url}
                                      alt={fileName}
                                      className="w-full h-full object-cover group-hover:scale-105 transition"
                                    />
                                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                      <Eye className="w-4 h-4" />
                                    </div>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-slate-800 truncate" title={fileName}>
                                      {fileName}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                      Image Attachment
                                    </span>
                                    <div className="flex items-center gap-3 mt-2">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewImage(url)}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                                      >
                                        <Eye className="w-3 h-3" /> View
                                      </button>
                                      <button
                                        type="button"
                                        disabled={downloadingUrl === url}
                                        onClick={() => handleDownload(url, fileName)}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer disabled:opacity-60"
                                      >
                                        {downloadingUrl === url ? (
                                          <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                                        ) : (
                                          <Download className="w-3 h-3" />
                                        )}
                                        <span>{downloadingUrl === url ? "Saving..." : "Download"}</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={i}
                                className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3 hover:border-slate-300 transition"
                              >
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-800 truncate" title={fileName}>
                                    {fileName}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <button
                                      type="button"
                                      disabled={downloadingUrl === url}
                                      onClick={() => handleDownload(url, fileName)}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 cursor-pointer disabled:opacity-60"
                                    >
                                      {downloadingUrl === url ? (
                                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                                      ) : (
                                        <Download className="w-3 h-3" />
                                      )}
                                      <span>{downloadingUrl === url ? "Downloading..." : "Download"}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-3 right-5 text-xs text-slate-400">
                      {formatDateTime(h.createdAt)}
                    </div>
                  </div>
                );
              })}
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

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(previewImage)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition"
                title="Download image"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

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
