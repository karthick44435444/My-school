"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  X,
  Trash2,
  Send,
  Pencil,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Search,
  School,
  MoreVertical,
  FileEdit,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import ConfirmDeleteModal from "@/components/shared/ConfirmDeleteModal";
import {
  downloadExamMarksPDF,
  exportExamTimetablePDF,
  downloadExamTimetableImage,
} from "@/lib/examExportClient";
import { formatDDMMYYYY } from "@/lib/validation";
import Pagination from "@/components/shared/Pagination";

function toCap(s?: string) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Split = { title: string; maxMarks: string };
type SubForm = {
  id?: string;
  subjectName: string;
  date: string;
  maxMarks: string;
  passMarks: string;
  splits: Split[];
};

export default function TeacherExamsPage() {
  const { user, loading } = useAuth(["TEACHER"]);
  const [mounted, setMounted] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [mode, setMode] = useState<"TEST" | "EXAM">("TEST");
  const [show, setShow] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;
  const [marksMode, setMarksMode] = useState<any>(null);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("");
  // All marks keyed by subKey (subject.id || "main") -> studentId -> mark string
  const [allMarks, setAllMarks] = useState<Record<string, Record<string, string>>>({});
  // All split marks keyed by subKey (subject.id || "main") -> studentId -> splitTitle -> mark string
  const [allSplitMarks, setAllSplitMarks] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [menuExamId, setMenuExamId] = useState<string | null>(null);
  const [timetableExam, setTimetableExam] = useState<any | null>(null);
  const [exportingTimetablePdf, setExportingTimetablePdf] = useState(false);
  const [exportingTimetableImg, setExportingTimetableImg] = useState(false);
  const [deleteExamItem, setDeleteExamItem] = useState<any>(null);
  const [deletingExam, setDeletingExam] = useState(false);

  // Edit states
  const [editItem, setEditItem] = useState<any>(null);
  const [editTestForm, setEditTestForm] = useState<any>({});
  const [editExamForm, setEditExamForm] = useState<any>({});
  const [editSubjects, setEditSubjects] = useState<SubForm[]>([]);
  const [updating, setUpdating] = useState(false);
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});
  const [examErrors, setExamErrors] = useState<Record<string, string>>({});
  const [editTestErrors, setEditTestErrors] = useState<Record<string, string>>({});
  const [editExamErrors, setEditExamErrors] = useState<Record<string, string>>({});

  const [testForm, setTestForm] = useState({
    name: "",
    className: "",
    section: "",
    subject: "",
    maxMarks: "100",
    passMarks: "35",
    date: new Date().toISOString().slice(0, 10),
  });

  const [examForm, setExamForm] = useState({
    name: "",
    className: "",
    section: "",
  });
  const [subjects, setSubjects] = useState<SubForm[]>([
    {
      subjectName: "",
      date: new Date().toISOString().slice(0, 10),
      maxMarks: "100",
      passMarks: "35",
      splits: [{ title: "Theory", maxMarks: "70" }, { title: "Practical", maxMarks: "30" }],
    },
  ]);

  const [selectedClassTab, setSelectedClassTab] = useState<string>("ALL");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const isClassTeacher = useMemo(
    () =>
      user?.teacherType === "CLASS_TEACHER" ||
      myClasses.some((c) => c.role === "CLASS_TEACHER"),
    [myClasses, user]
  );

  // Check if current teacher is Class Teacher for a given class and section
  const isClassTeacherFor = (className: string, section?: string) => {
    if (
      user?.teacherType === "CLASS_TEACHER" &&
      user.className === className &&
      (!section || !user.section || user.section === section)
    ) {
      return true;
    }
    return myClasses.some(
      (c) =>
        c.className === className &&
        (!section || !c.section || c.section === section) &&
        c.role === "CLASS_TEACHER"
    );
  };

  // Get list of subjects assigned to this teacher for a given class and section
  const getAssignedSubjectsFor = (className: string, section?: string): string[] => {
    const matching = myClasses.filter(
      (c) => c.className === className && (!section || !c.section || c.section === section)
    );
    const subs = matching.map((c) => c.subjectName || c.subject).filter(Boolean);
    const userSub = (user as any)?.subject;
    if (subs.length === 0 && userSub) subs.push(userSub);
    return Array.from(new Set(subs.map((s: string) => s.trim().toLowerCase())));
  };

  // Only the creator or the class teacher of that class can Edit, Delete, or Publish the exam
  const canManageExam = (ex: any) => {
    const isCreator = ex.createdById === user?.id;
    const isCT = isClassTeacherFor(ex.className, ex.section);
    return isCreator || isCT;
  };

  const loadExams = useCallback(
    async (currentPage = page, query = debouncedQuery, classTab = selectedClassTab) => {
      setLoadingExams(true);
      try {
        let url = `/api/exams?page=${currentPage}&limit=20`;
        if (query.trim()) {
          url += `&q=${encodeURIComponent(query.trim())}`;
        }
        if (classTab !== "ALL") {
          const [cn] = classTab.split("||");
          if (cn) url += `&className=${encodeURIComponent(cn)}`;
        }
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setExams(data.exams || []);
          setTotal(data.total || (data.exams || []).length);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("loadExams error:", err);
      } finally {
        setLoadingExams(false);
        setBusy(false);
      }
    },
    [debouncedQuery, page, selectedClassTab]
  );

  const loadInitialData = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        fetch("/api/users/list?role=STUDENT"),
        fetch("/api/teacher-classes"),
      ]);
      if (sRes.ok) setStudents((await sRes.json()).users || []);
      if (cRes.ok) {
        const classes = (await cRes.json()).classes || [];
        setMyClasses(classes);
        const first = classes[0];
        const firstCT =
          classes.find((c: any) => c.role === "CLASS_TEACHER") ||
          (user?.className
            ? { className: user.className, section: user.section || "" }
            : first);

        if (first) {
          setTestForm((f) => ({
            ...f,
            className: f.className || first.className,
            section: f.section || first.section || "",
          }));
        }
        if (firstCT) {
          setExamForm((f) => ({
            ...f,
            className: f.className || firstCT.className,
            section: f.section || firstCT.section || "",
          }));
        }
      }
    } catch (e) {
      console.error("loadInitialData error:", e);
    }
  };

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadExams(page, debouncedQuery, selectedClassTab);
    }
  }, [user, page, debouncedQuery, selectedClassTab, loadExams]);

  const classOptions = useMemo(() => {
    const map = new Map<string, any>();
    if (user?.className) {
      const key = `${user.className}||${user.section || ""}`;
      map.set(key, {
        className: user.className,
        section: user.section || "",
        role: user.teacherType === "CLASS_TEACHER" ? "CLASS_TEACHER" : "SUBJECT_TEACHER",
      });
    }
    myClasses.forEach((c) => {
      const key = `${c.className}||${c.section || ""}`;
      const existing = map.get(key);
      if (!existing || c.role === "CLASS_TEACHER") {
        map.set(key, c);
      }
    });
    return Array.from(map.values());
  }, [myClasses, user]);

  const classTeacherOptions = useMemo(() => {
    return classOptions.filter((c: any) => isClassTeacherFor(c.className, c.section));
  }, [classOptions, myClasses, user]);

  const classStudents = (className: string, section?: string) =>
    students.filter(
      (s) => s.className === className && (!section || s.section === section)
    );

  const openMarks = async (exam: any, initialSubjectId?: string) => {
    setMarksMode(exam);
    const isCT = isClassTeacherFor(exam.className, exam.section);
    let availableSubjects = exam.subjects || [];
    if (!isCT && exam.subjects?.length > 0) {
      const assigned = getAssignedSubjectsFor(exam.className, exam.section);
      const filtered = exam.subjects.filter((s: any) =>
        assigned.includes((s.subjectName || "").trim().toLowerCase())
      );
      if (filtered.length > 0) availableSubjects = filtered;
    }

    const firstSubId = (availableSubjects[0]?.id) || "main";
    const sid = initialSubjectId || firstSubId;
    setActiveSubjectId(sid);
    try {
      const res = await fetch(`/api/exams?examId=${encodeURIComponent(exam.id)}`);
      if (res.ok) {
        const data = await res.json();
        const mObj: Record<string, Record<string, string>> = {};
        const smObj: Record<string, Record<string, Record<string, string>>> = {};

        for (const m of data.marks || []) {
          const subKey = m.subjectId || "main";
          if (!mObj[subKey]) mObj[subKey] = {};
          if (!smObj[subKey]) smObj[subKey] = {};

          mObj[subKey][m.studentId] = m.marks != null ? String(m.marks) : "";

          if (m.splits && typeof m.splits === "object") {
            smObj[subKey][m.studentId] = {};
            for (const [k, v] of Object.entries(m.splits)) {
              smObj[subKey][m.studentId][k] = v != null ? String(v) : "";
            }
          }
        }
        setAllMarks(mObj);
        setAllSplitMarks(smObj);
      }
    } catch {
      setAllMarks({});
      setAllSplitMarks({});
    }
  };

  const saveTest = async () => {
    const errs: Record<string, string> = {};
    if (!testForm.name.trim()) errs.name = "Title is required";
    if (!testForm.className.trim()) errs.className = "Class is required";
    if (!testForm.subject.trim()) errs.subject = "Subject is required";
    if (!testForm.maxMarks.trim() || Number(testForm.maxMarks) <= 0) errs.maxMarks = "Enter valid total marks";
    if (testForm.passMarks.trim() && Number(testForm.passMarks) > (Number(testForm.maxMarks) || 100)) {
      errs.passMarks = "Pass marks cannot exceed total marks";
    }
    setTestErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const maxM = Number(testForm.maxMarks) || 100;
      const passM = testForm.passMarks !== "" && testForm.passMarks != null ? Number(testForm.passMarks) : Math.round(maxM * 0.35);
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testForm,
          type: "TEST",
          maxMarks: maxM,
          passMarks: passM,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Test created");
      setShow(false);
      loadExams(1, debouncedQuery, selectedClassTab);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveExam = async () => {
    const errs: Record<string, string> = {};
    if (!examForm.name.trim()) errs.name = "Exam title is required";
    if (!examForm.className.trim()) errs.className = "Class is required";
    if (!isClassTeacher) {
      toast.error("Only class teachers can create big exams");
      return;
    }
    subjects.forEach((s, idx) => {
      if (!s.subjectName.trim()) errs[`subject_${idx}`] = "Subject name is required";
      const total = Number(s.maxMarks) || 0;
      const splitSum = s.splits.reduce((a, x) => a + (Number(x.maxMarks) || 0), 0);
      if (splitSum > total) {
        errs[`subject_split_${idx}`] = "Splits exceed total marks";
      }
    });
    setExamErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EXAM",
          name: examForm.name.trim(),
          className: examForm.className,
          section: examForm.section || undefined,
          subjects: subjects.map((s) => {
            const maxM = Number(s.maxMarks) || 100;
            const passM = s.passMarks !== "" && s.passMarks != null ? Number(s.passMarks) : Math.round(maxM * 0.35);
            return {
              subjectName: s.subjectName.trim(),
              date: s.date,
              maxMarks: maxM,
              passMarks: passM,
              splits: s.splits
                .filter((x) => x.title.trim())
                .map((x) => ({ title: x.title.trim(), maxMarks: Number(x.maxMarks) || 0 })),
            };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Exam created · timetable notified");
      setShow(false);
      loadExams(1, debouncedQuery, selectedClassTab);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveMarksNow = async () => {
    if (!marksMode) return;
    const list = classStudents(marksMode.className, marksMode.section);
    const records: any[] = [];
    const isCT = isClassTeacherFor(marksMode.className, marksMode.section);

    let allowedSubjects = marksMode.subjects || [];
    if (!isCT && marksMode.subjects?.length > 0) {
      const assigned = getAssignedSubjectsFor(marksMode.className, marksMode.section);
      const filtered = marksMode.subjects.filter((s: any) =>
        assigned.includes((s.subjectName || "").trim().toLowerCase())
      );
      if (filtered.length > 0) allowedSubjects = filtered;
    }

    if (allowedSubjects && allowedSubjects.length > 0) {
      for (const sub of allowedSubjects) {
        const subKey = sub.id || "main";
        const subMax = Number(sub.maxMarks) || 100;
        for (const st of list) {
          const stName = `${st.firstName} ${st.lastName || ""}`.trim();
          if (sub.splits && sub.splits.length > 0) {
            const splits = allSplitMarks[subKey]?.[st.id] || {};
            const hasAny = Object.values(splits).some((v) => v !== "" && v != null);
            if (!hasAny) continue;

            // Validate each split value against split max
            for (const sp of sub.splits) {
              const spVal = splits[sp.title];
              if (spVal !== "" && spVal != null) {
                const num = Number(spVal) || 0;
                const spMax = Number(sp.maxMarks) || 0;
                if (num > spMax) {
                  toast.error(`${stName} - ${sub.subjectName} (${sp.title}) cannot exceed ${spMax}`);
                  return;
                }
                if (num < 0) {
                  toast.error(`${stName} - ${sub.subjectName} (${sp.title}) cannot be negative`);
                  return;
                }
              }
            }

            const cleanSplits: Record<string, number> = {};
            let total = 0;
            for (const [k, v] of Object.entries(splits)) {
              if (v !== "" && v != null) {
                const n = Number(v) || 0;
                cleanSplits[k] = n;
                total += n;
              }
            }
            if (total > subMax) {
              toast.error(`${stName} - ${sub.subjectName} total marks (${total}) cannot exceed ${subMax}`);
              return;
            }
            records.push({
              studentId: st.id,
              subjectId: sub.id,
              splits: cleanSplits,
              marks: total,
              maxMarks: subMax,
            });
          } else {
            const val = allMarks[subKey]?.[st.id];
            if (val === undefined || val === "") continue;
            const num = Number(val) || 0;
            if (num > subMax) {
              toast.error(`${stName} - ${sub.subjectName} marks (${num}) cannot exceed ${subMax}`);
              return;
            }
            if (num < 0) {
              toast.error(`${stName} - ${sub.subjectName} marks cannot be negative`);
              return;
            }
            records.push({
              studentId: st.id,
              subjectId: sub.id,
              marks: num,
              maxMarks: subMax,
            });
          }
        }
      }
    } else {
      // Single subject / TEST
      const subKey = "main";
      const testMax = Number(marksMode.maxMarks) || 100;
      for (const st of list) {
        const val = allMarks[subKey]?.[st.id];
        if (val === undefined || val === "") continue;
        const num = Number(val) || 0;
        const stName = `${st.firstName} ${st.lastName || ""}`.trim();
        if (num > testMax) {
          toast.error(`${stName} marks (${num}) cannot exceed total marks (${testMax})`);
          return;
        }
        if (num < 0) {
          toast.error(`${stName} marks cannot be negative`);
          return;
        }
        records.push({
          studentId: st.id,
          marks: num,
          maxMarks: testMax,
        });
      }
    }

    if (!records.length) {
      toast.error("Enter at least one mark");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "marks", examId: marksMode.id, records }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Marks saved (not published yet)");
      setMarksMode(null);
      await loadExams(page, debouncedQuery, selectedClassTab);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (ex: any) => {
    if (!canManageExam(ex)) {
      toast.error("Only the creator or class teacher can edit this exam");
      return;
    }
    setEditTestErrors({});
    setEditExamErrors({});
    setEditItem(ex);
    if (ex.type === "EXAM") {
      setEditExamForm({
        name: ex.name,
        className: ex.className,
        section: ex.section || "",
      });
      setEditSubjects(
        (ex.subjects || []).map((s: any) => ({
          id: s.id,
          subjectName: s.subjectName || "",
          date: s.date || ex.date || new Date().toISOString().slice(0, 10),
          maxMarks: String(s.maxMarks || 100),
          passMarks: String(s.passMarks != null ? s.passMarks : Math.round((Number(s.maxMarks) || 100) * 0.35)),
          splits: (s.splits || []).map((sp: any) => ({
            title: sp.title || "",
            maxMarks: String(sp.maxMarks || 0),
          })),
        }))
      );
    } else {
      const maxM = Number(ex.maxMarks) || 100;
      setEditTestForm({
        name: ex.name,
        className: ex.className,
        section: ex.section || "",
        subject: ex.subject || "",
        maxMarks: String(maxM),
        passMarks: String(ex.passMarks != null ? ex.passMarks : Math.round(maxM * 0.35)),
        date: ex.date || new Date().toISOString().slice(0, 10),
      });
    }
  };

  const updateTest = async () => {
    const errs: Record<string, string> = {};
    if (!editTestForm.name?.trim()) errs.name = "Title is required";
    if (!editTestForm.className?.trim()) errs.className = "Class is required";
    if (!editTestForm.subject?.trim()) errs.subject = "Subject is required";
    if (!String(editTestForm.maxMarks || "").trim() || Number(editTestForm.maxMarks) <= 0) errs.maxMarks = "Enter valid total marks";
    if (String(editTestForm.passMarks || "").trim() && Number(editTestForm.passMarks) > (Number(editTestForm.maxMarks) || 100)) {
      errs.passMarks = "Pass marks cannot exceed total marks";
    }
    setEditTestErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setUpdating(true);
    try {
      const maxM = Number(editTestForm.maxMarks) || 100;
      const passM = editTestForm.passMarks !== "" && editTestForm.passMarks != null ? Number(editTestForm.passMarks) : Math.round(maxM * 0.35);
      const res = await fetch("/api/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editItem.id,
          ...editTestForm,
          type: "TEST",
          maxMarks: maxM,
          passMarks: passM,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Test updated successfully");
      setEditItem(null);
      await loadExams(page, debouncedQuery, selectedClassTab);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const updateExamAction = async () => {
    const errs: Record<string, string> = {};
    if (!editExamForm.name?.trim()) errs.name = "Exam title is required";
    if (!editExamForm.className?.trim()) errs.className = "Class is required";
    editSubjects.forEach((s, idx) => {
      if (!s.subjectName?.trim()) errs[`subject_${idx}`] = "Subject name is required";
      const total = Number(s.maxMarks) || 0;
      const splitSum = s.splits.reduce((a: number, x: any) => a + (Number(x.maxMarks) || 0), 0);
      if (splitSum > total) {
        errs[`subject_split_${idx}`] = "Splits exceed total marks";
      }
    });
    setEditExamErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setUpdating(true);
    try {
      const res = await fetch("/api/exams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editItem.id,
          type: "EXAM",
          name: editExamForm.name,
          className: editExamForm.className,
          section: editExamForm.section,
          subjects: editSubjects.map((s: any) => {
            const maxM = Number(s.maxMarks) || 100;
            const passM = s.passMarks !== "" && s.passMarks != null ? Number(s.passMarks) : Math.round(maxM * 0.35);
            return {
              id: s.id,
              subjectName: s.subjectName.trim(),
              date: s.date,
              maxMarks: maxM,
              passMarks: passM,
              splits: s.splits
                .filter((x: any) => x.title.trim())
                .map((x: any) => ({ title: x.title.trim(), maxMarks: Number(x.maxMarks) || 0 })),
            };
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Exam updated successfully");
      setEditItem(null);
      await loadExams(page, debouncedQuery, selectedClassTab);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteExamConfirm = async () => {
    if (!deleteExamItem) return;
    setDeletingExam(true);
    try {
      const res = await fetch(`/api/exams?id=${deleteExamItem.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Exam deleted");
      setDeleteExamItem(null);
      await loadExams(page, debouncedQuery, selectedClassTab);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete exam");
    } finally {
      setDeletingExam(false);
    }
  };

  const handleDownloadPDF = async (ex: any) => {
    setDownloadingPdfId(ex.id);
    try {
      await downloadExamMarksPDF(ex.id, {
        schoolName: user?.schoolName || "MySchool Platform",
        themeColor: user?.themeColor || "#6366F1",
        teacherName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || undefined,
      });
      toast.success("Marksheet PDF downloaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to download marksheet PDF");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleDownloadTimetablePdf = async (ex: any) => {
    if (!ex) return;
    setExportingTimetablePdf(true);
    try {
      exportExamTimetablePDF({
        schoolName: user?.schoolName || "MySchool Platform",
        themeColor: user?.themeColor || "#6366F1",
        exam: ex,
      });
      toast.success("Exam timetable PDF downloaded!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to download timetable PDF");
    } finally {
      setExportingTimetablePdf(false);
    }
  };

  const handleDownloadTimetableImg = async (ex: any) => {
    if (!ex) return;
    setExportingTimetableImg(true);
    try {
      await downloadExamTimetableImage(
        "web-timetable-modal-content",
        `${ex.name || "Exam"}_Timetable.png`
      );
      toast.success("Exam timetable image downloaded!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to download timetable image");
    } finally {
      setExportingTimetableImg(false);
    }
  };

  const publish = async (examId: string) => {
    setPublishingId(examId);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", examId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Published · only updated students notified");
      await loadExams(page, debouncedQuery, selectedClassTab);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPublishingId(null);
    }
  };

  // Filter exams according to Class View Tab & Subject Teacher scope & search query
  const filteredExams = useMemo(() => {
    return exams.filter((ex) => {
      // Role & Subject Scope Filter
      const isCT = isClassTeacherFor(ex.className, ex.section);
      const isCreator = ex.createdById === user?.id;

      if (!isCT && !isCreator) {
        const assignedSubs = getAssignedSubjectsFor(ex.className, ex.section);
        if (assignedSubs.length === 0) return false;

        if (ex.type === "TEST" || !ex.subjects || ex.subjects.length === 0) {
          const testSub = (ex.subject || "").trim().toLowerCase();
          if (!assignedSubs.includes(testSub)) return false;
        } else {
          const hasMySub = (ex.subjects || []).some((s: any) =>
            assignedSubs.includes((s.subjectName || "").trim().toLowerCase())
          );
          if (!hasMySub) return false;
        }
      }

      return true;
    });
  }, [exams, myClasses, user, isClassTeacherFor, getAssignedSubjectsFor]);

  const paginatedExams = filteredExams;

  // When opening marksMode for Subject Teacher, only show their assigned subjects
  const isMarksModeCT = marksMode ? isClassTeacherFor(marksMode.className, marksMode.section) : false;
  const marksModeAllowedSubjects = useMemo(() => {
    if (!marksMode) return [];
    if (isMarksModeCT || !marksMode.subjects?.length) return marksMode.subjects || [];
    const assigned = getAssignedSubjectsFor(marksMode.className, marksMode.section);
    const filtered = marksMode.subjects.filter((s: any) =>
      assigned.includes((s.subjectName || "").trim().toLowerCase())
    );
    return filtered.length > 0 ? filtered : marksMode.subjects;
  }, [marksMode, isMarksModeCT, myClasses, user]);

  const activeSub =
    marksModeAllowedSubjects.find((s: any) => s.id === activeSubjectId) ||
    (marksModeAllowedSubjects.length ? marksModeAllowedSubjects[0] : null);
  const activeKey = activeSub?.id || activeSubjectId || "main";

  if (!mounted || loading || !user) {
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
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Exams &amp; Marks</h1>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search exams, subjects..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {classOptions.length > 0 && (
              <button
                onClick={() => {
                  if (selectedClassTab !== "ALL") {
                    const [cn, sec] = selectedClassTab.split("||");
                    setTestForm((f) => ({ ...f, className: cn, section: sec || "" }));
                    setExamForm((f) => ({ ...f, className: cn, section: sec || "" }));
                  }
                  setMode(isClassTeacher ? "EXAM" : "TEST");
                  setShow(true);
                }}
                className="px-4 py-2.5 rounded-2xl text-white text-xs font-bold flex items-center gap-2 shadow-sm transition hover:opacity-95 shrink-0"
                style={{ backgroundColor: theme }}
              >
                <Plus className="w-4 h-4" /> Create
              </button>
            )}
          </div>
        </div>

        {classOptions.length === 0 ? (
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
            {/* Class View Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setSelectedClassTab("ALL");
                setPage(1);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition shadow-2xs ${
                selectedClassTab === "ALL"
                  ? "text-white shadow-md scale-[1.02]"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
              style={selectedClassTab === "ALL" ? { backgroundColor: theme } : undefined}
            >
              All Classes ({exams.length})
            </button>
            {classOptions.map((c: any) => {
              const tabKey = `${c.className}||${c.section || ""}`;
              const isSelected = selectedClassTab === tabKey;
              const isCT = c.role === "CLASS_TEACHER";
              const count = exams.filter(
                (e) => e.className === c.className && (!c.section || !e.section || e.section === c.section)
              ).length;

              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => {
                    setSelectedClassTab(tabKey);
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition shadow-2xs ${
                    isSelected
                      ? "text-white border-transparent shadow-md scale-[1.02]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  style={isSelected ? { backgroundColor: theme } : undefined}
                >
                  <span>
                    Class {c.className}{c.section ? `-${c.section}` : ""}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : isCT
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isCT ? "Class Teacher" : c.subjectName || (user as any)?.subject || "Subject"}
                  </span>
                  <span
                    className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      isSelected ? "bg-white/30 text-white" : "bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        {(busy || loadingExams) ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Loading exams and marks...</span>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-xs">
            No exams or tests created yet
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-xs">
            <p className="font-bold text-slate-700">No exams match your selection</p>
            <p className="text-xs text-slate-400 mt-1">Try switching class tabs or clearing your search</p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="mt-3 text-xs text-indigo-600 hover:underline font-bold"
              >
                Clear search query
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedExams.map((ex) => {
              const isCT = isClassTeacherFor(ex.className, ex.section);
              const isCreator = ex.createdById === user.id;
              const hasManagePerms = canManageExam(ex);
              const assignedSubs = getAssignedSubjectsFor(ex.className, ex.section);

              // Displayed subjects in timetable: if Subject Teacher, only show their subjects
              const timetableSubjects = isCT || isCreator || !ex.subjects?.length
                ? ex.subjects || []
                : ex.subjects.filter((s: any) =>
                    assignedSubs.includes((s.subjectName || "").trim().toLowerCase())
                  );

              const isMenuOpen = menuExamId === ex.id;

              return (
                <div
                  key={ex.id}
                  onClick={() => openMarks(ex)}
                  className="bg-white rounded-3xl border border-slate-200/90 p-6 transition shadow-xs hover:shadow-md hover:border-indigo-200 cursor-pointer relative group"
                >
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <span>{toCap(ex.name)}</span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            ex.type === "EXAM" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {ex.type || "TEST"}
                        </span>
                        {ex.published ? (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                            Published
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                            Draft Marks
                          </span>
                        )}
                        {!isCT && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            Subject Teacher
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-2 font-medium">
                        <span>
                          <strong>Class:</strong> {ex.className}
                          {ex.section ? `-${ex.section}` : ""}
                        </span>
                        <span>·</span>
                        <span>
                          {ex.subject ||
                            (ex.subjects?.length ? `${ex.subjects.length} subjects` : "General")}
                        </span>
                        <span>·</span>
                        <span className="font-mono">
                          {formatDDMMYYYY(ex.dateFrom || ex.date)}
                          {ex.dateTo && ex.dateTo !== ex.dateFrom
                            ? ` → ${formatDDMMYYYY(ex.dateTo)}`
                            : ""}
                        </span>
                        <span>·</span>
                        <span>Total: <strong>{ex.maxMarks}</strong></span>
                      </div>
                    </div>

                    <div
                      className="flex gap-2 flex-wrap items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasManagePerms && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            publish(ex.id);
                          }}
                          disabled={publishingId === ex.id}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-60"
                          title={ex.published ? "Re-notify students and parents with latest marks" : "Publish exam marks to students and parents"}
                        >
                          {publishingId === ex.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>{ex.published ? "Republish" : "Publish"}</span>
                        </button>
                      )}

                      {/* 3-dots Menu Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuExamId(isMenuOpen ? null : ex.id);
                          }}
                          className={`p-2 rounded-xl border transition shadow-2xs ${
                            isMenuOpen
                              ? "bg-slate-100 border-slate-300 text-slate-900"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <>
                            {/* Backdrop to close on click outside */}
                            <div
                              className="fixed inset-0 z-20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuExamId(null);
                              }}
                            />
                            <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl bg-white border border-slate-200 shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuExamId(null);
                                  openMarks(ex);
                                }}
                                className="w-full px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <FileEdit className="w-4 h-4 text-indigo-600" />
                                <span>Enter mark</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuExamId(null);
                                  setTimetableExam(ex);
                                }}
                                className="w-full px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Calendar className="w-4 h-4 text-indigo-600" />
                                <span>Timetable</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuExamId(null);
                                  handleDownloadPDF(ex);
                                }}
                                className="w-full px-3.5 py-2 text-left font-semibold text-emerald-700 hover:bg-emerald-50/60 flex items-center gap-2"
                              >
                                <Download className="w-4 h-4 text-emerald-600" />
                                <span>Download Marksheet</span>
                              </button>

                              {hasManagePerms && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuExamId(null);
                                    openEdit(ex);
                                  }}
                                  className="w-full px-3.5 py-2 text-left font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Pencil className="w-4 h-4 text-blue-600" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {hasManagePerms && (
                                <div className="border-t border-slate-100 my-1 pt-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMenuExamId(null);
                                      setDeleteExamItem(ex);
                                    }}
                                    className="w-full px-3.5 py-2 text-left font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-500" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={pageSize}
              onPageChange={setPage}
              themeColor={theme}
              loading={loadingExams}
            />
          </div>
        )}
          </>
        )}
      </main>

      {/* Create modal */}
      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10">
              <h2 className="text-lg font-bold text-slate-900">Create {mode === "EXAM" ? "Exam" : "Test"}</h2>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMode("TEST")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border ${mode === "TEST" ? "text-white border-transparent" : ""}`}
                style={mode === "TEST" ? { backgroundColor: theme } : undefined}
              >
                Test
              </button>
              <button
                onClick={() => isClassTeacher && setMode("EXAM")}
                disabled={!isClassTeacher}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border ${mode === "EXAM" ? "text-white border-transparent" : ""} ${!isClassTeacher ? "opacity-40" : ""}`}
                style={mode === "EXAM" ? { backgroundColor: theme } : undefined}
              >
                Exam {isClassTeacher ? "" : "(class teacher only)"}
              </button>
            </div>

            {mode === "TEST" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Title <span className="text-rose-500">*</span></label>
                  <input
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${testErrors.name ? "border-rose-400 bg-rose-50/30" : ""}`}
                    placeholder="Title e.g. Unit Test 1"
                    value={testForm.name}
                    onChange={(e) => {
                      setTestForm({ ...testForm, name: e.target.value });
                      setTestErrors({ ...testErrors, name: "" });
                    }}
                  />
                  {testErrors.name && <p className="text-xs text-rose-500 mt-1">{testErrors.name}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Class & Section <span className="text-rose-500">*</span></label>
                  <select
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${testErrors.className ? "border-rose-400 bg-rose-50/30" : ""}`}
                    value={`${testForm.className}||${testForm.section}`}
                    onChange={(e) => {
                      const [cn, sec] = e.target.value.split("||");
                      setTestForm({ ...testForm, className: cn, section: sec || "" });
                      setTestErrors({ ...testErrors, className: "" });
                    }}
                  >
                    {classOptions.map((c: any) => (
                      <option key={`${c.className}-${c.section}`} value={`${c.className}||${c.section || ""}`}>
                        {c.className}{c.section ? `-${c.section}` : ""}
                      </option>
                    ))}
                  </select>
                  {testErrors.className && <p className="text-xs text-rose-500 mt-1">{testErrors.className}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Subject <span className="text-rose-500">*</span></label>
                  <input
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${testErrors.subject ? "border-rose-400 bg-rose-50/30" : ""}`}
                    placeholder="Subject e.g. Mathematics"
                    value={testForm.subject}
                    onChange={(e) => {
                      setTestForm({ ...testForm, subject: e.target.value });
                      setTestErrors({ ...testErrors, subject: "" });
                    }}
                  />
                  {testErrors.subject && <p className="text-xs text-rose-500 mt-1">{testErrors.subject}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Total Marks <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${testErrors.maxMarks ? "border-rose-400 bg-rose-50/30" : ""}`}
                      placeholder="Total marks"
                      value={testForm.maxMarks}
                      onChange={(e) => {
                        const nextMax = e.target.value;
                        const numMax = Number(nextMax) || 0;
                        const autoPass = String(numMax === 100 ? 35 : Math.round(numMax * 0.35));
                        setTestForm({ ...testForm, maxMarks: nextMax, passMarks: autoPass });
                        setTestErrors({ ...testErrors, maxMarks: "" });
                      }}
                    />
                    {testErrors.maxMarks && <p className="text-xs text-rose-500 mt-1">{testErrors.maxMarks}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Pass Grade Mark</label>
                    <input
                      type="number"
                      className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${testErrors.passMarks ? "border-rose-400 bg-rose-50/30" : ""}`}
                      placeholder="Pass marks (35)"
                      value={testForm.passMarks}
                      onChange={(e) => {
                        setTestForm({ ...testForm, passMarks: e.target.value });
                        setTestErrors({ ...testErrors, passMarks: "" });
                      }}
                    />
                    {testErrors.passMarks && <p className="text-xs text-rose-500 mt-1">{testErrors.passMarks}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Date</label>
                    <input
                      type="date"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm"
                      value={testForm.date}
                      onChange={(e) => setTestForm({ ...testForm, date: e.target.value })}
                    />
                  </div>
                </div>
                <button onClick={saveTest} disabled={saving} className="w-full py-3 rounded-xl text-white font-semibold" style={{ backgroundColor: theme }}>
                  {saving ? "..." : "Create Test"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Exam Title <span className="text-rose-500">*</span></label>
                  <input
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${examErrors.name ? "border-rose-400 bg-rose-50/30" : ""}`}
                    placeholder="Exam title e.g. Final Exam"
                    value={examForm.name}
                    onChange={(e) => {
                      setExamForm({ ...examForm, name: e.target.value });
                      setExamErrors({ ...examErrors, name: "" });
                    }}
                  />
                  {examErrors.name && <p className="text-xs text-rose-500 mt-1">{examErrors.name}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Class & Section <span className="text-rose-500">*</span></label>
                  <select
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${examErrors.className ? "border-rose-400 bg-rose-50/30" : ""}`}
                    value={`${examForm.className}||${examForm.section}`}
                    onChange={(e) => {
                      const [cn, sec] = e.target.value.split("||");
                      setExamForm({ ...examForm, className: cn, section: sec || "" });
                      setExamErrors({ ...examErrors, className: "" });
                    }}
                  >
                    {classTeacherOptions.map((c: any) => (
                      <option key={`${c.className}-${c.section}`} value={`${c.className}||${c.section || ""}`}>
                        {c.className}{c.section ? `-${c.section}` : ""}
                      </option>
                    ))}
                  </select>
                  {examErrors.className && <p className="text-xs text-rose-500 mt-1">{examErrors.className}</p>}
                </div>

                {subjects.map((s, i) => {
                  const splitSum = s.splits.reduce((a, x) => a + (Number(x.maxMarks) || 0), 0);
                  const total = Number(s.maxMarks) || 0;
                  const balance = Math.max(0, total - splitSum);
                  return (
                    <div key={i} className="border rounded-xl p-4 space-y-2 bg-slate-50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold">Subject {i + 1}</span>
                        {subjects.length > 1 && (
                          <button type="button" onClick={() => setSubjects(subjects.filter((_, j) => j !== i))} className="text-rose-500 text-xs font-medium">Remove</button>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700">Subject Name <span className="text-rose-500">*</span></label>
                        <input
                          className={`w-full mt-1 px-3 py-2 rounded-xl border bg-white text-sm ${examErrors[`subject_${i}`] ? "border-rose-400 bg-rose-50/30" : ""}`}
                          placeholder="Subject name"
                          value={s.subjectName}
                          onChange={(e) => {
                            const next = [...subjects];
                            next[i] = { ...s, subjectName: e.target.value };
                            setSubjects(next);
                            setExamErrors({ ...examErrors, [`subject_${i}`]: "" });
                          }}
                        />
                        {examErrors[`subject_${i}`] && <p className="text-xs text-rose-500 mt-1">{examErrors[`subject_${i}`]}</p>}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Date</label>
                          <input
                            type="date"
                            className="w-full mt-0.5 px-3 py-2 rounded-xl border bg-white text-sm"
                            value={s.date}
                            onChange={(e) => {
                              const next = [...subjects];
                              next[i] = { ...s, date: e.target.value };
                              setSubjects(next);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Total Marks <span className="text-rose-500">*</span></label>
                          <input
                            type="number"
                            className="w-full mt-0.5 px-3 py-2 rounded-xl border bg-white text-sm"
                            placeholder="Total marks"
                            value={s.maxMarks}
                            onChange={(e) => {
                              const next = [...subjects];
                              const nextMax = e.target.value;
                              const numMax = Number(nextMax) || 0;
                              const autoPass = String(numMax === 100 ? 35 : Math.round(numMax * 0.35));
                              next[i] = { ...s, maxMarks: nextMax, passMarks: autoPass };
                              setSubjects(next);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Pass Mark</label>
                          <input
                            type="number"
                            className="w-full mt-0.5 px-3 py-2 rounded-xl border bg-white text-sm"
                            placeholder="Pass mark (35)"
                            value={s.passMarks}
                            onChange={(e) => {
                              const next = [...subjects];
                              next[i] = { ...s, passMarks: e.target.value };
                              setSubjects(next);
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">Split marks (sum ≤ total). Balance: {balance}</div>
                      {examErrors[`subject_split_${i}`] && <p className="text-xs text-rose-500 mt-1">{examErrors[`subject_split_${i}`]}</p>}
                      {s.splits.map((sp, j) => (
                        <div key={j} className="grid grid-cols-2 gap-2">
                          <input className="px-3 py-2 rounded-xl border bg-white text-sm" placeholder="Title e.g. Theory" value={sp.title} onChange={(e) => {
                            const next = [...subjects];
                            const splits = [...s.splits];
                            splits[j] = { ...sp, title: e.target.value };
                            next[i] = { ...s, splits };
                            setSubjects(next);
                          }} />
                          <input type="number" className="px-3 py-2 rounded-xl border bg-white text-sm" placeholder="Marks" value={sp.maxMarks} onChange={(e) => {
                            const next = [...subjects];
                            const splits = [...s.splits];
                            splits[j] = { ...sp, maxMarks: e.target.value };
                            next[i] = { ...s, splits };
                            setSubjects(next);
                          }} />
                        </div>
                      ))}
                      <button type="button" className="text-xs font-semibold text-indigo-600" onClick={() => {
                        const next = [...subjects];
                        next[i] = { ...s, splits: [...s.splits, { title: "", maxMarks: "" }] };
                        setSubjects(next);
                      }}>+ Add split</button>
                    </div>
                  );
                })}
                <button type="button" className="text-sm font-semibold text-indigo-600" onClick={() => setSubjects([...subjects, {
                  subjectName: "",
                  date: new Date().toISOString().slice(0, 10),
                  maxMarks: "100",
                  passMarks: "35",
                  splits: [{ title: "Theory", maxMarks: "70" }, { title: "Practical", maxMarks: "30" }],
                }])}>+ Add subject</button>
                <button onClick={saveExam} disabled={saving} className="w-full py-3 rounded-xl text-white font-semibold" style={{ backgroundColor: theme }}>
                  {saving ? "..." : "Create Exam & notify timetable"}
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Edit modal - with identical fields to create */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10">
              <h2 className="text-lg font-bold text-slate-900">Edit {editItem.type === "EXAM" ? "Exam" : "Test"}</h2>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">

            {editItem.type === "TEST" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Test Title <span className="text-rose-500">*</span></label>
                  <input
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${editTestErrors.name ? "border-rose-400 bg-rose-50/30" : ""}`}
                    placeholder="Title"
                    value={editTestForm.name || ""}
                    onChange={(e) => {
                      setEditTestForm({ ...editTestForm, name: e.target.value });
                      setEditTestErrors({ ...editTestErrors, name: "" });
                    }}
                  />
                  {editTestErrors.name && <p className="text-xs text-rose-500 mt-1">{editTestErrors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Class & Section <span className="text-rose-500">*</span></label>
                  <select
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${editTestErrors.className ? "border-rose-400 bg-rose-50/30" : ""}`}
                    value={`${editTestForm.className}||${editTestForm.section}`}
                    onChange={(e) => {
                      const [cn, sec] = e.target.value.split("||");
                      setEditTestForm({ ...editTestForm, className: cn, section: sec || "" });
                      setEditTestErrors({ ...editTestErrors, className: "" });
                    }}
                  >
                    {classOptions.map((c: any) => (
                      <option key={`${c.className}-${c.section}`} value={`${c.className}||${c.section || ""}`}>
                        {c.className}{c.section ? `-${c.section}` : ""}
                      </option>
                    ))}
                  </select>
                  {editTestErrors.className && <p className="text-xs text-rose-500 mt-1">{editTestErrors.className}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Subject <span className="text-rose-500">*</span></label>
                  <input
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${editTestErrors.subject ? "border-rose-400 bg-rose-50/30" : ""}`}
                    placeholder="Subject"
                    value={editTestForm.subject || ""}
                    onChange={(e) => {
                      setEditTestForm({ ...editTestForm, subject: e.target.value });
                      setEditTestErrors({ ...editTestErrors, subject: "" });
                    }}
                  />
                  {editTestErrors.subject && <p className="text-xs text-rose-500 mt-1">{editTestErrors.subject}</p>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Total Marks <span className="text-rose-500">*</span></label>
                    <input
                      type="number"
                      className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${editTestErrors.maxMarks ? "border-rose-400 bg-rose-50/30" : ""}`}
                      placeholder="Total marks"
                      value={editTestForm.maxMarks || ""}
                      onChange={(e) => {
                        const nextMax = e.target.value;
                        const numMax = Number(nextMax) || 0;
                        const autoPass = String(numMax === 100 ? 35 : Math.round(numMax * 0.35));
                        setEditTestForm({
                          ...editTestForm,
                          maxMarks: nextMax,
                          passMarks: editTestForm.passMarks ? editTestForm.passMarks : autoPass,
                        });
                        setEditTestErrors({ ...editTestErrors, maxMarks: "" });
                      }}
                    />
                    {editTestErrors.maxMarks && <p className="text-xs text-rose-500 mt-1">{editTestErrors.maxMarks}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Pass Grade Mark</label>
                    <input
                      type="number"
                      className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${editTestErrors.passMarks ? "border-rose-400 bg-rose-50/30" : ""}`}
                      placeholder="Pass marks (35)"
                      value={editTestForm.passMarks || ""}
                      onChange={(e) => {
                        setEditTestForm({ ...editTestForm, passMarks: e.target.value });
                        setEditTestErrors({ ...editTestErrors, passMarks: "" });
                      }}
                    />
                    {editTestErrors.passMarks && <p className="text-xs text-rose-500 mt-1">{editTestErrors.passMarks}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Date</label>
                    <input
                      type="date"
                      className="w-full mt-1 px-3 py-2.5 rounded-xl border text-sm"
                      value={editTestForm.date || ""}
                      onChange={(e) => setEditTestForm({ ...editTestForm, date: e.target.value })}
                    />
                  </div>
                </div>
                <button onClick={updateTest} disabled={updating} className="w-full mt-2 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: theme }}>
                  {updating ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating Test...</> : "Update Test"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Exam Title <span className="text-rose-500">*</span></label>
                  <input
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${editExamErrors.name ? "border-rose-400 bg-rose-50/30" : ""}`}
                    placeholder="Exam title e.g. Final Exam"
                    value={editExamForm.name || ""}
                    onChange={(e) => {
                      setEditExamForm({ ...editExamForm, name: e.target.value });
                      setEditExamErrors({ ...editExamErrors, name: "" });
                    }}
                  />
                  {editExamErrors.name && <p className="text-xs text-rose-500 mt-1">{editExamErrors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Class & Section <span className="text-rose-500">*</span></label>
                  <select
                    className={`w-full mt-1 px-3 py-2.5 rounded-xl border text-sm ${editExamErrors.className ? "border-rose-400 bg-rose-50/30" : ""}`}
                    value={`${editExamForm.className}||${editExamForm.section}`}
                    onChange={(e) => {
                      const [cn, sec] = e.target.value.split("||");
                      setEditExamForm({ ...editExamForm, className: cn, section: sec || "" });
                      setEditExamErrors({ ...editExamErrors, className: "" });
                    }}
                  >
                    {classTeacherOptions.map((c: any) => (
                      <option key={`${c.className}-${c.section}`} value={`${c.className}||${c.section || ""}`}>
                        {c.className}{c.section ? `-${c.section}` : ""}
                      </option>
                    ))}
                  </select>
                  {editExamErrors.className && <p className="text-xs text-rose-500 mt-1">{editExamErrors.className}</p>}
                </div>
                {editSubjects.map((s, i) => {
                  const splitSum = s.splits.reduce((a, x) => a + (Number(x.maxMarks) || 0), 0);
                  const total = Number(s.maxMarks) || 0;
                  const balance = Math.max(0, total - splitSum);
                  return (
                    <div key={i} className="border rounded-xl p-4 space-y-2 bg-slate-50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold">Subject {i + 1}</span>
                        {editSubjects.length > 1 && (
                          <button type="button" onClick={() => setEditSubjects(editSubjects.filter((_, j) => j !== i))} className="text-rose-500 text-xs font-medium">Remove</button>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700">Subject Name <span className="text-rose-500">*</span></label>
                        <input
                          className={`w-full mt-1 px-3 py-2 rounded-xl border bg-white text-sm ${editExamErrors[`subject_${i}`] ? "border-rose-400 bg-rose-50/30" : ""}`}
                          placeholder="Subject name"
                          value={s.subjectName}
                          onChange={(e) => {
                            const next = [...editSubjects];
                            next[i] = { ...s, subjectName: e.target.value };
                            setEditSubjects(next);
                            setEditExamErrors({ ...editExamErrors, [`subject_${i}`]: "" });
                          }}
                        />
                        {editExamErrors[`subject_${i}`] && <p className="text-xs text-rose-500 mt-1">{editExamErrors[`subject_${i}`]}</p>}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Date</label>
                          <input
                            type="date"
                            className="w-full mt-0.5 px-3 py-2 rounded-xl border bg-white text-sm"
                            value={s.date}
                            onChange={(e) => {
                              const next = [...editSubjects];
                              next[i] = { ...s, date: e.target.value };
                              setEditSubjects(next);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Total Marks <span className="text-rose-500">*</span></label>
                          <input
                            type="number"
                            className="w-full mt-0.5 px-3 py-2 rounded-xl border bg-white text-sm"
                            placeholder="Total marks"
                            value={s.maxMarks}
                            onChange={(e) => {
                              const next = [...editSubjects];
                              const nextMax = e.target.value;
                              const numMax = Number(nextMax) || 0;
                              const autoPass = String(numMax === 100 ? 35 : Math.round(numMax * 0.35));
                              next[i] = {
                                ...s,
                                maxMarks: nextMax,
                                passMarks: s.passMarks ? s.passMarks : autoPass,
                              };
                              setEditSubjects(next);
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600">Pass Mark</label>
                          <input
                            type="number"
                            className="w-full mt-0.5 px-3 py-2 rounded-xl border bg-white text-sm"
                            placeholder="Pass mark (35)"
                            value={s.passMarks}
                            onChange={(e) => {
                              const next = [...editSubjects];
                              next[i] = { ...s, passMarks: e.target.value };
                              setEditSubjects(next);
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">Split marks (sum ≤ total). Balance: {balance}</div>
                      {editExamErrors[`subject_split_${i}`] && <p className="text-xs text-rose-500 mt-1">{editExamErrors[`subject_split_${i}`]}</p>}
                      {s.splits.map((sp, j) => (
                        <div key={j} className="grid grid-cols-2 gap-2">
                          <input className="px-3 py-2 rounded-xl border bg-white text-sm" placeholder="Title e.g. Theory" value={sp.title} onChange={(e) => {
                            const next = [...editSubjects];
                            const splits = [...s.splits];
                            splits[j] = { ...sp, title: e.target.value };
                            next[i] = { ...s, splits };
                            setEditSubjects(next);
                          }} />
                          <input type="number" className="px-3 py-2 rounded-xl border bg-white text-sm" placeholder="Marks" value={sp.maxMarks} onChange={(e) => {
                            const next = [...editSubjects];
                            const splits = [...s.splits];
                            splits[j] = { ...sp, maxMarks: e.target.value };
                            next[i] = { ...s, splits };
                            setEditSubjects(next);
                          }} />
                        </div>
                      ))}
                      <button type="button" className="text-xs font-semibold text-indigo-600" onClick={() => {
                        const next = [...editSubjects];
                        next[i] = { ...s, splits: [...s.splits, { title: "", maxMarks: "" }] };
                        setEditSubjects(next);
                      }}>+ Add split</button>
                    </div>
                  );
                })}
                <button type="button" className="text-sm font-semibold text-indigo-600" onClick={() => setEditSubjects([...editSubjects, {
                  subjectName: "",
                  date: new Date().toISOString().slice(0, 10),
                  maxMarks: "100",
                  passMarks: "35",
                  splits: [{ title: "Theory", maxMarks: "70" }, { title: "Practical", maxMarks: "30" }],
                }])}>+ Add subject</button>
                <button onClick={updateExamAction} disabled={updating} className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: theme }}>
                  {updating ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating Exam...</> : "Update Exam & notify timetable"}
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Marks entry */}
      {marksMode && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Pinned Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10 backdrop-blur-xs">
              <div>
                <h2 className="font-bold text-lg text-slate-900">Marks · {marksMode.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Class: {marksMode.className}{marksMode.section ? `-${marksMode.section}` : ""} · {!isMarksModeCT ? `Entering marks for ${activeSub?.subjectName || "your subject"} (Subject Teacher)` : "Enter marks for subjects and click Save"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(marksMode)}
                  disabled={downloadingPdfId === marksMode.id}
                  className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-60"
                  title="Download Marksheet PDF"
                >
                  {downloadingPdfId === marksMode.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMarksMode(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
              {marksModeAllowedSubjects.length > 0 && (
                <div className="flex gap-2 flex-wrap pb-3 items-center border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500 mr-1">Subject:</span>
                  {marksModeAllowedSubjects.map((s: any) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSubjectId(s.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        activeKey === s.id
                          ? "text-white border-transparent shadow-sm"
                          : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                      }`}
                      style={activeKey === s.id ? { backgroundColor: theme } : undefined}
                    >
                      {s.subjectName} ({s.maxMarks} · Pass: {s.passMarks != null ? s.passMarks : Math.round((Number(s.maxMarks) || 100) * 0.35)})
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {classStudents(marksMode.className, marksMode.section).map((st) => (
                  <div
                    key={st.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition"
                  >
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <Avatar name={st.firstName} photoUrl={st.photoUrl} size={36} />
                      <div>
                        <div className="font-semibold text-sm text-slate-800">
                          {st.firstName} {st.lastName || ""}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          <span className="font-semibold text-slate-600 mr-1.5">Roll: {st.rollNumber || st.rollNo || "-"} ·</span>
                          {st.username || st.email || ""}
                        </div>
                      </div>
                    </div>

                    {activeSub?.splits?.length ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {activeSub.splits.map((sp: any) => (
                          <div key={sp.title} className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[80px]">
                              {sp.title} ({sp.maxMarks})
                            </span>
                            <input
                              type="number"
                              min="0"
                              max={sp.maxMarks}
                              className="w-20 px-2.5 py-1.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder={`${sp.maxMarks}`}
                              value={allSplitMarks[activeKey]?.[st.id]?.[sp.title] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                const spMax = Number(sp.maxMarks) || 0;
                                if (val !== "") {
                                  const num = Number(val);
                                  if (num > spMax) {
                                    toast.error(`${sp.title} mark cannot exceed ${spMax}`);
                                    return;
                                  }
                                  if (num < 0) return;
                                }
                                setAllSplitMarks((prev) => {
                                  const subObj = prev[activeKey] || {};
                                  const stObj = subObj[st.id] || {};
                                  return {
                                    ...prev,
                                    [activeKey]: {
                                      ...subObj,
                                      [st.id]: {
                                        ...stObj,
                                        [sp.title]: val,
                                      },
                                    },
                                  };
                                });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-medium">
                          Marks (Total {activeSub?.maxMarks || marksMode.maxMarks} · Pass {activeSub?.passMarks ?? marksMode.passMarks ?? Math.round((Number(activeSub?.maxMarks || marksMode.maxMarks) || 100) * 0.35)})
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={activeSub?.maxMarks || marksMode.maxMarks}
                          className="w-28 px-2.5 py-1.5 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={`0 - ${activeSub?.maxMarks || marksMode.maxMarks}`}
                          value={allMarks[activeKey]?.[st.id] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const maxAllowed = Number(activeSub?.maxMarks || marksMode.maxMarks) || 100;
                            if (val !== "") {
                              const num = Number(val);
                              if (num > maxAllowed) {
                                toast.error(`Marks cannot exceed ${maxAllowed}`);
                                return;
                              }
                              if (num < 0) return;
                            }
                            setAllMarks((prev) => {
                              const subObj = prev[activeKey] || {};
                              return {
                                ...prev,
                                [activeKey]: {
                                  ...subObj,
                                  [st.id]: val,
                                },
                              };
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={saveMarksNow}
                disabled={saving}
                className="w-full mt-4 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-60"
                style={{ backgroundColor: theme }}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving all subjects...
                  </>
                ) : (
                  "Save Marks"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Dialog */}
      {timetableExam && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span>Timetable · {toCap(timetableExam.name)}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Class: {timetableExam.className}{timetableExam.section ? `-${timetableExam.section}` : ""} · Official Exam Schedule
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadTimetableImg(timetableExam)}
                  disabled={exportingTimetableImg}
                  className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-60 cursor-pointer"
                  title="Download timetable as PNG Image"
                >
                  {exportingTimetableImg ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>Download Image</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadTimetablePdf(timetableExam)}
                  disabled={exportingTimetablePdf}
                  className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-60 cursor-pointer"
                  title="Download timetable as PDF"
                >
                  {exportingTimetablePdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTimetableExam(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable/Exportable Content */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0 bg-slate-50/50">
              <div
                id="web-timetable-modal-content"
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
              >
                {/* Header Banner */}
                <div
                  className="p-4 rounded-xl text-white flex flex-wrap items-center justify-between gap-4"
                  style={{ backgroundColor: theme }}
                >
                  <div>
                    <h3 className="font-black text-lg tracking-wide uppercase">
                      {user?.schoolName || "MySchool Platform"}
                    </h3>
                    <p className="text-xs opacity-90 font-medium">
                      Official Examination Schedule &amp; Timetable
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-lg">
                      Class {timetableExam.className}{timetableExam.section ? `-${timetableExam.section}` : ""}
                    </span>
                  </div>
                </div>

                {/* Exam Title & Details */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">Examination</span>
                    <div className="font-bold text-slate-900 text-sm">{toCap(timetableExam.name)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">Type</span>
                    <div className="font-bold text-slate-800">{timetableExam.type || "TEST"}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">Total Subjects</span>
                    <div className="font-bold text-slate-800">{timetableExam.subjects?.length || 1}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold uppercase text-[10px]">Total Marks</span>
                    <div className="font-bold text-slate-800">
                      {timetableExam.subjects?.length
                        ? timetableExam.subjects.reduce((a: number, s: any) => a + (Number(s.maxMarks) || 100), 0)
                        : Number(timetableExam.maxMarks) || 100}
                    </div>
                  </div>
                </div>

                {/* Timetable Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-xs text-left min-w-[650px]">
                    <thead className="bg-slate-800 text-white font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-3.5 py-3 w-10 text-center">#</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Day</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3 text-center">Total Marks</th>
                        <th className="px-4 py-3 text-center">Pass Mark</th>
                        <th className="px-4 py-3">Marks Breakdown / Splits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(timetableExam.type === "EXAM" && timetableExam.subjects?.length > 0
                        ? timetableExam.subjects
                        : [
                            {
                              id: "main",
                              subjectName: timetableExam.subject || timetableExam.name || "Subject",
                              date: timetableExam.date || timetableExam.dateFrom || new Date().toISOString().slice(0, 10),
                              maxMarks: Number(timetableExam.maxMarks) || 100,
                              passMarks: timetableExam.passMarks != null ? Number(timetableExam.passMarks) : Math.round((Number(timetableExam.maxMarks) || 100) * 0.35),
                              splits: [],
                            },
                          ]
                      ).map((s: any, idx: number) => {
                        const dateObj = s.date ? new Date(s.date) : null;
                        const dayName = dateObj && !isNaN(dateObj.getTime())
                          ? dateObj.toLocaleDateString("en-US", { weekday: "short" })
                          : "—";
                        const passM = s.passMarks != null ? s.passMarks : Math.round((Number(s.maxMarks) || 100) * 0.35);

                        return (
                          <tr key={s.id || idx} className="hover:bg-slate-50/70 transition">
                            <td className="px-3.5 py-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3 font-mono font-medium text-slate-800">
                              {formatDDMMYYYY(s.date)}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-600">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]">
                                {dayName}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900 text-sm">
                              {s.subjectName}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-center text-slate-800">
                              {s.maxMarks}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-center text-emerald-700">
                              {passM}
                            </td>
                            <td className="px-4 py-3">
                              {s.splits?.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {s.splits.map((sp: any, spIdx: number) => (
                                    <span
                                      key={spIdx}
                                      className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-800 font-medium"
                                    >
                                      {sp.title}: <strong className="text-indigo-900">{sp.maxMarks}</strong>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Standard</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Important Notes */}
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/70 text-[11px] text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <Clock className="w-3.5 h-3.5 text-amber-700" /> Instructions for Students:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 pl-1">
                    <li>Students must be seated in the examination hall 15 minutes before the exam commences.</li>
                    <li>Students must carry their ID card and required stationery items.</li>
                    <li>Electronic devices, smart watches, and unauthorized materials are strictly prohibited.</li>
                  </ul>
                </div>

                {/* Signatures */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 text-xs text-slate-500 font-medium">
                  <div>
                    <span>Class Teacher: ____________________</span>
                  </div>
                  <div className="text-right">
                    <span>Principal: ____________________</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleteExamItem}
        title="Delete Exam?"
        description={deleteExamItem ? `Are you sure you want to delete "${deleteExamItem.name}" (${deleteExamItem.className}-${deleteExamItem.section})? This will delete all entered marks.` : ""}
        loading={deletingExam}
        onClose={() => !deletingExam && setDeleteExamItem(null)}
        onConfirm={handleDeleteExamConfirm}
      />
    </div>
  );
}
