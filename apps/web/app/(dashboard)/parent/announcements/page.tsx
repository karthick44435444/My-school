"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Megaphone, Search, X } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/validation";
import { getDayWiseLabel } from "@/lib/utils";
import Pagination from "@/components/shared/Pagination";

export default function ParentAnnouncementsPage() {
  const { user, loading } = useAuth(["PARENT"]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setHighlightId(sp.get("highlight"));
    }
  }, []);

  const load = useCallback(async (targetPage = page, q = search) => {
    try {
      setBusy(true);
      let url = `/api/announcements?page=${targetPage}&limit=${pageSize}`;
      if (q.trim()) url += `&q=${encodeURIComponent(q.trim())}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
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

  useEffect(() => {
    if (!highlightId) return;
    const tmr = setTimeout(() => {
      document.getElementById(`item-row-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
    return () => clearTimeout(tmr);
  }, [highlightId, list]);

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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="w-6 h-6" /> Notices
          </h1>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search notices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
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
                    <div
                      id={`item-row-${a.id}`}
                      className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                        highlightId === a.id ? "ring-2 ring-indigo-400 bg-indigo-50/50" : ""
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-base">{a.title}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {a.createdByName} ({a.createdByRole})
                          {a.className ? ` · Class ${a.className}${a.section ? `-${a.section}` : ""}` : ""}
                        </div>
                        <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap leading-relaxed">{a.content}</p>
                      </div>
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

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={(newPage) => {
                setPage(newPage);
                load(newPage, search);
              }}
              themeColor={theme}
            />
          </div>
        )}
      </main>
    </div>
  );
}
