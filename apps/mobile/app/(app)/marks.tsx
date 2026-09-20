import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { captureRef } from "react-native-view-shot";
import { api, getApiBase, getApiBaseSync, resolveMediaUrlSync } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useBadges } from "@/hooks/useBadges";
import { useToast } from "@/hooks/useToast";
import { resolveChildren, ChildInfo } from "@/hooks/useChildren";
import { SafeAvatar } from "@/components/ChildAvatar";
import { Badge, Button, Empty, Input, Label, Loading } from "@/components/ui";
import { SearchBar, matchesSearch } from "@/components/SearchBar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Colors, spacing, radius } from "@/constants/theme";
import { str, formatPersonName, toTitleCase, formatDateDDMMYYYY, isSameClassAndSection } from "@/lib/format";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";

type MarkRow = {
  id?: string;
  examId?: string;
  examName?: string;
  examType?: string;
  subject?: string;
  subjectId?: string;
  marks?: number | string | null;
  maxMarks?: number | string;
  passMarks?: number | string;
  studentName?: string;
  photoUrl?: string;
  grade?: string;
  studentId?: string;
  className?: string;
  section?: string;
  rollNumber?: string;
  parentName?: string;
  teacherName?: string;
  splits?: Record<string, number>;
  subjects?: any[];
  rows?: any[];
  dateFrom?: string;
  dateTo?: string;
  examDate?: string;
  published?: boolean;
};

type ExamItem = {
  id: string;
  name: string;
  className?: string;
  section?: string;
  subject?: string;
  maxMarks?: number;
  passMarks?: number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: "TEST" | "EXAM";
  createdById?: string;
  subjects?: {
    id: string;
    subjectName: string;
    date: string;
    maxMarks: number;
    passMarks?: number;
    splits: { title: string; maxMarks: number }[];
  }[];
  published?: boolean;
};

type SplitForm = { title: string; maxMarks: string };
type SubForm = {
  id?: string;
  subjectName: string;
  date: string;
  maxMarks: string;
  passMarks: string;
  splits: SplitForm[];
};

