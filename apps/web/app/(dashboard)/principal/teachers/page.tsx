"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Pencil, Trash2, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import Pagination from "@/components/shared/Pagination";
import TeacherStatCards from "@/components/ui/TeacherStatCards";
import CreateUserForm from "@/components/forms/CreateUserForm";
import EditUserForm from "@/components/forms/EditUserForm";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";

export default function PrincipalTeachersPage() {
  const { user, loading: authLoading } = useAuth(["PRINCIPAL"]);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setHighlightId(sp.get("highlight"));
    }
  }, []);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [edit, setEdit] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [checkRep, setCheckRep] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  const loadAttendanceStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const repRes = await fetch(`/api/attendance/teachers?date=${today}`);
      if (repRes.ok) {
        const rep = await repRes.json();
        setCheckRep(rep);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadTeachers = useCallback(async (targetPage = page, q = search) => {
    setLoading(true);
    try {
      let url = `/api/users/list?role=TEACHER&page=${targetPage}&limit=20`;
      if (q.trim()) {
        url += `&q=${encodeURIComponent(q.trim())}`;
      }
      const [res, tr] = await Promise.all([
        fetch(url),
        fetch(`/api/attendance/teachers?date=${new Date().toISOString().slice(0, 10)}`).then((r) => r.json()).catch(() => null),
      ]);
      if (res.ok) {
        const data = await res.json();
        let users = data.users || [];
        if (tr?.teachers?.length) {
          const map = new Map<string, any>(tr.teachers.map((x: any) => [x.id, x]));
          users = users.map((u: any) => ({
            ...u,
            checkedIn: map.get(u.id)?.checkedIn ?? u.checkedIn,
            classLabel: map.get(u.id)?.classLabel || u.classLabel,
          }));
        }
        setList(users);
        setTotal(data.total || users.length);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || targetPage);
      }
      if (tr) setCheckRep(tr);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (user) {
      loadAttendanceStats();
    }
  }, [user, loadAttendanceStats]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      loadTeachers(1, search);
    }, 250);
    return () => clearTimeout(timer);
  }, [user, search]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`user-row-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, list]);

  const displayedList = list.filter((t: any) => {
    if (filter === "in") return t.checkedIn;
    if (filter === "out") return !t.checkedIn;
    return true;
  });

  const theme = user?.themeColor || "#6366F1";

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Removed");
      setDeleteId(null);
      loadTeachers(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadTeachers(newPage, search);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Faculty &amp; Teachers</h1>
            <p className="text-sm text-slate-500">{total} total teachers</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, subject..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 shrink-0 transition hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: theme }}
            >
              <Plus className="w-4 h-4" /> Add Teacher
            </button>
          </div>
        </div>

        {checkRep && (
          <TeacherStatCards
            total={checkRep.totalTeachers ?? checkRep.total ?? 0}
            checkedIn={checkRep.checkedInToday ?? checkRep.checkedIn ?? 0}
            notCheckedIn={checkRep.notCheckedInToday ?? checkRep.notCheckedIn ?? 0}
            theme={theme}
            activeFilter={filter}
            onFilter={(f) => {
              setFilter(f);
              setPage(1);
            }}
          />
        )}

        <div className="bg-white rounded-2xl border overflow-x-auto shadow-xs mt-6">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <table className="w-full text-sm min-w-[650px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Qualification</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        No teachers found
                      </td>
                    </tr>
                  ) : (
                    displayedList.map((t) => (
                      <tr
                        key={t.id}
                        id={`user-row-${t.id}`}
                        className={`border-t hover:bg-slate-50 ${
                          highlightId === t.id ? "bg-indigo-50 ring-2 ring-indigo-400 ring-inset" : ""
                        }`}
                      >
                        <td className="px-4 py-2">
                          <Avatar name={t.firstName} photoUrl={t.photoUrl} size={32} />
                        </td>
                        <td className="px-4 py-2 font-medium">
                          {t.firstName} {t.lastName || ""}
                          {t.classLabel && (
                            <span className="block text-[11px] text-slate-400 font-normal">
                              {t.classLabel}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-slate-600">{t.email}</td>
                        <td className="px-4 py-2 text-slate-600">{t.phone || "—"}</td>
                        <td className="px-4 py-2 text-slate-600">{t.education || "—"}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              t.checkedIn
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {t.checkedIn ? "Checked In" : "Not In"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEdit(t)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(t.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={20}
                onPageChange={handlePageChange}
                themeColor={theme}
                loading={loading}
              />
            </>
          )}
        </div>
      </main>

      <CreateUserForm
        role="TEACHER"
        theme={theme}
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          loadTeachers(1);
        }}
      />

      <EditUserForm
        role="TEACHER"
        theme={theme}
        open={!!edit}
        user={edit}
        onClose={() => setEdit(null)}
        onUpdated={() => {
          setEdit(null);
          loadTeachers(page);
        }}
      />

      <ConfirmDeleteModal
        open={!!deleteId}
        title="Remove Teacher"
        description="Are you sure you want to remove this teacher? This action cannot be undone."
        loading={saving}
        onClose={() => !saving && setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
