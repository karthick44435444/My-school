"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  X,
  Paperclip,
  Search,
  Eye,
  Download,
  FileText,
  FileSpreadsheet,
  File,
  ExternalLink,
  School,
} from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/validation";
import { getDayWiseLabel } from "@/lib/utils";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import Pagination from "@/components/shared/Pagination";

function isImageUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".svg") ||
    clean.startsWith("data:image/")
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

export default function TeacherHomeworkPage() {
  const { user, loading } = useAuth(["TEACHER"]);
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [show, setShow] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteHomeworkItem, setDeleteHomeworkItem] = useState<any>(null);
  const [deletingHomework, setDeletingHomework] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    title: "",
    description: "",
    className: "",
    section: "",
    subject: "",
  });
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const handleDownload = async (url: string, fileName?: string) => {
    if (downloadingUrl) return;
    setDownloadingUrl(url);
    try {
      await downloadAttachment(url, fileName);
    } finally {
      setDownloadingUrl(null);
    }
  };

  const load = useCallback(async (targetPage = page, q = searchQuery) => {
    setBusy(true);
    try {
      let url = `/api/homework?page=${targetPage}&limit=20`;
      if (q.trim()) url += `&q=${encodeURIComponent(q.trim())}`;
      const [hRes, cRes] = await Promise.all([
        fetch(url),
        fetch("/api/teacher-classes"),
      ]);
      if (hRes.ok) {
        const d = await hRes.json();
        setList(d.homeworks || []);
        setTotal(d.total ?? (d.homeworks || []).length);
        setTotalPages(d.totalPages || 1);
        setPage(d.page || targetPage);
      }
      if (cRes.ok) {
        const d = await cRes.json();
        const classes = d.classes || [];
        setMyClasses(classes);
        if (classes[0] && !form.className) {
          setForm((f) => ({
            ...f,
            className: classes[0].className,
            section: classes[0].section || "",
          }));
        }
      }
    } finally {
      setBusy(false);
    }
  }, [page, searchQuery, form.className]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      load(1, searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [user, searchQuery, load]);

  const uploadFile = async (file: File) => {
    if (attachments.length >= 2) {
      toast.error("Maximum 2 attachments");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAttachments((prev) =>
        [...prev, { name: file.name, url: data.url }].slice(0, 2)
      );
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Homework title is required";
    if (!form.className) errs.className = "Class is required";
    if (!form.subject.trim()) errs.subject = "Subject is required";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const urls = attachments.map((a) => a.url);
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          attachments: urls,
          attachmentUrl: urls[0],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Homework created (auto-deletes in 7 days)");
      setShow(false);
      setAttachments([]);
      setFormErrors({});
      setForm({
        title: "",
        description: "",
        className: myClasses[0]?.className || "",
        section: myClasses[0]?.section || "",
        subject: "",
      });
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const classOptions = useMemo(() => {
    return Array.from(
      new Map(myClasses.map((c) => [`${c.className}||${c.section || ""}`, c])).values()
    );
  }, [myClasses]);

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
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Homework</h1>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search homework..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {myClasses.length > 0 && (
              <button
                onClick={() => setShow(true)}
                className="px-4 py-2.5 rounded-2xl text-white text-xs font-bold flex items-center gap-2 shadow-sm transition hover:opacity-95 shrink-0"
                style={{ backgroundColor: theme }}
              >
                <Plus className="w-4 h-4" /> Create HW
              </button>
            )}
          </div>
        </div>

        {busy ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading assigned homework...</span>
          </div>
        ) : myClasses.length === 0 && list.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100">
              <School className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No classes allocated for you</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You have not been assigned to any classes or subjects yet. Please contact the administrator.
            </p>
          </div>
        ) : (
          <>
            {list.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-xs">
                {searchQuery ? (
                  <>
                    <p className="font-bold text-slate-700">No homework matches &ldquo;{searchQuery}&rdquo;</p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="mt-3 text-xs text-indigo-600 hover:underline font-bold"
                    >
                      Clear search filter
                    </button>
                  </>
                ) : (
                  "No homework created yet"
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {list.map((h, index) => {
                  const currDay = getDayWiseLabel(h.createdAt || h.expiresAt);
                  const prevDay = index > 0 ? getDayWiseLabel(list[index - 1]?.createdAt || list[index - 1]?.expiresAt) : null;
                  const showDayHeader = currDay !== prevDay;

              const allAttachments: string[] = Array.from(
                new Set(
                  [
                    ...(Array.isArray(h.attachments) ? h.attachments : []),
                    h.attachmentUrl,
                  ].filter((url): url is string => Boolean(url && typeof url === "string"))
                )
              );

              return (
                <div key={h.id}>
                  {showDayHeader && (
                    <div className="flex items-center justify-center my-5 gap-3">
                      <div className="h-px bg-slate-200 flex-1 max-w-[80px]" />
                      <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500 shadow-xs">
                        {currDay}
                      </span>
                      <div className="h-px bg-slate-200 flex-1 max-w-[80px]" />
                    </div>
                  )}
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 relative pb-12 shadow-xs hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                        {h.subject || "General"}
                      </span>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                        Class: {h.className}{h.section ? `-${h.section}` : ""}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteHomeworkItem(h)}
                      className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-100 shadow-2xs"
                      title="Delete Homework"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 mt-1 capitalize">{h.title}</h3>
                  {h.description && (
                    <div className="mt-2">
                      <p
                        className={`text-sm text-slate-600 whitespace-pre-wrap leading-relaxed ${
                          !expandedIds[h.id] && h.description.length > 180 ? "line-clamp-3" : ""
                        }`}
                      >
                        {h.description}
                      </p>
                      {h.description.length > 180 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedIds((prev) => ({
                              ...prev,
                              [h.id]: !prev[h.id],
                            }))
                          }
                          className="mt-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition block"
                        >
                          {expandedIds[h.id] ? "Show less" : "Show more..."}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Rich Attachments Section (Images & Documents with Lightbox Preview and Download) */}
                  {allAttachments.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 block flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5" /> Attachments ({allAttachments.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {allAttachments.map((url, i) => {
                          const isImg = isImageUrl(url);
                          const fileName = getFileName(url);
                          const isPdf = /\.pdf(\?.*)?$/i.test(url);
                          const isSheet = /\.(xls|xlsx|csv)(\?.*)?$/i.test(url);

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
                                      {downloadingUrl === url ? "Downloading..." : "Download"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={i}
                              className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3 hover:border-indigo-300 transition"
                            >
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-indigo-600 shadow-2xs">
                                {isPdf ? (
                                  <FileText className="w-5 h-5 text-rose-500" />
                                ) : isSheet ? (
                                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <File className="w-5 h-5 text-indigo-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-800 truncate" title={fileName}>
                                  {fileName}
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 uppercase">
                                  {isPdf ? "PDF Document" : isSheet ? "Spreadsheet" : "Document / File"}
                                </span>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                                  >
                                    <ExternalLink className="w-3 h-3" /> Open
                                  </a>
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
                                    {downloadingUrl === url ? "Downloading..." : "Download"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-3.5 right-6 text-[11px] font-mono text-slate-400">
                    {h.createdAt ? formatDateTime(h.createdAt) : ""}
                  </div>
                </div>
                </div>
              );
            })}

            <div className="bg-white rounded-3xl border border-slate-200/80 px-4 shadow-xs">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={20}
                onPageChange={setPage}
                themeColor={theme}
              />
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* Lightbox Modal for Image Previews */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[88vh] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-3.5 bg-slate-900/90 text-white border-b border-slate-800">
              <span className="text-xs font-semibold truncate max-w-[280px]">
                {getFileName(previewImage)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={downloadingUrl === previewImage}
                  onClick={() => previewImage && handleDownload(previewImage, getFileName(previewImage))}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                >
                  {downloadingUrl === previewImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {downloadingUrl === previewImage ? "Saving..." : "Download"}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3 flex items-center justify-center overflow-auto max-h-[calc(88vh-60px)]">
              <img
                src={previewImage}
                alt="Attachment Preview"
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Create homework Modal */}
      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Create Homework</h2>
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
                  <label className="text-xs font-bold text-slate-600">
                    Homework Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={`w-full px-3.5 py-2.5 rounded-2xl border mt-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      formErrors.title ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                    placeholder="e.g. Chapter 4 Math Exercises"
                    value={form.title}
                    onChange={(e) => {
                      setForm({ ...form, title: e.target.value });
                      setFormErrors((prev) => ({ ...prev, title: "" }));
                    }}
                  />
                  {formErrors.title && <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Class &amp; Section <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className={`w-full px-3.5 py-2.5 rounded-2xl border mt-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white ${
                      formErrors.className ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                    value={`${form.className}||${form.section}`}
                    onChange={(e) => {
                      const [cn, sec] = e.target.value.split("||");
                      setForm({ ...form, className: cn, section: sec || "" });
                      setFormErrors((prev) => ({ ...prev, className: "" }));
                    }}
                  >
                    {classOptions.map((c: any) => (
                      <option
                        key={`${c.className}-${c.section}`}
                        value={`${c.className}||${c.section || ""}`}
                      >
                        {c.className}
                        {c.section ? `-${c.section}` : ""} (
                        {c.role === "CLASS_TEACHER"
                          ? "Class Teacher"
                          : c.subjectName || "Subject"}
                        )
                      </option>
                    ))}
                  </select>
                  {formErrors.className && <p className="mt-1 text-xs text-red-600">{formErrors.className}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={`w-full px-3.5 py-2.5 rounded-2xl border mt-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                      formErrors.subject ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                    placeholder="e.g. Mathematics"
                    value={form.subject}
                    onChange={(e) => {
                      setForm({ ...form, subject: e.target.value });
                      setFormErrors((prev) => ({ ...prev, subject: "" }));
                    }}
                  />
                  {formErrors.subject && <p className="mt-1 text-xs text-red-600">{formErrors.subject}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Description / Instructions</label>
                  <textarea
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 mt-1 text-sm font-medium min-h-[90px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="Instructions for students..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-600 mb-1.5">
                    Attachments (max 2 files or images)
                  </div>
                  <label className="flex items-center justify-center gap-2 border border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 rounded-2xl py-3 cursor-pointer text-xs font-bold text-indigo-600 transition shadow-2xs">
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                    {uploading ? "Uploading attachment..." : "Add file or photo"}
                    <input
                      type="file"
                      accept="image/*,.pdf,.xls,.xlsx,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      disabled={uploading || attachments.length >= 2}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div className="mt-2 space-y-1.5">
                    {attachments.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="flex-1 truncate font-medium text-slate-800">{a.name}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttachments((prev) => prev.filter((_, j) => j !== i))
                          }
                          className="text-rose-500 hover:text-rose-700 p-0.5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  style={{ backgroundColor: theme }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating Homework...
                    </>
                  ) : (
                    "Create Homework"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteHomeworkItem}
        title="Delete Homework?"
        description={deleteHomeworkItem ? `Are you sure you want to delete "${deleteHomeworkItem.title}"?` : ""}
        loading={deletingHomework}
        onClose={() => !deletingHomework && setDeleteHomeworkItem(null)}
        onConfirm={async () => {
          if (!deleteHomeworkItem) return;
          setDeletingHomework(true);
          try {
            const res = await fetch(`/api/homework?id=${deleteHomeworkItem.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            toast.success("Homework deleted");
            setDeleteHomeworkItem(null);
            load();
          } catch (e: any) {
            toast.error(e.message || "Failed to delete homework");
          } finally {
            setDeletingHomework(false);
          }
        }}
      />
    </div>
  );
}
