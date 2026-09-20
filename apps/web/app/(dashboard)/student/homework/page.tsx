"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Loader2,
  Search,
  BookOpen,
  Calendar,
  User,
  Paperclip,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  File,
  X,
  ExternalLink,
} from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/validation";
import { getDayWiseLabel, capitalizeFirst } from "@/lib/utils";
import Pagination from "@/components/shared/Pagination";

function isImageUrl(url: string): boolean {
  return (
    /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url) ||
    url.includes("image/upload") ||
    url.startsWith("data:image")
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

export default function StudentHomeworkPage() {
  const { user, loading } = useAuth(["STUDENT"]);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setHighlightId(sp.get("highlight"));
    }
  }, []);
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
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

  // Load subject list for filter pills
  useEffect(() => {
    if (!user) return;
    fetch(`/api/classes`)
      .then((r) => r.json())
      .then((d) => {
        const myClass = (d.classes || []).find((c: any) => c.name === user.className);
        if (myClass && Array.isArray(myClass.subjects)) {
          setSubjects(myClass.subjects);
        }
      })
      .catch(() => {});
  }, [user]);

  const load = useCallback(async (targetPage = page, query = debouncedSearch, sub = subjectFilter) => {
    if (!user) return;
    setBusy(true);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: "20",
      });
      if (user.className) params.set("className", user.className);
      if (user.section) params.set("section", user.section);
      if (sub !== "ALL" && sub.trim()) params.set("subject", sub.trim());
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/homework?${params}`);
      if (res.ok) {
        const d = await res.json();
        const items = d.homeworks || [];
        setList(items);
        setTotal(d.total ?? items.length);
        setTotalPages(d.totalPages ?? 1);

        // Dynamically add any other subjects found in homework
        setSubjects((prev) => {
          const sSet = new Set(prev);
          items.forEach((h: any) => {
            if (h.subject) sSet.add(h.subject);
          });
          return Array.from(sSet);
        });

        items.forEach((h: any) => {
          fetch("/api/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "HOMEWORK", itemId: h.id }),
          }).catch(() => {});
        });
      }
    } finally {
      setBusy(false);
    }
  }, [user, page, debouncedSearch, subjectFilter]);

  useEffect(() => {
    if (user) {
      load(page, debouncedSearch, subjectFilter);
    }
  }, [user, page, debouncedSearch, subjectFilter, load]);

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
        {/* Header with Search */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Homework</h1>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search homework, subject..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Subject Filter Chips */}
        {subjects.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setSubjectFilter("ALL");
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                subjectFilter === "ALL"
                  ? "text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
              style={subjectFilter === "ALL" ? { backgroundColor: theme } : undefined}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  setSubjectFilter(sub);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  subjectFilter === sub
                    ? "text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
                style={subjectFilter === sub ? { backgroundColor: theme } : undefined}
              >
                {capitalizeFirst(sub)}
              </button>
            ))}
          </div>
        )}

        {busy ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading homework...</span>
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No homework found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery || subjectFilter !== "ALL"
                ? "Try refining your search or subject filters"
                : "No homework currently assigned for your class"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((h, index) => {
              const allAttachments: string[] = (
                Array.isArray(h.attachments) && h.attachments.length > 0
                  ? h.attachments
                  : h.attachmentUrl
                  ? [h.attachmentUrl]
                  : []
              ).filter(Boolean);

              const currDay = getDayWiseLabel(h.createdAt || h.expiresAt);
              const prevDay = index > 0 ? getDayWiseLabel(list[index - 1]?.createdAt || list[index - 1]?.expiresAt) : null;
              const showDayHeader = currDay !== prevDay;

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
                  <div
                    id={`item-row-${h.id}`}
                    className={`bg-white rounded-3xl border border-slate-200/90 p-6 relative pb-12 shadow-xs hover:shadow-md transition-all ${
                      highlightId === h.id ? "ring-2 ring-indigo-500 bg-indigo-50/30" : ""
                    }`}
                  >
                  <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                        {capitalizeFirst(h.subject || "General")}
                      </span>
                      {h.createdByName && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {h.createdByName}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-slate-900">{capitalizeFirst(h.title)}</h3>
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

                  {/* Attachments Section (Images & Files with View and Download) */}
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

                  {/* Bottom right corner timestamp (am/pm format) */}
                  <div className="absolute bottom-3.5 right-5 text-xs text-slate-400 font-medium inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDateTime(h.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}

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

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-800/80 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-white/80 truncate">
                {getFileName(previewImage)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadAttachment(previewImage, getFileName(previewImage))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto flex-1 bg-black/40">
              <img
                src={previewImage}
                alt="Preview"
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