function dedupeClasses(raw: any[]) {
  const seen = new Set<string>();
  const sorted = [...raw].sort(
    (a, b) => (a.role === "CLASS_TEACHER" ? 0 : 1) - (b.role === "CLASS_TEACHER" ? 0 : 1)
  );
  return sorted.filter((c) => {
    const k = `${c.className || c.name || ""}|${c.section || ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function getGradeInfo(score: number, max: number, pass: number) {
  if (score < pass) return { grade: "F", pass: false };
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 90) return { grade: "A+", pass: true };
  if (pct >= 80) return { grade: "A", pass: true };
  if (pct >= 70) return { grade: "B", pass: true };
  if (pct >= 60) return { grade: "C", pass: true };
  return { grade: "D", pass: true };
}

function parseDateToIso(strDate: string): string {
  if (!strDate) return new Date().toISOString().slice(0, 10);
  const trimmed = strDate.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("-");
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed;
}

function getTodayFormattedDDMMYYYY(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default function MarksScreen() {
  const { user, themeColor } = useAuth();
  const badges = useBadges();
  const badgesRef = useRef(badges);
  useEffect(() => {
    badgesRef.current = badges;
  }, [badges]);
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const toast = useToast();
  const color = themeColor || Colors.primary;
  const params = useLocalSearchParams<{ highlightId?: string; childId?: string }>();
  const [highlightId, setHighlightId] = useState<string | undefined>(
    params.highlightId ? String(params.highlightId) : undefined
  );

  const [list, setList] = useState<MarkRow[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const childrenRef = useRef<ChildInfo[]>([]);
  useEffect(() => {
    childrenRef.current = children;
  }, [children]);
  const [childIdx, setChildIdx] = useState(0);
  const childIdxRef = useRef(0);
  childIdxRef.current = childIdx;
  const handledInitialParamChildRef = useRef(false);
  const [apiBase, setApiBase] = useState(() => getApiBaseSync());
  const [classes, setClasses] = useState<any[]>([]);
  const classesRef = useRef<any[]>([]);
  useEffect(() => {
    classesRef.current = classes;
  }, [classes]);
  const [selectedClassTab, setSelectedClassTab] = useState<string>("ALL");
  const [isClassTeacher, setIsClassTeacher] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(handler);
  }, [q]);

  // Creation state
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"TEST" | "EXAM">("TEST");
  const [saving, setSaving] = useState(false);
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});
  const [examErrors, setExamErrors] = useState<Record<string, string>>({});

  const [testForm, setTestForm] = useState({
    name: "",
    className: "",
    section: "",
    subject: "",
    maxMarks: "100",
    passMarks: "35",
    date: getTodayFormattedDDMMYYYY(),
  });
  const [examForm, setExamForm] = useState({ name: "", className: "", section: "" });
  const [subjects, setSubjects] = useState<SubForm[]>([
    {
      subjectName: "",
      date: getTodayFormattedDDMMYYYY(),
      maxMarks: "100",
      passMarks: "35",
      splits: [
        { title: "Theory", maxMarks: "70" },
        { title: "Practical", maxMarks: "30" },
      ],
    },
  ]);

  // Edit state
  const [editItem, setEditItem] = useState<ExamItem | null>(null);
  const [editTestErrors, setEditTestErrors] = useState<Record<string, string>>({});
  const [editExamErrors, setEditExamErrors] = useState<Record<string, string>>({});
  const [editTestForm, setEditTestForm] = useState({
    name: "",
    className: "",
    section: "",
    subject: "",
    maxMarks: "100",
    passMarks: "35",
    date: getTodayFormattedDDMMYYYY(),
  });
  const [editExamForm, setEditExamForm] = useState({ name: "", className: "", section: "" });
  const [editSubjects, setEditSubjects] = useState<SubForm[]>([]);
  const [updating, setUpdating] = useState(false);

  // Exam card menu state
  const [examMenu, setExamMenu] = useState<ExamItem | null>(null);

  // Delete state
  const [confirmDelExam, setConfirmDelExam] = useState<ExamItem | null>(null);
  const [deletingExam, setDeletingExam] = useState(false);

  // Marks entry state - Store all marks for all subjects keyed by subKey
  const [marksOpen, setMarksOpen] = useState(false);
  const [marksLoading, setMarksLoading] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamItem | null>(null);
  const [activeSubjectId, setActiveSubjectId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [allMarks, setAllMarks] = useState<Record<string, Record<string, string>>>({});
  const [allSplitMarks, setAllSplitMarks] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  // Progress card state
  const [cardOpen, setCardOpen] = useState(false);
  const [cardGroup, setCardGroup] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [downloadingProgressPdf, setDownloadingProgressPdf] = useState(false);
  const [downloadingProgressImage, setDownloadingProgressImage] = useState(false);
  const [appModalToast, setAppModalToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const cardViewRef = useRef<View>(null);
  const printCardRef = useRef<View>(null);

  // Timetable state
  const [timetableExam, setTimetableExam] = useState<ExamItem | null>(null);
  const [downloadingTimetablePdf, setDownloadingTimetablePdf] = useState(false);
  const [downloadingTimetableImage, setDownloadingTimetableImage] = useState(false);
  const timetableRef = useRef<View>(null);

  const showAppToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    toast.show(msg, type);
    setAppModalToast({ msg, type });
    setTimeout(() => setAppModalToast(null), 3000);
  }, [toast]);

  const isTeacher = ["TEACHER", "ADMIN", "PRINCIPAL"].includes(user?.role || "");
  const isParent = user?.role === "PARENT";
  const isStudent = user?.role === "STUDENT";

  const isClassTeacherFor = useCallback(
    (className?: string, section?: string) => {
      if (!className) return false;
      if (
        user?.teacherType === "CLASS_TEACHER" &&
        user.className === className &&
        (!section || !user.section || user.section === section)
      ) {
        return true;
      }
      return classes.some(
        (c) =>
          c.className === className &&
          (!section || !c.section || c.section === section) &&
          c.role === "CLASS_TEACHER"
      );
    },
    [classes, user]
  );

  const getAssignedSubjectsFor = useCallback(
    (className?: string, section?: string): string[] => {
      if (!className) return [];
      const matching = classes.filter(
        (c) => c.className === className && (!section || !c.section || c.section === section)
      );
      const subs = matching.map((c) => c.subjectName || c.subject).filter(Boolean);
      const userSub = (user as any)?.subject;
      if (subs.length === 0 && userSub) subs.push(userSub);
      return Array.from(new Set(subs.map((s: string) => s.trim().toLowerCase())));
    },
    [classes, user]
  );

  const canManageExam = useCallback(
    (ex: ExamItem) => {
      if (user?.role === "ADMIN" || user?.role === "PRINCIPAL") return true;
      const isCreator = ex.createdById === user?.id;
      const isCT = isClassTeacherFor(ex.className, ex.section);
      return isCreator || isCT;
    },
    [isClassTeacherFor, user]
  );

  const buildStudentRows = useCallback((rawExams: ExamItem[], rawMarks: any[], studentInfo: any): MarkRow[] => {
    const studentName = `${studentInfo.firstName || ""} ${studentInfo.lastName || ""}`.trim() || "Student";
    const map = new Map<string, MarkRow>();

    for (const ex of rawExams) {
      if (ex.type === "EXAM" && !ex.published) continue;
      const examMarks = rawMarks.filter((m: any) => m.examId === ex.id);
      const subList = ex.subjects?.length ? ex.subjects : [];
      let rows: any[] = [];

      if (subList.length > 0) {
        rows = subList.map((s: any) => {
          const m = examMarks.find((mk: any) => mk.subjectId === s.id || mk.subject === s.subjectName);
          const maxM = Number(s.maxMarks) || 100;
          const passM = s.passMarks != null ? Number(s.passMarks) : Math.round(maxM * 0.35);
          return {
            id: m?.id || `${ex.id}-${s.id}`,
            examId: ex.id,
            subjectId: s.id,
            subject: s.subjectName,
            subjectName: s.subjectName,
            date: s.date || ex.date || ex.dateFrom,
            maxMarks: maxM,
            passMarks: passM,
            marks: m?.marks != null ? m.marks : null,
            splits: m?.splits || {},
          };
        });
      } else {
        const m = examMarks[0];
        const maxM = Number(ex.maxMarks) || 100;
        const passM = ex.passMarks != null ? Number(ex.passMarks) : Math.round(maxM * 0.35);
        rows = [
          {
            id: m?.id || ex.id,
            examId: ex.id,
            subjectId: "main",
            subject: ex.subject || ex.name || "Subject",
            subjectName: ex.subject || ex.name || "Subject",
            date: ex.date || ex.dateFrom,
            maxMarks: maxM,
            passMarks: passM,
            marks: m?.marks != null ? m.marks : null,
            splits: m?.splits || {},
          },
        ];
      }

      map.set(ex.id, {
        id: ex.id,
        examId: ex.id,
        examName: ex.name,
        examType: ex.type || "TEST",
        dateFrom: ex.dateFrom || ex.date,
        dateTo: ex.dateTo || ex.date,
        published: ex.published,
        studentName,
        studentId: studentInfo.id,
        photoUrl: studentInfo.photoUrl,
        className: studentInfo.className,
        section: studentInfo.section,
        rollNumber: studentInfo.rollNumber,
        parentName: studentInfo.parentName,
        teacherName: studentInfo.teacherName,
        subjects: ex.subjects || [],
        rows,
      });
    }

    for (const m of rawMarks) {
      if (!map.has(m.examId)) {
        const maxM = Number(m.maxMarks) || 100;
        const passM = m.passMarks != null ? Number(m.passMarks) : Math.round(maxM * 0.35);
        map.set(m.examId, {
          id: m.examId || m.id,
          examId: m.examId || m.id,
          examName: m.examName || m.name || "Examination",
          examType: m.examType || "TEST",
          dateFrom: m.dateFrom || m.examDate,
          dateTo: m.dateTo || m.examDate,
          published: m.published ?? true,
          studentName,
          studentId: studentInfo.id,
          photoUrl: studentInfo.photoUrl,
          className: studentInfo.className,
          section: studentInfo.section,
          rollNumber: studentInfo.rollNumber,
          parentName: studentInfo.parentName,
          teacherName: studentInfo.teacherName,
          subjects: m.subjects || [],
          rows: [
            {
              id: m.id || m.examId,
              examId: m.examId,
              subjectId: m.subjectId || "main",
              subject: m.subject || m.examName || "Subject",
              subjectName: m.subject || m.examName || "Subject",
              date: m.subjectDate || m.examDate || m.dateFrom,
              maxMarks: maxM,
              passMarks: passM,
              marks: m.marks != null ? m.marks : null,
              splits: m.splits || {},
            },
          ],
        });
      }
    }

    return Array.from(map.values());
  }, []);

  const load = useCallback(
    async (
      pageNum = 1,
      isAppend = false,
      targetChildIdx?: number,
      query = debouncedQ,
      classTab = selectedClassTab
    ) => {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        if (pageNum === 1) setLoading(true);
      }
      try {
        const currentUser = userRef.current;
        const currentIsStudent = currentUser?.role === "STUDENT";
        const currentIsParent = currentUser?.role === "PARENT";

        if (pageNum === 1) {
          try {
            const s = await api<any>("/api/school");
            setSchool(s.school || null);
          } catch {
            setSchool(null);
          }
        }

        if (currentIsStudent && currentUser) {
          let url = `/api/exams?studentId=${encodeURIComponent(currentUser.id)}&page=${pageNum}&limit=20`;
          if (query.trim()) url += `&q=${encodeURIComponent(query.trim())}`;
          const data = await api<any>(url);
          const rawMarks = data.marks || [];
          const rawExams: ExamItem[] = data.exams || [];
          const studentInfo = {
            id: currentUser.id,
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            photoUrl: currentUser.photoUrl,
            className: currentUser.className,
            section: currentUser.section,
            rollNumber: (currentUser as any)?.rollNumber || (currentUser as any)?.rollNo || undefined,
            parentName: (currentUser as any)?.parentName,
            teacherName: (currentUser as any)?.teacherName,
          };
          const newRows = buildStudentRows(rawExams, rawMarks, studentInfo);

          if (isAppend) {
            setExams((prev) => [...prev, ...rawExams.filter((e) => !prev.some((p) => p.id === e.id))]);
            setList((prev) => [...prev, ...newRows]);
          } else {
            setExams(rawExams);
            setList(newRows);
          }
          setHasMore(Boolean(data.hasMore));

          const seenIds: string[] = [];
          for (const m of rawMarks) {
            const mid = m.id || `${currentUser.id}-${m.examId || m.subject || ""}`;
            if (mid) seenIds.push(String(mid));
          }
          for (const ex of rawExams) {
            if (ex.id) seenIds.push(String(ex.id));
          }
          if (seenIds.length) {
            badgesRef.current?.markMarksSeen(seenIds);
          }
        } else if (currentIsParent) {
          let kids = childrenRef.current;
          if (kids.length === 0) {
            kids = await resolveChildren(currentUser);
            setChildren(kids);
          }
          let activeKidIdx = typeof targetChildIdx === "number" ? targetChildIdx : childIdxRef.current;
          if (!handledInitialParamChildRef.current && params.childId) {
            handledInitialParamChildRef.current = true;
            const idx = kids.findIndex((k) => k.id === String(params.childId));
            if (idx >= 0) {
              activeKidIdx = idx;
              setChildIdx(idx);
            }
          }
          if (activeKidIdx >= kids.length) activeKidIdx = 0;
          const kid = kids[activeKidIdx] || kids[0];
          if (kid) {
            let url = `/api/exams?studentId=${encodeURIComponent(kid.id)}&page=${pageNum}&limit=20`;
            if (query.trim()) url += `&q=${encodeURIComponent(query.trim())}`;
            const data = await api<any>(url);
            const rawMarks = data.marks || [];
            const rawExams: ExamItem[] = data.exams || [];
            const kidName = `${kid.firstName} ${kid.lastName || ""}`.trim();
            const parentName = kid.parentName || `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim();
            const studentInfo = {
              id: kid.id,
              firstName: kid.firstName,
              lastName: kid.lastName,
              photoUrl: kid.photoUrl,
              className: kid.className,
              section: kid.section,
              rollNumber: kid.rollNumber || kid.rollNo || undefined,
              parentName,
              teacherName: kid.teacherName,
            };
            const newRows = buildStudentRows(rawExams, rawMarks, studentInfo);

            if (isAppend) {
              setExams((prev) => [...prev, ...rawExams.filter((e) => !prev.some((p) => p.id === e.id))]);
              setList((prev) => [...prev, ...newRows]);
            } else {
              setExams(rawExams);
              setList(newRows);
            }
            setHasMore(Boolean(data.hasMore));

            const seenIds: string[] = [];
            for (const m of rawMarks) {
              const mid = m.id || `${kid.id}-${m.examId || m.subject || ""}`;
              if (mid) seenIds.push(String(mid));
            }
            for (const ex of rawExams) {
              if (ex.id) seenIds.push(String(ex.id));
            }
            if (seenIds.length) {
              badgesRef.current?.markMarksSeen(seenIds);
            }
          } else {
            setList([]);
            setHasMore(false);
          }
        } else {
          // Teacher / Admin
          let url = `/api/exams?page=${pageNum}&limit=20`;
          if (query.trim()) url += `&q=${encodeURIComponent(query.trim())}`;
          if (classTab !== "ALL") {
            const [cn, sec] = classTab.split("||");
            if (cn) url += `&className=${encodeURIComponent(cn)}`;
            if (sec) url += `&section=${encodeURIComponent(sec)}`;
          }
          const data = await api<any>(url);
          const examList: ExamItem[] = data.exams || [];
          const newRows: MarkRow[] = examList.map((ex) => ({
            id: ex.id,
            examId: ex.id,
            subject: ex.subject,
            examName: ex.name,
            examType: ex.type || "TEST",
            maxMarks: ex.maxMarks,
            passMarks: ex.passMarks,
            dateFrom: ex.dateFrom || ex.date,
            dateTo: ex.dateTo,
            published: ex.published,
            subjects: ex.subjects,
          }));

          if (isAppend) {
            setExams((prev) => [...prev, ...examList.filter((e) => !prev.some((p) => p.id === e.id))]);
            setList((prev) => [...prev, ...newRows]);
          } else {
            setExams(examList);
            setList(newRows);
          }
          setHasMore(Boolean(data.hasMore));

          if (pageNum === 1 && classesRef.current.length === 0) {
            try {
              const tc = await api<any>("/api/teacher-classes");
              const uniq = dedupeClasses(tc.classes || []);
              setClasses(uniq);
              setIsClassTeacher(uniq.some((c: any) => c.role === "CLASS_TEACHER"));
            } catch {
              setClasses([]);
            }
          }

          const seenIds: string[] = examList.map((e) => String(e.id)).filter(Boolean);
          if (seenIds.length) {
            badgesRef.current?.markMarksSeen(seenIds);
          }
        }
      } catch (err) {
        console.error("load marks error:", err);
        if (!isAppend) setList([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [params.childId, buildStudentRows]
  );

  useFocusEffect(
    useCallback(() => {
      setQ("");
      setSelectedClassTab("ALL");
      setPage(1);
      load(1, false, childIdxRef.current, "", "ALL");
      if (params.highlightId) {
        setHighlightId(String(params.highlightId));
        const t = setTimeout(() => setHighlightId(undefined), 4000);
        return () => clearTimeout(t);
      }
    }, [params.highlightId, load])
  );

  useEffect(() => {
    setPage(1);
    load(1, false, childIdx, debouncedQ, selectedClassTab);
  }, [debouncedQ, selectedClassTab, childIdx, load]);

  const filtered = useMemo(() => {
    return list.filter((r) => {
      const exam = exams.find((e) => e.id === r.examId || e.id === r.id);
      if (user?.role === "TEACHER") {
        if (!exam) return true;

        // Role & Class Mapping Filter (matching Web)
        const isCT = isClassTeacherFor(exam.className, exam.section);
        const isCreator = exam.createdById === user?.id;

        if (!isCT && !isCreator) {
          const assignedSubs = getAssignedSubjectsFor(exam.className, exam.section);
          if (assignedSubs.length === 0) return false;

          if (exam.type === "TEST" || !exam.subjects || exam.subjects.length === 0) {
            const testSub = (exam.subject || "").trim().toLowerCase();
            if (!assignedSubs.includes(testSub)) return false;
          } else {
            const hasMySub = (exam.subjects || []).some((s: any) =>
              assignedSubs.includes((s.subjectName || "").trim().toLowerCase())
            );
            if (!hasMySub) return false;
          }
        }
      }

      return true;
    });
  }, [list, user, exams, isClassTeacherFor, getAssignedSubjectsFor]);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    load(nextPage, true, childIdx, debouncedQ, selectedClassTab);
  };

  const openCreate = () => {
    const first = classes[0];
    setCreateMode(isClassTeacher ? "EXAM" : "TEST");
    const todayStr = getTodayFormattedDDMMYYYY();
    setTestErrors({});
    setExamErrors({});
    setTestForm({
      name: "",
      className: first?.className || "",
      section: first?.section || "",
      subject: "",
      maxMarks: "100",
      passMarks: "35",
      date: todayStr,
    });
    setExamForm({
      name: "",
      className: first?.className || "",
      section: first?.section || "",
    });
    setSubjects([
      {
        subjectName: "",
        date: todayStr,
        maxMarks: "100",
        passMarks: "35",
        splits: [
          { title: "Theory", maxMarks: "70" },
          { title: "Practical", maxMarks: "30" },
        ],
      },
    ]);
    setCreateOpen(true);
  };

  const saveTest = async () => {
    if (saving) return;
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
      const passM = testForm.passMarks ? Number(testForm.passMarks) : Math.round(maxM * 0.35);
      await api("/api/exams", {
        method: "POST",
        body: {
          type: "TEST",
          name: testForm.name.trim(),
          className: testForm.className,
          section: testForm.section || undefined,
          subject: testForm.subject.trim() || undefined,
          maxMarks: maxM,
          passMarks: passM,
          date: parseDateToIso(testForm.date),
        },
      });
      setCreateOpen(false);
      toast.success("Test created");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const saveExam = async () => {
    if (saving) return;
    const errs: Record<string, string> = {};
    if (!examForm.name.trim()) errs.name = "Exam title is required";
    if (!examForm.className.trim()) errs.className = "Class is required";
    if (!isClassTeacher && user?.role === "TEACHER") {
      toast.error("Only class teachers can create exams");
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
      await api("/api/exams", {
        method: "POST",
        body: {
          type: "EXAM",
          name: examForm.name.trim(),
          className: examForm.className,
          section: examForm.section || undefined,
          subjects: subjects.map((s) => {
            const maxM = Number(s.maxMarks) || 100;
            const passM = s.passMarks ? Number(s.passMarks) : Math.round(maxM * 0.35);
            return {
              subjectName: s.subjectName.trim(),
              date: parseDateToIso(s.date),
              maxMarks: maxM,
              passMarks: passM,
              splits: s.splits
                .filter((x) => x.title.trim())
                .map((x) => ({
                  title: x.title.trim(),
                  maxMarks: Number(x.maxMarks) || 0,
                })),
            };
          }),
        },
      });
      setCreateOpen(false);
      toast.success("Exam created");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (ex: ExamItem) => {
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
        className: ex.className || "",
        section: ex.section || "",
      });
      setEditSubjects(
        (ex.subjects || []).map((s: any) => ({
          id: s.id,
          subjectName: s.subjectName || "",
          date: formatDateDDMMYYYY(s.date || ex.date || new Date().toISOString().slice(0, 10)),
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
        className: ex.className || "",
        section: ex.section || "",
        subject: ex.subject || "",
        maxMarks: String(maxM),
        passMarks: String(ex.passMarks != null ? ex.passMarks : Math.round(maxM * 0.35)),
        date: formatDateDDMMYYYY(ex.date || new Date().toISOString().slice(0, 10)),
      });
    }
  };

  const updateTest = async () => {
    if (!editItem || updating) return;
    const errs: Record<string, string> = {};
    if (!editTestForm.name.trim()) errs.name = "Title is required";
    if (!editTestForm.className.trim()) errs.className = "Class is required";
    if (!editTestForm.subject.trim()) errs.subject = "Subject is required";
    if (!editTestForm.maxMarks.trim() || Number(editTestForm.maxMarks) <= 0) errs.maxMarks = "Enter valid total marks";
    if (editTestForm.passMarks.trim() && Number(editTestForm.passMarks) > (Number(editTestForm.maxMarks) || 100)) {
      errs.passMarks = "Pass marks cannot exceed total marks";
    }
    setEditTestErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setUpdating(true);
    try {
      const maxM = Number(editTestForm.maxMarks) || 100;
      const passM = editTestForm.passMarks ? Number(editTestForm.passMarks) : Math.round(maxM * 0.35);
      await api("/api/exams", {
        method: "PATCH",
        body: {
          id: editItem.id,
          ...editTestForm,
          date: parseDateToIso(editTestForm.date),
          type: "TEST",
          maxMarks: maxM,
          passMarks: passM,
        },
      });
      toast.success("Test updated successfully");
      setEditItem(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update test");
    } finally {
      setUpdating(false);
    }
  };

  const updateExamAction = async () => {
    if (!editItem || updating) return;
    const errs: Record<string, string> = {};
    if (!editExamForm.name.trim()) errs.name = "Exam title is required";
    if (!editExamForm.className.trim()) errs.className = "Class is required";
    editSubjects.forEach((s, idx) => {
      if (!s.subjectName.trim()) errs[`subject_${idx}`] = "Subject name is required";
      const total = Number(s.maxMarks) || 0;
      const splitSum = s.splits.reduce((a, x) => a + (Number(x.maxMarks) || 0), 0);
      if (splitSum > total) {
        errs[`subject_split_${idx}`] = "Splits exceed total marks";
      }
    });
    setEditExamErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setUpdating(true);
    try {
      await api("/api/exams", {
        method: "PATCH",
        body: {
          id: editItem.id,
          type: "EXAM",
          name: editExamForm.name.trim(),
          className: editExamForm.className,
          section: editExamForm.section || undefined,
          subjects: editSubjects.map((s) => {
            const maxM = Number(s.maxMarks) || 100;
            const passM = s.passMarks ? Number(s.passMarks) : Math.round(maxM * 0.35);
            return {
              id: s.id,
              subjectName: s.subjectName.trim(),
              date: parseDateToIso(s.date),
              maxMarks: maxM,
              passMarks: passM,
              splits: s.splits
                .filter((x) => x.title.trim())
                .map((x) => ({ title: x.title.trim(), maxMarks: Number(x.maxMarks) || 0 })),
            };
          }),
        },
      });
      toast.success("Exam updated successfully");
      setEditItem(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to update exam");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteExam = async () => {
    if (!confirmDelExam || deletingExam) return;
    setDeletingExam(true);
    try {
      await api(`/api/exams?id=${confirmDelExam.id}`, { method: "DELETE" });
      toast.success("Exam deleted");
      setConfirmDelExam(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete exam");
    } finally {
      setDeletingExam(false);
    }
  };

  const openMarks = async (exam: ExamItem) => {
    setSelectedExam(exam);
    setMarksOpen(true);
    setMarksLoading(true);

    const isCT = isClassTeacherFor(exam.className, exam.section);
    const isCreator = exam.createdById === user?.id;
    let availableSubjects = exam.subjects || [];
    if (user?.role === "TEACHER" && !isCT && !isCreator && (exam.subjects?.length || 0) > 0) {
      const assigned = getAssignedSubjectsFor(exam.className, exam.section);
      const filteredSubs = (exam.subjects || []).filter((s: any) =>
        assigned.includes((s.subjectName || "").trim().toLowerCase())
      );
      if (filteredSubs.length > 0) availableSubjects = filteredSubs;
    }

    const sid = availableSubjects[0]?.id || "main";
    setActiveSubjectId(sid);
    setStudents([]);
    setAllMarks({});
    setAllSplitMarks({});
    try {
      const [detail, usersRes] = await Promise.all([
        api<any>(`/api/exams?examId=${encodeURIComponent(exam.id)}`),
        api<any>("/api/users/list?role=STUDENT&limit=all"),
      ]);
      const allStudents = (usersRes.users || []).filter(
        (u: any) =>
          u.role === "STUDENT" &&
          u.isActive !== false &&
          isSameClassAndSection(u.className, u.section, exam.className, exam.section)
      );
      allStudents.sort((a: any, b: any) => {
        const rA = a.rollNumber ? parseInt(a.rollNumber) || 9999 : 9999;
        const rB = b.rollNumber ? parseInt(b.rollNumber) || 9999 : 9999;
        if (rA !== rB) return rA - rB;
        return (a.firstName || "").localeCompare(b.firstName || "");
      });
      setStudents(allStudents);

      const mObj: Record<string, Record<string, string>> = {};
      const smObj: Record<string, Record<string, Record<string, string>>> = {};

      for (const m of detail.marks || []) {
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
    } catch {
      setStudents([]);
    } finally {
      setMarksLoading(false);
    }
  };

  const switchSubject = (subjectId: string) => {
    setActiveSubjectId(subjectId);
  };

  const clampSplit = (subKey: string, studentId: string, title: string, value: string, max: number) => {
    let n = value.replace(/[^0-9.]/g, "");
    if (n === "") {
      setAllSplitMarks((prev) => ({
        ...prev,
        [subKey]: {
          ...(prev[subKey] || {}),
          [studentId]: {
            ...(prev[subKey]?.[studentId] || {}),
            [title]: "",
          },
        },
      }));
      return;
    }
    let num = Number(n);
    if (Number.isNaN(num)) num = 0;
    if (num > max) num = max;
    if (num < 0) num = 0;
    setAllSplitMarks((prev) => ({
      ...prev,
      [subKey]: {
        ...(prev[subKey] || {}),
        [studentId]: {
          ...(prev[subKey]?.[studentId] || {}),
          [title]: String(num),
        },
      },
    }));
  };

  const clampSimple = (subKey: string, studentId: string, value: string, max: number) => {
    let n = value.replace(/[^0-9.]/g, "");
    if (n === "") {
      setAllMarks((prev) => ({
        ...prev,
        [subKey]: {
          ...(prev[subKey] || {}),
          [studentId]: "",
        },
      }));
      return;
    }
    let num = Number(n);
    if (Number.isNaN(num)) num = 0;
    if (num > max) num = max;
    if (num < 0) num = 0;
    setAllMarks((prev) => ({
      ...prev,
      [subKey]: {
        ...(prev[subKey] || {}),
        [studentId]: String(num),
      },
    }));
  };

  const saveMarks = async () => {
    if (!selectedExam || saving) return;
    const records: any[] = [];
    const isExam = selectedExam.type === "EXAM";
    const examSubjects = isExam && allowedExamSubjects.length ? allowedExamSubjects : [];

    if (examSubjects.length > 0) {
      for (const sub of examSubjects) {
        const subKey = sub.id;
        const subMax = Number(sub.maxMarks) || 100;
        for (const st of students) {
          const stName = `${st.firstName} ${st.lastName || ""}`.trim();
          if (sub.splits?.length) {
            const splits = allSplitMarks[subKey]?.[st.id] || {};
            const hasAny = Object.values(splits).some((v) => v !== "" && v != null);
            if (!hasAny) continue;

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

            const total = Object.values(splits).reduce((a, v) => a + (Number(v) || 0), 0);
            if (total > subMax) {
              toast.error(`${stName} - ${sub.subjectName} total (${total}) cannot exceed total marks (${subMax})`);
              return;
            }

            records.push({
              studentId: st.id,
              subjectId: sub.id,
              splits: Object.fromEntries(
                Object.entries(splits).map(([k, v]) => [k, Number(v) || 0])
              ),
              marks: total,
              maxMarks: subMax,
            });
          } else {
            const val = allMarks[subKey]?.[st.id];
            if (val === undefined || val === "") continue;
            const num = Number(val) || 0;
            if (num > subMax) {
              toast.error(`${stName} - ${sub.subjectName} (${num}) cannot exceed total marks (${subMax})`);
              return;
            }
            if (num < 0) {
              toast.error(`${stName} - ${sub.subjectName} cannot be negative`);
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
      // Single subject test
      const subKey = "main";
      const testMax = Number(selectedExam.maxMarks) || 100;
      for (const st of students) {
        const val = allMarks[subKey]?.[st.id];
        if (val === undefined || val === "") continue;
        const num = Number(val) || 0;
        const stName = `${st.firstName} ${st.lastName || ""}`.trim();
        if (num > testMax) {
          toast.error(`${stName} (${num}) cannot exceed total marks (${testMax})`);
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
      await api("/api/exams", {
        method: "POST",
        body: { action: "marks", examId: selectedExam.id, records },
      });
      toast.success("All marks saved successfully");
      setMarksOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const publishExam = async (examId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await api("/api/exams", {
        method: "POST",
        body: { action: "publish", examId },
      });
      toast.success("Exam published");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async (ex: ExamItem) => {
    setDownloadingPdf(ex.id);
    try {
      const [detail, usersRes] = await Promise.all([
        api<any>(`/api/exams?examId=${encodeURIComponent(ex.id)}`),
        api<any>("/api/users/list?role=STUDENT&limit=all"),
      ]);
      const classStudents = (usersRes.users || []).filter(
        (u: any) =>
          u.role === "STUDENT" &&
          u.isActive !== false &&
          isSameClassAndSection(u.className, u.section, ex.className, ex.section)
      );
      classStudents.sort((a: any, b: any) => {
        const rA = a.rollNumber ? parseInt(a.rollNumber) || 9999 : 9999;
        const rB = b.rollNumber ? parseInt(b.rollNumber) || 9999 : 9999;
        if (rA !== rB) return rA - rB;
        return (a.firstName || "").localeCompare(b.firstName || "");
      });

      const isExam = ex.type === "EXAM";
      const subs = isExam && ex.subjects?.length ? ex.subjects : [
        {
          id: "main",
          subjectName: ex.subject || ex.name || "Subject",
          maxMarks: ex.maxMarks || 100,
          passMarks: ex.passMarks || 35,
        }
      ];

      const marksMap: Record<string, Record<string, any>> = {};
      for (const m of detail.marks || []) {
        const subKey = m.subjectId || "main";
        if (!marksMap[m.studentId]) marksMap[m.studentId] = {};
        marksMap[m.studentId][subKey] = m;
      }

      const schoolTitle = school?.name || (user as any)?.schoolName || "MySchool Platform";
      const schoolAddress = school?.location || school?.address || "";
      const schoolLogoUrl = resolveMediaUrlSync(school?.logoUrl || (user as any)?.schoolLogo, apiBase);
      const examTitle = ex.name || "Exam Marksheet";
      const className = `${ex.className || ""}${ex.section ? ` - Section ${ex.section}` : ""}`;
      const totalMaxAll = subs.reduce((sum: number, s: any) => sum + (Number(s.maxMarks) || 100), 0);
      const teacherName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

      const studentRowsHtml = classStudents.map((st: any, idx: number) => {
        let studentTotal = 0;
        let hasAnyMarks = false;
        let anyFail = false;

        const subjectCells = subs.map((sub: any) => {
          const subKey = sub.id || "main";
          const m = marksMap[st.id]?.[subKey];
          const maxM = Number(sub.maxMarks) || 100;
          const passM = sub.passMarks != null ? Number(sub.passMarks) : Math.round(maxM * 0.35);

          if (m && m.marks != null && m.marks !== "") {
            const markVal = Number(m.marks);
            studentTotal += markVal;
            hasAnyMarks = true;
            const isPass = markVal >= passM;
            if (!isPass) anyFail = true;
            return `<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px;">
              <span style="font-weight: 700; color: ${isPass ? '#1e293b' : '#dc2626'};">${markVal}</span>
              <span style="color: #64748b; font-size: 10px;">/${maxM}</span>
            </td>`;
          }
          return `<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">—</td>`;
        }).join("");

        const pct = totalMaxAll > 0 && hasAnyMarks ? Math.round((studentTotal / totalMaxAll) * 100) : 0;
        const overallStatus = !hasAnyMarks ? "—" : anyFail ? "FAIL" : "PASS";
        const statusColor = overallStatus === "PASS" ? "#16a34a" : overallStatus === "FAIL" ? "#dc2626" : "#64748b";

        const stPhoto = resolveMediaUrlSync(st.photoUrl, apiBase);
        return `<tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">${idx + 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #1e293b;">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${stPhoto ? `<img src="${stPhoto}" style="width: 26px; height: 26px; border-radius: 6px; object-fit: cover;" />` : `<div style="width: 26px; height: 26px; border-radius: 6px; background: #e2e8f0; color: #475569; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center;">${(st.firstName || 'S')[0]}</div>`}
              <div>
                <span>${toTitleCase(st.firstName)} ${toTitleCase(st.lastName || "")}</span>
                ${(st.rollNumber || st.rollNo) ? `<div style="font-size: 10px; color: #64748b; font-weight: normal;">Roll: ${st.rollNumber || st.rollNo}</div>` : ''}
              </div>
            </div>
          </td>
          ${subjectCells}
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; font-weight: 800; color: #1e293b;">
            ${hasAnyMarks ? `${studentTotal}/${totalMaxAll}` : "—"}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; font-weight: 700; color: #475569;">
            ${hasAnyMarks ? `${pct}%` : "—"}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px; font-weight: 800; color: ${statusColor};">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background-color: ${overallStatus === 'PASS' ? '#dcfce7' : overallStatus === 'FAIL' ? '#fee2e2' : '#f1f5f9'}; color: ${statusColor};">
              ${overallStatus}
            </span>
          </td>
        </tr>`;
      }).join("");

      const subjectHeaderCells = subs.map((sub: any) => `
        <th style="padding: 12px; background: #1e293b; color: #ffffff; font-size: 11px; font-weight: 700; text-align: center;">
          ${toTitleCase(sub.subjectName)}<br/><span style="font-weight: normal; color: #94a3b8; font-size: 9px;">(Max: ${sub.maxMarks || 100}, Pass: ${sub.passMarks || 35})</span>
        </th>
      `).join("");

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${examTitle} - Marksheet</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; }
    .card-wrap { border: 2px solid ${color}; border-radius: 16px; padding: 24px; background: #ffffff; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 20px; }
    .header-logo-title { display: flex; align-items: center; gap: 16px; }
    .logo-img { width: 56px; height: 56px; object-fit: contain; border-radius: 12px; }
    .logo-ph { width: 56px; height: 56px; border-radius: 12px; background: ${color}; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 20px; }
    .school-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .school-addr { font-size: 12px; color: #64748b; margin-top: 2px; }
    .report-badge { background: ${color}15; color: ${color}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }

    .meta-grid { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; font-size: 12px; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-lbl { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-val { font-size: 13px; font-weight: 800; color: #0f172a; }

    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-top: 8px; }
    .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="card-wrap">
    <div class="header">
      <div class="header-logo-title">
        ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" class="logo-img" />` : `<div class="logo-ph">MS</div>`}
        <div>
          <h1 class="school-name">${schoolTitle}</h1>
          ${schoolAddress ? `<div class="school-addr">${schoolAddress}</div>` : ''}
        </div>
      </div>
      <div class="report-badge">${toTitleCase(examTitle)} Marksheet</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-lbl">Class</span>
        <span class="meta-val">${className}</span>
      </div>
      <div class="meta-item">
        <span class="meta-lbl">Date</span>
        <span class="meta-val">${new Date().toLocaleDateString('en-GB')}</span>
      </div>
      ${teacherName ? `
      <div class="meta-item">
        <span class="meta-lbl">Teacher</span>
        <span class="meta-val">${teacherName}</span>
      </div>` : ''}
      <div class="meta-item">
        <span class="meta-lbl">Total Students</span>
        <span class="meta-val">${classStudents.length}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; width: 36px; text-align: center;">#</th>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; text-align: left;">Student Name</th>
          ${subjectHeaderCells}
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; text-align: center;">Total</th>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; text-align: center;">%</th>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; text-align: center;">Result</th>
        </tr>
      </thead>
      <tbody>
        ${studentRowsHtml}
      </tbody>
    </table>

    <div class="footer">
      Generated automatically by ${schoolTitle} Management System.
    </div>
  </div>
</body>
</html>`;

      const { uri: pdfTempUri } = await Print.printToFileAsync({ html });
      const filename = `marksheet_${ex.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
      const fileUri = `${dir}${filename}`;
      await FileSystem.copyAsync({ from: pdfTempUri, to: fileUri });

      if (Platform.OS === "android" && (FileSystem as any).StorageAccessFramework) {
        try {
          const permissions = await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64Data = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const createdUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              filename,
              "application/pdf"
            );
            await FileSystem.writeAsStringAsync(createdUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            showAppToast("Marksheet PDF saved successfully", "success");
            return;
          }
        } catch {
          /* fallback */
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: `${examTitle} Marksheet`,
          UTI: "com.adobe.pdf",
        });
      }
      showAppToast("Marksheet PDF ready", "success");
    } catch (err: any) {
      showAppToast(err?.message || "Failed to download PDF", "error");
    } finally {
      setDownloadingPdf(null);
    }
  };

  const handleDownloadTimetablePDF = async (ex: ExamItem) => {
    setDownloadingTimetablePdf(true);
    try {
      const schoolTitle = school?.name || (user as any)?.schoolName || "MySchool Platform";
      const schoolAddress = school?.location || school?.address || "";
      const schoolLogoUrl = resolveMediaUrlSync(school?.logoUrl || (user as any)?.schoolLogo, apiBase);
      const examTitle = toTitleCase(ex.name || "Exam Timetable");
      const className = `Class ${ex.className || ""}${ex.section ? ` - ${ex.section}` : ""}`;
      const isExam = ex.type === "EXAM";
      const subs = isExam && ex.subjects?.length ? ex.subjects : [
        {
          id: "main",
          subjectName: ex.subject || ex.name || "Subject",
          date: ex.date || ex.dateFrom || new Date().toISOString().slice(0, 10),
          maxMarks: ex.maxMarks || 100,
          passMarks: ex.passMarks != null ? ex.passMarks : Math.round(Number(ex.maxMarks || 100) * 0.35),
          splits: [],
        },
      ];

      const rowsHtml = subs.map((s: any, idx: number) => {
        const dateObj = s.date ? new Date(s.date) : null;
        const dayName = dateObj && !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString("en-US", { weekday: "short" })
          : "—";
        const maxM = Number(s.maxMarks) || 100;
        const passM = s.passMarks != null ? Number(s.passMarks) : Math.round(maxM * 0.35);
        const splitsText = s.splits?.length
          ? s.splits.map((sp: any) => `${sp.title}: ${sp.maxMarks}`).join(" · ")
          : "Standard";

        return `<tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">${idx + 1}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-family: monospace; font-weight: 600; color: #1e293b;">${formatDateDDMMYYYY(s.date)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #475569;">${dayName}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #0f172a;">${toTitleCase(s.subjectName)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; font-weight: 700; color: #0f172a;">${maxM}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; font-weight: 700; color: #16a34a;">${passM}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">${splitsText}</td>
        </tr>`;
      }).join("");

      const totalMarksSum = subs.reduce((a: number, s: any) => a + (Number(s.maxMarks) || 100), 0);

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${examTitle} - Timetable</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; background: #fff; }
    .card-wrap { border: 2px solid ${color}; border-radius: 16px; padding: 24px; background: #ffffff; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 20px; }
    .header-left { display: flex; align-items: center; gap: 14px; }
    .logo-img { width: 52px; height: 52px; object-fit: contain; border-radius: 12px; }
    .logo-ph { width: 52px; height: 52px; border-radius: 12px; background: ${color}; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 20px; }
    .school-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
    .school-addr { font-size: 12px; color: #64748b; margin-top: 2px; }
    .badge { background: ${color}15; color: ${color}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-grid { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; font-size: 12px; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-lbl { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .meta-val { font-size: 13px; font-weight: 800; color: #0f172a; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-top: 8px; }
    .notes { margin-top: 20px; padding: 14px 18px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; font-size: 11px; color: #78350f; }
    .signatures { display: flex; justify-content: space-between; margin-top: 32px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
    .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card-wrap">
    <div class="header">
      <div class="header-left">
        ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" class="logo-img" />` : `<div class="logo-ph">MS</div>`}
        <div>
          <h1 class="school-name">${schoolTitle}</h1>
          ${schoolAddress ? `<div class="school-addr">${schoolAddress}</div>` : ''}
        </div>
      </div>
      <div class="badge">Official Timetable</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-lbl">Examination</span>
        <span class="meta-val">${examTitle}</span>
      </div>
      <div class="meta-item">
        <span class="meta-lbl">Class & Section</span>
        <span class="meta-val">${className}</span>
      </div>
      <div class="meta-item">
        <span class="meta-lbl">Total Subjects</span>
        <span class="meta-val">${subs.length}</span>
      </div>
      <div class="meta-item">
        <span class="meta-lbl">Total Marks</span>
        <span class="meta-val">${totalMarksSum}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; width: 36px; text-align: center;">#</th>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; text-align: left;">Date</th>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; text-align: left;">Day</th>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; text-align: left;">Subject</th>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; text-align: center;">Total Marks</th>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; text-align: center;">Pass Mark</th>
          <th style="padding: 12px; background: #1e293b; color: #fff; font-size: 11px; text-align: left;">Splits</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="notes">
      <strong>Important Guidelines for Students:</strong><br/>
      1. Be seated in the exam room at least 15 minutes before exam start time.<br/>
      2. Carry your student ID card and necessary stationery items.<br/>
      3. Mobile phones, smart devices, and unauthorized notes are strictly prohibited.
    </div>

    <div class="signatures">
      <div>Class Teacher Signature: _______________________</div>
      <div>Principal Signature: _______________________</div>
    </div>

    <div class="footer">
      Generated automatically by ${schoolTitle} Platform.
    </div>
  </div>
</body>
</html>`;

      const { uri: pdfTempUri } = await Print.printToFileAsync({ html });
      const filename = `timetable_${ex.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
      const fileUri = `${dir}${filename}`;
      await FileSystem.copyAsync({ from: pdfTempUri, to: fileUri });

      if (Platform.OS === "android" && (FileSystem as any).StorageAccessFramework) {
        try {
          const permissions = await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64Data = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const createdUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              filename,
              "application/pdf"
            );
            await FileSystem.writeAsStringAsync(createdUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            showAppToast("Exam timetable PDF saved successfully", "success");
            return;
          }
        } catch {
          /* fallback */
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: `${examTitle} Timetable`,
          UTI: "com.adobe.pdf",
        });
      }
      showAppToast("Exam timetable PDF ready", "success");
    } catch (err: any) {
      showAppToast(err?.message || "Failed to download timetable PDF", "error");
    } finally {
      setDownloadingTimetablePdf(false);
    }
  };

  const handleDownloadTimetableImage = async (ex: ExamItem) => {
    if (!timetableRef.current) {
      showAppToast("Timetable preview not ready", "error");
      return;
    }
    setDownloadingTimetableImage(true);
    try {
      const pngUri = await captureRef(timetableRef, {
        format: "png",
        quality: 1.0,
      });

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        try {
          await MediaLibrary.saveToLibraryAsync(pngUri);
          showAppToast("Timetable image saved to gallery", "success");
          return;
        } catch {
          /* fallback */
        }
      }

      if (Platform.OS === "android" && (FileSystem as any).StorageAccessFramework) {
        try {
          const permissions = await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64Data = await FileSystem.readAsStringAsync(pngUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const createdUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              `timetable_${ex.name.replace(/\s+/g, '_')}_${Date.now()}.png`,
              "image/png"
            );
            await FileSystem.writeAsStringAsync(createdUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            showAppToast("Timetable image saved successfully", "success");
            return;
          }
        } catch {
          /* fallback */
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pngUri, {
          mimeType: "image/png",
          dialogTitle: `${ex.name} Timetable`,
          UTI: "public.png",
        });
      }
      showAppToast("Timetable image ready", "success");
    } catch (err: any) {
      showAppToast(err?.message || "Failed to download timetable image", "error");
    } finally {
      setDownloadingTimetableImage(false);
    }
  };

  const generateProgressCardHtml = (group: any) => {
    const schoolTitle = school?.name || (user as any)?.schoolName || "MySchool Platform";
    const schoolAddress = school?.location || school?.address || "";
    const schoolLogoUrl = resolveMediaUrlSync(school?.logoUrl || (user as any)?.schoolLogo, apiBase);
    const studentName = toTitleCase(group.studentName || "Student");
    const className = `Class ${group.className || "—"}${group.section ? ` - ${group.section}` : ""}`;
    const examName = toTitleCase(group.examName || "Examination");
    const dateRange = group.dateFrom
      ? `${formatDateDDMMYYYY(group.dateFrom)}${group.dateTo && group.dateTo !== group.dateFrom ? ` → ${formatDateDDMMYYYY(group.dateTo)}` : ""}`
      : "";
    const rollNo = group.rollNumber || group.rollNo || "";
    const parentName = group.parentName || "";
    const teacherName = group.teacherName || "";
    const photoUrl = resolveMediaUrlSync(group.photoUrl, apiBase);

    const cols: string[] = [];
    for (const r of group.rows || []) {
      if (r.splits) {
        for (const k of Object.keys(r.splits)) {
          if (!cols.includes(k)) cols.push(k);
        }
      }
    }

    let totalEarned = 0;
    let totalMax = 0;
    let anyFail = false;
    let passedSubjectsCount = 0;
    let hasAnyMarks = false;

    const rowsHtml = (group.rows || []).map((r: any, i: number) => {
      const subName = toTitleCase(r.subject || r.subjectName || group.examName || "Subject");
      const rowDate = r.date || r.subjectDate || group.dateFrom || "";
      const maxM = Number(r.maxMarks) || 100;
      const passM = r.passMarks != null ? Number(r.passMarks) : Math.round(maxM * 0.35);
      const earned = r.marks != null && r.marks !== "" ? Number(r.marks) : null;
      
      if (earned != null) {
        hasAnyMarks = true;
        totalEarned += earned;
        totalMax += maxM;
        if (earned >= passM) {
          passedSubjectsCount++;
        } else {
          anyFail = true;
        }
      } else {
        totalMax += maxM;
        anyFail = true;
      }

      const isPass = earned != null ? earned >= passM : false;

      const splitTds = cols.map((c) => `
        <td style="padding: 10px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #475569;">
          ${r.splits?.[c] ?? "—"}
        </td>
      `).join("");

      return `
        <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; font-family: monospace; color: #64748b; white-space: nowrap;">
            ${rowDate ? formatDateDDMMYYYY(rowDate) : "—"}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #0f172a;">
            ${subName}
          </td>
          ${splitTds}
          <td style="padding: 10px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">${maxM}</td>
          <td style="padding: 10px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">${passM}</td>
          <td style="padding: 10px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 13px; font-weight: 800; color: #0f172a;">${earned != null ? earned : "—"}</td>
          <td style="padding: 10px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 12px; font-weight: 800; color: ${isPass ? '#16a34a' : '#dc2626'};">
            ${earned != null ? (isPass ? 'Pass' : 'Fail') : '<span style="color: #94a3b8; font-size: 11px; font-weight: normal;">Pending</span>'}
          </td>
        </tr>
      `;
    }).join("");

    const pct = hasAnyMarks && totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
    const overallGrade = hasAnyMarks && totalMax > 0 ? getGradeInfo(totalEarned, totalMax, Math.round(totalMax * 0.35)) : null;
    const isOverallPass = hasAnyMarks && !anyFail && totalEarned >= totalMax * 0.35;
    const totalSubs = (group.rows || []).length;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Progress Report - ${studentName}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      color: #0f172a;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .card-wrap {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 28px;
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 20px;
      gap: 16px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-img {
      width: 54px;
      height: 54px;
      object-fit: contain;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 2px;
      background: #fff;
    }
    .logo-ph {
      width: 54px;
      height: 54px;
      border-radius: 12px;
      background: ${color};
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: 800;
      font-size: 20px;
    }
    .school-name {
      font-size: 19px;
      font-weight: 900;
      color: #0f172a;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: -0.3px;
    }
    .school-addr {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 500;
    }
    .school-subtag {
      font-size: 11px;
      font-weight: 700;
      color: ${color};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 3px;
    }
    .date-badge {
      background: #f1f5f9;
      color: #334155;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
      white-space: nowrap;
    }
    
    .student-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .student-avatar {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      object-fit: cover;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .student-avatar-ph {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      background: ${color};
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .student-info {
      flex: 1;
    }
    .student-name {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .student-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 16px;
      margin-top: 6px;
      font-size: 12px;
      color: #475569;
    }
    .exam-badge-wrap {
      text-align: right;
      border-left: 1px solid #cbd5e1;
      padding-left: 16px;
    }
    .exam-lbl {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .exam-val {
      font-size: 14px;
      font-weight: 800;
      color: ${color};
      margin-top: 2px;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 10px;
      text-align: center;
    }
    .kpi-lbl {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-val {
      font-size: 16px;
      font-weight: 900;
      margin-top: 3px;
    }
    .kpi-sub {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 2px;
    }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 20px;
    }
    th {
      background: #1e293b;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      color: #334155;
    }
    tfoot td {
      background: #f1f5f9;
      font-weight: 800;
      color: #0f172a;
      border-top: 1.5px solid #cbd5e1;
      border-bottom: none;
    }

    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    .sig-line {
      border-top: 1.5px dashed #cbd5e1;
      padding-top: 6px;
    }
    .sig-title {
      font-size: 11px;
      font-weight: 800;
      color: #1e293b;
    }
    .sig-name {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 2px;
    }

    .footer-note {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card-wrap">
    <div class="header">
      <div class="header-left">
        ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" class="logo-img" />` : `<div class="logo-ph">${(schoolTitle || "MS").slice(0, 2).toUpperCase()}</div>`}
        <div>
          <h1 class="school-name">${schoolTitle}</h1>
          ${schoolAddress ? `<div class="school-addr">${schoolAddress}</div>` : ''}
          <div class="school-subtag">Official Student Progress Card</div>
        </div>
      </div>
      ${dateRange ? `<div class="date-badge">${dateRange}</div>` : ''}
    </div>

    <div class="student-banner">
      ${photoUrl ? `<img src="${photoUrl}" class="student-avatar" />` : `<div class="student-avatar-ph">${(studentName || "S").slice(0, 1).toUpperCase()}</div>`}
      <div class="student-info">
        <h2 class="student-name">${studentName}</h2>
        <div class="student-grid">
          <div>Class: <strong>${className}</strong></div>
          ${rollNo ? `<div>Roll No: <strong>${rollNo}</strong></div>` : ''}
          ${parentName ? `<div>Parent: <strong>${parentName}</strong></div>` : ''}
          ${teacherName ? `<div>Teacher: <strong>${teacherName}</strong></div>` : ''}
        </div>
      </div>
      <div class="exam-badge-wrap">
        <div class="exam-lbl">Examination</div>
        <div class="exam-val">${examName}</div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-lbl">Total Score</div>
        <div class="kpi-val" style="color: #0f172a;">${hasAnyMarks ? `${totalEarned} / ${totalMax}` : '—'}</div>
        <div class="kpi-sub">Max Marks: ${totalMax}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Percentage</div>
        <div class="kpi-val" style="color: ${color};">${hasAnyMarks ? `${pct.toFixed(1)}%` : '—'}</div>
        <div class="kpi-sub">Aggregate</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Grade</div>
        <div class="kpi-val" style="color: #7c3aed;">${hasAnyMarks && overallGrade ? overallGrade.grade : "—"}</div>
        <div class="kpi-sub">Evaluation</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-lbl">Overall Result</div>
        <div class="kpi-val" style="color: ${hasAnyMarks ? (isOverallPass ? '#16a34a' : '#dc2626') : '#94a3b8'}; font-size: ${hasAnyMarks ? '18px' : '14px'};">${hasAnyMarks ? (isOverallPass ? 'PASSED' : 'FAIL') : 'Pending'}</div>
        <div class="kpi-sub">${hasAnyMarks ? `${passedSubjectsCount}/${totalSubs} Passed` : `0/${totalSubs} Evaluated`}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 100px;">Date</th>
          <th>Subject</th>
          ${cols.map(c => `<th style="text-align: center;">${c}</th>`).join('')}
          <th style="text-align: center; width: 60px;">Max</th>
          <th style="text-align: center; width: 60px;">Pass</th>
          <th style="text-align: center; width: 70px;">Obtained</th>
          <th style="text-align: center; width: 75px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 10px 12px;">Total Assessment</td>
          ${cols.map(() => `<td style="text-align: center; color: #94a3b8;">—</td>`).join('')}
          <td style="text-align: center; font-family: monospace;">${totalMax}</td>
          <td style="text-align: center; color: #94a3b8;">—</td>
          <td style="text-align: center; font-family: monospace; color: ${color}; font-size: 14px;">${hasAnyMarks ? totalEarned : '—'}</td>
          <td style="text-align: center; color: ${color};">${hasAnyMarks ? `${pct.toFixed(1)}%` : '—'}</td>
        </tr>
      </tfoot>
    </table>

    <div class="signatures">
      <div>
        <div class="sig-line"></div>
        <div class="sig-title">Class Teacher</div>
        <div class="sig-name">${teacherName || "Authorized Signature"}</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-title">Principal / Head</div>
        <div class="sig-name">Signature &amp; Verification</div>
      </div>
      <div>
        <div class="sig-line"></div>
        <div class="sig-title">Date &amp; Stamp</div>
        <div class="sig-name">${new Date().toLocaleDateString("en-GB")}</div>
      </div>
    </div>

    <div class="footer-note">
      This is an official computer-generated progress report issued by ${schoolTitle}.
    </div>
  </div>
</body>
</html>`;
  };

  const handleDownloadProgressPDF = async () => {
    if (!cardGroup) return;
    setDownloadingProgressPdf(true);
    try {
      const studentName = toTitleCase(cardGroup.studentName || "Student");
      const html = generateProgressCardHtml(cardGroup);

      const { uri: pdfTempUri } = await Print.printToFileAsync({ html });
      const filename = `progress_card_${studentName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
      const fileUri = `${dir}${filename}`;
      await FileSystem.copyAsync({ from: pdfTempUri, to: fileUri });

      if (Platform.OS === "android" && (FileSystem as any).StorageAccessFramework) {
        try {
          const permissions = await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64Data = await FileSystem.readAsStringAsync(fileUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const createdUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              filename,
              "application/pdf"
            );
            await FileSystem.writeAsStringAsync(createdUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            showAppToast("Progress Report PDF saved successfully", "success");
            return;
          }
        } catch {
          /* fallback */
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/pdf",
          dialogTitle: `Progress Card - ${studentName}`,
          UTI: "com.adobe.pdf",
        });
      }
      showAppToast("Progress Report PDF ready", "success");
    } catch (err: any) {
      showAppToast(err?.message || "Failed to download progress report", "error");
    } finally {
      setDownloadingProgressPdf(false);
    }
  };

  const handleDownloadProgressImage = async () => {
    if (!cardGroup) return;
    setDownloadingProgressImage(true);
    try {
      const studentName = toTitleCase(cardGroup.studentName || "Student");

      // Web handling
      if (Platform.OS === "web") {
        try {
          const html = generateProgressCardHtml(cardGroup);
          const { uri: tempUri } = await Print.printToFileAsync({ html });
          const filename = `progress_card_${studentName.replace(/\s+/g, '_')}_${Date.now()}.png`;
          const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
          const fileUri = `${dir}${filename}`;
          await FileSystem.copyAsync({ from: tempUri, to: fileUri });

          if (typeof window !== "undefined") {
            const a = document.createElement("a");
            a.href = fileUri;
            a.download = `Progress_Card_${studentName.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
          }
          showAppToast("Progress card image downloaded successfully", "success");
          return;
        } catch (webErr: any) {
          console.log("Web image download error:", webErr);
        }
      }

      // Native view snapshot to generate real PNG bitmap matching PDF layout
      let pngUri = "";
      const targetRef = printCardRef.current ? printCardRef : cardViewRef;
      if (targetRef.current) {
        try {
          pngUri = await captureRef(targetRef, {
            format: "png",
            quality: 1.0,
            result: "tmpfile",
          });
        } catch (captureErr) {
          console.log("Print card capture fallback:", captureErr);
          if (cardViewRef.current) {
            pngUri = await captureRef(cardViewRef, {
              format: "png",
              quality: 1.0,
              result: "tmpfile",
            });
          }
        }
      }

      if (!pngUri) {
        // Fallback to HTML print if view ref wasn't ready
        const html = generateProgressCardHtml(cardGroup);
        const { uri: tempUri } = await Print.printToFileAsync({ html });
        pngUri = tempUri;
      }

      // Try saving directly to device Photo Gallery via MediaLibrary
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync(true);
        if (status === "granted") {
          await MediaLibrary.saveToLibraryAsync(pngUri);
          showAppToast("Progress card image saved to gallery!", "success");
          return;
        }
      } catch (mediaErr) {
        console.log("MediaLibrary save fallback:", mediaErr);
      }

      // Android Storage Access Framework fallback to save directly to Pictures/Downloads
      if (Platform.OS === "android" && (FileSystem as any).StorageAccessFramework) {
        try {
          const permissions = await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64Data = await FileSystem.readAsStringAsync(pngUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const createdUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
              permissions.directoryUri,
              `progress_card_${studentName.replace(/\s+/g, '_')}_${Date.now()}.png`,
              "image/png"
            );
            await FileSystem.writeAsStringAsync(createdUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            showAppToast("Progress card image saved to device successfully", "success");
            return;
          }
        } catch {
          /* fallback */
        }
      }

      // If gallery permission is not granted, share the real PNG
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pngUri, {
          mimeType: "image/png",
          dialogTitle: `Progress Card Image - ${studentName}`,
          UTI: "public.png",
        });
      }
      showAppToast("Progress card image ready", "success");
    } catch (err: any) {
      showAppToast(err?.message || "Failed to download progress card image", "error");
    } finally {
      setDownloadingProgressImage(false);
    }
  };

  const openProgressCard = (item: MarkRow) => {
    const examId = item.examId || item.id;
    const matchingExam = exams.find((e) => e.id === examId);

    const currentChild: any = isParent ? (children[childIdx] || children[0]) : null;
    const studentName =
      item.studentName ||
      (isStudent
        ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
        : currentChild
        ? `${currentChild.firstName} ${currentChild.lastName || ""}`.trim()
        : "Student");
    const photoUrl = item.photoUrl || (isStudent ? user?.photoUrl : currentChild?.photoUrl);
    const className = item.className || (isStudent ? user?.className : currentChild?.className);
    const section = item.section || (isStudent ? user?.section : currentChild?.section);
    const rollNumber =
      item.rollNumber ||
      (isStudent ? ((user as any)?.rollNumber || (user as any)?.rollNo) : (currentChild?.rollNumber || (currentChild as any)?.rollNo));
    const parentName =
      item.parentName ||
      (isStudent ? (user as any)?.parentName : (currentChild?.parentName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim()));
    const teacherName =
      item.teacherName || ((user as any)?.teacherName || currentChild?.teacherName);

    let orderedRows: any[] = [];
    if (item.rows && item.rows.length > 0) {
      orderedRows = item.rows.map((r: any) => {
        const maxM = Number(r.maxMarks) || 100;
        const passM = r.passMarks != null ? Number(r.passMarks) : Math.round(maxM * 0.35);
        return {
          id: r.id || `${examId}-${r.subjectId || r.subject}`,
          subjectId: r.subjectId,
          subject: r.subject || r.subjectName || "Subject",
          subjectName: r.subjectName || r.subject || "Subject",
          date: r.date || item.dateFrom || item.examDate,
          maxMarks: maxM,
          passMarks: passM,
          marks: r.marks != null && r.marks !== "" ? r.marks : null,
          splits: r.splits || {},
        };
      });
    } else if (matchingExam?.subjects && matchingExam.subjects.length > 0) {
      orderedRows = matchingExam.subjects.map((sub: any) => {
        return {
          id: sub.id,
          subjectId: sub.id,
          subject: sub.subjectName,
          subjectName: sub.subjectName,
          date: sub.date || matchingExam.date,
          maxMarks: Number(sub.maxMarks) || 100,
          passMarks: sub.passMarks != null ? Number(sub.passMarks) : Math.round(Number(sub.maxMarks || 100) * 0.35),
          marks: null,
          splits: {},
        };
      });
    } else {
      orderedRows = [
        {
          id: item.id || examId,
          subject: item.subject || matchingExam?.subject || item.examName || "Subject",
          subjectName: item.subject || matchingExam?.subject || item.examName || "Subject",
          date: item.dateFrom || item.examDate || matchingExam?.date,
          maxMarks: Number(item.maxMarks || matchingExam?.maxMarks || 100),
          passMarks: item.passMarks != null ? Number(item.passMarks) : Math.round(Number(item.maxMarks || 100) * 0.35),
          marks: item.marks != null && item.marks !== "" ? item.marks : null,
          splits: item.splits || {},
        },
      ];
    }

    setCardGroup({
      examId,
      examName: item.examName || matchingExam?.name,
      examType: item.examType || matchingExam?.type,
      dateFrom: item.dateFrom || item.examDate || matchingExam?.dateFrom || matchingExam?.date,
      dateTo: item.dateTo || matchingExam?.dateTo,
      studentName,
      photoUrl,
      className,
      section,
      rollNumber,
      parentName,
      teacherName,
      rows: orderedRows,
      subjects: matchingExam?.subjects || item.subjects || [],
    });
    setCardOpen(true);
  };

  const isSelectedExamCT = selectedExam ? isClassTeacherFor(selectedExam.className, selectedExam.section) : false;
  const isSelectedExamCreator = selectedExam ? selectedExam.createdById === user?.id : false;

  const allowedExamSubjects = useMemo(() => {
    if (!selectedExam || !selectedExam.subjects?.length) return [];
    if (user?.role !== "TEACHER" || isSelectedExamCT || isSelectedExamCreator) {
      return selectedExam.subjects;
    }
    const assigned = getAssignedSubjectsFor(selectedExam.className, selectedExam.section);
    const filteredSubs = selectedExam.subjects.filter((s: any) =>
      assigned.includes((s.subjectName || "").trim().toLowerCase())
    );
    return filteredSubs.length > 0 ? filteredSubs : selectedExam.subjects;
  }, [selectedExam, isSelectedExamCT, isSelectedExamCreator, user, getAssignedSubjectsFor]);

  const activeSub = allowedExamSubjects.find((s) => s.id === activeSubjectId) || allowedExamSubjects[0];
  const activeSubKey = activeSub?.id || activeSubjectId || "main";
  const maxForSimple = activeSub?.maxMarks || selectedExam?.maxMarks || 100;
  const passForSimple = activeSub?.passMarks || selectedExam?.passMarks || 35;

  const classOptions = createMode === "EXAM"
    ? classes.filter((c) => c.role === "CLASS_TEACHER" || user?.role !== "TEACHER")
    : classes;

  if (user?.role === "TEACHER" && classes.length === 0 && !loading) {
    return (
      <View style={styles.root}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Ionicons name="school-outline" size={32} color="#d97706" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8, textAlign: "center" }}>
            No classes allocated for you
          </Text>
          <Text style={{ fontSize: 14, color: "#64748b", textAlign: "center", maxWidth: 280, lineHeight: 20 }}>
            You have not been assigned to any classes or subjects yet. Please contact the administrator.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Parent Child Switcher (ONLY if children.length > 1) */}
      {isParent && children.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.childTabs}
        >
          {children.map((c, i) => {
            const on = i === childIdx;
            const mBadge = badges.childBadges?.[c.id]?.marks || 0;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  if (i === childIdx) return;
                  setQ("");
                  setDebouncedQ("");
                  setChildIdx(i);
                  childIdxRef.current = i;
                  setPage(1);
                  load(1, false, i, "", selectedClassTab);
                }}
                style={[
                  styles.childTab,
                  on && { borderColor: color, backgroundColor: color },
                ]}
              >
                <SafeAvatar
                  photoUrl={c.photoUrl}
                  name={toTitleCase(c.firstName)}
                  apiBase={apiBase}
                  size={24}
                  color={on ? "#ffffff" : color}
                />
                <Text style={[styles.childName, on && { color: "#ffffff" }]}>
                  {toTitleCase(c.firstName)}{" "}
                  <Text style={[styles.childClass, on && { color: "rgba(255,255,255,0.85)" }]}>
                    ({c.className || ""}{c.section ? `-${c.section}` : ""})
                  </Text>
                </Text>
                {mBadge > 0 && !on && (
                  <View style={{ backgroundColor: "#EF4444", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                    <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "800" }}>{mBadge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Teacher Class Filter Tabs */}
      {isTeacher && classes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.classNavTabs}
          contentContainerStyle={{ alignItems: "center", paddingRight: 12 }}
        >
          <Pressable
            onPress={() => {
              if (selectedClassTab === "ALL") return;
              setQ("");
              setDebouncedQ("");
              setSelectedClassTab("ALL");
              setPage(1);
              load(1, false, childIdx, "", "ALL");
            }}
            style={[
              styles.classNavTab,
              selectedClassTab === "ALL" && { backgroundColor: color, borderColor: color },
            ]}
          >
            <Text
              style={[
                styles.classNavTabText,
                selectedClassTab === "ALL" && { color: "#fff" },
              ]}
            >
              All Classes
            </Text>
          </Pressable>
          {classes.map((c, i) => {
            const tabKey = `${c.className}||${c.section || ""}`;
            const on = selectedClassTab === tabKey;
            return (
              <Pressable
                key={i}
                onPress={() => {
                  if (selectedClassTab === tabKey) return;
                  setQ("");
                  setDebouncedQ("");
                  setSelectedClassTab(tabKey);
                  setPage(1);
                  load(1, false, childIdx, "", tabKey);
                }}
                style={[
                  styles.classNavTab,
                  on && { backgroundColor: color, borderColor: color },
                ]}
              >
                <Text
                  style={[
                    styles.classNavTabText,
                    on && { color: "#fff" },
                  ]}
                >
                  {c.className}
                  {c.section ? `-${c.section}` : ""}
                  {c.role === "CLASS_TEACHER" ? " ★" : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <SearchBar value={q} onChangeText={setQ} placeholder="Search exams, subjects…" />
      {isTeacher && (classes.length > 0 || user?.role !== "TEACHER") && (
        <View style={{ paddingHorizontal: spacing.md, marginBottom: 8 }}>
          <Button title="+ Create Test / Exam" color={color} onPress={openCreate} />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.id || String(i)}
        keyboardShouldPersistTaps="handled"
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} color={color} />
          ) : null
        }
        contentContainerStyle={{
          padding: spacing.md,
          flexGrow: 1,
          paddingBottom: TAB_BAR_CLEARANCE,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setPage(1);
              load(1, false, childIdx, debouncedQ, selectedClassTab);
            }}
            tintColor={color}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ paddingVertical: 40 }} size="large" color={color} />
          ) : (
            <Empty message={q.trim() ? "No matching exams or marks found" : "No exams or marks yet"} />
          )
        }
        renderItem={({ item }) => {
          const exam = exams.find((e) => e.id === item.examId || e.id === item.id);
          const isExamClassTeacher = exam ? isClassTeacherFor(exam.className, exam.section) : false;
          const canManage = exam ? canManageExam(exam) : false;

          if (!isTeacher) {
            const hasRows = item.rows && item.rows.length > 0;
            let totalObt = 0;
            let totalMx = 0;
            let hasAnyMarks = false;
            let anyFailed = false;

            if (hasRows) {
              for (const r of item.rows || []) {
                const mx = Number(r.maxMarks) || 100;
                totalMx += mx;
                if (r.marks != null && r.marks !== "") {
                  hasAnyMarks = true;
                  const obt = Number(r.marks) || 0;
                  const pass = r.passMarks != null ? Number(r.passMarks) : Math.round(mx * 0.35);
                  totalObt += obt;
                  if (obt < pass) anyFailed = true;
                }
              }
            } else if (item.marks != null && item.marks !== "") {
              hasAnyMarks = true;
              const obt = Number(item.marks) || 0;
              const mx = Number(item.maxMarks) || 100;
              const pass = item.passMarks != null ? Number(item.passMarks) : Math.round(mx * 0.35);
              totalObt = obt;
              totalMx = mx;
              if (obt < pass) anyFailed = true;
            } else {
              totalMx = Number(item.maxMarks) || 100;
            }

            const pct = hasAnyMarks && totalMx > 0 ? (totalObt / totalMx) * 100 : 0;
            const gradeInfo = hasAnyMarks && totalMx > 0 ? getGradeInfo(totalObt, totalMx, Math.round(totalMx * 0.35)) : null;
            const isPass = hasAnyMarks && !anyFailed && totalObt >= totalMx * 0.35;
            const subsCount = item.rows?.length || item.subjects?.length || 1;

            return (
              <Pressable
                style={[
                  styles.card,
                  highlightId === item.id && {
                    borderWidth: 2,
                    borderColor: color,
                    backgroundColor: Colors.card,
                  },
                ]}
                onPress={() => openProgressCard(item)}
              >
                {/* Top Badge & Date */}
                <View style={styles.row}>
                  <View
                    style={{
                      backgroundColor: item.examType === "EXAM" ? "#f3e8ff" : "#e0f2fe",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="medal"
                      size={12}
                      color={item.examType === "EXAM" ? "#7e22ce" : "#0284c7"}
                    />
                    <Text
                      style={{
                        color: item.examType === "EXAM" ? "#7e22ce" : "#0284c7",
                        fontSize: 11,
                        fontWeight: "800",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.examType || "EXAM"}
                    </Text>
                  </View>

                  {item.dateFrom ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="calendar-outline" size={13} color={color} />
                      <Text style={{ fontSize: 11, color: "#64748b", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontWeight: "600" }}>
                        {formatDateDDMMYYYY(item.dateFrom)}
                        {item.dateTo && item.dateTo !== item.dateFrom
                          ? ` → ${formatDateDDMMYYYY(item.dateTo)}`
                          : ""}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Exam Title & Subject Count */}
                <Text style={[styles.title, { marginTop: 8 }]}>
                  {toTitleCase(str(item.examName || item.subject, "Exam"))}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {subsCount} {subsCount === 1 ? "Subject" : "Subjects"} Evaluated
                </Text>

                {/* Performance 3-column KPI Box */}
                {hasAnyMarks ? (
                  <View
                    style={{
                      flexDirection: "row",
                      backgroundColor: "#f8fafc",
                      borderRadius: 14,
                      padding: 10,
                      marginTop: 10,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      justifyContent: "space-around",
                    }}
                  >
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                        Total Score
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#0f172a", marginTop: 2 }}>
                        {totalObt}
                        <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: "600" }}> / {totalMx}</Text>
                      </Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: "#e2e8f0" }} />
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                        Percentage
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: "800", color, marginTop: 2 }}>
                        {pct.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: "#e2e8f0" }} />
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                        Grade
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: "#7c3aed", marginTop: 2 }}>
                        {gradeInfo?.grade || "—"}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: "#f8fafc",
                      borderRadius: 12,
                      padding: 8,
                      marginTop: 10,
                      borderWidth: 1,
                      borderStyle: "dashed",
                      borderColor: "#cbd5e1",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: "600" }}>
                      Marks compilation in progress
                    </Text>
                  </View>
                )}

                {/* Bottom Status & View Button */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 12,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: "#f1f5f9",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    {isPass ? (
                      <>
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                        <Text style={{ color: "#16a34a", fontWeight: "800", fontSize: 12 }}>Passed</Text>
                      </>
                    ) : hasAnyMarks ? (
                      <>
                        <Ionicons name="alert-circle" size={16} color="#dc2626" />
                        <Text style={{ color: "#dc2626", fontWeight: "800", fontSize: 12 }}>Needs Improvement</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="time-outline" size={16} color="#64748b" />
                        <Text style={{ color: "#64748b", fontWeight: "700", fontSize: 12 }}>Published</Text>
                      </>
                    )}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      backgroundColor: color,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                    }}
                  >
                    <Ionicons name="document-text-outline" size={14} color="#fff" />
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>
                      View Progress Card
                    </Text>
                    <Ionicons name="arrow-forward" size={12} color="#fff" />
                  </View>
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              style={[
                styles.card,
                highlightId === item.id && {
                  borderWidth: 2,
                  borderColor: color,
                  backgroundColor: Colors.card,
                },
              ]}
              onPress={() => {
                if (exam) openMarks(exam);
              }}
              onLongPress={() => {
                if (!exam || !canManage) return;
                setConfirmDelExam(exam);
              }}
              delayLongPress={450}
            >
              <View style={styles.row}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                  <Ionicons name="medal-outline" size={18} color={color} />
                  <Text style={styles.title} numberOfLines={1}>
                    {toTitleCase(str(item.examName || item.subject, "Exam"))}
                  </Text>
                </View>
                {item.examType ? (
                  <Badge text={str(item.examType)} color={color} />
                ) : null}
                {item.published ? (
                  <Badge text="Published" color={Colors.success} />
                ) : item.examType === "EXAM" && isTeacher ? (
                  <Badge text="Draft" color={Colors.warning || "#F59E0B"} />
                ) : null}
                {exam && isTeacher && (
                  <Pressable
                    hitSlop={10}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setExamMenu(exam);
                    }}
                    style={{ padding: 4, marginLeft: 4 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color="#64748b" />
                  </Pressable>
                )}
              </View>

              <Text style={styles.meta}>
                {exam?.className ? `Class ${exam.className}${exam.section ? `-${exam.section}` : ""} · ` : ""}
                {item.subject ? `${toTitleCase(item.subject)} · ` : ""}
                {item.marks != null ? `Marks: ${item.marks}` : ""}
                {item.maxMarks != null && item.marks != null ? ` / ${item.maxMarks}` : ""}
                {item.dateFrom ? ` · ${formatDateDDMMYYYY(item.dateFrom)}` : ""}
              </Text>

              {exam && item.examType === "EXAM" && isExamClassTeacher && (
                <View style={[styles.rowActions, { marginTop: 10, justifyContent: "flex-end" }]}>
                  <Pressable
                    onPress={() => publishExam(item.examId || item.id || "")}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                      backgroundColor: item.published ? "#10b981" : "#f59e0b",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      shadowColor: item.published ? "#10b981" : "#f59e0b",
                      shadowOpacity: 0.25,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                  >
                    <Ionicons
                      name={item.published ? "refresh-outline" : "paper-plane-outline"}
                      size={13}
                      color="#ffffff"
                    />
                    <Text
                      style={{
                        color: "#ffffff",
                        fontWeight: "800",
                        fontSize: 11,
                      }}
                    >
                      {item.published ? "Re-publish" : "Publish"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          );
        }}
      />

      {/* Exam Options Menu Action Modal */}
      <Modal visible={!!examMenu} animationType="slide" transparent onRequestClose={() => setExamMenu(null)}>
        <Pressable style={styles.modalBg} onPress={() => setExamMenu(null)}>
          <Pressable style={[styles.modalCard, { maxHeight: 440, paddingBottom: 24 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.examMenuHeader}>
              <View style={[styles.examMenuIconBox, { backgroundColor: color + "15" }]}>
                <Ionicons
                  name={examMenu?.type === "EXAM" ? "medal-outline" : "document-text-outline"}
                  size={22}
                  color={color}
                />
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.examMenuTitle} numberOfLines={2}>
                  {toTitleCase(str(examMenu?.name || examMenu?.subject, "Exam"))}
                </Text>
                <View style={styles.examMenuMetaRow}>
                  {examMenu?.className ? (
                    <Text style={styles.examMenuMeta}>
                      Class {examMenu.className}{examMenu.section ? `-${examMenu.section}` : ""}
                    </Text>
                  ) : null}
                  {examMenu?.type ? (
                    <View style={styles.examMenuBadge}>
                      <Text style={[styles.examMenuBadgeText, { color }]}>
                        {examMenu.type}
                      </Text>
                    </View>
                  ) : null}
                  {examMenu?.subject && examMenu?.type === "TEST" ? (
                    <Text style={styles.examMenuMeta} numberOfLines={1}>
                      · {toTitleCase(examMenu.subject)}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable onPress={() => setExamMenu(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            <View style={{ marginTop: 8 }}>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  const ex = examMenu;
                  setExamMenu(null);
                  if (ex) openMarks(ex);
                }}
              >
                <Ionicons name="create-outline" size={20} color={color} />
                <Text style={styles.menuItemText}>Enter Marks</Text>
              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  const ex = examMenu;
                  setExamMenu(null);
                  if (ex) setTimetableExam(ex);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                <Text style={styles.menuItemText}>View Timetable</Text>
              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  const ex = examMenu;
                  setExamMenu(null);
                  if (ex) handleDownloadPDF(ex);
                }}
              >
                <Ionicons name="download-outline" size={20} color="#059669" />
                <Text style={styles.menuItemText}>Download Marksheet</Text>
              </Pressable>

              {examMenu && canManageExam(examMenu) && (
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    const ex = examMenu;
                    setExamMenu(null);
                    if (ex) openEdit(ex);
                  }}
                >
                  <Ionicons name="pencil-outline" size={20} color="#2563eb" />
                  <Text style={styles.menuItemText}>Edit {examMenu.type === "EXAM" ? "Exam" : "Test"}</Text>
                </Pressable>
              )}

              {examMenu && canManageExam(examMenu) && (
                <Pressable
                  style={[styles.menuItem, { backgroundColor: "#fef2f2" }]}
                  onPress={() => {
                    const ex = examMenu;
                    setExamMenu(null);
                    if (ex) setConfirmDelExam(ex);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                  <Text style={[styles.menuItemText, { color: "#dc2626" }]}>Delete {examMenu.type === "EXAM" ? "Exam" : "Test"}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Timetable Modal (Viewer with Image and PDF download) */}
      <Modal visible={!!timetableExam} animationType="slide" transparent onRequestClose={() => setTimetableExam(null)}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { maxHeight: "90%", paddingHorizontal: 16 }]}>
            {/* Header */}
            <View style={styles.modalHead}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <Ionicons name="calendar" size={22} color={color} />
                <Text style={[styles.modalTitle, { flex: 1 }]} numberOfLines={1}>
                  Timetable · {toTitleCase(timetableExam?.name || "Exam")}
                </Text>
              </View>
              <Pressable onPress={() => setTimetableExam(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            {/* Actions: Download Image and Download PDF */}
            <View style={{ flexDirection: "row", gap: 10, marginVertical: 12 }}>
              <Pressable
                onPress={() => timetableExam && handleDownloadTimetableImage(timetableExam)}
                disabled={downloadingTimetableImage}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: "#eff6ff",
                  borderWidth: 1,
                  borderColor: "#bfdbfe",
                }}
              >
                {downloadingTimetableImage ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Ionicons name="image-outline" size={16} color="#2563eb" />
                )}
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#2563eb" }}>
                  Download Image
                </Text>
              </Pressable>

              <Pressable
                onPress={() => timetableExam && handleDownloadTimetablePDF(timetableExam)}
                disabled={downloadingTimetablePdf}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: "#ecfdf5",
                  borderWidth: 1,
                  borderColor: "#a7f3d0",
                }}
              >
                {downloadingTimetablePdf ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <Ionicons name="document-text-outline" size={16} color="#059669" />
                )}
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#059669" }}>
                  Download PDF
                </Text>
              </Pressable>
            </View>

            {/* Scrollable Printable Timetable Card View */}
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {timetableExam && (
                <View
                  ref={timetableRef}
                  collapsable={false}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: "#e2e8f0",
                    padding: 16,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 3 },
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  {/* Top School Banner */}
                  <View
                    style={{
                      backgroundColor: color,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {school?.name || (user as any)?.schoolName || "MySchool Platform"}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600", marginTop: 2 }}>
                        Official Examination Schedule & Timetable
                      </Text>
                    </View>
                    <View style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>
                        Class {timetableExam.className}{timetableExam.section ? `-${timetableExam.section}` : ""}
                      </Text>
                    </View>
                  </View>

                  {/* Exam Details Grid */}
                  <View
                    style={{
                      backgroundColor: "#f8fafc",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      padding: 12,
                      marginBottom: 14,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Exam Name</Text>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a", marginTop: 1 }}>{toTitleCase(timetableExam.name)}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Type</Text>
                      <Text style={{ fontSize: 13, fontWeight: "800", color, marginTop: 1 }}>{timetableExam.type || "TEST"}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Subjects</Text>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#0f172a", marginTop: 1 }}>{timetableExam.subjects?.length || 1}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total Marks</Text>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#059669", marginTop: 1 }}>
                        {timetableExam.subjects?.length
                          ? timetableExam.subjects.reduce((a, s) => a + (Number(s.maxMarks) || 100), 0)
                          : Number(timetableExam.maxMarks) || 100}
                      </Text>
                    </View>
                  </View>

                  {/* Timetable List Table */}
                  <View style={{ borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", overflow: "hidden", marginBottom: 14 }}>
                    <View style={{ backgroundColor: "#1e293b", paddingVertical: 8, paddingHorizontal: 10, flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", width: 28, textAlign: "center" }}>#</Text>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", flex: 1.2 }}>Date / Day</Text>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", flex: 1.5 }}>Subject</Text>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", width: 44, textAlign: "center" }}>Total</Text>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", width: 40, textAlign: "center" }}>Pass</Text>
                    </View>

                    {(timetableExam.type === "EXAM" && timetableExam.subjects?.length
                      ? timetableExam.subjects
                      : [
                          {
                            id: "main",
                            subjectName: timetableExam.subject || timetableExam.name || "Subject",
                            date: timetableExam.date || timetableExam.dateFrom || new Date().toISOString().slice(0, 10),
                            maxMarks: Number(timetableExam.maxMarks) || 100,
                            passMarks: timetableExam.passMarks != null ? Number(timetableExam.passMarks) : Math.round(Number(timetableExam.maxMarks || 100) * 0.35),
                            splits: [],
                          },
                        ]
                    ).map((s: any, idx: number) => {
                      const dateObj = s.date ? new Date(s.date) : null;
                      const dayName = dateObj && !isNaN(dateObj.getTime())
                        ? dateObj.toLocaleDateString("en-US", { weekday: "short" })
                        : "—";
                      const passM = s.passMarks != null ? s.passMarks : Math.round(Number(s.maxMarks || 100) * 0.35);

                      return (
                        <View
                          key={s.id || idx}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 10,
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                            borderTopWidth: idx === 0 ? 0 : 1,
                            borderTopColor: "#f1f5f9",
                          }}
                        >
                          <Text style={{ fontSize: 11, color: "#94a3b8", width: 28, textAlign: "center", fontWeight: "700" }}>{idx + 1}</Text>
                          <View style={{ flex: 1.2 }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#0f172a", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }}>
                              {formatDateDDMMYYYY(s.date)}
                            </Text>
                            <Text style={{ fontSize: 9.5, color: "#64748b", fontWeight: "600" }}>{dayName}</Text>
                          </View>
                          <View style={{ flex: 1.5 }}>
                            <Text style={{ fontSize: 12, fontWeight: "800", color: "#0f172a" }}>{toTitleCase(s.subjectName)}</Text>
                            {s.splits?.length > 0 && (
                              <Text style={{ fontSize: 9, color: "#6366f1", marginTop: 1 }}>
                                {s.splits.map((sp: any) => `${sp.title}: ${sp.maxMarks}`).join(" · ")}
                              </Text>
                            )}
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: "800", color: "#0f172a", width: 44, textAlign: "center" }}>{s.maxMarks}</Text>
                          <Text style={{ fontSize: 12, fontWeight: "800", color: "#16a34a", width: 40, textAlign: "center" }}>{passM}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Student Instructions */}
                  <View style={{ backgroundColor: "#fffbeb", borderRadius: 10, borderWidth: 1, borderColor: "#fef3c7", padding: 10, marginBottom: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: "800", color: "#92400e", marginBottom: 3 }}>Instructions for Students:</Text>
                    <Text style={{ fontSize: 9.5, color: "#78350f", lineHeight: 14 }}>
                      • Be seated in the examination hall 15 minutes before start.{"\n"}
                      • Bring your student ID card and required stationery.{"\n"}
                      • Unauthorized electronic devices are strictly prohibited.
                    </Text>
                  </View>

                  {/* Signatures */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
                    <Text style={{ fontSize: 9.5, color: "#64748b", fontWeight: "600" }}>Class Teacher Sign</Text>
                    <Text style={{ fontSize: 9.5, color: "#64748b", fontWeight: "600" }}>Principal Sign</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Standard Center-Gray Toast */}
            {!!appModalToast && (
              <View pointerEvents="none" style={styles.modalToastWrap}>
                <Text style={styles.modalToastText} numberOfLines={3}>
                  {appModalToast.msg}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Test / Exam Modal */}
      <Modal visible={createOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Create {createMode === "EXAM" ? "Exam" : "Test"}</Text>
              <Pressable onPress={() => setCreateOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="always">
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => setCreateMode("TEST")}
                  style={[
                    styles.modeChip,
                    createMode === "TEST" && { backgroundColor: color, borderColor: color },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      createMode === "TEST" && { color: "#fff" },
                    ]}
                  >
                    Test (Single Subject)
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (isClassTeacher || user?.role !== "TEACHER") setCreateMode("EXAM");
                    else toast.error("Only class teachers can create exams");
                  }}
                  style={[
                    styles.modeChip,
                    createMode === "EXAM" && { backgroundColor: color, borderColor: color },
                    !isClassTeacher && user?.role === "TEACHER" && { opacity: 0.45 },
                  ]}
                >
                  <Text
                    style={[
                      styles.modeText,
                      createMode === "EXAM" && { color: "#fff" },
                    ]}
                  >
                    Exam (Multi-Subject)
                  </Text>
                </Pressable>
              </View>

              {createMode === "TEST" ? (
                <>
                  <Label>Title *</Label>
                  <Input
                    value={testForm.name}
                    onChangeText={(t) => {
                      setTestForm((f) => ({ ...f, name: t }));
                      setTestErrors((e) => ({ ...e, name: "" }));
                    }}
                    placeholder="e.g. Unit Test 1"
                  />
                  {!!testErrors.name && <Text style={styles.err}>{testErrors.name}</Text>}

                  <Label>Class *</Label>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                    {classOptions.length === 0 ? (
                      <Text style={styles.meta}>No classes mapped</Text>
                    ) : (
                      classOptions.map((c: any, i: number) => {
                        const cn = c.className || c.name || "";
                        const sec = c.section || "";
                        const on = testForm.className === cn && testForm.section === sec;
                        return (
                          <Pressable
                            key={i}
                            onPress={() => {
                              setTestForm((f) => ({
                                ...f,
                                className: cn,
                                section: sec,
                              }));
                              setTestErrors((e) => ({ ...e, className: "" }));
                            }}
                            style={[
                              styles.classChip,
                              on && { backgroundColor: color, borderColor: color },
                            ]}
                          >
                            <Text
                              style={[
                                styles.classChipText,
                                on && { color: "#fff" },
                              ]}
                            >
                              {cn}{sec ? `-${sec}` : ""}
                            </Text>
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                  {!!testErrors.className && <Text style={styles.err}>{testErrors.className}</Text>}

                  <Label>Subject *</Label>
                  <Input
                    value={testForm.subject}
                    onChangeText={(t) => {
                      setTestForm((f) => ({ ...f, subject: t }));
                      setTestErrors((e) => ({ ...e, subject: "" }));
                    }}
                    placeholder="e.g. Mathematics"
                  />
                  {!!testErrors.subject && <Text style={styles.err}>{testErrors.subject}</Text>}

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Label>Total Marks *</Label>
                      <Input
                        value={testForm.maxMarks}
                        keyboardType="numeric"
                        onChangeText={(t) => {
                          setTestForm((f) => ({ ...f, maxMarks: t }));
                          setTestErrors((e) => ({ ...e, maxMarks: "" }));
                        }}
                        placeholder="100"
                      />
                      {!!testErrors.maxMarks && <Text style={styles.err}>{testErrors.maxMarks}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Label>Pass Marks</Label>
                      <Input
                        value={testForm.passMarks}
                        keyboardType="numeric"
                        onChangeText={(t) => {
                          setTestForm((f) => ({ ...f, passMarks: t }));
                          setTestErrors((e) => ({ ...e, passMarks: "" }));
                        }}
                        placeholder="35"
                      />
                      {!!testErrors.passMarks && <Text style={styles.err}>{testErrors.passMarks}</Text>}
                    </View>
                  </View>
                  <Label>Date</Label>
                  <Input
                    value={testForm.date}
                    onChangeText={(t) => setTestForm((f) => ({ ...f, date: t }))}
                    placeholder="DD-MM-YYYY"
                  />
                  <Button
                    title="Create Test"
                    color={color}
                    loading={saving}
                    onPress={saveTest}
                  />
                </>
              ) : (
                <>
                  <Label>Exam Title *</Label>
                  <Input
                    value={examForm.name}
                    onChangeText={(t) => {
                      setExamForm((f) => ({ ...f, name: t }));
                      setExamErrors((e) => ({ ...e, name: "" }));
                    }}
                    placeholder="e.g. Mid-Term Examination"
                  />
                  {!!examErrors.name && <Text style={styles.err}>{examErrors.name}</Text>}

                  <Label>Class *</Label>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                    {(classOptions.length ? classOptions : classes).map((c: any, i: number) => {
                      const cn = c.className || c.name || "";
                      const sec = c.section || "";
                      const on = examForm.className === cn && examForm.section === sec;
                      return (
                        <Pressable
                          key={i}
                          onPress={() => {
                            setExamForm((f) => ({
                              ...f,
                              className: cn,
                              section: sec,
                            }));
                            setExamErrors((e) => ({ ...e, className: "" }));
                          }}
                          style={[
                            styles.classChip,
                            on && { backgroundColor: color, borderColor: color },
                          ]}
                        >
                          <Text
                            style={[
                              styles.classChipText,
                              on && { color: "#fff" },
                            ]}
                          >
                            {cn}{sec ? `-${sec}` : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  {!!examErrors.className && <Text style={styles.err}>{examErrors.className}</Text>}

                  {subjects.map((s, i) => {
                    const splitSum = s.splits.reduce((a, x) => a + (Number(x.maxMarks) || 0), 0);
                    const total = Number(s.maxMarks) || 0;
                    const balance = Math.max(0, total - splitSum);
                    return (
                      <View key={i} style={styles.subBox}>
                        <View style={styles.row}>
                          <Text style={{ fontWeight: "800", color: Colors.text }}>Subject {i + 1}</Text>
                          {subjects.length > 1 && (
                            <Pressable onPress={() => setSubjects(subjects.filter((_, j) => j !== i))}>
                              <Text style={{ color: Colors.danger, fontSize: 12, fontWeight: "700" }}>Remove</Text>
                            </Pressable>
                          )}
                        </View>
                        <Label>Subject Name *</Label>
                        <Input
                          placeholder="Subject Name (e.g. English)"
                          value={s.subjectName}
                          onChangeText={(t) => {
                            const next = [...subjects];
                            next[i] = { ...s, subjectName: t };
                            setSubjects(next);
                            setExamErrors((e) => ({ ...e, [`subject_${i}`]: "" }));
                          }}
                        />
                        {!!examErrors[`subject_${i}`] && <Text style={styles.err}>{examErrors[`subject_${i}`]}</Text>}

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Label>Date</Label>
                            <Input
                              value={s.date}
                              onChangeText={(t) => {
                                const next = [...subjects];
                                next[i] = { ...s, date: t };
                                setSubjects(next);
                              }}
                              placeholder="DD-MM-YYYY"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Label>Total Marks *</Label>
                            <Input
                              keyboardType="numeric"
                              value={s.maxMarks}
                              onChangeText={(t) => {
                                const next = [...subjects];
                                next[i] = { ...s, maxMarks: t };
                                setSubjects(next);
                              }}
                              placeholder="100"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Label>Pass Marks</Label>
                            <Input
                              keyboardType="numeric"
                              value={s.passMarks}
                              onChangeText={(t) => {
                                const next = [...subjects];
                                next[i] = { ...s, passMarks: t };
                                setSubjects(next);
                              }}
                              placeholder="35"
                            />
                          </View>
                        </View>

                        <Text style={[styles.meta, { marginBottom: 6 }]}>
                          Splits (sum ≤ total). Balance: {balance}
                        </Text>
                        {!!examErrors[`subject_split_${i}`] && <Text style={styles.err}>{examErrors[`subject_split_${i}`]}</Text>}
                        {s.splits.map((sp, j) => (
                          <View key={j} style={styles.splitRow}>
                            <Input
                              style={{ flex: 1 }}
                              placeholder="Split title (e.g. Theory)"
                              value={sp.title}
                              onChangeText={(t) => {
                                const next = [...subjects];
                                const splits = [...s.splits];
                                splits[j] = { ...sp, title: t };
                                next[i] = { ...s, splits };
                                setSubjects(next);
                              }}
                            />
                            <Input
                              style={{ width: 85 }}
                              keyboardType="numeric"
                              placeholder="Total"
                              value={sp.maxMarks}
                              onChangeText={(t) => {
                                const next = [...subjects];
                                const splits = [...s.splits];
                                splits[j] = { ...sp, maxMarks: t };
                                next[i] = { ...s, splits };
                                setSubjects(next);
                              }}
                            />
                          </View>
                        ))}
                        <Pressable
                          onPress={() => {
                            const next = [...subjects];
                            next[i] = {
                              ...s,
                              splits: [...s.splits, { title: "", maxMarks: "" }],
                            };
                            setSubjects(next);
                          }}
                        >
                          <Text style={{ color, fontWeight: "700", fontSize: 12 }}>+ Add split</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                  <Pressable
                    onPress={() =>
                      setSubjects([
                        ...subjects,
                        {
                          subjectName: "",
                          date: getTodayFormattedDDMMYYYY(),
                          maxMarks: "100",
                          passMarks: "35",
                          splits: [
                            { title: "Theory", maxMarks: "70" },
                            { title: "Practical", maxMarks: "30" },
                          ],
                        },
                      ])
                    }
                    style={{ marginBottom: 14 }}
                  >
                    <Text style={{ color, fontWeight: "800" }}>+ Add Another Subject</Text>
                  </Pressable>
                  <Button
                    title="Create Exam"
                    color={color}
                    loading={saving}
                    onPress={saveExam}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Test / Exam Modal */}
      <Modal visible={!!editItem} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                Edit {editItem?.type === "EXAM" ? "Exam" : "Test"}
              </Text>
              <Pressable onPress={() => setEditItem(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="always">
              {editItem?.type === "TEST" ? (
                <>
                  <Label>Title *</Label>
                  <Input
                    value={editTestForm.name}
                    onChangeText={(t) => {
                      setEditTestForm((f) => ({ ...f, name: t }));
                      setEditTestErrors((e) => ({ ...e, name: "" }));
                    }}
                  />
                  {!!editTestErrors.name && <Text style={styles.err}>{editTestErrors.name}</Text>}

                  <Label>Subject *</Label>
                  <Input
                    value={editTestForm.subject}
                    onChangeText={(t) => {
                      setEditTestForm((f) => ({ ...f, subject: t }));
                      setEditTestErrors((e) => ({ ...e, subject: "" }));
                    }}
                  />
                  {!!editTestErrors.subject && <Text style={styles.err}>{editTestErrors.subject}</Text>}

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Label>Total Marks *</Label>
                      <Input
                        value={editTestForm.maxMarks}
                        keyboardType="numeric"
                        onChangeText={(t) => {
                          setEditTestForm((f) => ({ ...f, maxMarks: t }));
                          setEditTestErrors((e) => ({ ...e, maxMarks: "" }));
                        }}
                      />
                      {!!editTestErrors.maxMarks && <Text style={styles.err}>{editTestErrors.maxMarks}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Label>Pass Marks</Label>
                      <Input
                        value={editTestForm.passMarks}
                        keyboardType="numeric"
                        onChangeText={(t) => {
                          setEditTestForm((f) => ({ ...f, passMarks: t }));
                          setEditTestErrors((e) => ({ ...e, passMarks: "" }));
                        }}
                      />
                      {!!editTestErrors.passMarks && <Text style={styles.err}>{editTestErrors.passMarks}</Text>}
                    </View>
                  </View>
                  <Label>Date</Label>
                  <Input
                    value={editTestForm.date}
                    onChangeText={(t) => setEditTestForm((f) => ({ ...f, date: t }))}
                  />
                  <Button
                    title="Save Changes"
                    color={color}
                    loading={updating}
                    onPress={updateTest}
                  />
                </>
              ) : (
                <>
                  <Label>Exam Title *</Label>
                  <Input
                    value={editExamForm.name}
                    onChangeText={(t) => {
                      setEditExamForm((f) => ({ ...f, name: t }));
                      setEditExamErrors((e) => ({ ...e, name: "" }));
                    }}
                  />
                  {!!editExamErrors.name && <Text style={styles.err}>{editExamErrors.name}</Text>}

                  {editSubjects.map((s, i) => {
                    const splitSum = s.splits.reduce((a, x) => a + (Number(x.maxMarks) || 0), 0);
                    const total = Number(s.maxMarks) || 0;
                    const balance = Math.max(0, total - splitSum);
                    return (
                      <View key={i} style={styles.subBox}>
                        <View style={styles.row}>
                          <Text style={{ fontWeight: "800", color: Colors.text }}>Subject {i + 1}</Text>
                          {editSubjects.length > 1 && (
                            <Pressable onPress={() => setEditSubjects(editSubjects.filter((_, j) => j !== i))}>
                              <Text style={{ color: Colors.danger, fontSize: 12, fontWeight: "700" }}>Remove</Text>
                            </Pressable>
                          )}
                        </View>
                        <Label>Subject Name *</Label>
                        <Input
                          placeholder="Subject Name"
                          value={s.subjectName}
                          onChangeText={(t) => {
                            const next = [...editSubjects];
                            next[i] = { ...s, subjectName: t };
                            setEditSubjects(next);
                            setEditExamErrors((e) => ({ ...e, [`subject_${i}`]: "" }));
                          }}
                        />
                        {!!editExamErrors[`subject_${i}`] && <Text style={styles.err}>{editExamErrors[`subject_${i}`]}</Text>}

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Label>Date</Label>
                            <Input
                              value={s.date}
                              onChangeText={(t) => {
                                const next = [...editSubjects];
                                next[i] = { ...s, date: t };
                                setEditSubjects(next);
                              }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Label>Total Marks *</Label>
                            <Input
                              keyboardType="numeric"
                              value={s.maxMarks}
                              onChangeText={(t) => {
                                const next = [...editSubjects];
                                next[i] = { ...s, maxMarks: t };
                                setEditSubjects(next);
                              }}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Label>Pass Marks</Label>
                            <Input
                              keyboardType="numeric"
                              value={s.passMarks}
                              onChangeText={(t) => {
                                const next = [...editSubjects];
                                next[i] = { ...s, passMarks: t };
                                setEditSubjects(next);
                              }}
                            />
                          </View>
                        </View>
                        <Text style={[styles.meta, { marginBottom: 6 }]}>
                          Splits (sum ≤ total). Balance: {balance}
                        </Text>
                        {!!editExamErrors[`subject_split_${i}`] && <Text style={styles.err}>{editExamErrors[`subject_split_${i}`]}</Text>}
                        {s.splits.map((sp, j) => (
                          <View key={j} style={styles.splitRow}>
                            <Input
                              style={{ flex: 1 }}
                              placeholder="Split title"
                              value={sp.title}
                              onChangeText={(t) => {
                                const next = [...editSubjects];
                                const splits = [...s.splits];
                                splits[j] = { ...sp, title: t };
                                next[i] = { ...s, splits };
                                setEditSubjects(next);
                              }}
                            />
                            <Input
                              style={{ width: 85 }}
                              keyboardType="numeric"
                              placeholder="Total"
                              value={sp.maxMarks}
                              onChangeText={(t) => {
                                const next = [...editSubjects];
                                const splits = [...s.splits];
                                splits[j] = { ...sp, maxMarks: t };
                                next[i] = { ...s, splits };
                                setEditSubjects(next);
                              }}
                            />
                          </View>
                        ))}
                        <Pressable
                          onPress={() => {
                            const next = [...editSubjects];
                            next[i] = {
                              ...s,
                              splits: [...s.splits, { title: "", maxMarks: "" }],
                            };
                            setEditSubjects(next);
                          }}
                        >
                          <Text style={{ color, fontWeight: "700", fontSize: 12 }}>+ Add split</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                  <Pressable
                    onPress={() =>
                      setEditSubjects([
                        ...editSubjects,
                        {
                          subjectName: "",
                          date: getTodayFormattedDDMMYYYY(),
                          maxMarks: "100",
                          passMarks: "35",
                          splits: [
                            { title: "Theory", maxMarks: "70" },
                            { title: "Practical", maxMarks: "30" },
                          ],
                        },
                      ])
                    }
                    style={{ marginBottom: 14 }}
                  >
                    <Text style={{ color, fontWeight: "800" }}>+ Add Another Subject</Text>
                  </Pressable>
                  <Button
                    title="Save Changes"
                    color={color}
                    loading={updating}
                    onPress={updateExamAction}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Exam Confirmation Modal */}
      <ConfirmModal
        visible={!!confirmDelExam}
        title={`Delete ${confirmDelExam?.type === "EXAM" ? "Exam" : "Test"}?`}
        message={confirmDelExam ? `Are you sure you want to remove "${confirmDelExam.name}"? All recorded marks will also be deleted.` : ""}
        confirmText="Delete"
        destructive
        loading={deletingExam}
        onCancel={() => !deletingExam && setConfirmDelExam(null)}
        onConfirm={handleDeleteExam}
      />

      {/* Marks Entry Modal / Drawer */}
      <Modal visible={marksOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBg}
        >
          <View style={styles.marksDrawerCard}>
            {/* Drawer Header */}
            <View style={styles.drawerHeaderBox}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.drawerTitle} numberOfLines={1}>
                  {toTitleCase(selectedExam?.name || "Marks Entry")}
                </Text>
                <View style={styles.drawerMetaRow}>
                  <Badge
                    text={`Class ${selectedExam?.className || ""}${selectedExam?.section ? `-${selectedExam.section}` : ""}`}
                    color={color}
                  />
                  <Badge
                    text={`Total: ${maxForSimple}`}
                    color="#475569"
                  />
                  <Badge
                    text={`Pass: ${passForSimple}`}
                    color="#16a34a"
                  />
                </View>
              </View>
              <Pressable onPress={() => setMarksOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            {/* Subject Tabs if Multi-Subject Exam */}
            {!!allowedExamSubjects?.length && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.drawerSubjectScroll}
                contentContainerStyle={{ alignItems: "center" }}
              >
                {allowedExamSubjects.map((s) => {
                  const on = (activeSub?.id || activeSubjectId) === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => switchSubject(s.id)}
                      style={[
                        styles.drawerSubjectChip,
                        on && { backgroundColor: color, borderColor: color },
                      ]}
                    >
                      <Text
                        style={[
                          styles.drawerSubjectChipText,
                          on && { color: "#fff" },
                        ]}
                      >
                        {toTitleCase(s.subjectName)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {/* Content / Loading State */}
            {marksLoading ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={color} />
                <Text style={styles.loaderText}>Loading students & marks…</Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
                style={styles.drawerBody}
              >
                {students.length === 0 ? (
                  <Empty message="No students found in this class" />
                ) : (
                  students.map((st) => {
                    let totalMark = 0;
                    let hasMark = false;

                    if (activeSub?.splits?.length) {
                      const sp = allSplitMarks[activeSubKey]?.[st.id] || {};
                      const sum = Object.values(sp).reduce((a, v) => a + (Number(v) || 0), 0);
                      totalMark = sum;
                      hasMark = Object.values(sp).some((v) => v !== "" && v != null);
                    } else {
                      const raw = allMarks[activeSubKey]?.[st.id];
                      if (raw !== "" && raw != null) {
                        totalMark = Number(raw) || 0;
                        hasMark = true;
                      }
                    }

                    const gradeInfo = hasMark
                      ? getGradeInfo(totalMark, Number(maxForSimple) || 100, Number(passForSimple) || 35)
                      : null;

                    return (
                      <View key={st.id} style={styles.studentMarkCard}>
                        <View style={styles.studentInfoLeft}>
                          <SafeAvatar
                            photoUrl={st.photoUrl}
                            name={st.firstName}
                            apiBase={apiBase}
                            size={44}
                            color={color}
                          />
                          <View style={{ flex: 1, minWidth: 90 }}>
                            <Text style={styles.studentNameText} numberOfLines={1}>
                              {formatPersonName(st.firstName, st.lastName)}
                            </Text>
                            {(st.rollNumber || st.rollNo) ? (
                              <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 1 }}>
                                Roll: {st.rollNumber || st.rollNo}
                              </Text>
                            ) : null}
                            {gradeInfo ? (
                              <View style={styles.gradeBadgeRow}>
                                <View
                                  style={[
                                    styles.passFailTag,
                                    { backgroundColor: gradeInfo.pass ? "#dcfce7" : "#fee2e2" },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.passFailText,
                                      { color: gradeInfo.pass ? "#16a34a" : "#dc2626" },
                                    ]}
                                  >
                                    {gradeInfo.pass ? "Pass" : "Fail"} ({gradeInfo.grade})
                                  </Text>
                                </View>
                                <Text style={styles.totalScoreText}>
                                  {totalMark}/{maxForSimple}
                                </Text>
                              </View>
                            ) : (
                              <Text style={styles.noMarkText}>Not entered</Text>
                            )}
                          </View>
                        </View>

                        {activeSub?.splits?.length ? (
                          <View style={styles.splitsContainer}>
                            {activeSub.splits.map((sp) => (
                              <View key={sp.title} style={styles.splitRowItem}>
                                <Text style={styles.splitTitleLabel} numberOfLines={1}>
                                  {sp.title} (/{sp.maxMarks})
                                </Text>
                                <Input
                                  style={styles.splitInputField}
                                  keyboardType="numeric"
                                  value={allSplitMarks[activeSubKey]?.[st.id]?.[sp.title] ?? ""}
                                  onChangeText={(t) =>
                                    clampSplit(activeSubKey, st.id, sp.title, t, Number(sp.maxMarks) || 0)
                                  }
                                  placeholder="0"
                                />
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.singleInputContainer}>
                            <Input
                              style={styles.singleInputField}
                              keyboardType="numeric"
                              value={allMarks[activeSubKey]?.[st.id] ?? ""}
                              onChangeText={(t) =>
                                clampSimple(activeSubKey, st.id, t, Number(maxForSimple) || 100)
                              }
                              placeholder={`0-${maxForSimple}`}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })
                )}

                <View style={{ marginTop: 16, marginBottom: 24 }}>
                  <Button
                    title="Save Marks"
                    color={color}
                    loading={saving}
                    onPress={saveMarks}
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Student / Parent Progress Card Modal */}
      <Modal visible={cardOpen} animationType="fade" transparent>
        <View style={styles.cardModalBg}>
          <View ref={cardViewRef} collapsable={false} style={styles.progressCard}>
            <View style={[styles.pcShape1, { backgroundColor: color + "33" }]} />
            <View style={[styles.pcShape2, { backgroundColor: color + "22" }]} />
            <View style={styles.pcHeader}>
              {resolveMediaUrlSync(school?.logoUrl || (user as any)?.schoolLogo, apiBase) ? (
                <SafeAvatar
                  photoUrl={school?.logoUrl || (user as any)?.schoolLogo}
                  name={school?.name || "S"}
                  apiBase={apiBase}
                  size={48}
                  color={color}
                  round={false}
                />
              ) : (
                <View style={[styles.pcLogoPh, { backgroundColor: color }]}>
                  <Text style={{ color: "#fff", fontWeight: "800" }}>MS</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.pcSchool}>
                  {school?.name || (user as any)?.schoolName || "My School"}
                </Text>
                {!!(school?.location || school?.address) && (
                  <Text style={styles.pcAddr} numberOfLines={2}>
                    {school?.location || school?.address}
                  </Text>
                )}
                <Text style={{ fontSize: 10, fontWeight: "700", color, textTransform: "uppercase", marginTop: 2 }}>
                  Official Student Progress Card
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Pressable onPress={() => setCardOpen(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={Colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.pcStudent}>
              <SafeAvatar
                photoUrl={cardGroup?.photoUrl}
                name={cardGroup?.studentName}
                apiBase={apiBase}
                size={56}
                color={color}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.pcName}>{toTitleCase(cardGroup?.studentName || "")}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                  <Text style={styles.pcMeta}>
                    Class: <Text style={{ fontWeight: "700", color: Colors.text }}>{cardGroup?.className || "—"}{cardGroup?.section ? `-${cardGroup.section}` : ""}</Text>
                  </Text>
                  {!!cardGroup?.rollNumber && (
                    <Text style={styles.pcMeta}>
                      Roll: <Text style={{ fontWeight: "700", color: Colors.text }}>{cardGroup.rollNumber}</Text>
                    </Text>
                  )}
                  {!!cardGroup?.parentName && (
                    <Text style={styles.pcMeta}>
                      Parent: <Text style={{ fontWeight: "700", color: Colors.text }}>{cardGroup.parentName}</Text>
                    </Text>
                  )}
                  {!!cardGroup?.teacherName && (
                    <Text style={styles.pcMeta}>
                      Teacher: <Text style={{ fontWeight: "700", color: Colors.text }}>{cardGroup.teacherName}</Text>
                    </Text>
                  )}
                </View>
                <Text style={[styles.pcExam, { color }]}>{toTitleCase(cardGroup?.examName || "")}</Text>
                {!!cardGroup?.dateFrom && (
                  <Text style={styles.pcMeta}>
                    {formatDateDDMMYYYY(cardGroup.dateFrom)}
                    {cardGroup?.dateTo && cardGroup.dateTo !== cardGroup.dateFrom
                      ? ` → ${formatDateDDMMYYYY(cardGroup.dateTo)}`
                      : ""}
                  </Text>
                )}
              </View>
            </View>

            {/* Performance KPI summary */}
            {(() => {
              let totalEarned = 0;
              let totalMax = 0;
              let anyFail = false;
              let passedSubs = 0;
              let hasAnyMarks = false;
              const rows = cardGroup?.rows || [];
              for (const r of rows) {
                const mx = Number(r.maxMarks) || 100;
                const pass = r.passMarks != null ? Number(r.passMarks) : Math.round(mx * 0.35);
                if (r.marks != null && r.marks !== "") {
                  hasAnyMarks = true;
                  const obt = Number(r.marks) || 0;
                  totalEarned += obt;
                  totalMax += mx;
                  if (obt >= pass) passedSubs++;
                  else anyFail = true;
                } else {
                  totalMax += mx;
                  anyFail = true;
                }
              }
              const pct = hasAnyMarks && totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
              const grade = hasAnyMarks && totalMax > 0 ? getGradeInfo(totalEarned, totalMax, Math.round(totalMax * 0.35)) : null;
              const isPass = hasAnyMarks && !anyFail && totalEarned >= totalMax * 0.35;

              return (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                  <View style={{ flex: 1, backgroundColor: "#f8fafc", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" }}>
                    <Text style={{ fontSize: 9, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" }}>Score</Text>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: Colors.text, marginTop: 2 }}>{hasAnyMarks ? `${totalEarned}/${totalMax}` : "—"}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: "#f8fafc", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" }}>
                    <Text style={{ fontSize: 9, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" }}>Percent</Text>
                    <Text style={{ fontSize: 13, fontWeight: "800", color, marginTop: 2 }}>{hasAnyMarks ? `${pct.toFixed(1)}%` : "—"}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: "#f8fafc", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" }}>
                    <Text style={{ fontSize: 9, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" }}>Grade</Text>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: "#7c3aed", marginTop: 2 }}>{hasAnyMarks && grade ? grade.grade : "—"}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: "#f8fafc", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center" }}>
                    <Text style={{ fontSize: 9, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" }}>Result</Text>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: hasAnyMarks ? (isPass ? Colors.success : Colors.danger) : Colors.textMuted, marginTop: 2 }}>
                      {hasAnyMarks ? (isPass ? "PASS" : "FAIL") : "PENDING"}
                    </Text>
                  </View>
                </View>
              );
            })()}

            <ScrollView horizontal style={{ marginTop: 10, maxHeight: 220 }}>
              <View>
                <View style={[styles.pcTableHead, { backgroundColor: color + "18" }]}>
                  <Text style={[styles.pcTh, { width: 90 }]}>Date</Text>
                  <Text style={[styles.pcTh, { width: 110 }]}>Subject</Text>
                  {(() => {
                    const cols: string[] = [];
                    for (const r of cardGroup?.rows || []) {
                      if (r.splits) {
                        for (const k of Object.keys(r.splits)) {
                          if (!cols.includes(k)) cols.push(k);
                        }
                      }
                    }
                    return cols.map((c) => (
                      <Text key={c} style={[styles.pcTh, { width: 65, textAlign: "center" }]}>
                        {c}
                      </Text>
                    ));
                  })()}
                  <Text style={[styles.pcTh, { width: 50, textAlign: "center" }]}>Max</Text>
                  <Text style={[styles.pcTh, { width: 50, textAlign: "center" }]}>Pass</Text>
                  <Text style={[styles.pcTh, { width: 60, textAlign: "center" }]}>Marks</Text>
                  <Text style={[styles.pcTh, { width: 55, textAlign: "center" }]}>Status</Text>
                </View>
                {(cardGroup?.rows || []).map((r: any, i: number) => {
                  const cols: string[] = [];
                  for (const row of cardGroup?.rows || []) {
                    if (row.splits) {
                      for (const k of Object.keys(row.splits)) {
                        if (!cols.includes(k)) cols.push(k);
                      }
                    }
                  }
                  const maxM = Number(r.maxMarks) || 100;
                  const passM = r.passMarks != null ? Number(r.passMarks) : Math.round(maxM * 0.35);
                  const markVal = r.marks != null && r.marks !== "" ? Number(r.marks) : null;
                  const isPass = markVal != null && markVal >= passM;
                  const rowDate = r.date || r.subjectDate || cardGroup?.dateFrom;

                  return (
                    <View
                      key={i}
                      style={[
                        styles.pcTableRow,
                        i % 2 === 0 && { backgroundColor: "#F8FAFC" },
                      ]}
                    >
                      <Text style={[styles.pcTd, { width: 90, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: Colors.textMuted }]}>
                        {rowDate ? formatDateDDMMYYYY(rowDate) : "—"}
                      </Text>
                      <Text style={[styles.pcTd, { width: 110, fontWeight: "700" }]} numberOfLines={2}>
                        {toTitleCase(
                          r.subject ||
                            r.subjectName ||
                            cardGroup?.subjects?.find((s: any) => s.id === r.subjectId)
                              ?.subjectName ||
                            cardGroup?.examName
                        )}
                      </Text>
                      {cols.map((c) => (
                        <Text key={c} style={[styles.pcTd, { width: 65, textAlign: "center" }]}>
                          {r.splits?.[c] ?? "—"}
                        </Text>
                      ))}
                      <Text style={[styles.pcTd, { width: 50, textAlign: "center", color: Colors.textMuted }]}>
                        {maxM}
                      </Text>
                      <Text style={[styles.pcTd, { width: 50, textAlign: "center", color: Colors.textMuted }]}>
                        {passM}
                      </Text>
                      <Text
                        style={[
                          styles.pcTd,
                          { width: 60, textAlign: "center", fontWeight: "800" },
                        ]}
                      >
                        {r.marks ?? "—"}
                      </Text>
                      <Text
                        style={[
                          styles.pcTd,
                          {
                            width: 55,
                            textAlign: "center",
                            fontWeight: "800",
                            color: r.marks == null ? Colors.textMuted : isPass ? Colors.success : Colors.danger,
                          },
                        ]}
                      >
                        {r.marks == null ? "—" : isPass ? "Pass" : "Fail"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Bottom Action Buttons for Download Image and PDF */}
            <View style={styles.pcFooter}>
              <Pressable
                onPress={handleDownloadProgressImage}
                disabled={downloadingProgressImage}
                style={[styles.pcFooterBtn, { borderColor: color + "55", backgroundColor: color + "12" }]}
                accessibilityLabel="Download Image"
              >
                {downloadingProgressImage ? (
                  <ActivityIndicator size="small" color={color} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={17} color={color} />
                    <Text style={[styles.pcFooterBtnText, { color }]}>Download Image</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={handleDownloadProgressPDF}
                disabled={downloadingProgressPdf}
                style={[styles.pcFooterBtn, { backgroundColor: color }]}
                accessibilityLabel="Download PDF Report"
              >
                {downloadingProgressPdf ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={17} color="#fff" />
                    <Text style={[styles.pcFooterBtnText, { color: "#fff" }]}>Download PDF</Text>
                  </>
                )}
              </Pressable>
            </View>

          </View>

          {/* Dedicated Off-screen High-Resolution Full Progress Card (Matches PDF Exactly) */}
          {!!cardGroup && (
            <View
              ref={printCardRef}
              collapsable={false}
              style={styles.printCardOffscreen}
            >
              {/* 1. Header */}
              <View style={styles.printHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
                  {resolveMediaUrlSync(school?.logoUrl || (user as any)?.schoolLogo, apiBase) ? (
                    <SafeAvatar
                      photoUrl={school?.logoUrl || (user as any)?.schoolLogo}
                      name={school?.name || "S"}
                      apiBase={apiBase}
                      size={52}
                      color={color}
                      round={false}
                    />
                  ) : (
                    <View style={[styles.pcLogoPh, { backgroundColor: color, width: 52, height: 52, borderRadius: 12 }]}>
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>MS</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.printSchoolName}>
                      {school?.name || (user as any)?.schoolName || "My School"}
                    </Text>
                    {!!(school?.location || school?.address) && (
                      <Text style={styles.printSchoolAddr}>
                        {school?.location || school?.address}
                      </Text>
                    )}
                    <Text style={{ fontSize: 11, fontWeight: "800", color, textTransform: "uppercase", marginTop: 3 }}>
                      Official Student Progress Card
                    </Text>
                  </View>
                </View>

                {!!cardGroup?.dateFrom && (
                  <View style={styles.printDateBadge}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#334155", fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                      {formatDateDDMMYYYY(cardGroup.dateFrom)}
                      {cardGroup?.dateTo && cardGroup.dateTo !== cardGroup.dateFrom
                        ? ` → ${formatDateDDMMYYYY(cardGroup.dateTo)}`
                        : ""}
                    </Text>
                  </View>
                )}
              </View>

              {/* 2. Student Info Banner */}
              <View style={styles.printStudentBanner}>
                <SafeAvatar
                  photoUrl={cardGroup?.photoUrl}
                  name={cardGroup?.studentName}
                  apiBase={apiBase}
                  size={56}
                  color={color}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.printStudentName}>{toTitleCase(cardGroup?.studentName || "")}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
                    <Text style={styles.printMeta}>
                      Class: <Text style={{ fontWeight: "700", color: "#0f172a" }}>{cardGroup?.className || "—"}{cardGroup?.section ? `-${cardGroup.section}` : ""}</Text>
                    </Text>
                    {!!cardGroup?.rollNumber && (
                      <Text style={styles.printMeta}>
                        Roll / ID: <Text style={{ fontWeight: "700", color: "#0f172a" }}>{cardGroup.rollNumber}</Text>
                      </Text>
                    )}
                    {!!cardGroup?.parentName && (
                      <Text style={styles.printMeta}>
                        Parent: <Text style={{ fontWeight: "700", color: "#0f172a" }}>{cardGroup.parentName}</Text>
                      </Text>
                    )}
                    {!!cardGroup?.teacherName && (
                      <Text style={styles.printMeta}>
                        Teacher: <Text style={{ fontWeight: "700", color: "#0f172a" }}>{cardGroup.teacherName}</Text>
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.printExamBadge}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Examination</Text>
                  <Text style={{ fontSize: 14, fontWeight: "800", color, marginTop: 2 }}>{toTitleCase(cardGroup?.examName || "")}</Text>
                </View>
              </View>

              {/* 3. Performance KPI 4 Cards */}
              {(() => {
                let totalEarned = 0;
                let totalMax = 0;
                let anyFail = false;
                let passedSubs = 0;
                let hasAnyMarks = false;
                const rows = cardGroup?.rows || [];
                for (const r of rows) {
                  const mx = Number(r.maxMarks) || 100;
                  const pass = r.passMarks != null ? Number(r.passMarks) : Math.round(mx * 0.35);
                  if (r.marks != null && r.marks !== "") {
                    hasAnyMarks = true;
                    const obt = Number(r.marks) || 0;
                    totalEarned += obt;
                    totalMax += mx;
                    if (obt >= pass) passedSubs++;
                    else anyFail = true;
                  } else {
                    totalMax += mx;
                    anyFail = true;
                  }
                }
                const pct = hasAnyMarks && totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;
                const grade = hasAnyMarks && totalMax > 0 ? getGradeInfo(totalEarned, totalMax, Math.round(totalMax * 0.35)) : null;
                const isPass = hasAnyMarks && !anyFail && totalEarned >= totalMax * 0.35;

                return (
                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                    <View style={styles.printKpiCard}>
                      <Text style={styles.printKpiLbl}>Total Score</Text>
                      <Text style={[styles.printKpiVal, { color: "#0f172a" }]}>{hasAnyMarks ? `${totalEarned} / ${totalMax}` : "—"}</Text>
                      <Text style={styles.printKpiSub}>Max Marks: {totalMax}</Text>
                    </View>
                    <View style={styles.printKpiCard}>
                      <Text style={styles.printKpiLbl}>Percentage</Text>
                      <Text style={[styles.printKpiVal, { color }]}>{hasAnyMarks ? `${pct.toFixed(1)}%` : "—"}</Text>
                      <Text style={styles.printKpiSub}>Aggregate</Text>
                    </View>
                    <View style={styles.printKpiCard}>
                      <Text style={styles.printKpiLbl}>Grade</Text>
                      <Text style={[styles.printKpiVal, { color: "#7c3aed" }]}>{hasAnyMarks && grade ? grade.grade : "—"}</Text>
                      <Text style={styles.printKpiSub}>Evaluation</Text>
                    </View>
                    <View style={styles.printKpiCard}>
                      <Text style={styles.printKpiLbl}>Overall Result</Text>
                      <Text style={[styles.printKpiVal, { color: hasAnyMarks ? (isPass ? Colors.success : Colors.danger) : "#94a3b8", fontSize: hasAnyMarks ? 14 : 12 }]}>
                        {hasAnyMarks ? (isPass ? "PASSED" : "FAIL") : "PENDING"}
                      </Text>
                      <Text style={styles.printKpiSub}>{hasAnyMarks ? `${passedSubs}/${rows.length} Passed` : `0/${rows.length} Evaluated`}</Text>
                    </View>
                  </View>
                );
              })()}

              {/* 4. Full Table */}
              <View style={styles.printTableWrap}>
                <View style={styles.printTableHead}>
                  <Text style={[styles.printTh, { width: 95 }]}>Date</Text>
                  <Text style={[styles.printTh, { flex: 1 }]}>Subject</Text>
                  {(() => {
                    const cols: string[] = [];
                    for (const r of cardGroup?.rows || []) {
                      if (r.splits) {
                        for (const k of Object.keys(r.splits)) {
                          if (!cols.includes(k)) cols.push(k);
                        }
                      }
                    }
                    return cols.map((c) => (
                      <Text key={c} style={[styles.printTh, { width: 75, textAlign: "center" }]}>
                        {c}
                      </Text>
                    ));
                  })()}
                  <Text style={[styles.printTh, { width: 55, textAlign: "center" }]}>Max</Text>
                  <Text style={[styles.printTh, { width: 55, textAlign: "center" }]}>Pass</Text>
                  <Text style={[styles.printTh, { width: 65, textAlign: "center" }]}>Obtained</Text>
                  <Text style={[styles.printTh, { width: 65, textAlign: "center" }]}>Status</Text>
                </View>
                {(cardGroup?.rows || []).map((r: any, i: number) => {
                  const cols: string[] = [];
                  for (const row of cardGroup?.rows || []) {
                    if (row.splits) {
                      for (const k of Object.keys(row.splits)) {
                        if (!cols.includes(k)) cols.push(k);
                      }
                    }
                  }
                  const maxM = Number(r.maxMarks) || 100;
                  const passM = r.passMarks != null ? Number(r.passMarks) : Math.round(maxM * 0.35);
                  const markVal = r.marks != null && r.marks !== "" ? Number(r.marks) : null;
                  const isPass = markVal != null && markVal >= passM;
                  const rowDate = r.date || r.subjectDate || cardGroup?.dateFrom;

                  return (
                    <View
                      key={i}
                      style={[
                        styles.printTableRow,
                        i % 2 === 0 ? { backgroundColor: "#ffffff" } : { backgroundColor: "#f8fafc" },
                      ]}
                    >
                      <Text style={[styles.printTd, { width: 95, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: "#64748b" }]}>
                        {rowDate ? formatDateDDMMYYYY(rowDate) : "—"}
                      </Text>
                      <Text style={[styles.printTd, { flex: 1, fontWeight: "700", color: "#0f172a" }]}>
                        {toTitleCase(
                          r.subject ||
                            r.subjectName ||
                            cardGroup?.subjects?.find((s: any) => s.id === r.subjectId)?.subjectName ||
                            cardGroup?.examName
                        )}
                      </Text>
                      {cols.map((c) => (
                        <Text key={c} style={[styles.printTd, { width: 75, textAlign: "center", color: "#475569" }]}>
                          {r.splits?.[c] ?? "—"}
                        </Text>
                      ))}
                      <Text style={[styles.printTd, { width: 55, textAlign: "center", color: "#64748b" }]}>
                        {maxM}
                      </Text>
                      <Text style={[styles.printTd, { width: 55, textAlign: "center", color: "#94a3b8" }]}>
                        {passM}
                      </Text>
                      <Text style={[styles.printTd, { width: 65, textAlign: "center", fontWeight: "800", color: "#0f172a", fontSize: 13 }]}>
                        {r.marks ?? "—"}
                      </Text>
                      <Text
                        style={[
                          styles.printTd,
                          {
                            width: 65,
                            textAlign: "center",
                            fontWeight: "800",
                            color: r.marks == null ? "#94a3b8" : isPass ? "#16a34a" : "#dc2626",
                          },
                        ]}
                      >
                        {r.marks == null ? "—" : isPass ? "Pass" : "Fail"}
                      </Text>
                    </View>
                  );
                })}
                {/* Table Footer Total Summary */}
                {(() => {
                  let tEarned = 0;
                  let tMax = 0;
                  let hasAnyM = false;
                  for (const r of cardGroup?.rows || []) {
                    if (r.marks != null && r.marks !== "") {
                      hasAnyM = true;
                      tEarned += Number(r.marks);
                    }
                    tMax += Number(r.maxMarks) || 100;
                  }
                  const tPct = hasAnyM && tMax > 0 ? (tEarned / tMax) * 100 : 0;
                  const cols: string[] = [];
                  for (const row of cardGroup?.rows || []) {
                    if (row.splits) {
                      for (const k of Object.keys(row.splits)) {
                        if (!cols.includes(k)) cols.push(k);
                      }
                    }
                  }

                  return (
                    <View style={styles.printTableFoot}>
                      <Text style={[styles.printTd, { width: 95, fontWeight: "800", color: "#0f172a" }]}>Total</Text>
                      <Text style={[styles.printTd, { flex: 1, fontWeight: "800", color: "#0f172a" }]}>Assessment</Text>
                      {cols.map((c) => (
                        <Text key={c} style={[styles.printTd, { width: 75, textAlign: "center", color: "#94a3b8" }]}>—</Text>
                      ))}
                      <Text style={[styles.printTd, { width: 55, textAlign: "center", fontWeight: "700", color: "#0f172a" }]}>{tMax}</Text>
                      <Text style={[styles.printTd, { width: 55, textAlign: "center", color: "#94a3b8" }]}>—</Text>
                      <Text style={[styles.printTd, { width: 65, textAlign: "center", fontWeight: "900", color, fontSize: 13 }]}>{hasAnyM ? tEarned : "—"}</Text>
                      <Text style={[styles.printTd, { width: 65, textAlign: "center", fontWeight: "800", color }]}>{hasAnyM ? `${tPct.toFixed(1)}%` : "—"}</Text>
                    </View>
                  );
                })()}
              </View>

              {/* 5. Signatures Section */}
              <View style={styles.printSignatures}>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View style={styles.printSigLine} />
                  <Text style={styles.printSigTitle}>Class Teacher</Text>
                  <Text style={styles.printSigName}>{cardGroup?.teacherName || "Authorized Signature"}</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View style={styles.printSigLine} />
                  <Text style={styles.printSigTitle}>Principal / Head</Text>
                  <Text style={styles.printSigName}>Signature & Verification</Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View style={styles.printSigLine} />
                  <Text style={styles.printSigTitle}>Date & Stamp</Text>
                  <Text style={styles.printSigName}>{new Date().toLocaleDateString("en-GB")}</Text>
                </View>
              </View>

              {/* 6. Footer Note */}
              <View style={styles.printFooterNote}>
                <Text style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
                  This is an official computer-generated progress report issued by {school?.name || (user as any)?.schoolName || "My School"}.
                </Text>
              </View>
            </View>
          )}

          {/* Standard Center-Gray Toast */}
          {!!appModalToast && (
            <View pointerEvents="none" style={styles.modalToastWrap}>
              <Text style={styles.modalToastText} numberOfLines={3}>
                {appModalToast.msg}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  childTabs: {
    minHeight: 48,
    maxHeight: 48,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  childTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: "#fff",
  },
  childName: { fontSize: 13, fontWeight: "700", color: Colors.text },
  childClass: { fontSize: 11, fontWeight: "500", color: Colors.textMuted },
  classNavTabs: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 46,
    maxHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  classNavTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: "#f8fafc",
  },
  classNavTabText: { fontSize: 12, fontWeight: "700", color: Colors.text },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
  },
  rowActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  iconActionBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  title: { fontWeight: "800", fontSize: 15, color: Colors.text, flex: 1 },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "92%",
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: Colors.text, flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pcHeaderIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  modeChip: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
  },
  modeText: { fontWeight: "800", fontSize: 12, color: Colors.text },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  classChipText: { fontWeight: "700", fontSize: 12, color: Colors.text },
  subBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#F8FAFC",
  },
  splitRow: { flexDirection: "row", gap: 8, marginBottom: 6 },

  /* Marks Drawer Specific Styles */
  marksDrawerCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    height: "88%",
    maxHeight: "92%",
  },
  drawerHeaderBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  drawerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
  },
  drawerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  drawerSubjectScroll: {
    marginVertical: 8,
    maxHeight: 40,
  },
  drawerSubjectChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: "#f8fafc",
  },
  drawerSubjectChipText: {
    fontWeight: "700",
    fontSize: 12,
    color: Colors.text,
  },
  drawerBody: {
    flex: 1,
    marginTop: 6,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  studentMarkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    borderRadius: 14,
    marginBottom: 8,
    gap: 8,
  },
  studentInfoLeft: {
    flex: 1.1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  studentNameText: {
    fontWeight: "700",
    fontSize: 13,
    color: Colors.text,
  },
  gradeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  passFailTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  passFailText: {
    fontSize: 10,
    fontWeight: "800",
  },
  totalScoreText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  noMarkText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  splitsContainer: {
    flex: 1.3,
    gap: 4,
  },
  splitRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  splitTitleLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    width: 68,
    textAlign: "right",
  },
  splitInputField: {
    width: 65,
    minHeight: 36,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 0,
    backgroundColor: "#f8fafc",
    fontSize: 13,
    textAlign: "center",
  },
  singleInputContainer: {
    alignItems: "flex-end",
  },
  singleInputField: {
    width: 80,
    minHeight: 40,
    marginBottom: 0,
    backgroundColor: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  cardModalBg: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    maxHeight: "90%",
    overflow: "hidden",
  },
  pcShape1: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -40,
    right: -30,
  },
  pcShape2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 24,
    bottom: 40,
    left: -30,
  },
  pcHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  pcLogoPh: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pcSchool: { fontWeight: "800", fontSize: 16, color: Colors.text },
  pcAddr: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  pcStudent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
  },
  pcName: { fontWeight: "800", fontSize: 16, color: Colors.text },
  pcMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  pcExam: { fontWeight: "700", fontSize: 13, marginTop: 4 },
  pcTableHead: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  pcTh: { fontWeight: "800", fontSize: 11, color: Colors.text },
  pcTableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  pcTd: { fontSize: 12, color: Colors.text },
  pcFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  pcFooterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pcFooterBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  printCardOffscreen: {
    position: "absolute",
    left: -9999,
    top: 0,
    width: 760,
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  printHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 16,
    marginBottom: 16,
    gap: 16,
  },
  printSchoolName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    textTransform: "uppercase",
  },
  printSchoolAddr: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  printDateBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  printStudentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  printStudentName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  printMeta: {
    fontSize: 12,
    color: "#475569",
  },
  printExamBadge: {
    borderLeftWidth: 1,
    borderLeftColor: "#cbd5e1",
    paddingLeft: 14,
    alignItems: "flex-end",
  },
  printKpiCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  printKpiLbl: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  printKpiVal: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 3,
  },
  printKpiSub: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  printTableWrap: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  printTableHead: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  printTh: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  printTableRow: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
  },
  printTableFoot: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1.5,
    borderTopColor: "#cbd5e1",
    alignItems: "center",
  },
  printTd: {
    fontSize: 12,
    color: "#334155",
  },
  printSignatures: {
    flexDirection: "row",
    gap: 20,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  printSigLine: {
    width: "80%",
    borderTopWidth: 1.5,
    borderTopColor: "#cbd5e1",
    marginBottom: 6,
  },
  printSigTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1e293b",
  },
  printSigName: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 2,
  },
  printFooterNote: {
    marginTop: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  modalToastWrap: {
    position: "absolute",
    bottom: 96,
    alignSelf: "center",
    left: 24,
    right: 24,
    zIndex: 999999,
    elevation: 999999,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.78)",
  },
  modalToastText: {
    color: "#E2E8F0",
    fontWeight: "600",
    fontSize: 14,
    flexShrink: 1,
    textAlign: "center",
    lineHeight: 19,
  },
  err: {
    color: Colors.danger,
    fontSize: 11,
    marginTop: -4,
    marginBottom: 6,
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    marginBottom: 8,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  examMenuHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 12,
  },
  examMenuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  examMenuTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
    lineHeight: 22,
  },
  examMenuMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
    flexWrap: "wrap",
  },
  examMenuMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  examMenuBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  examMenuBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
