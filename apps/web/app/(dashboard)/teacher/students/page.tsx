"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Trash2, X, Save, Search, Plus, Copy, School, FileSpreadsheet, ArrowRightLeft, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import Pagination from "@/components/shared/Pagination";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import PhoneInput from "@/components/forms/PhoneInput";
import ImageCropModal from "@/components/shared/ImageCropModal";
import BulkStudentUploadModal from "@/components/shared/BulkStudentUploadModal";
import BulkChangeClassModal from "@/components/shared/BulkChangeClassModal";
import {
  validateEmail,
  validateName,
  validatePhone,
  validateRequired,
  collectErrors,
  type FieldErrors,
} from "@/lib/validation";

export default function TeacherStudentsPage() {
  const { user, loading: authLoading } = useAuth(["TEACHER"]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkChangeClass, setShowBulkChangeClass] = useState(false);
  const [bulkActionSaving, setBulkActionSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState<any>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [editErrors, setEditErrors] = useState<FieldErrors>({});
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [phoneCountry, setPhoneCountry] = useState("+91");
  const [editPhoneCountry, setEditPhoneCountry] = useState("+91");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<"create" | "edit" | null>(null);
  const [allClasses, setAllClasses] = useState<any[]>([]);

  const activeMapping = mappings.find(
    (c) => `${c.className}||${c.section}` === activeTab
  );
  const isClassTeacherTab = activeMapping?.role === "CLASS_TEACHER";

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [res, stRes, cRes] = await Promise.all([
          fetch("/api/teacher-classes"),
          fetch("/api/teacher-classes?students=1&all=1").catch(() => null),
          fetch("/api/classes?all=1").catch(() => null),
        ]);
        let allStudents: any[] = [];
        if (stRes && stRes.ok) {
          const sd = await stRes.json();
          allStudents = sd.students || [];
        }
        if (cRes && cRes.ok) {
          const cd = await cRes.json();
          setAllClasses(cd.classes || []);
        }
        if (res.ok) {
          const d = await res.json();
          const classes = d.classes || [];
          const sorted = [
            ...classes.filter((c: any) => c.role === "CLASS_TEACHER"),
            ...classes.filter((c: any) => c.role !== "CLASS_TEACHER"),
          ];
          const map = new Map<string, any>();
          for (const c of sorted) {
            const key = `${c.className}||${c.section}`;
            const count = allStudents.filter(
              (s) =>
                s.className?.toLowerCase() === c.className?.toLowerCase() &&
                (!c.section || s.section?.toLowerCase() === c.section?.toLowerCase())
            ).length;
            if (!map.has(key) || c.role === "CLASS_TEACHER") {
              map.set(key, { ...c, count });
            }
          }
          const tabs = Array.from(map.values());
          setMappings(tabs);
          if (tabs[0]) setActiveTab(`${tabs[0].className}||${tabs[0].section}`);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const loadStudents = (targetPage = page, q = search, tab = activeTab) => {
    if (!tab) return;
    const [className, section] = tab.split("||");
    const params = new URLSearchParams({
      role: "STUDENT",
      className,
      page: String(targetPage),
      limit: "20",
    });
    if (section) params.set("section", section);
    if (q.trim()) params.set("q", q.trim());

    setStudentsLoading(true);
    fetch(`/api/users/list?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.users || []);
        setTotal(d.total || (d.users || []).length);
        setTotalPages(d.totalPages || 1);
        setPage(d.page || targetPage);
      })
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedIds([]);
      loadStudents(1, search, activeTab);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, activeTab]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
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
      loadStudents(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBulkActionSaving(false);
    }
  };

  const validateCreate = () => {
    const next = collectErrors({
      firstName: validateName(form.firstName, "First name"),
      phone: validatePhone(form.phone, { required: true, countryCode: phoneCountry }),
      dateOfBirth: validateRequired(form.dateOfBirth, "Date of birth"),
      parentName: validateName(form.parentName, "Parent name"),
      parentEmail: validateEmail(form.parentEmail, true),
      rollNumber: form.rollNumber?.trim() && !/^\d+$/.test(form.rollNumber.trim()) ? "Roll number must contain only numbers" : "",
    });
    setErrors(next || {});
    return !next;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClassTeacherTab || !activeMapping) {
      toast.error("Only Class Teachers can add students");
      return;
    }
    if (!validateCreate()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    setCreating(true);
    try {
      const { email, ...cleanForm } = form;
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cleanForm,
          role: "STUDENT",
          className: activeMapping.className,
          section: activeMapping.section || "A",
          rollNumber: form.rollNumber?.trim() || undefined,
          rollNo: form.rollNumber?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCredentials(data.credentials);
      toast.success("Student created!");
      setShowCreate(false);
      setForm({});
      setErrors({});
      loadStudents();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const validateEdit = () => {
    if (!editUser) return false;
    const next = collectErrors({
      firstName: validateName(editUser.firstName, "First name"),
      phone: validatePhone(editUser.phone, { required: true, countryCode: editPhoneCountry }),
      dateOfBirth: validateRequired(editUser.dateOfBirth, "Date of birth"),
      parentName: validateName(editUser.parentName, "Parent name"),
      parentEmail: validateEmail(editUser.parentEmail, true),
      rollNumber:
        editUser.rollNumber &&
        String(editUser.rollNumber).trim() &&
        !/^\d+$/.test(String(editUser.rollNumber).trim())
          ? "Roll number must contain only numbers"
          : "",
    });
    setEditErrors(next || {});
    return !next;
  };

  const saveEdit = async () => {
    if (!editUser) return;
    if (!validateEdit()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editUser.firstName,
          lastName: editUser.lastName,
          phone: editUser.phone,
          dateOfBirth: editUser.dateOfBirth,
          parentName: editUser.parentName,
          parentEmail: editUser.parentEmail,
          gender: editUser.gender,
          photoUrl: editUser.photoUrl,
          className: editUser.className,
          section: editUser.section,
          rollNumber: editUser.rollNumber !== undefined ? String(editUser.rollNumber).trim() : undefined,
          rollNo: editUser.rollNumber !== undefined ? String(editUser.rollNumber).trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Student updated");
      setEditUser(null);
      setEditErrors({});
      loadStudents();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Student removed");
      setDeleteId(null);
      loadStudents();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold">My Classes</h1>
          </div>
          {mappings.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, class, parent..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border text-sm bg-white"
                />
              </div>
              {isClassTeacherTab && (
                <>
                  {students.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        setSelectedIds([]);
                      }}
                      className={`px-3.5 py-2 rounded-xl border text-sm font-semibold flex items-center gap-2 shrink-0 transition shadow-xs ${
                        isSelectionMode
                          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                      {isSelectionMode ? "Cancel Select" : "Select"}
                    </button>
                  )}
                  <button
                    onClick={() => setShowBulk(true)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold flex items-center gap-2 shrink-0 transition hover:bg-slate-50 shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Bulk Upload
                  </button>
                  <button
                    onClick={() => {
                      setShowCreate(true);
                      setForm({});
                      setErrors({});
                      setPhoneCountry("+91");
                    }}
                    className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2"
                    style={{ backgroundColor: theme }}
                  >
                    <Plus className="w-4 h-4" /> Add Student
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="mb-6" />

        {/* Bulk Actions Floating Bar for Class Teacher */}
        {isClassTeacherTab && isSelectionMode && selectedIds.length > 0 && (
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

        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        ) : mappings.length === 0 ? (
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
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 flex-nowrap whitespace-nowrap">
              {mappings.map((c) => {
                const key = `${c.className}||${c.section}`;
                const active = activeTab === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveTab(key);
                      setSelectedIds([]);
                      setIsSelectionMode(false);
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition shrink-0 ${
                      active ? "text-white border-transparent" : "bg-white text-slate-600"
                    }`}
                    style={active ? { backgroundColor: theme } : undefined}
                  >
                    {c.className}-{c.section} {c.count !== undefined ? `[${c.count}]` : ""}
                    <span className={`ml-2 text-[10px] ${active ? "text-white/80" : "text-slate-400"}`}>
                      {c.role === "CLASS_TEACHER" ? "Class Teacher" : c.subjectName || "Subject"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl border overflow-x-auto shadow-xs">
              <table className="w-full text-sm min-w-[650px]">
                <thead className="bg-slate-50 text-slate-500 text-left">
                  <tr>
                    {isClassTeacherTab && isSelectionMode && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={students.length > 0 && selectedIds.length === students.length}
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          title="Select all on this page"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3">Roll No</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Parent</th>
                    {isClassTeacherTab && <th className="px-4 py-3 w-28">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={isClassTeacherTab ? (isSelectionMode ? 7 : 6) : 5} className="px-4 py-8 text-center text-slate-400">
                        No students
                      </td>
                    </tr>
                  ) : (
                    students.map((s) => (
                      <tr
                        key={s.id}
                        className={`border-t hover:bg-slate-50 transition-colors ${
                          selectedIds.includes(s.id) ? "bg-indigo-50/40" : ""
                        }`}
                      >
                        {isClassTeacherTab && isSelectionMode && (
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
                        <td className="px-4 py-2 font-mono text-xs">{s.username}</td>
                        <td className="px-4 py-2 text-xs">{s.parentName || s.parentEmail || "—"}</td>
                        {isClassTeacherTab && (
                          <td className="px-4 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditUser({
                                    ...s,
                                    dateOfBirth: s.dateOfBirth
                                      ? typeof s.dateOfBirth === "string"
                                        ? s.dateOfBirth.slice(0, 10)
                                        : ""
                                      : "",
                                    rollNumber: s.rollNumber !== undefined ? s.rollNumber : s.rollNo || "",
                                  });
                                  setEditErrors({});
                                }}
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
                        )}
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
                onPageChange={(newPage) => {
                  setPage(newPage);
                  setSelectedIds([]);
                  loadStudents(newPage, search, activeTab);
                }}
                themeColor={theme}
                loading={studentsLoading}
              />
            </div>
          </>
        )}
      </main>

      {/* Add Student (Class Teacher only) */}
      {showCreate && isClassTeacherTab && activeMapping && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10">
              <div>
                <h2 className="font-bold text-base sm:text-lg text-slate-900">
                  Add Student — {activeMapping.className}
                  {activeMapping.section ? `-${activeMapping.section}` : ""}
                </h2>
                <p className="text-xs text-slate-500">Create new student and parent credentials</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form onSubmit={handleCreate} className="space-y-3.5" noValidate>
                {/* Photo Upload */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Student Photo (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden border border-slate-200">
                      {form.photoUrl ? (
                        <img src={form.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-medium">
                          Pic
                        </div>
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="text-xs file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
                        disabled={uploadingPhoto}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setCropFile(f);
                            setCropTarget("create");
                          }
                          e.target.value = "";
                        }}
                      />
                      {uploadingPhoto && (
                        <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 shrink-0">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      First Name *
                    </label>
                    <input
                      value={form.firstName || ""}
                      onChange={(e) => {
                        setForm({ ...form, firstName: e.target.value });
                        setErrors((er) => ({ ...er, firstName: "" }));
                      }}
                      placeholder="First name"
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                        errors.firstName ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Last Name
                    </label>
                    <input
                      value={form.lastName || ""}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Last name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Roll Number (optional) - Below Name */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Roll Number (optional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.rollNumber || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*$/.test(val)) {
                        setForm({ ...form, rollNumber: val });
                        setErrors((er) => ({ ...er, rollNumber: "" }));
                      }
                    }}
                    placeholder="e.g. 101"
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                      errors.rollNumber ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  />
                  {errors.rollNumber && <p className="mt-1 text-xs text-red-600">{errors.rollNumber}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Phone *
                  </label>
                  <PhoneInput
                    value={form.phone || ""}
                    defaultCountryCode="+91"
                    error={errors.phone}
                    onChange={(full, code) => {
                      setForm({ ...form, phone: full });
                      setPhoneCountry(code);
                      setErrors((er) => ({ ...er, phone: "" }));
                    }}
                  />
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={form.dateOfBirth || ""}
                      onChange={(e) => {
                        setForm({ ...form, dateOfBirth: e.target.value });
                        setErrors((er) => ({ ...er, dateOfBirth: "" }));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                        errors.dateOfBirth ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {errors.dateOfBirth && <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Gender
                    </label>
                    <select
                      value={form.gender || "MALE"}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                {/* Parent Name */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Parent Name *
                  </label>
                  <input
                    value={form.parentName || ""}
                    onChange={(e) => {
                      setForm({ ...form, parentName: e.target.value });
                      setErrors((er) => ({ ...er, parentName: "" }));
                    }}
                    placeholder="Parent name"
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                      errors.parentName ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  />
                  {errors.parentName && <p className="mt-1 text-xs text-red-600">{errors.parentName}</p>}
                </div>

                {/* Parent Email */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Parent Email *
                  </label>
                  <input
                    type="email"
                    value={form.parentEmail || ""}
                    onChange={(e) => {
                      setForm({ ...form, parentEmail: e.target.value });
                      setErrors((er) => ({ ...er, parentEmail: "" }));
                    }}
                    placeholder="Parent email"
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                      errors.parentEmail ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  />
                  {errors.parentEmail && <p className="mt-1 text-xs text-red-600">{errors.parentEmail}</p>}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-xs transition hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    style={{ backgroundColor: theme }}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      "Create Student"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student — identical UI & structure */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10">
              <div>
                <h2 className="font-bold text-base sm:text-lg text-slate-900">Edit Student</h2>
                <p className="text-xs text-slate-500">Update student information and parent details</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditUser(null);
                  setEditErrors({});
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEdit();
                }}
                className="space-y-3.5"
                noValidate
              >
                {/* Photo Upload */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Student Photo (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden border border-slate-200">
                      {editUser.photoUrl ? (
                        <img src={editUser.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-medium">
                          Pic
                        </div>
                      )}
                      {uploadingEditPhoto && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="text-xs file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
                        disabled={uploadingEditPhoto}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setCropFile(f);
                            setCropTarget("edit");
                          }
                          e.target.value = "";
                        }}
                      />
                      {uploadingEditPhoto && (
                        <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 shrink-0">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      First Name *
                    </label>
                    <input
                      value={editUser.firstName || ""}
                      onChange={(e) => {
                        setEditUser({ ...editUser, firstName: e.target.value });
                        setEditErrors((er) => ({ ...er, firstName: "" }));
                      }}
                      placeholder="First name"
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                        editErrors.firstName ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {editErrors.firstName && <p className="mt-1 text-xs text-red-600">{editErrors.firstName}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Last Name
                    </label>
                    <input
                      value={editUser.lastName || ""}
                      onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                      placeholder="Last name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Roll Number (optional) - Below Name */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Roll Number (optional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={editUser.rollNumber !== undefined ? editUser.rollNumber : editUser.rollNo || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*$/.test(val)) {
                        setEditUser({ ...editUser, rollNumber: val, rollNo: val });
                        setEditErrors((er) => ({ ...er, rollNumber: "" }));
                      }
                    }}
                    placeholder="e.g. 101"
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                      editErrors.rollNumber ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  />
                  {editErrors.rollNumber && <p className="mt-1 text-xs text-red-600">{editErrors.rollNumber}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Phone *
                  </label>
                  <PhoneInput
                    value={editUser.phone || ""}
                    defaultCountryCode="+91"
                    error={editErrors.phone}
                    onChange={(full, code) => {
                      setEditUser({ ...editUser, phone: full });
                      if (code) setEditPhoneCountry(code);
                      setEditErrors((er) => ({ ...er, phone: "" }));
                    }}
                  />
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={editUser.dateOfBirth || ""}
                      onChange={(e) => {
                        setEditUser({ ...editUser, dateOfBirth: e.target.value });
                        setEditErrors((er) => ({ ...er, dateOfBirth: "" }));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                        editErrors.dateOfBirth ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {editErrors.dateOfBirth && <p className="mt-1 text-xs text-red-600">{editErrors.dateOfBirth}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Gender
                    </label>
                    <select
                      value={editUser.gender || "MALE"}
                      onChange={(e) => setEditUser({ ...editUser, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                {/* Parent Name */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Parent Name *
                  </label>
                  <input
                    value={editUser.parentName || ""}
                    onChange={(e) => {
                      setEditUser({ ...editUser, parentName: e.target.value });
                      setEditErrors((er) => ({ ...er, parentName: "" }));
                    }}
                    placeholder="Parent name"
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                      editErrors.parentName ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  />
                  {editErrors.parentName && <p className="mt-1 text-xs text-red-600">{editErrors.parentName}</p>}
                </div>

                {/* Parent Email */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Parent Email *
                  </label>
                  <input
                    type="email"
                    value={editUser.parentEmail || ""}
                    onChange={(e) => {
                      setEditUser({ ...editUser, parentEmail: e.target.value });
                      setEditErrors((er) => ({ ...er, parentEmail: "" }));
                    }}
                    placeholder="Parent email"
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                      editErrors.parentEmail ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  />
                  {editErrors.parentEmail && <p className="mt-1 text-xs text-red-600">{editErrors.parentEmail}</p>}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-xs transition hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    style={{ backgroundColor: theme }}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteId}
        title="Remove Student"
        description="Are you sure you want to remove this student? This will deactivate the student account."
        loading={saving}
        onClose={() => !saving && setDeleteId(null)}
        onConfirm={confirmDelete}
      />

      {credentials && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10">
              <h2 className="text-base sm:text-lg font-bold text-green-700">Created Successfully!</h2>
              <button
                type="button"
                onClick={() => setCredentials(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-3.5">
              <p className="text-xs text-slate-500">Save these credentials securely.</p>
              {credentials.student ? (
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                    <div className="text-xs text-slate-500 mb-1 font-semibold">Student Username</div>
                    <div className="flex justify-between items-center">
                      <code className="font-mono font-bold text-xs text-slate-900">{credentials.student.username}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(credentials.student.username);
                          toast.success("Copied!");
                        }}
                        className="p-1.5 hover:bg-white rounded-lg cursor-pointer"
                      >
                        <Copy className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 mb-1 font-semibold">Student Password (DOB)</div>
                    <div className="flex justify-between items-center">
                      <code className="font-mono font-bold text-xs text-slate-900">{credentials.student.password}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(credentials.student.password);
                          toast.success("Copied!");
                        }}
                        className="p-1.5 hover:bg-white rounded-lg cursor-pointer"
                      >
                        <Copy className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-indigo-50/70 rounded-xl p-4 border border-indigo-100">
                    <div className="text-xs text-indigo-600 mb-1 font-semibold">Parent Username</div>
                    <div className="flex justify-between items-center">
                      <code className="font-mono font-bold text-xs text-indigo-950">{credentials.parent.username}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(credentials.parent.username);
                          toast.success("Copied!");
                        }}
                        className="p-1.5 hover:bg-white rounded-lg cursor-pointer"
                      >
                        <Copy className="w-4 h-4 text-indigo-500" />
                      </button>
                    </div>
                    <div className="text-xs text-indigo-600 mt-2 mb-1 font-semibold">Parent Password</div>
                    <div className="flex justify-between items-center">
                      <code className="font-mono font-bold text-xs text-indigo-950">{credentials.parent.password}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(credentials.parent.password);
                          toast.success("Copied!");
                        }}
                        className="p-1.5 hover:bg-white rounded-lg cursor-pointer"
                      >
                        <Copy className="w-4 h-4 text-indigo-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              <button
                onClick={() => setCredentials(null)}
                className="w-full mt-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-xs hover:bg-indigo-700 transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageCropModal
        open={!!cropTarget && !!cropFile}
        imageFile={cropFile}
        onClose={() => {
          setCropTarget(null);
          setCropFile(null);
        }}
        onCropComplete={async (croppedFile) => {
          const target = cropTarget;
          const fd = new FormData();
          fd.append("file", croppedFile);

          if (target === "create") {
            setUploadingPhoto(true);
            try {
              const res = await fetch("/api/upload", { method: "POST", body: fd });
              const data = await res.json();
              if (res.ok) {
                setForm((prev: any) => ({ ...prev, photoUrl: data.url }));
                toast.success("Photo uploaded");
              } else {
                toast.error(data.error || "Upload failed");
              }
            } catch (err: any) {
              toast.error(err.message || "Upload failed");
            } finally {
              setUploadingPhoto(false);
            }
          } else if (target === "edit") {
            setUploadingEditPhoto(true);
            try {
              const res = await fetch("/api/upload", { method: "POST", body: fd });
              const data = await res.json();
              if (res.ok) {
                setEditUser((prev: any) => ({ ...prev, photoUrl: data.url }));
                toast.success("Photo uploaded");
              } else {
                toast.error(data.error || "Upload failed");
              }
            } catch (err: any) {
              toast.error(err.message || "Upload failed");
            } finally {
              setUploadingEditPhoto(false);
            }
          }
        }}
        title="Crop Student Photo"
        themeColor="#6366F1"
      />

      <BulkStudentUploadModal
        isOpen={showBulk}
        onClose={() => setShowBulk(false)}
        theme={theme}
        userRole={user.role}
        defaultClassName={activeMapping?.className}
        defaultSection={activeMapping?.section}
        onSuccess={() => {
          loadStudents();
        }}
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
        classes={
          allClasses.length > 0
            ? allClasses
            : mappings.map((m) => ({ name: m.className, section: m.section }))
        }
        theme={theme}
        loading={bulkActionSaving}
        onClose={() => setShowBulkChangeClass(false)}
        onConfirm={handleBulkChangeClass}
      />
    </div>
  );
}
