"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Pencil, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import Pagination from "@/components/shared/Pagination";
import CreateUserForm from "@/components/forms/CreateUserForm";
import EditUserForm from "@/components/forms/EditUserForm";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";

export default function AdminPrincipalsPage() {
  const { user, loading: authLoading } = useAuth(["ADMIN"]);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      setHighlightId(sp.get("highlight"));
    }
  }, []);
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPrincipals = useCallback(async (targetPage = page, q = search) => {
    setLoading(true);
    try {
      let url = `/api/users/list?role=PRINCIPAL&page=${targetPage}&limit=20`;
      if (q.trim()) {
        url += `&q=${encodeURIComponent(q.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setList(d.users || []);
        setTotal(d.total || (d.users || []).length);
        setTotalPages(d.totalPages || 1);
        setPage(d.page || targetPage);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      loadPrincipals(1, search);
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

  const theme = user?.themeColor || "#6366F1";

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${deleteItem.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Principal removed");
      setDeleteItem(null);
      loadPrincipals(page);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove principal");
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadPrincipals(newPage, search);
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
            <h1 className="text-2xl font-bold text-slate-900">Principals</h1>
            <p className="text-sm text-slate-500">{total} total principals</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search principal name, email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 shadow-xs transition hover:opacity-95 cursor-pointer shrink-0"
              style={{ backgroundColor: theme }}
            >
              <Plus className="w-4 h-4" /> Add Principal
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <table className="w-full text-sm text-left min-w-[650px]">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Education</th>
                    <th className="px-4 py-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                        No principals found
                      </td>
                    </tr>
                  ) : (
                    list.map((p) => (
                      <tr
                        key={p.id}
                        id={`user-row-${p.id}`}
                        className={`hover:bg-slate-50 ${
                          highlightId === p.id ? "bg-indigo-50 ring-2 ring-indigo-400 ring-inset" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Avatar name={p.firstName} photoUrl={p.photoUrl} size={32} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {p.firstName} {p.lastName || ""}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {p.username}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{p.email}</td>
                        <td className="px-4 py-3 text-slate-600">{p.phone || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{p.education || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEdit(p)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"
                              title="Edit Principal"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteItem(p)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              title="Delete Principal"
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
        role="PRINCIPAL"
        theme={theme}
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          loadPrincipals(1);
        }}
      />

      <EditUserForm
        role="PRINCIPAL"
        theme={theme}
        open={!!edit}
        user={edit}
        onClose={() => setEdit(null)}
        onUpdated={() => {
          setEdit(null);
          loadPrincipals(page);
        }}
      />

      <ConfirmDeleteModal
        open={!!deleteItem}
        title="Remove Principal"
        description={`Are you sure you want to remove ${deleteItem?.firstName} ${deleteItem?.lastName || ""}? This action cannot be undone.`}
        loading={deleting}
        onClose={() => !deleting && setDeleteItem(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
