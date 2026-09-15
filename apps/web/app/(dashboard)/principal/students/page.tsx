"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Pencil, Trash2, Search, Plus, FileSpreadsheet, ArrowRightLeft, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import Pagination from "@/components/shared/Pagination";
import CreateUserForm from "@/components/forms/CreateUserForm";
import EditUserForm from "@/components/forms/EditUserForm";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import CredentialsModal from "@/components/forms/CredentialsModal";
import BulkStudentUploadModal from "@/components/shared/BulkStudentUploadModal";
import BulkChangeClassModal from "@/components/shared/BulkChangeClassModal";

export default function PrincipalStudentsPage() {
  const { user, loading: authLoading } = useAuth(["PRINCIPAL"]);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setHighlightId(params.get("highlight"));
    }
  }, []);
  const [list, setList] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [edit, setEdit] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkChangeClass, setShowBulkChangeClass] = useState(false);
  const [bulkActionSaving, setBulkActionSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);

  // Load class metadata & counts for tabs
  const loadMetadata = useCallback(async () => {
    try {
      const [cRes, allRes] = await Promise.all([
        fetch("/api/classes?all=1"),
        fetch("/api/users/list?role=STUDENT&all=1"),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setClasses(cData.classes || []);
      }
      if (allRes.ok) {
        const aData = await allRes.json();
        const counts: Record<string, number> = {};
        (aData.users || []).forEach((s: any) => {
          if (s.className) {
            const key = `${s.className}||${s.section || ""}`;
            counts[key] = (counts[key] || 0) + 1;
          }
        });
        counts["ALL"] = aData.total || (aData.users || []).length;
        setClassCounts(counts);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadStudents = useCallback(async (targetPage = page, q = search, tab = activeTab) => {
    setLoading(true);
    try {
      let url = `/api/users/list?role=STUDENT&page=${targetPage}&limit=20`;
      if (q.trim()) {
        url += `&q=${encodeURIComponent(q.trim())}`;
      }
      if (tab !== "ALL") {
        const [cn, sec] = tab.split("||");
        if (cn) url += `&className=${encodeURIComponent(cn)}`;
        if (sec) url += `&section=${encodeURIComponent(sec)}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setList(data.users || []);
        setTotal(data.total || (data.users || []).length);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || targetPage);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeTab]);

  useEffect(() => {
    if (user) loadMetadata();
  }, [user, loadMetadata]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      loadStudents(1, search, activeTab);
    }, 250);
    return () => clearTimeout(timer);
  }, [user, search, activeTab]);

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`user-row-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, list]);

  const tabs = useMemo(() => {
    const listTabs: { key: string; label: string; count: number }[] = [];
    classes.forEach((c: any) => {
      const key = `${c.name}||${c.section || ""}`;
      const label = `${c.name}${c.section ? `-${c.section}` : ""}`;
      const count = classCounts[key] || 0;
      listTabs.push({ key, label: `${label} [${count}]`, count });
    });
    return listTabs;
  }, [classes, classCounts]);

  const theme = user?.themeColor || "#6366F1";

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((s) => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionSaving(true);
    try {
      const res = await fetch("/api/students/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", studentIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete selected students");
      toast.success(data.message || `Deleted ${selectedIds.length} student(s)`);
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      loadMetadata();
      loadStudents(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBulkActionSaving(false);
    }
  };

  const handleBulkChangeClass = async (targetClassName: string, targetSection: string) => {
    if (selectedIds.length === 0) return;
    setBulkActionSaving(true);
    try {
      const res = await fetch("/api/students/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-class",
          studentIds: selectedIds,
          className: targetClassName,
          section: targetSection,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change class");
      toast.success(data.message || "Class updated for selected students");
      setSelectedIds([]);
      setShowBulkChangeClass(false);
      loadMetadata();
      loadStudents(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBulkActionSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Removed");
      setDeleteId(null);
      loadMetadata();
      loadStudents(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSelectedIds([]);
    loadStudents(newPage, search, activeTab);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-16">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-sm text-slate-500">{total} total students</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto flex-wrap">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                  setSelectedIds([]);
                }}
                placeholder="Search name, roll, class, parent..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedIds([]);
                }}
                className={`px-3.5 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 shrink-0 transition shadow-xs cursor-pointer ${
                  isSelectionMode
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <CheckSquare className="w-4 h-4 text-indigo-600" />
                {isSelectionMode ? "Cancel Select" : "Select"}
              </button>
              <button
                onClick={() => setShowBulk(true)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold flex items-center gap-2 shrink-0 transition hover:bg-slate-50 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Bulk Upload
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 shrink-0 transition hover:opacity-95 cursor-pointer"
                style={{ backgroundColor: theme }}
              >
                <Plus className="w-4 h-4" /> Add Student
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Floating Bar */}
        {isSelectionMode && selectedIds.length > 0 && (
          <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-2xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center bg-indigo-600 text-white text-xs font-bold w-6 h-6 rounded-full">
                {selectedIds.length}
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {selectedIds.length === 1 ? "1 student selected" : `${selectedIds.length} students selected`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkChangeClass(true)}
                className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100/50 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Change Class
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.length})
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-medium transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-2 flex-nowrap whitespace-nowrap">
          <button
            onClick={() => {
              setActiveTab("ALL");
              setPage(1);
              setSelectedIds([]);
              setIsSelectionMode(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border shrink-0 ${
              activeTab === "ALL" ? "text-white border-transparent" : "bg-white text-slate-700"
            }`}
            style={activeTab === "ALL" ? { backgroundColor: theme } : undefined}
          >
            All [{classCounts["ALL"] || total}]
          </button>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setActiveTab(t.key);
                setPage(1);
                setSelectedIds([]);
                setIsSelectionMode(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border shrink-0 ${
                activeTab === t.key ? "text-white border-transparent" : "bg-white text-slate-700"
              }`}
              style={activeTab === t.key ? { backgroundColor: theme } : undefined}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table View */}
        <div className="bg-white rounded-2xl border overflow-x-auto shadow-xs">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    {isSelectionMode && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={list.length > 0 && selectedIds.length === list.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          title="Select all on this page"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Parent</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={isSelectionMode ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    list.map((s) => (
                      <tr
                        key={s.id}
                        id={`user-row-${s.id}`}
                        className={`border-t hover:bg-slate-50 transition-colors ${
                          selectedIds.includes(s.id) ? "bg-indigo-50/40" : ""
                        } ${
                          highlightId === s.id ? "bg-indigo-50 ring-2 ring-indigo-400 ring-inset" : ""
                        }`}
                      >
                        {isSelectionMode && (
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(s.id)}
                              onChange={() => toggleSelect(s.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-2">
                          <Avatar name={s.firstName} photoUrl={s.photoUrl} size={32} />
                        </td>
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-slate-700">
                          {s.rollNumber || s.rollNo || "—"}
                        </td>
                        <td className="px-4 py-2 font-medium">
                          {s.firstName} {s.lastName || ""}
                        </td>
                        <td className="px-4 py-2">
                          {s.className}-{s.section}
                        </td>
                        <td className="px-4 py-2 text-xs">
                          <div>{s.parentName || "—"}</div>
                          <div className="text-slate-400">{s.parentEmail}</div>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{s.username}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEdit(s)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(s.id)}
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
        role="STUDENT"
        theme={theme}
        classes={classes}
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(creds) => {
          setCredentials(creds);
          loadMetadata();
          loadStudents(1);
        }}
      />
      <CredentialsModal
        credentials={credentials}
        theme={theme}
        title="Student credentials"
        onClose={() => setCredentials(null)}
      />

      <EditUserForm
        role="STUDENT"
        theme={theme}
        classes={classes}
        open={!!edit}
        user={edit}
        onClose={() => setEdit(null)}
        onUpdated={() => {
          setEdit(null);
          loadMetadata();
          loadStudents(page);
        }}
      />

      <ConfirmDeleteModal
        open={!!deleteId}
        title="Remove Student"
        description="Are you sure you want to remove this student? This action cannot be undone."
        loading={saving}
        onClose={() => !saving && setDeleteId(null)}
        onConfirm={handleDelete}
      />

      <ConfirmDeleteModal
        open={showBulkDeleteConfirm}
        title={`Remove ${selectedIds.length} Student(s)`}
        description={`Are you sure you want to remove ${selectedIds.length} selected student(s)? This action cannot be undone.`}
        loading={bulkActionSaving}
        onClose={() => !bulkActionSaving && setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
      />

      <BulkChangeClassModal
        open={showBulkChangeClass}
        count={selectedIds.length}
        classes={classes}
        theme={theme}
        loading={bulkActionSaving}
        onClose={() => setShowBulkChangeClass(false)}
        onConfirm={handleBulkChangeClass}
      />

      <BulkStudentUploadModal
        isOpen={showBulk}
        onClose={() => setShowBulk(false)}
        theme={theme}
        userRole={user.role}
        onSuccess={() => {
          loadMetadata();
          loadStudents(1);
        }}
      />
    </div>
  );
}
