"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Plus, Loader2, X, School, UserCheck, BookOpen, Users, MoreVertical, Pencil, Trash2, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import TeacherSelect from "@/components/shared/TeacherSelect";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import Pagination from "@/components/shared/Pagination";

export default function PrincipalClassesPage() {
  const { user, loading: authLoading } = useAuth(["PRINCIPAL"]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<any>(null);
  const [editForm, setEditForm] = useState({ id: "", name: "", section: "A", classTeacherId: "" });
  const [transferData, setTransferData] = useState(true);
  const [showMap, setShowMap] = useState<any>(null);
  const [showSubMap, setShowSubMap] = useState<any>(null);
  const [classDetail, setClassDetail] = useState<any>(null);
  const [classMappings, setClassMappings] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState({ name: "", section: "A", classTeacherId: "" });
  const [mapTeacherId, setMapTeacherId] = useState("");
  const [mapSubjectName, setMapSubjectName] = useState("");
  const [subMapForm, setSubMapForm] = useState({ subjectName: "", teacherId: "" });
  const [saving, setSaving] = useState(false);
  const [deleteClassItem, setDeleteClassItem] = useState<any>(null);
  const [deletingClass, setDeletingClass] = useState(false);
  const [deleteMappingItem, setDeleteMappingItem] = useState<any>(null);
  const [deletingMapping, setDeletingMapping] = useState(false);

  const load = useCallback(async (targetPage = page, q = search) => {
    setLoading(true);
    try {
      const [cRes, tRes] = await Promise.all([
        fetch(`/api/classes?page=${targetPage}&limit=20&q=${encodeURIComponent(q)}`),
        fetch("/api/users/list?role=TEACHER&all=1"),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setClasses(cData.classes || []);
        setTotal(cData.total ?? (cData.classes || []).length);
        setTotalPages(cData.totalPages ?? 1);
      }
      if (tRes.ok) setTeachers((await tRes.json()).users || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      setPage(1);
      load(1, search);
    }, 250);
    return () => clearTimeout(timer);
  }, [user, search, load]);

  useEffect(() => {
    if (!activeMenuId) return;
    const handleDocumentClick = () => {
      setActiveMenuId(null);
    };
    const timer = setTimeout(() => {
      document.addEventListener("click", handleDocumentClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [activeMenuId]);

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = form.name.trim();
    const cleanSection = form.section.trim().toUpperCase();
    if (!cleanName || !cleanSection) {
      toast.error("Name and section required");
      return;
    }

    // Validation for duplicates
    const duplicate = classes.some(
      (c) => c.name.trim().toLowerCase() === cleanName.toLowerCase() && c.section.trim().toUpperCase() === cleanSection
    );
    if (duplicate) {
      toast.error(`Class ${cleanName}-${cleanSection} already exists!`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          section: cleanSection,
          classTeacherId: form.classTeacherId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (form.classTeacherId) {
        await fetch("/api/teacher-classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: form.classTeacherId,
            className: cleanName,
            section: cleanSection,
            role: "CLASS_TEACHER",
            transferData: true,
          }),
        });
      }
      toast.success("Class created");
      setShowCreate(false);
      setForm({ name: "", section: "A", classTeacherId: "" });
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (c: any) => {
    setEditForm({
      id: c.id,
      name: c.name,
      section: c.section || "A",
      classTeacherId: c.classTeacherId || "",
    });
    setTransferData(true);
    setShowEdit(c);
  };

  const updateClassAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editForm.name.trim();
    const cleanSection = editForm.section.trim().toUpperCase();
    if (!cleanName || !cleanSection) {
      toast.error("Name and section required");
      return;
    }

    // Validation for duplicates
    const duplicate = classes.some(
      (c) =>
        c.id !== editForm.id &&
        c.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        c.section.trim().toUpperCase() === cleanSection
    );
    if (duplicate) {
      toast.error(`Class ${cleanName}-${cleanSection} already exists!`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editForm.id,
          name: cleanName,
          section: cleanSection,
          classTeacherId: editForm.classTeacherId || undefined,
          transferData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      if (editForm.classTeacherId) {
        await fetch("/api/teacher-classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teacherId: editForm.classTeacherId,
            className: cleanName,
            section: cleanSection,
            role: "CLASS_TEACHER",
            transferData,
          }),
        });
      }

      toast.success("Class updated successfully");
      setShowEdit(null);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClassConfirm = async () => {
    if (!deleteClassItem) return;
    setDeletingClass(true);
    try {
      const res = await fetch(`/api/classes?id=${encodeURIComponent(deleteClassItem.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`Class ${deleteClassItem.name}-${deleteClassItem.section} deleted successfully`);
      if (classDetail?.id === deleteClassItem.id) setClassDetail(null);
      setDeleteClassItem(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete class");
    } finally {
      setDeletingClass(false);
    }
  };

  const handleRemoveSubjectTeacherConfirm = async () => {
    if (!deleteMappingItem) return;
    setDeletingMapping(true);
    try {
      const res = await fetch(`/api/teacher-classes?id=${encodeURIComponent(deleteMappingItem.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Subject teacher removed successfully");
      setDeleteMappingItem(null);
      if (classDetail) openDetail(classDetail);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove mapping");
    } finally {
      setDeletingMapping(false);
    }
  };

  const mapClassTeacher = async () => {
    if (!showMap || !mapTeacherId) {
      toast.error("Select a teacher");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: showMap.id, teacherId: mapTeacherId, transferData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await fetch("/api/teacher-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: mapTeacherId,
          className: showMap.name,
          section: showMap.section,
          role: "CLASS_TEACHER",
          subjectName: mapSubjectName.trim() || undefined,
          transferData,
        }),
      });
      toast.success("Class teacher mapped");
      setShowMap(null);
      setMapSubjectName("");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const mapSubjectTeacher = async () => {
    if (!showSubMap || !subMapForm.teacherId || !subMapForm.subjectName.trim()) {
      toast.error("Enter subject and select teacher");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/teacher-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: subMapForm.teacherId,
          className: showSubMap.name,
          section: showSubMap.section,
          role: "SUBJECT_TEACHER",
          subjectName: subMapForm.subjectName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Subject teacher mapped");
      setShowSubMap(null);
      setSubMapForm({ subjectName: "", teacherId: "" });
      if (classDetail?.id === showSubMap.id) openDetail(showSubMap);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (c: any) => {
    setClassDetail(c);
    setDetailLoading(true);
    setClassMappings([]);
    setClassStudents([]);
    try {
      const [mRes, sRes] = await Promise.all([
        fetch(
          `/api/teacher-classes?className=${encodeURIComponent(c.name)}&section=${encodeURIComponent(c.section || "")}`
        ),
        fetch("/api/users/list?role=STUDENT"),
      ]);
      let maps: any[] = [];
      if (mRes.ok) {
        const d = await mRes.json();
        maps = (d.classes || d.mappings || []).filter(
          (x: any) =>
            x.className === c.name && (!c.section || x.section === c.section)
        );
      }
      if (!maps.length) {
        const all = await fetch("/api/teacher-classes?all=1");
        if (all.ok) {
          const d = await all.json();
          maps = (d.classes || d.mappings || []).filter(
            (x: any) =>
              x.className === c.name && (!c.section || x.section === c.section)
          );
        }
      }
      const enriched = maps.map((m) => {
        const t = teachers.find((x) => x.id === m.teacherId);
        return {
          ...m,
          teacherName: t
            ? `${t.firstName} ${t.lastName || ""}`.trim()
            : m.teacherName || "Teacher",
          photoUrl: t?.photoUrl,
        };
      });
      setClassMappings(enriched);
      if (sRes.ok) {
        const users = (await sRes.json()).users || [];
        setClassStudents(
          users.filter(
            (u: any) =>
              u.className === c.name && (!c.section || u.section === c.section)
          )
        );
      }
    } catch {
      setClassMappings([]);
      setClassStudents([]);
    } finally {
      setDetailLoading(false);
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
    <div className="min-h-screen bg-slate-50/70">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Classes &amp; Subjects</h1>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-2xs">
              {total} Total {total === 1 ? "Class" : "Classes"}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search class or teacher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 rounded-2xl text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition hover:opacity-95 shrink-0"
              style={{ backgroundColor: theme }}
            >
              <Plus className="w-4 h-4" /> Create Class
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading classes...</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200/80 shadow-xs">
            <School className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-bold mb-1">
              {search ? "No classes match your search" : "No classes yet"}
            </p>
            <p className="text-xs text-slate-400 mb-4">
              {search ? "Try searching for a different class or teacher name" : "Create classes and assign teachers"}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2.5 rounded-2xl text-white text-xs font-bold"
                style={{ backgroundColor: theme }}
              >
                Create First Class
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openDetail(c)}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-indigo-300/80 transition-all cursor-pointer relative flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-indigo-100 shadow-2xs group-hover:scale-105 transition-transform">
                          <School className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <div className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {c.name} - {c.section}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 font-medium flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span><strong>{c.studentCount || 0}</strong> enrolled students</span>
                          </div>
                        </div>
                      </div>

                      {/* 3-dots Menu Icon with Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === c.id ? null : c.id);
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          title="Class options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === c.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10 cursor-default"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                              }}
                            />
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-9 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-20 animate-in fade-in zoom-in-95 duration-150"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  openEditModal(c);
                                }}
                                className="w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition text-left cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Edit Class</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDeleteClassItem(c);
                                }}
                                className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition text-left cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Delete Class</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Class Teacher Badge */}
                    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 my-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Class Teacher
                      </div>
                      <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${c.classTeacherName ? "bg-emerald-500" : "bg-slate-300"}`} />
                        <span className="truncate">{c.classTeacherName || "Not assigned"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Mappings Buttons */}
                  <div className="flex gap-2 pt-3 border-t border-slate-100 mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMap(c);
                        setMapTeacherId(c.classTeacherId || "");
                        setMapSubjectName("");
                        setTransferData(true);
                      }}
                      className="flex-1 text-xs py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center gap-1.5 transition shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Class teacher
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSubMap(c);
                        setSubMapForm({ subjectName: "", teacherId: "" });
                      }}
                      className="flex-1 text-xs py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center gap-1.5 transition shadow-2xs"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Subject teacher
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 px-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={total}
                pageSize={20}
                onPageChange={(p) => {
                  setPage(p);
                  load(p, search);
                }}
                themeColor={theme}
              />
            </div>
          </div>
        )}
      </main>

      {/* Create class */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10 backdrop-blur-xs">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Create Class</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form onSubmit={createClass} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-600">Class Name</label>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 mt-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. Class 10"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Section</label>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 mt-1 text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. A"
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Class Teacher (Optional)</label>
                  <TeacherSelect
                    value={form.classTeacherId}
                    onChange={(id) => setForm({ ...form, classTeacherId: id })}
                    teachers={teachers}
                    placeholder="Select class teacher (optional)"
                    optional
                    optionalLabel="No class teacher"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition hover:opacity-95 disabled:opacity-60 mt-2"
                  style={{ backgroundColor: theme }}
                >
                  {saving ? "Creating..." : "Create Class"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10 backdrop-blur-xs">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Edit Class · {showEdit.name}-{showEdit.section}
              </h2>
              <button
                type="button"
                onClick={() => setShowEdit(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form onSubmit={updateClassAction} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-600">Class Name</label>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 mt-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. Class 10"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Section</label>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 mt-1 text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. A"
                    value={editForm.section}
                    onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Class Teacher</label>
                  <TeacherSelect
                    value={editForm.classTeacherId}
                    onChange={(id) => setEditForm({ ...editForm, classTeacherId: id })}
                    teachers={teachers}
                    placeholder="No class teacher"
                    optional
                    optionalLabel="No class teacher"
                  />
                </div>

                {/* Data Transfer Checkbox */}
                {editForm.classTeacherId && (
                  <div className="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-100/90 flex items-start gap-2.5 mt-2">
                    <input
                      type="checkbox"
                      id="transferDataEditPrincipal"
                      checked={transferData}
                      onChange={(e) => setTransferData(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="transferDataEditPrincipal" className="text-xs text-slate-700 cursor-pointer select-none">
                      <span className="font-bold text-slate-900 block">
                        Transfer class information to new class teacher
                      </span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                        If checked, previous teacher&apos;s Homeworks, Exams &amp; Tests, Marks, and Attendance for this class will show for the new teacher. If unchecked, new teacher starts fresh.
                      </span>
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition hover:opacity-95 disabled:opacity-60 mt-2"
                  style={{ backgroundColor: theme }}
                >
                  {saving ? "Saving Changes..." : "Save Class Changes"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Map class teacher + optional subject */}
      {showMap && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10 backdrop-blur-xs">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Class Teacher → {showMap.name}-{showMap.section}
              </h2>
              <button
                type="button"
                onClick={() => setShowMap(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <label className="text-xs font-bold text-slate-600">Teacher</label>
              <TeacherSelect
                value={mapTeacherId}
                onChange={setMapTeacherId}
                teachers={teachers}
                placeholder="Select teacher"
                className="mb-3"
              />
              <label className="text-xs font-bold text-slate-600">
                Subject (text, optional)
              </label>
              <input
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 mb-3 mt-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder="e.g. Mathematics"
                value={mapSubjectName}
                onChange={(e) => setMapSubjectName(e.target.value)}
              />

              {/* Data Transfer Checkbox */}
              {mapTeacherId && (
                <div className="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-100/90 flex items-start gap-2.5 mb-4">
                  <input
                    type="checkbox"
                    id="transferDataMapPrincipal"
                    checked={transferData}
                    onChange={(e) => setTransferData(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="transferDataMapPrincipal" className="text-xs text-slate-700 cursor-pointer select-none">
                    <span className="font-bold text-slate-900 block">
                      Transfer class information to new class teacher
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                      If checked, previous teacher&apos;s Homeworks, Exams &amp; Tests, Marks, and Attendance for this class will show for the new teacher. If unchecked, new teacher starts fresh.
                    </span>
                  </label>
                </div>
              )}

              <button
                type="button"
                onClick={mapClassTeacher}
                disabled={saving}
                className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition hover:opacity-95 disabled:opacity-60"
                style={{ backgroundColor: theme }}
              >
                {saving ? "Saving..." : "Save Class Teacher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map subject teacher — teacher dropdown + subject text (multiple allowed) */}
      {showSubMap && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10 backdrop-blur-xs">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Subject Teacher → {showSubMap.name}-{showSubMap.section}
              </h2>
              <button
                type="button"
                onClick={() => setShowSubMap(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <p className="text-xs text-slate-500 mb-3 font-medium">
                You can map multiple subject teachers for this class (one subject each time).
              </p>
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-600">Subject (text)</label>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 mt-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. English"
                    value={subMapForm.subjectName}
                    onChange={(e) =>
                      setSubMapForm({ ...subMapForm, subjectName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600">Teacher</label>
                  <TeacherSelect
                    value={subMapForm.teacherId}
                    onChange={(id) =>
                      setSubMapForm({ ...subMapForm, teacherId: id })
                    }
                    teachers={teachers}
                    placeholder="Select teacher"
                  />
                </div>
                <button
                  type="button"
                  onClick={mapSubjectTeacher}
                  disabled={saving}
                  className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition hover:opacity-95 disabled:opacity-60 mt-1"
                  style={{ backgroundColor: theme }}
                >
                  {saving ? "Mapping..." : "Map Subject Teacher"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click class → teachers + subjects + students */}
      {classDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10 backdrop-blur-xs">
              <h2 className="font-black text-lg text-slate-900 tracking-tight">
                Class {classDetail.name}-{classDetail.section}
              </h2>
              <button
                type="button"
                onClick={() => setClassDetail(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {detailLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <>
                  <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <div className="text-xs font-bold text-indigo-600 mb-2">Class teacher</div>
                    {classMappings.filter((m) => m.role === "CLASS_TEACHER").length === 0 ? (
                      <div className="font-semibold text-slate-900 text-sm">
                        {classDetail.classTeacherName || "Not assigned"}
                      </div>
                    ) : (
                      classMappings
                        .filter((m) => m.role === "CLASS_TEACHER")
                        .map((m: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 py-1"
                          >
                            <Avatar name={m.teacherName} photoUrl={m.photoUrl} size={36} />
                            <div className="flex-1 flex justify-between gap-2 items-center">
                              <span className="font-bold text-slate-900 text-sm">{m.teacherName}</span>
                              {m.subjectName ? (
                                <span className="text-xs font-bold text-indigo-600 bg-white px-2.5 py-0.5 rounded-full border border-indigo-100">
                                  {m.subjectName}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ))
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="text-xs font-bold text-slate-500 mb-2">
                      Subject teachers (
                      {classMappings.filter((m) => m.role === "SUBJECT_TEACHER").length})
                    </div>
                    {classMappings.filter((m) => m.role === "SUBJECT_TEACHER").length === 0 ? (
                      <p className="text-xs text-slate-400 font-medium italic">No subject teachers mapped yet</p>
                    ) : (
                      <div className="space-y-2">
                        {classMappings
                          .filter((m) => m.role === "SUBJECT_TEACHER")
                          .map((m, i) => (
                            <div
                              key={m.id || i}
                              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition"
                            >
                              <Avatar name={m.teacherName} photoUrl={m.photoUrl} size={34} />
                              <div className="flex-1 flex justify-between gap-2 items-center min-w-0">
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-slate-800 block truncate">{m.teacherName}</span>
                                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                    {m.subjectName || "Subject"}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setDeleteMappingItem(m)}
                                  className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition shadow-2xs shrink-0"
                                  title="Remove Subject Teacher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Enrolled Students Summary & Navigation */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-2xs border border-indigo-100 shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 truncate">
                          {classStudents.length} {classStudents.length === 1 ? "Student" : "Students"} Enrolled
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">
                          Class {classDetail.name}-{classDetail.section} roster
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/principal/students?className=${encodeURIComponent(classDetail.name)}&section=${encodeURIComponent(classDetail.section || "")}`}
                      onClick={() => setClassDetail(null)}
                      className="px-3.5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition hover:opacity-95 shrink-0 cursor-pointer"
                      style={{ backgroundColor: theme }}
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="flex gap-2 mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setClassDetail(null);
                        setShowMap(classDetail);
                        setMapTeacherId(classDetail.classTeacherId || "");
                      }}
                      className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Map class teacher
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setClassDetail(null);
                        setShowSubMap(classDetail);
                        setSubMapForm({ subjectName: "", teacherId: "" });
                      }}
                      className="flex-1 py-2.5 rounded-2xl text-white text-xs font-bold shadow-sm hover:opacity-95 transition"
                      style={{ backgroundColor: theme }}
                    >
                      Add subject teacher
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Class Confirmation Modal */}
      <ConfirmDeleteModal
        open={!!deleteClassItem}
        title="Delete Class"
        description={
          deleteClassItem
            ? `Are you sure you want to delete Class ${deleteClassItem.name}-${deleteClassItem.section}? All its student and teacher assignments will be unmapped.`
            : ""
        }
        confirmText="Delete Class"
        loading={deletingClass}
        onClose={() => !deletingClass && setDeleteClassItem(null)}
        onConfirm={handleDeleteClassConfirm}
      />

      {/* Remove Subject Teacher Confirmation Modal */}
      <ConfirmDeleteModal
        open={!!deleteMappingItem}
        title="Remove Subject Teacher"
        description={
          deleteMappingItem
            ? `Are you sure you want to remove ${deleteMappingItem.teacherName || "this teacher"}${deleteMappingItem.subjectName ? ` for ${deleteMappingItem.subjectName}` : ""}?`
            : ""
        }
        confirmText="Remove"
        loading={deletingMapping}
        onClose={() => !deletingMapping && setDeleteMappingItem(null)}
        onConfirm={handleRemoveSubjectTeacherConfirm}
      />
    </div>
  );
}
