"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Bell } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/validation";
import { getDayWiseLabel } from "@/lib/utils";

function hrefForNotification(n: any): string | null {
  const type = (n.type || "").toUpperCase();
  const meta = n.meta || {};
  const child = meta.studentId || meta.childId ? `?child=${meta.studentId || meta.childId}` : "";
  if (type === "MARKS") {
    const id = meta.examId || meta.itemId;
    return id ? `/parent/marks${child}${child ? "&" : "?"}highlight=${id}` : `/parent/marks${child}`;
  }
  if (type === "LEAVE" || type === "ATTENDANCE") {
    const q = new URLSearchParams();
    if (meta.studentId || meta.childId) q.set("child", meta.studentId || meta.childId);
    if (meta.date) q.set("date", meta.date);
    if (meta.date) q.set("highlight", meta.date);
    return `/parent/attendance${q.toString() ? `?${q}` : ""}`;
  }
  if (type === "HOMEWORK") {
    const id = meta.itemId || meta.homeworkId;
    return id ? `/parent/homework${child}${child ? "&" : "?"}highlight=${id}` : `/parent/homework${child}`;
  }
  if (type === "ANNOUNCEMENT") {
    const id = meta.itemId || meta.announcementId;
    return id ? `/parent/announcements?highlight=${id}` : "/parent/announcements";
  }
  return null;
}

export default function ParentNotificationsPage() {
  const { user, loading } = useAuth(["PARENT"]);
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const load = async (pageNum = 1, isAppend = false) => {
    if (pageNum === 1) setBusy(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`/api/notifications?page=${pageNum}&limit=20`);
      if (res.ok) {
        const d = await res.json();
        const incoming = d.notifications || [];
        setList((prev) => (isAppend ? [...prev, ...incoming] : incoming));
        setPage(pageNum);
        setHasMore(d.hasMore ?? (d.page < d.totalPages));
      }
    } finally {
      setBusy(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user) {
      load(1, false);
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "readAll" }),
      }).catch(() => {});
    }
  }, [user]);

  // Real-time socket listener for incoming notifications & read status
  useEffect(() => {
    let unsubNew: (() => void) | null = null;
    let unsubRead: (() => void) | null = null;

    import("@/lib/socketClient").then(({ subscribeNewNotification, subscribeNotificationRead }) => {
      unsubNew = subscribeNewNotification((newNotif) => {
        setList((prev) => {
          if (prev.some((x) => x.id === newNotif.id)) return prev;
          return [newNotif, ...prev];
        });
      });

      unsubRead = subscribeNotificationRead(({ id }) => {
        setList((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
      });
    });

    return () => {
      if (unsubNew) unsubNew();
      if (unsubRead) unsubRead();
    };
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (!observerTarget.current || !hasMore || loadingMore || busy) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !busy) {
          load(page + 1, true);
        }
      },
      { rootMargin: "200px" }
    );

    const currentEl = observerTarget.current;
    observer.observe(currentEl);
    return () => {
      if (currentEl) observer.unobserve(currentEl);
    };
  }, [hasMore, loadingMore, busy, page]);

  const markAll = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "readAll" }),
    });
    load(1, false);
  };

  const onClick = async (n: any) => {
    if (!n.read) {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      });
      setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    const href = hrefForNotification(n);
    if (href) router.push(href);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-indigo-600" /> Notifications
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Updates, alerts, marks announcements, and school notices for your children
            </p>
          </div>
          <button
            type="button"
            onClick={markAll}
            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-200 transition"
          >
            Mark all read
          </button>
        </div>

        {busy ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading notifications...</span>
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-700">No notifications yet</h3>
            <p className="text-xs text-slate-400 mt-1">You will receive alerts here for your children&apos;s marks, exams, and attendance</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((n, index) => {
              const currDay = getDayWiseLabel(n.createdAt);
              const prevDay = index > 0 ? getDayWiseLabel(list[index - 1]?.createdAt) : null;
              const showDayHeader = currDay !== prevDay;

              return (
                <div key={n.id}>
                  {showDayHeader && (
                    <div className="flex items-center justify-center my-5 gap-3">
                      <div className="h-px bg-slate-200 flex-1 max-w-[80px]" />
                      <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-500 shadow-xs">
                        {currDay}
                      </span>
                      <div className="h-px bg-slate-200 flex-1 max-w-[80px]" />
                    </div>
                  )}
                  <button
                    onClick={() => onClick(n)}
                    className={`w-full text-left bg-white rounded-3xl border p-5 relative pb-10 shadow-xs hover:shadow-md transition-all ${
                      !n.read ? "border-indigo-200 bg-indigo-50/30" : "border-slate-200/90"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 pr-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!n.read && <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />}
                          <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                          {n.type && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                              {n.type}
                            </span>
                          )}
                        </div>

                        {(n.meta?.type === "EXAM_TIMETABLE" || n.type === "EXAM") && Array.isArray(n.meta?.table) ? (
                          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-600">
                                  <th className="text-left px-3 py-2 font-semibold">Date</th>
                                  <th className="text-left px-3 py-2 font-semibold">Subject</th>
                                </tr>
                              </thead>
                              <tbody>
                                {n.meta.table.map((row: any, i: number) => (
                                  <tr key={i} className="border-t border-slate-100">
                                    <td className="px-3 py-2 font-mono">{row.date}</td>
                                    <td className="px-3 py-2 font-medium text-slate-800">{row.subject}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{n.body}</p>
                        )}
                      </div>
                    </div>

                    {/* Bottom right corner date without seconds */}
                    <div className="absolute bottom-3.5 right-5 text-xs text-slate-400 font-medium">
                      {formatDateTime(n.createdAt)}
                    </div>
                  </button>
                </div>
              );
            })}

            {/* Sentinel element for infinite scroll */}
            <div ref={observerTarget} className="h-4" />

            {loadingMore && (
              <div className="py-6 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">Loading more notifications...</span>
              </div>
            )}

            {!hasMore && list.length > 20 && (
              <p className="text-center text-xs text-slate-400 py-6">
                You&apos;ve reached the end of all notifications
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
