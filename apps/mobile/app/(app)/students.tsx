import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  LayoutAnimation,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { api, getApiBase, resolveMediaUrlSync } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Badge, Button, Empty, Input, Label, Loading } from "@/components/ui";
import { SafeAvatar } from "@/components/ChildAvatar";
import { PhoneField } from "@/components/PhoneField";
import { Colors, spacing, radius } from "@/constants/theme";
import { str, formatDateDDMMYYYY, cleanPhone } from "@/lib/format";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CredentialsModal, Credentials } from "@/components/CredentialsModal";
import { BulkStudentUploadModal } from "@/components/BulkStudentUploadModal";
import { SearchBar } from "@/components/SearchBar";
import { useToast } from "@/hooks/useToast";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";

type TeacherClass = { className: string; section?: string; role?: string };

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "MALE",
  rollNumber: "",
  dateOfBirth: "",
  parentName: "",
  parentEmail: "",
  photoUrl: "",
  className: "",
  section: "A",
};

type FieldErr = Partial<Record<keyof typeof emptyForm, string>>;

export default function StudentsScreen() {
  const { user, themeColor } = useAuth();
  const color = themeColor || Colors.primary;
  const toast = useToast();
  const params = useLocalSearchParams<{ className?: string; section?: string; _t?: string }>();
  const [q, setQ] = useState("");
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [allRegisteredClasses, setAllRegisteredClasses] = useState<{ className: string; section?: string }[]>([]);
  const [classCounts, setClassCounts] = useState<Record<string, number>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const active = classes[activeIdx];
  const isTeacher = user?.role === "TEACHER";
  const isAdmin = ["ADMIN", "PRINCIPAL"].includes(user?.role || "");

  const [list, setList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Bulk Selection States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkChangeModal, setShowBulkChangeModal] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkActionSaving, setBulkActionSaving] = useState(false);
  const [targetClassSection, setTargetClassSection] = useState<string>("");

  const [modal, setModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FieldErr>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [apiBase, setApiBase] = useState("");
  const [showDob, setShowDob] = useState(false);
  const [confirmDel, setConfirmDel] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const lastParamsKeyRef = React.useRef<string>("");
  const activeIdxRef = React.useRef<number>(0);
  activeIdxRef.current = activeIdx;
  const classesRef = React.useRef<TeacherClass[]>([]);
  classesRef.current = classes;
  const qRef = React.useRef<string>("");
  qRef.current = q;

  const classTeacherClasses = useMemo(() => {
    if (!isTeacher) return classes;
    return classes.filter((c) => c.role === "CLASS_TEACHER");
  }, [classes, isTeacher]);

  const isCurrentTabClassTeacher =
    isAdmin ||
    (!isTeacher
      ? true
      : active?.role === "CLASS_TEACHER" ||
        classTeacherClasses.some(
          (c) =>
            c.className?.toLowerCase() === active?.className?.toLowerCase() &&
            (!c.section || !active?.section || c.section?.toLowerCase() === active?.section?.toLowerCase())
        ));

  const canAddStudent = isCurrentTabClassTeacher;

  const canManageStudent = (item: any) => {
    if (!item) return false;
    if (isAdmin) return true;
    if (!isTeacher) return false;
    return classTeacherClasses.some(
      (c) =>
        c.className?.toLowerCase() === String(item.className || "").toLowerCase() &&
        (!c.section || !item.section || c.section?.toLowerCase() === String(item.section || "").toLowerCase())
    );
  };

  useEffect(() => {
    getApiBase().then(setApiBase);
  }, []);

  // Load Classes Metadata & Badge Counts
  const loadMetadata = useCallback(async () => {
    try {
      if (isTeacher) {
        const [tc, stRes, cRes] = await Promise.all([
          api<any>("/api/teacher-classes"),
          api<any>("/api/teacher-classes?students=1&all=1").catch(() => null),
          api<any>("/api/classes?all=1").catch(() => null),
        ]);
        const cls: TeacherClass[] = tc.classes || [];
        setClasses(cls);
        classesRef.current = cls;
        if (cRes && cRes.classes) {
          setAllRegisteredClasses(
            cRes.classes.map((x: any) => ({
              className: x.name || x.className,
              section: x.section,
            }))
          );
        } else {
          setAllRegisteredClasses(
            cls.map((x) => ({ className: x.className, section: x.section }))
          );
        }

        const counts: Record<string, number> = {};
        const allStudents = stRes?.students || [];
        allStudents.forEach((s: any) => {
          if (s.className) {
            const key = `${s.className.toLowerCase()}||${(s.section || "").toLowerCase()}`;
            counts[key] = (counts[key] || 0) + 1;
          }
        });
        setClassCounts(counts);

        // Adopt initial query params
        const currentParamKey = `${params.className || ""}_${params.section || ""}_${params._t || ""}`;
        if (params.className && currentParamKey !== lastParamsKeyRef.current && cls.length > 0) {
          lastParamsKeyRef.current = currentParamKey;
          const matchedIdx = cls.findIndex(
            (c) =>
              c.className?.toLowerCase() === params.className?.toLowerCase() &&
              (!params.section || !c.section || c.section?.toLowerCase() === params.section?.toLowerCase())
          );
          if (matchedIdx >= 0) {
            setActiveIdx(matchedIdx);
            activeIdxRef.current = matchedIdx;
          }
        }
        return cls;
      } else {
        const [cRes, allRes] = await Promise.all([
          api<any>("/api/classes?all=1").catch(() => ({ classes: [] })),
          api<any>("/api/users/list?role=STUDENT&all=1").catch(() => ({ users: [] })),
        ]);
        const rawClasses = cRes.classes || [];
        const cls: TeacherClass[] = [
          { className: "All", section: "", role: "ALL" },
          ...rawClasses.map((x: any) => ({
            className: x.name || x.className,
            section: x.section,
            role: "CLASS",
          })),
        ];
        setClasses(cls);
        classesRef.current = cls;
        setAllRegisteredClasses(
          rawClasses.map((x: any) => ({
            className: x.name || x.className,
            section: x.section,
          }))
        );

        const counts: Record<string, number> = {};
        (allRes.users || []).forEach((s: any) => {
          if (s.className) {
            const key = `${s.className.toLowerCase()}||${(s.section || "").toLowerCase()}`;
            counts[key] = (counts[key] || 0) + 1;
          }
        });
        counts["all||"] = allRes.total || (allRes.users || []).length;
        setClassCounts(counts);

        const currentParamKey = `${params.className || ""}_${params.section || ""}_${params._t || ""}`;
        if (params.className && currentParamKey !== lastParamsKeyRef.current && cls.length > 0) {
          lastParamsKeyRef.current = currentParamKey;
          const matchedIdx = cls.findIndex(
            (c) =>
              c.className?.toLowerCase() === params.className?.toLowerCase() &&
              (!params.section || !c.section || c.section?.toLowerCase() === params.section?.toLowerCase())
          );
          if (matchedIdx >= 0) {
            setActiveIdx(matchedIdx);
            activeIdxRef.current = matchedIdx;
          }
        }
        return cls;
      }
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [isTeacher, params.className, params.section, params._t]);

  // Load Students from API with server pagination, query and class filter
  const fetchStudents = useCallback(
    async (
      targetPage = 1,
      append = false,
      searchQuery = qRef.current,
      tabIdx = activeIdxRef.current,
      currentClasses = classesRef.current
    ) => {
      try {
        const activeClass = currentClasses[tabIdx];
        let url = `/api/users/list?role=STUDENT&page=${targetPage}&limit=20`;
        if (searchQuery && searchQuery.trim()) {
          url += `&q=${encodeURIComponent(searchQuery.trim())}`;
        }
        if (activeClass && activeClass.className && activeClass.className !== "All" && activeClass.role !== "ALL") {
          url += `&className=${encodeURIComponent(activeClass.className)}`;
          if (activeClass.section) {
            url += `&section=${encodeURIComponent(activeClass.section)}`;
          }
        }

        const data = await api<any>(url);
        const fetched = data.users || [];
        if (append) {
          setList((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = fetched.filter((item: any) => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        } else {
          setList(fetched);
        }
        setPage(data.page || targetPage);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || fetched.length);
      } catch (err) {
        if (!append) setList([]);
      } finally {
        setLoading(false);
        setTabLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setQ("");
      qRef.current = "";
      setSelectedIds([]);
      setIsSelectionMode(false);
      setLoading(true);

      (async () => {
        try {
          const cls = await loadMetadata();
          if (isMounted) {
            fetchStudents(1, false, "", activeIdxRef.current, cls);
          }
        } catch {
          if (isMounted) {
            setLoading(false);
            setTabLoading(false);
          }
        }
      })();

      return () => {
        isMounted = false;
        setQ("");
        qRef.current = "";
        setSelectedIds([]);
        setIsSelectionMode(false);
      };
    }, [loadMetadata, fetchStudents])
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedIds([]);
      fetchStudents(1, false, q, activeIdxRef.current, classesRef.current);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, fetchStudents]);

  const onSelectTab = (idx: number) => {
    if (idx === activeIdx && !tabLoading) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveIdx(idx);
    activeIdxRef.current = idx;
    setSelectedIds([]);
    setIsSelectionMode(false);
    setQ("");
    qRef.current = "";
    setTabLoading(true);
    fetchStudents(1, false, "", idx, classesRef.current);
  };

  const handleEndReached = () => {
    if (loading || loadingMore || tabLoading || page >= totalPages) return;
    setLoadingMore(true);
    fetchStudents(page + 1, true, qRef.current, activeIdxRef.current, classesRef.current);
  };

  const getStudentCountForClass = useCallback(
    (c: TeacherClass) => {
      if (!c) return 0;
      if (c.className === "All" || c.role === "ALL") {
        return classCounts["all||"] || classCounts["ALL"] || total || 0;
      }
      const key = `${c.className.toLowerCase()}||${(c.section || "").toLowerCase()}`;
      return classCounts[key] || 0;
    },
    [classCounts, total]
  );

  // Selection actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === list.length && list.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map((s) => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionSaving(true);
    try {
      const res = await api<any>("/api/students/bulk-action", {
        method: "POST",
        body: { action: "delete", studentIds: selectedIds },
      });
      toast.success(res.message || `Deleted ${selectedIds.length} student(s)`);
      setSelectedIds([]);
      setIsSelectionMode(false);
      setShowBulkDeleteConfirm(false);
      loadMetadata();
      fetchStudents(1, false, qRef.current, activeIdxRef.current, classesRef.current);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete students");
    } finally {
      setBulkActionSaving(false);
    }
  };

  const handleBulkChangeClass = async () => {
    if (selectedIds.length === 0 || !targetClassSection) return;
    const [tClass, tSection] = targetClassSection.split("||");
    setBulkActionSaving(true);
    try {
      const res = await api<any>("/api/students/bulk-action", {
        method: "POST",
        body: {
          action: "change-class",
          studentIds: selectedIds,
          className: tClass,
          section: tSection || "A",
        },
      });
      toast.success(res.message || "Class updated for selected students");
      setSelectedIds([]);
      setIsSelectionMode(false);
      setShowBulkChangeModal(false);
      loadMetadata();
      fetchStudents(1, false, qRef.current, activeIdxRef.current, classesRef.current);
    } catch (e: any) {
      toast.error(e?.message || "Failed to change class");
    } finally {
      setBulkActionSaving(false);
    }
  };

  const validate = () => {
    const e: FieldErr = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      e.email = "Enter a valid email";
    if (!form.phone?.trim()) e.phone = "Phone is required";
    else if (form.phone.replace(/\D/g, "").length < 8)
      e.phone = "Enter a valid phone number";
    if (form.rollNumber?.trim() && !/^\d+$/.test(form.rollNumber.trim()))
      e.rollNumber = "Roll number must contain only numbers";
    if (!form.className.trim() && !active?.className) e.className = "Class is required" as any;
    if (!form.parentName?.trim()) e.parentName = "Parent name is required";
    if (!editingId) {
      if (!form.dateOfBirth.trim()) e.dateOfBirth = "Date of birth is required";
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth))
        e.dateOfBirth = "Use YYYY-MM-DD";
      if (!form.parentEmail.trim()) e.parentEmail = "Parent email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail.trim()))
        e.parentEmail = "Enter a valid parent email";
    } else if (form.parentEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.parentEmail.trim())) {
      e.parentEmail = "Enter a valid parent email";
    }
    if (
      form.email.trim() &&
      form.parentEmail.trim() &&
      form.email.trim().toLowerCase() === form.parentEmail.trim().toLowerCase()
    ) {
      e.parentEmail = "Student email and Parent email cannot be the same";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Allow photo library access");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const asset = res.assets[0];
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as any);
      const base = await getApiBase();
      const token = await (await import("@/lib/api")).getToken();
      const uploadRes = await fetch(`${base}/api/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(data.error || "Upload failed");
      setForm((f) => ({ ...f, photoUrl: data.url }));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    const available = isTeacher ? classTeacherClasses : allRegisteredClasses;
    const defaultCls =
      available.find(
        (c) =>
          c.className &&
          c.className !== "All" &&
          c.className?.toLowerCase() === active?.className?.toLowerCase() &&
          (!c.section || !active?.section || c.section?.toLowerCase() === active?.section?.toLowerCase())
      ) || available.find((c) => c.className && c.className !== "All") || available[0];
    setForm({
      ...emptyForm,
      rollNumber: "",
      className: (active?.className && active?.className !== "All" ? active?.className : defaultCls?.className) || user?.className || "",
      section: (active?.className && active?.className !== "All" ? active?.section : defaultCls?.section) || "A",
    });
    setErrors({});
    setModal(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      firstName: s.firstName || "",
      lastName: s.lastName || "",
      email: s.email || "",
      phone: s.phone || "",
      gender: s.gender || "MALE",
      rollNumber: s.rollNumber || s.rollNo || "",
      dateOfBirth: s.dateOfBirth || "",
      parentName: s.parentName || "",
      parentEmail: s.parentEmail || "",
      photoUrl: s.photoUrl || "",
      className: s.className || "",
      section: s.section || "A",
    });
    setErrors({});
    setModal(true);
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api(`/api/users/${editingId}`, {
          method: "PATCH",
          body: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            gender: form.gender,
            rollNumber: form.rollNumber?.trim() || undefined,
            parentName: form.parentName,
            parentEmail: form.parentEmail,
            photoUrl: form.photoUrl || undefined,
            className: form.className || active?.className || user?.className,
            section: form.section || active?.section || "A",
          },
        });
        toast.success("Student updated");
      } else {
        const body = {
          role: "STUDENT",
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          gender: form.gender,
          rollNumber: form.rollNumber?.trim() || undefined,
          dateOfBirth: form.dateOfBirth,
          parentName: form.parentName,
          parentEmail: form.parentEmail,
          photoUrl: form.photoUrl || undefined,
          className: form.className || active?.className || user?.className || "",
          section: form.section || active?.section || "A",
        };
        if (!body.className) {
          toast.error("No class selected");
          setSaving(false);
          return;
        }
        const res = await api<any>("/api/users/create", { method: "POST", body });
        toast.success("Student enrolled successfully");
        if (res.credentials) {
          setCredentials(res.credentials);
        }
      }
      setModal(false);
      loadMetadata();
      fetchStudents(1, false, q, activeIdx);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const photoUri = resolveMediaUrlSync(form.photoUrl, apiBase);
  const selectableClasses = isTeacher ? classTeacherClasses : classes;

  if (loading) return <Loading />;

  if (isTeacher && classes.length === 0) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center", padding: spacing.xl }]}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 24,
            backgroundColor: "#FEF3C7",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "#FDE68A",
          }}
        >
          <Ionicons name="school-outline" size={36} color="#D97706" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.text, textAlign: "center", marginBottom: 6 }}>
          No classes allocated for you
        </Text>
        <Text style={{ fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 18 }}>
          You are not assigned to any classes yet. Please contact your school administrator to allocate classes to your account.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {classes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{ alignItems: "center", paddingRight: 12 }}>
          {classes.map((c, i) => {
            const on = i === activeIdx;
            const count = getStudentCountForClass(c);
            return (
              <Pressable
                key={`${c.className}-${c.section}-${i}`}
                onPress={() => onSelectTab(i)}
                style={[styles.tab, on && { backgroundColor: color, borderColor: color }]}
              >
                <Text style={[styles.tabText, on && { color: "#fff" }]}>
                  {c.className === "All" ? "All" : `${c.className}${c.section ? `-${c.section}` : ""}`} [{count}]
                  {c.role === "CLASS_TEACHER" ? " ★" : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <SearchBar value={q} onChangeText={setQ} placeholder="Search name, roll, email, class…" />

      {/* Action Buttons Row with Smooth Animated Mode Switch (Only for Class Teacher & Admins) */}
      {canAddStudent && (
        <View
          style={{
            paddingHorizontal: spacing.md,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          {isSelectionMode ? (
            // In Selection Mode: Add Student & Bulk Upload morph into Change Class & Delete
            <>
              <Pressable
                onPress={() => {
                  if (selectedIds.length === 0) {
                    toast.error("Select at least 1 student first");
                    return;
                  }
                  if (allRegisteredClasses.length > 0) {
                    const first = allRegisteredClasses[0];
                    setTargetClassSection(`${first.className}||${first.section || ""}`);
                  }
                  setShowBulkChangeModal(true);
                }}
                style={{
                  flex: 1,
                  height: 42,
                  backgroundColor: selectedIds.length > 0 ? color : "#E2E8F0",
                  borderRadius: radius.md,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  shadowColor: selectedIds.length > 0 ? color : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: selectedIds.length > 0 ? 2 : 0,
                }}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={18}
                  color={selectedIds.length > 0 ? "#fff" : "#94A3B8"}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: selectedIds.length > 0 ? "#fff" : "#94A3B8",
                  }}
                >
                  Change Class
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (selectedIds.length === 0) {
                    toast.error("Select at least 1 student first");
                    return;
                  }
                  setShowBulkDeleteConfirm(true);
                }}
                style={{
                  flex: 1,
                  height: 42,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  backgroundColor: selectedIds.length > 0 ? "#FEE2E2" : "#F1F5F9",
                  borderWidth: 1.2,
                  borderColor: selectedIds.length > 0 ? "#FECACA" : "#E2E8F0",
                  borderRadius: radius.md,
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={17}
                  color={selectedIds.length > 0 ? "#DC2626" : "#94A3B8"}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: selectedIds.length > 0 ? "#DC2626" : "#94A3B8",
                  }}
                >
                  {selectedIds.length > 0 ? `Delete (${selectedIds.length})` : "Delete"}
                </Text>
              </Pressable>

              {/* Icon-only Cancel Selection Button */}
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setIsSelectionMode(false);
                  setSelectedIds([]);
                }}
                hitSlop={8}
                style={{
                  width: 42,
                  height: 42,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#FEE2E2",
                  borderWidth: 1.2,
                  borderColor: "#FECACA",
                  borderRadius: radius.md,
                }}
              >
                <Ionicons name="close" size={20} color="#DC2626" />
              </Pressable>
            </>
          ) : (
            // In Normal Mode: Add Student & Bulk Upload + Icon-only Select Button
            <>
              <Pressable
                onPress={openAdd}
                style={{
                  flex: 1,
                  height: 42,
                  backgroundColor: color,
                  borderRadius: radius.md,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  shadowColor: color,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 3,
                  elevation: 2,
                }}
              >
                <Ionicons name="add" size={17} color="#fff" />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
                  Add Student
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setBulkModal(true)}
                style={{
                  flex: 1,
                  height: 42,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  backgroundColor: "#ECFDF5",
                  borderWidth: 1.2,
                  borderColor: "#A7F3D0",
                  borderRadius: radius.md,
                }}
              >
                <Ionicons name="document-text-outline" size={17} color="#059669" />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#047857" }}>
                  Bulk Upload
                </Text>
              </Pressable>

              {/* Icon-only Multiselect Toggle Button */}
              <Pressable
                onPress={() => {
                  if (list.length === 0) {
                    toast.error("No students to select");
                    return;
                  }
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setIsSelectionMode(true);
                }}
                hitSlop={8}
                style={{
                  width: 42,
                  height: 42,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#F1F5F9",
                  borderWidth: 1.2,
                  borderColor: "#CBD5E1",
                  borderRadius: radius.md,
                  opacity: list.length > 0 ? 1 : 0.6,
                }}
              >
                <Ionicons name="checkbox-outline" size={20} color={color} />
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Bulk Selection Header Bar (Only visible when isSelectionMode is active) */}
      {isSelectionMode && (
        <View
          style={{
            marginHorizontal: spacing.md,
            marginBottom: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: "#EEF2FF",
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: "#C7D2FE",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: color,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
                {selectedIds.length}
              </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.text }}>
              {selectedIds.length === 1 ? "1 selected" : `${selectedIds.length} selected`}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={toggleSelectAll} hitSlop={8}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: color }}>
                {selectedIds.length === list.length && list.length > 0 ? "Deselect All" : "Select All"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSelectedIds([]);
              }}
              hitSlop={8}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textMuted }}>
                Clear
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {tabLoading ? (
        <Loading />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item, i) => item.id || String(i)}
          onEndReached={handleEndReached}
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
                setSelectedIds([]);
                loadMetadata();
                fetchStudents(1, false, qRef.current, activeIdxRef.current, classesRef.current);
              }}
              tintColor={color}
            />
          }
          ListEmptyComponent={<Empty message="No students found" />}
          renderItem={({ item }) => {
            const isSelected = selectedIds.includes(item.id);
            const canManage = canManageStudent(item);
            return (
              <Pressable
                style={[
                  styles.card,
                  isSelected && {
                    backgroundColor: "#F5F3FF",
                    borderColor: color,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => {
                  if (isSelectionMode && canManage) {
                    toggleSelect(item.id);
                  } else {
                    setDetail(item);
                  }
                }}
                onLongPress={() => {
                  if (!canManage) return;
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setIsSelectionMode(true);
                  toggleSelect(item.id);
                }}
                delayLongPress={300}
              >
                {canManage && isSelectionMode && (
                  <Pressable
                    hitSlop={10}
                    onPress={() => toggleSelect(item.id)}
                    style={{ paddingRight: 4 }}
                  >
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={22}
                      color={isSelected ? color : Colors.textMuted}
                    />
                  </Pressable>
                )}
                <SafeAvatar
                  photoUrl={item.photoUrl}
                  name={item.firstName}
                  apiBase={apiBase}
                  size={46}
                  color={color}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {str(item.firstName)} {str(item.lastName)}
                  </Text>
                  <Text style={styles.meta}>
                    Roll: {item.rollNumber || item.rollNo || "-"} · {str(item.className)}
                    {item.section ? ` · ${str(item.section)}` : ""} · {str(item.email)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Bulk Change Class Modal */}
      <Modal
        visible={showBulkChangeModal}
        animationType="slide"
        transparent
        onRequestClose={() => !bulkActionSaving && setShowBulkChangeModal(false)}
      >
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                Change Class ({selectedIds.length} Students)
              </Text>
              <Pressable
                onPress={() => !bulkActionSaving && setShowBulkChangeModal(false)}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            <Text style={{ fontSize: 13, color: Colors.textMuted, marginBottom: 14 }}>
              Select the registered school class and section to move selected students into:
            </Text>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {allRegisteredClasses.length === 0 ? (
                <Text style={{ padding: 16, textAlign: "center", color: Colors.textMuted }}>
                  No registered classes found
                </Text>
              ) : (
                allRegisteredClasses.map((c, idx) => {
                  const key = `${c.className}||${c.section || ""}`;
                  const isChosen = targetClassSection === key;
                  return (
                    <Pressable
                      key={`${key}-${idx}`}
                      onPress={() => setTargetClassSection(key)}
                      style={{
                        padding: 14,
                        borderRadius: radius.md,
                        borderWidth: 1.5,
                        borderColor: isChosen ? color : Colors.border,
                        backgroundColor: isChosen ? "#EEF2FF" : "#fff",
                        marginBottom: 8,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Ionicons
                          name={isChosen ? "radio-button-on" : "radio-button-off"}
                          size={20}
                          color={isChosen ? color : Colors.textMuted}
                        />
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: isChosen ? "800" : "600",
                            color: isChosen ? color : Colors.text,
                          }}
                        >
                          {c.className} {c.section ? `· Section ${c.section}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <View style={{ marginTop: 16 }}>
              <Button
                title={bulkActionSaving ? "Updating..." : "Confirm & Move Students"}
                color={color}
                loading={bulkActionSaving}
                onPress={handleBulkChangeClass}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        visible={showBulkDeleteConfirm}
        title={`Remove ${selectedIds.length} Students?`}
        message={`Are you sure you want to remove ${selectedIds.length} selected student(s)? This action cannot be undone.`}
        confirmText="Delete Selected"
        destructive
        loading={bulkActionSaving}
        onCancel={() => !bulkActionSaving && setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
      />

      {/* Student Detail Modal */}
      <Modal visible={!!detail} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Student Details</Text>
              <Pressable onPress={() => setDetail(null)} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            {detail && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <SafeAvatar
                    photoUrl={detail.photoUrl}
                    name={detail.firstName}
                    apiBase={apiBase}
                    size={88}
                    color={color}
                  />
                  <Text style={[styles.name, { fontSize: 18, marginTop: 10 }]}>
                    {str(detail.firstName)} {str(detail.lastName)}
                  </Text>
                  <Badge
                    text={`Class: ${str(detail.className || "—")}${detail.section ? ` · Section ${detail.section}` : ""}`}
                    color={color}
                  />
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="id-card-outline" size={18} color={color} />
                  <Text style={styles.infoText}>Roll No: {detail.rollNumber || detail.rollNo || "-"}</Text>
                </View>

                {!!detail.phone && (
                  <Pressable
                    style={styles.infoRow}
                    onPress={() => Linking.openURL(`tel:${cleanPhone(detail.phone)}`)}
                  >
                    <Ionicons name="call" size={18} color={color} />
                    <Text style={styles.infoText}>{cleanPhone(detail.phone)}</Text>
                  </Pressable>
                )}

                {!!detail.email && (
                  <Pressable
                    style={styles.infoRow}
                    onPress={() => Linking.openURL(`mailto:${detail.email}`)}
                  >
                    <Ionicons name="mail" size={18} color={color} />
                    <Text style={styles.infoText}>{detail.email}</Text>
                  </Pressable>
                )}

                {!!detail.dateOfBirth && (
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar" size={18} color={color} />
                    <Text style={styles.infoText}>DOB: {formatDateDDMMYYYY(detail.dateOfBirth)}</Text>
                  </View>
                )}

                {!!detail.gender && (
                  <View style={styles.infoRow}>
                    <Ionicons name="person" size={18} color={color} />
                    <Text style={styles.infoText}>Gender: {detail.gender}</Text>
                  </View>
                )}

                {!!detail.parentName && (
                  <View style={styles.infoRow}>
                    <Ionicons name="people" size={18} color={color} />
                    <Text style={styles.infoText}>Parent: {detail.parentName}</Text>
                  </View>
                )}

                {!!detail.parentEmail && (
                  <Pressable
                    style={styles.infoRow}
                    onPress={() => Linking.openURL(`mailto:${detail.parentEmail}`)}
                  >
                    <Ionicons name="mail-outline" size={18} color={color} />
                    <Text style={styles.infoText}>{detail.parentEmail}</Text>
                  </Pressable>
                )}

                {canManageStudent(detail) && (
                  <View style={{ marginTop: 20 }}>
                    <Button
                      title="Edit student"
                      color={color}
                      onPress={() => {
                        const s = detail;
                        setDetail(null);
                        openEdit(s);
                      }}
                    />
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add / Edit Student Modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                {editingId ? "Edit student" : "Add student"}
              </Text>
              <Pressable onPress={() => setModal(false)} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Pressable style={styles.photoPick} onPress={pickPhoto}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoBig} />
                ) : (
                  <View style={[styles.photoBig, styles.photoPh]}>
                    <Ionicons name="camera" size={28} color={Colors.textMuted} />
                    <Text style={styles.photoHint}>{uploading ? "Uploading…" : "Add photo"}</Text>
                  </View>
                )}
              </Pressable>

              <Label>First name *</Label>
              <Input
                value={form.firstName}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, firstName: t }));
                  setErrors((e) => ({ ...e, firstName: undefined }));
                }}
              />
              {!!errors.firstName && <Text style={styles.err}>{errors.firstName}</Text>}

              <Label>Last name</Label>
              <Input
                value={form.lastName}
                onChangeText={(t) => setForm((f) => ({ ...f, lastName: t }))}
              />

              <Label>Roll number (optional)</Label>
              <Input
                value={form.rollNumber}
                placeholder="e.g. 101"
                keyboardType="number-pad"
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, rollNumber: t }));
                  setErrors((e) => ({ ...e, rollNumber: undefined }));
                }}
              />
              {!!errors.rollNumber && <Text style={styles.err}>{errors.rollNumber}</Text>}

              <Label>Email *</Label>
              <Input
                value={form.email}
                autoCapitalize="none"
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, email: t }));
                  setErrors((e) => ({ ...e, email: undefined }));
                }}
              />
              {!!errors.email && <Text style={styles.err}>{errors.email}</Text>}

              <Label>Phone *</Label>
              <PhoneField
                value={form.phone}
                onChange={(full) => {
                  setForm((f) => ({ ...f, phone: full }));
                  setErrors((e) => ({ ...e, phone: undefined }));
                }}
                error={errors.phone}
              />
              {!!errors.phone && <Text style={styles.err}>{errors.phone}</Text>}

              <Label>Gender</Label>
              <View style={styles.genderRow}>
                {["MALE", "FEMALE", "OTHER"].map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setForm((f) => ({ ...f, gender: g }))}
                    style={[
                      styles.genderChip,
                      form.gender === g && { backgroundColor: color, borderColor: color },
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        form.gender === g && { color: "#fff" },
                      ]}
                    >
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {!editingId && (
                <>
                  <Label>Date of birth *</Label>
                  <Pressable style={styles.dobBtn} onPress={() => setShowDob(true)}>
                    <Ionicons name="calendar-outline" size={18} color={color} />
                    <Text style={styles.dobText}>
                      {form.dateOfBirth ? formatDateDDMMYYYY(form.dateOfBirth) : "Select date"}
                    </Text>
                  </Pressable>
                  {!!errors.dateOfBirth && (
                    <Text style={styles.err}>{errors.dateOfBirth}</Text>
                  )}
                  {showDob && (
                    <DateTimePicker
                      value={
                        form.dateOfBirth
                          ? new Date(form.dateOfBirth)
                          : new Date(2012, 0, 1)
                      }
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      maximumDate={new Date()}
                      onChange={(_, date) => {
                        if (Platform.OS !== "ios") setShowDob(false);
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, "0");
                          const d = String(date.getDate()).padStart(2, "0");
                          setForm((f) => ({ ...f, dateOfBirth: `${y}-${m}-${d}` }));
                          setErrors((e) => ({ ...e, dateOfBirth: undefined }));
                        }
                      }}
                    />
                  )}
                  {Platform.OS === "ios" && showDob && (
                    <Button title="Done" variant="outline" color={color} onPress={() => setShowDob(false)} />
                  )}
                </>
              )}

              <Label>Class *</Label>
              {selectableClasses.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {selectableClasses.map((c, i) => {
                    const cn = c.className || "";
                    const sec = c.section || "";
                    const on = form.className === cn && form.section === (sec || form.section);
                    const selected = sec ? on : form.className === cn;
                    return (
                      <Pressable
                        key={`${cn}-${sec}-${i}`}
                        onPress={() =>
                          setForm((f) => ({
                            ...f,
                            className: cn,
                            section: sec || "A",
                          }))
                        }
                        style={[
                          styles.genderChip,
                          selected && { backgroundColor: color, borderColor: color },
                        ]}
                      >
                        <Text style={[styles.genderText, selected && { color: "#fff" }]}>
                          {cn}{sec ? `-${sec}` : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <Input
                  value={form.className}
                  placeholder="e.g. Class 10"
                  onChangeText={(txt) => setForm((f) => ({ ...f, className: txt }))}
                />
              )}
              {!!(errors as any).className && (
                <Text style={styles.err}>{(errors as any).className}</Text>
              )}
              {selectableClasses.length === 0 && (
                <>
                  <Label>Section</Label>
                  <Input
                    value={form.section}
                    placeholder="A"
                    onChangeText={(txt) => setForm((f) => ({ ...f, section: txt }))}
                  />
                </>
              )}
              <Label>Parent name *</Label>
              <Input
                value={form.parentName}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, parentName: t }));
                  setErrors((e) => ({ ...e, parentName: undefined }));
                }}
              />
              {!!errors.parentName && (
                <Text style={styles.err}>{errors.parentName}</Text>
              )}

              <Label>Parent email {!editingId ? "*" : ""}</Label>
              <Input
                value={form.parentEmail}
                autoCapitalize="none"
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, parentEmail: t }));
                  setErrors((e) => ({ ...e, parentEmail: undefined }));
                }}
              />
              {!!errors.parentEmail && (
                <Text style={styles.err}>{errors.parentEmail}</Text>
              )}

              <Button
                title={editingId ? "Save changes" : "Create student"}
                color={color}
                loading={saving}
                onPress={save}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Single Delete Confirm Modal */}
      <ConfirmModal
        visible={!!confirmDel}
        title="Remove student?"
        message={confirmDel ? `${str(confirmDel.firstName)} ${str(confirmDel.lastName)}`.trim() : ""}
        confirmText="Delete"
        destructive
        loading={deleting}
        onCancel={() => !deleting && setConfirmDel(null)}
        onConfirm={async () => {
          const item = confirmDel;
          if (!item?.id) return;
          setDeleting(true);
          try {
            await api(`/api/users/${item.id}`, { method: "DELETE" });
            toast.success("Student removed");
            setConfirmDel(null);
            loadMetadata();
            fetchStudents(page, false, q, activeIdx);
          } catch (e: any) {
            toast.error(e?.message || "Could not delete");
          } finally {
            setDeleting(false);
          }
        }}
      />

      {/* Credentials Modal */}
      <CredentialsModal
        visible={!!credentials}
        credentials={credentials}
        color={color}
        title="Student Enrolled"
        subtitle="Credentials for both Student and Parent login"
        onClose={() => setCredentials(null)}
      />

      {/* Bulk Upload Modal */}
      <BulkStudentUploadModal
        visible={bulkModal}
        onClose={() => setBulkModal(false)}
        color={color}
        isTeacher={isTeacher}
        onSuccess={async () => {
          loadMetadata();
          fetchStudents(1, false, q, activeIdx);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  tabs: { height: 48, flexGrow: 0, flexShrink: 0, paddingHorizontal: spacing.md, marginTop: 8, marginBottom: 4 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  tabText: { fontWeight: "700", fontSize: 13, color: Colors.text },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 42, height: 42, borderRadius: 14 },
  letter: { fontWeight: "800", color: "#4F46E5" },
  name: { fontWeight: "700", fontSize: 15, color: Colors.text },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
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
    marginBottom: 8,
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
  photoPick: { alignItems: "center", marginBottom: 12 },
  photoBig: { width: 96, height: 96, borderRadius: 28 },
  photoPh: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
  },
  photoHint: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  err: { color: Colors.danger, fontSize: 12, marginTop: 4, marginBottom: 4 },
  genderRow: { flexDirection: "row", gap: 8, marginTop: 4, marginBottom: 8 },
  genderChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  genderText: { fontWeight: "700", fontSize: 12, color: Colors.text },
  dobBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dobText: { fontSize: 16, color: Colors.text, fontWeight: "600" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
});
