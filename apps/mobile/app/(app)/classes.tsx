import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, getApiBase } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button, Empty, Input, Label, Loading } from "@/components/ui";
import { SafeAvatar } from "@/components/ChildAvatar";
import { SearchBar, matchesSearch } from "@/components/SearchBar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Colors, spacing, radius } from "@/constants/theme";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";
import { str } from "@/lib/format";

export default function ClassesScreen() {
  const { user, themeColor } = useAuth();
  const toast = useToast();
  const color = themeColor || Colors.primary;
  const canManage = user?.role === "PRINCIPAL" || user?.role === "ADMIN";

  const [list, setList] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const qRef = useRef("");
  qRef.current = q;
  const [apiBase, setApiBase] = useState("");

  // Sub-forms state (class creation, editing, mapping)
  const [formModal, setFormModal] = useState<
    "class" | "edit" | "change_class_teacher" | "map_subject_teacher" | null
  >(null);
  const [detailModal, setDetailModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [confirmDel, setConfirmDel] = useState<any>(null);
  const [deletingClass, setDeletingClass] = useState(false);
  const [confirmDelSubject, setConfirmDelSubject] = useState<{
    id: string;
    teacherName: string;
    subjectName?: string;
  } | null>(null);
  const [deletingSubject, setDeletingSubject] = useState(false);

  // Dropdown Picker State
  const [teacherPickerTarget, setTeacherPickerTarget] = useState<
    "classTeacherForm" | "changeClassTeacher" | "mapSubjectTeacher" | null
  >(null);
  const [teacherSearch, setTeacherSearch] = useState("");

  // Add / Edit form
  const [form, setForm] = useState({
    name: "",
    section: "A",
    classTeacherId: "",
  });
  const [transferData, setTransferData] = useState(true);

  // Detail Drawer state
  const [classDetail, setClassDetail] = useState<any>(null);
  const [classMappings, setClassMappings] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Sub-modal forms for class details
  const [changeClassTeacherId, setChangeClassTeacherId] = useState("");
  const [mapSubjectForm, setMapSubjectForm] = useState({
    teacherId: "",
    subjectName: "",
  });
  const [err, setErr] = useState<Record<string, string>>({});

  const slide = useRef(new Animated.Value(40)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getApiBase().then(setApiBase);
  }, []);

  const openFormModal = (
    type: "class" | "edit" | "change_class_teacher" | "map_subject_teacher",
    cls?: any
  ) => {
    const targetCls = cls || classDetail || selectedClass;
    setSelectedClass(targetCls || null);
    setErr({});

    if (type === "edit" && targetCls) {
      setForm({
        name: targetCls.name || "",
        section: targetCls.section || "A",
        classTeacherId: targetCls.classTeacherId || "",
      });
      setTransferData(true);
    } else if (type === "class") {
      setForm({ name: "", section: "A", classTeacherId: "" });
      setTransferData(true);
    } else if (type === "change_class_teacher") {
      setChangeClassTeacherId(targetCls?.classTeacherId || "");
      setTransferData(true);
    } else if (type === "map_subject_teacher") {
      setMapSubjectForm({ teacherId: "", subjectName: "" });
    }

    setFormModal(type);
    slide.setValue(40);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  };

  const closeFormModal = () => {
    Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setFormModal(null);
    });
  };

  const fetchClasses = useCallback(
    async (targetPage = 1, append = false, searchQuery = qRef.current) => {
      try {
        let url = `/api/classes?page=${targetPage}&limit=20`;
        if (searchQuery && searchQuery.trim()) {
          url += `&q=${encodeURIComponent(searchQuery.trim())}`;
        }
        const [c, u] = await Promise.all([
          api<any>(url),
          api<any>("/api/users/list?role=TEACHER&all=1"),
        ]);
        const fetched = c.classes || [];
        if (append) {
          setList((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const newItems = fetched.filter((item: any) => !existingIds.has(item.id));
            return [...prev, ...newItems];
          });
        } else {
          setList(fetched);
        }
        setTeachers(u.users || []);
        setPage(c.page || targetPage);
        setTotalPages(c.totalPages || 1);
        setTotal(c.total || fetched.length);
      } catch {
        if (!append) setList([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      setQ("");
      qRef.current = "";
      setPage(1);
      setLoading(true);
      fetchClasses(1, false, "");
      return () => {
        setQ("");
        qRef.current = "";
      };
    }, [fetchClasses])
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClasses(1, false, q);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, fetchClasses]);

  const handleLoadMore = () => {
    if (loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchClasses(page + 1, true, qRef.current);
  };

  const loadClassDetail = async (c: any) => {
    if (!c) return;
    setDetailLoading(true);
    try {
      const [mRes, tRes, sRes, cRes] = await Promise.all([
        api<any>(
          `/api/teacher-classes?className=${encodeURIComponent(c.name)}&section=${encodeURIComponent(c.section || "")}`
        ),
        api<any>("/api/users/list?role=TEACHER&all=1"),
        api<any>(
          `/api/users/list?role=STUDENT&all=1&className=${encodeURIComponent(c.name)}&section=${encodeURIComponent(c.section || "")}`
        ),
        api<any>("/api/classes"),
      ]);

      const allTeachers = tRes.users || [];

      // Refresh class object itself and enrich photo
      const freshClass = (cRes.classes || []).find((x: any) => x.id === c.id) || c;
      const ctUser = allTeachers.find((u: any) => u.id === freshClass.classTeacherId);
      freshClass.classTeacherPhotoUrl = ctUser?.photoUrl;
      setClassDetail(freshClass);

      const normCName = (c.name || "").trim().toLowerCase().replace(/^class\s+/i, "");
      const normCSec = (c.section || "").trim().toLowerCase();

      const maps = (mRes.classes || mRes.mappings || []).filter((x: any) => {
        const mName = (x.className || "").trim().toLowerCase().replace(/^class\s+/i, "");
        const mSec = (x.section || "").trim().toLowerCase();
        return mName === normCName && (!normCSec || mSec === normCSec);
      });
      const enriched = maps.map((m: any) => {
        const t = allTeachers.find((x: any) => x.id === m.teacherId);
        return {
          ...m,
          teacherName: t ? `${t.firstName || ""} ${t.lastName || ""}`.trim() : m.teacherId,
          photoUrl: t?.photoUrl,
        };
      });
      setClassMappings(enriched);
      setClassStudents(sRes.users || []);
    } catch {
      /* ignore */
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (c: any) => {
    setClassDetail(c);
    setDetailModal(true);
    setClassMappings([]);
    setClassStudents([]);
    loadClassDetail(c);
  };

  const closeDetail = () => {
    setDetailModal(false);
    setClassDetail(null);
  };

  const saveClass = async () => {
    const cleanName = form.name.trim();
    const cleanSection = form.section.trim().toUpperCase();
    const e: Record<string, string> = {};
    if (!cleanName) e.name = "Class name required";
    if (!cleanSection) e.section = "Section required";

    const duplicate = list.some(
      (c) =>
        c.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        (c.section || "").trim().toUpperCase() === cleanSection
    );
    if (duplicate) {
      e.name = `Class ${cleanName}-${cleanSection} already exists!`;
    }

    setErr(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await api("/api/classes", {
        method: "POST",
        body: {
          name: cleanName,
          section: cleanSection,
          classTeacherId: form.classTeacherId || undefined,
        },
      });
      if (form.classTeacherId) {
        await api("/api/teacher-classes", {
          method: "POST",
          body: {
            teacherId: form.classTeacherId,
            className: cleanName,
            section: cleanSection,
            role: "CLASS_TEACHER",
            transferData: true,
          },
        });
      }
      toast.success("Class created successfully");
      closeFormModal();
      await fetchClasses(1, false, qRef.current);
    } catch (ex: any) {
      toast.error(ex?.message || "Failed to create class");
    } finally {
      setSaving(false);
    }
  };

  const saveEditClass = async () => {
    if (!selectedClass) return;
    const cleanName = form.name.trim();
    const cleanSection = form.section.trim().toUpperCase();
    const e: Record<string, string> = {};
    if (!cleanName) e.name = "Class name required";
    if (!cleanSection) e.section = "Section required";

    const duplicate = list.some(
      (c) =>
        c.id !== selectedClass.id &&
        c.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        (c.section || "").trim().toUpperCase() === cleanSection
    );
    if (duplicate) {
      e.name = `Class ${cleanName}-${cleanSection} already exists!`;
    }

    setErr(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await api("/api/classes", {
        method: "PATCH",
        body: {
          id: selectedClass.id,
          name: cleanName,
          section: cleanSection,
          classTeacherId: form.classTeacherId !== undefined ? form.classTeacherId : "",
          transferData,
        },
      });
      toast.success("Class updated successfully");
      closeFormModal();
      await fetchClasses(1, false, qRef.current);
      if (detailModal && classDetail) {
        await loadClassDetail({ ...selectedClass, name: cleanName, section: cleanSection });
      }
    } catch (ex: any) {
      toast.error(ex?.message || "Failed to update class");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!confirmDel) return;
    setDeletingClass(true);
    try {
      await api(`/api/classes?id=${confirmDel.id}`, { method: "DELETE" });
      toast.success("Class deleted");
      setConfirmDel(null);
      if (detailModal) closeDetail();
      await fetchClasses(1, false, qRef.current);
    } catch (ex: any) {
      toast.error(ex?.message || "Failed to delete class");
    } finally {
      setDeletingClass(false);
    }
  };

  const saveChangeClassTeacher = async () => {
    if (!classDetail) return;
    setSaving(true);
    try {
      if (!changeClassTeacherId) {
        // Unassign / remove class teacher
        await api("/api/classes", {
          method: "PATCH",
          body: {
            id: classDetail.id,
            name: classDetail.name,
            section: classDetail.section,
            classTeacherId: "",
            transferData: false,
          },
        });
        toast.success("Class teacher removed");
      } else {
        await api("/api/classes", {
          method: "PATCH",
          body: {
            id: classDetail.id,
            name: classDetail.name,
            section: classDetail.section,
            classTeacherId: changeClassTeacherId,
            transferData,
          },
        });
        await api("/api/teacher-classes", {
          method: "POST",
          body: {
            teacherId: changeClassTeacherId,
            className: classDetail.name,
            section: classDetail.section || "",
            role: "CLASS_TEACHER",
            transferData,
          },
        });
        toast.success("Class teacher updated");
      }

      closeFormModal();
      await fetchClasses(1, false, qRef.current);
      await loadClassDetail(classDetail);
    } catch (ex: any) {
      toast.error(ex?.message || "Failed to update class teacher");
    } finally {
      setSaving(false);
    }
  };

  const saveMapSubjectTeacher = async () => {
    if (!classDetail) return;
    if (!mapSubjectForm.teacherId) {
      setErr({ teacherId: "Please select a teacher from dropdown" });
      return;
    }
    if (!mapSubjectForm.subjectName.trim()) {
      setErr({ subjectName: "Please enter a subject name" });
      return;
    }

    setSaving(true);
    try {
      await api("/api/teacher-classes", {
        method: "POST",
        body: {
          teacherId: mapSubjectForm.teacherId,
          className: classDetail.name,
          section: classDetail.section || "",
          role: "SUBJECT_TEACHER",
          subjectName: mapSubjectForm.subjectName.trim(),
        },
      });
      toast.success("Subject teacher mapped");
      closeFormModal();
      await fetchClasses(1, false, qRef.current);
      await loadClassDetail(classDetail);
    } catch (ex: any) {
      toast.error(ex?.message || "Failed to map subject teacher");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubjectTeacher = async (mappingId: string) => {
    setDeletingSubject(true);
    try {
      await api(`/api/teacher-classes?id=${encodeURIComponent(mappingId)}`, {
        method: "DELETE",
      });
      toast.success("Subject teacher removed");
      setConfirmDelSubject(null);
      if (classDetail) {
        await loadClassDetail(classDetail);
      }
      await fetchClasses(1, false, qRef.current);
    } catch (ex: any) {
      toast.error(ex?.message || "Failed to remove mapping");
    } finally {
      setDeletingSubject(false);
    }
  };

  if (loading) return <Loading />;

  const selectedClassTeacher = teachers.find((t) => t.id === form.classTeacherId);
  const selectedChangeClassTeacher = teachers.find((t) => t.id === changeClassTeacherId);
  const selectedMapSubjectTeacher = teachers.find((t) => t.id === mapSubjectForm.teacherId);

  const filteredDropdownTeachers = teachers.filter((t) => {
    const full = `${t.firstName || ""} ${t.lastName || ""} ${t.email || ""}`.toLowerCase();
    return full.includes(teacherSearch.toLowerCase());
  });

  return (
    <View style={styles.root}>
      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Search class, section, teacher…"
      />
      {canManage && (
        <View style={{ paddingHorizontal: spacing.md, marginBottom: 8 }}>
          <Button
            title="+ Add New Class"
            color={color}
            onPress={() => openFormModal("class")}
          />
        </View>
      )}

      {/* Total Classes Count Indicator */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.md,
          marginBottom: 4,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: color + "14",
            paddingHorizontal: 10,
            paddingVertical: 4.5,
            borderRadius: 10,
          }}
        >
          <Ionicons name="school" size={14} color={color} />
          <Text style={{ color, fontWeight: "800", fontSize: 12 }}>
            Total Classes: {total || list.length}
          </Text>
        </View>
        {q ? (
          <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "600" }}>
            Showing {list.length} of {total || list.length}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={list}
        keyExtractor={(item, i) => item.id || String(i)}
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
              fetchClasses(1, false, qRef.current);
            }}
            tintColor={color}
          />
        }
        ListEmptyComponent={
          <Empty
            message={
              q
                ? "No classes match your query"
                : "No classes created yet. Tap '+ Add New Class' to set up classes."
            }
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => openDetail(item)}
            onLongPress={() => {
              if (canManage) setConfirmDel(item);
            }}
            delayLongPress={450}
          >
            {/* Class Icon */}
            <View style={[styles.icon, { backgroundColor: color + "14" }]}>
              <Ionicons name="school" size={22} color={color} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {str(item.name)}
                {item.section ? ` - Section ${str(item.section)}` : ""}
              </Text>

              {/* Class Teacher row with clean Ionicons, NO emojis */}
              {item.classTeacherName ? (
                <View style={styles.cardMetaRow}>
                  <Ionicons name="person-outline" size={14} color="#64748B" />
                  <Text style={styles.meta} numberOfLines={1}>
                    Class Teacher: {item.classTeacherName}
                  </Text>
                </View>
              ) : (
                <View style={styles.cardMetaRow}>
                  <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
                  <Text style={[styles.meta, { color: "#D97706" }]} numberOfLines={1}>
                    No Class Teacher assigned
                  </Text>
                </View>
              )}
            </View>

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </Pressable>
        )}
      />

      {/* Class Details Drawer */}
      <Modal visible={detailModal} transparent animationType="slide" onRequestClose={closeDetail}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>
                {classDetail?.name}
                {classDetail?.section ? ` - Section ${classDetail.section}` : ""}
              </Text>
              <Text style={styles.detailSub}>Class Details & Teacher Mappings</Text>
            </View>

            <Pressable onPress={closeDetail} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1, padding: spacing.md }} showsVerticalScrollIndicator={false}>
            {detailLoading ? (
              <Loading />
            ) : (
              <>
                {/* Class Teacher Section */}
                <Text style={styles.sectionHeading}>Class Teacher</Text>
                <View style={styles.detailBox}>
                  {classDetail?.classTeacherName ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <SafeAvatar
                        photoUrl={classDetail?.classTeacherPhotoUrl}
                        name={classDetail.classTeacherName}
                        apiBase={apiBase}
                        size={46}
                        color={color}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailPersonName}>{classDetail.classTeacherName}</Text>
                        <Text style={styles.detailPersonRole}>Primary Class Teacher</Text>
                      </View>
                      {canManage && (
                        <Pressable
                          onPress={() => openFormModal("change_class_teacher", classDetail)}
                          style={[styles.smallOutlineBtn, { borderColor: color }]}
                        >
                          <Text style={{ color, fontSize: 12, fontWeight: "700" }}>Change</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
                        <Text style={{ color: "#D97706", fontSize: 13, fontWeight: "600" }}>
                          No Class Teacher assigned
                        </Text>
                      </View>
                      {canManage && (
                        <Pressable
                          onPress={() => openFormModal("change_class_teacher", classDetail)}
                          style={[styles.smallOutlineBtn, { borderColor: color }]}
                        >
                          <Text style={{ color, fontSize: 12, fontWeight: "700" }}>+ Assign</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>

                {/* Subject Teachers Section */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 18,
                    marginBottom: 8,
                  }}
                >
                  <Text style={styles.sectionHeading}>Subject Teachers</Text>
                  {canManage && (
                    <Pressable onPress={() => openFormModal("map_subject_teacher", classDetail)}>
                      <Text style={{ color, fontWeight: "700", fontSize: 13 }}>+ Map Subject</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.detailBox}>
                  {classMappings.filter((m) => m.role === "SUBJECT_TEACHER").length === 0 ? (
                    <Text style={{ color: Colors.textMuted, fontSize: 13, paddingVertical: 4 }}>
                      No subject teachers mapped yet.
                    </Text>
                  ) : (
                    classMappings
                      .filter((m) => m.role === "SUBJECT_TEACHER")
                      .map((m, idx) => (
                        <View
                          key={m.id || idx}
                          style={[styles.teacherRow, idx > 0 && styles.rowBorder]}
                        >
                          <SafeAvatar
                            photoUrl={m.photoUrl}
                            name={m.teacherName}
                            apiBase={apiBase}
                            size={40}
                            color={color}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.detailPersonName}>{m.teacherName}</Text>
                            <Text style={styles.detailPersonRole}>
                              Subject: {m.subjectName || "General"}
                            </Text>
                          </View>
                          {canManage && (
                            <Pressable
                              onPress={() =>
                                setConfirmDelSubject({
                                  id: m.id,
                                  teacherName: m.teacherName,
                                  subjectName: m.subjectName,
                                })
                              }
                              style={[styles.smallBtn, { backgroundColor: "#FEE2E2" }]}
                              hitSlop={8}
                            >
                              <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                            </Pressable>
                          )}
                        </View>
                      ))
                  )}
                </View>

                {/* Enrolled Students Total Count & Navigation */}
                <Text style={[styles.sectionHeading, { marginTop: 20, marginBottom: 8 }]}>
                  Enrolled Students
                </Text>
                <Pressable
                  style={styles.enrolledStudentsCard}
                  onPress={() => {
                    closeDetail();
                    router.push({
                      pathname: "/(app)/students",
                      params: {
                        className: classDetail?.name,
                        section: classDetail?.section || "",
                      },
                    });
                  }}
                >
                  <View style={[styles.studentsIconWrap, { backgroundColor: color + "14" }]}>
                    <Ionicons name="people" size={24} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.enrolledStudentsTitle}>
                      {classStudents.length} {classStudents.length === 1 ? "Student" : "Students"} Enrolled
                    </Text>
                    <Text style={styles.enrolledStudentsSub}>
                      Tap to view and manage students of this class
                    </Text>
                  </View>
                  <View style={styles.viewStudentsBtn}>
                    <Text style={[styles.viewStudentsText, { color }]}>View All</Text>
                    <Ionicons name="chevron-forward" size={16} color={color} />
                  </View>
                </Pressable>

                <View style={{ height: 40 }} />
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add / Edit Class Modal */}
      <Modal
        visible={formModal === "class" || formModal === "edit"}
        transparent
        animationType="none"
        onRequestClose={closeFormModal}
      >
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeFormModal} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>
                {formModal === "class"
                  ? "Create New Class"
                  : `Edit Class (${selectedClass?.name}-${selectedClass?.section})`}
              </Text>
              <Pressable onPress={closeFormModal} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Label>Class Name *</Label>
              <Input
                value={form.name}
                placeholder="e.g. Class 10"
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              />
              {!!err.name && <Text style={styles.err}>{err.name}</Text>}

              <Label>Section *</Label>
              <Input
                value={form.section}
                placeholder="A"
                onChangeText={(t) => setForm((f) => ({ ...f, section: t }))}
                autoCapitalize="characters"
              />
              {!!err.section && <Text style={styles.err}>{err.section}</Text>}

              {/* Class Teacher Select Dropdown */}
              <Label>Class Teacher</Label>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => {
                  setTeacherSearch("");
                  setTeacherPickerTarget("classTeacherForm");
                }}
              >
                {selectedClassTeacher ? (
                  <View style={styles.dropdownSelectedRow}>
                    <SafeAvatar
                      name={selectedClassTeacher.firstName}
                      photoUrl={selectedClassTeacher.photoUrl}
                      apiBase={apiBase}
                      size={28}
                      color={color}
                    />
                    <Text style={styles.dropdownSelectedText}>
                      {selectedClassTeacher.firstName} {selectedClassTeacher.lastName || ""}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.dropdownPlaceholder}>No Teacher Assigned</Text>
                )}
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </Pressable>

              {formModal === "edit" &&
                form.classTeacherId !== (selectedClass?.classTeacherId || "") && (
                  <View style={styles.transferBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.transferTitle}>Transfer Class Data</Text>
                      <Text style={styles.transferDesc}>
                        Transfer exams, homework and attendance history to the new class teacher.
                      </Text>
                    </View>
                    <Switch
                      value={transferData}
                      onValueChange={setTransferData}
                      trackColor={{ true: color, false: "#CBD5E1" }}
                    />
                  </View>
                )}

              <View style={{ height: 16 }} />
              <Button
                title={saving ? "Saving…" : formModal === "class" ? "Create Class" : "Save Changes"}
                color={color}
                loading={saving}
                onPress={formModal === "class" ? saveClass : saveEditClass}
              />
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Change Class Teacher Modal */}
      <Modal
        visible={formModal === "change_class_teacher"}
        transparent
        animationType="none"
        onRequestClose={closeFormModal}
      >
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeFormModal} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>
                Change Class Teacher · {classDetail?.name}
                {classDetail?.section ? `-${classDetail.section}` : ""}
              </Text>
              <Pressable onPress={closeFormModal} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.roleBanner}>
                <Ionicons name="shield-checkmark" size={18} color={color} />
                <Text style={[styles.roleBannerText, { color }]}>
                  Mapping Role: Class Teacher (Primary)
                </Text>
              </View>

              <Label>Select Teacher</Label>
              <Pressable
                style={styles.dropdownTrigger}
                onPress={() => {
                  setTeacherSearch("");
                  setTeacherPickerTarget("changeClassTeacher");
                }}
              >
                {selectedChangeClassTeacher ? (
                  <View style={styles.dropdownSelectedRow}>
                    <SafeAvatar
                      name={selectedChangeClassTeacher.firstName}
                      photoUrl={selectedChangeClassTeacher.photoUrl}
                      apiBase={apiBase}
                      size={28}
                      color={color}
                    />
                    <Text style={styles.dropdownSelectedText}>
                      {selectedChangeClassTeacher.firstName}{" "}
                      {selectedChangeClassTeacher.lastName || ""}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dropdownSelectedRow}>
                    <Ionicons name="person-remove-outline" size={20} color="#64748B" />
                    <Text style={styles.dropdownPlaceholder}>No Teacher (Unassigned)</Text>
                  </View>
                )}
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </Pressable>

              {changeClassTeacherId !== (classDetail?.classTeacherId || "") && (
                !changeClassTeacherId ? (
                  <View style={styles.deleteWarningBox}>
                    <Ionicons name="warning-outline" size={20} color={Colors.danger} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deleteWarningTitle}>Unassign Class Teacher</Text>
                      <Text style={styles.deleteWarningDesc}>
                        Removing the primary class teacher will unmap them. Any teacher-specific class data links will be removed.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.transferBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.transferTitle}>Transfer Class Data</Text>
                      <Text style={styles.transferDesc}>
                        Transfer exams, homework and attendance history to the new class teacher.
                      </Text>
                    </View>
                    <Switch
                      value={transferData}
                      onValueChange={setTransferData}
                      trackColor={{ true: color, false: "#CBD5E1" }}
                    />
                  </View>
                )
              )}

              <View style={{ height: 18 }} />
              <Button
                title={saving ? "Saving…" : "Save Class Teacher"}
                color={color}
                loading={saving}
                onPress={saveChangeClassTeacher}
              />
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Map Subject Teacher Modal */}
      <Modal
        visible={formModal === "map_subject_teacher"}
        transparent
        animationType="none"
        onRequestClose={closeFormModal}
      >
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeFormModal} />
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>
                Map Subject Teacher · {classDetail?.name}
                {classDetail?.section ? `-${classDetail.section}` : ""}
              </Text>
              <Pressable onPress={closeFormModal} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.roleBanner}>
                <Ionicons name="book" size={18} color="#059669" />
                <Text style={[styles.roleBannerText, { color: "#059669" }]}>
                  Mapping Role: Subject Teacher
                </Text>
              </View>

              <Label>Select Teacher *</Label>
              <Pressable
                style={[styles.dropdownTrigger, !!err.teacherId && styles.dropdownTriggerErr]}
                onPress={() => {
                  setTeacherSearch("");
                  setTeacherPickerTarget("mapSubjectTeacher");
                }}
              >
                {selectedMapSubjectTeacher ? (
                  <View style={styles.dropdownSelectedRow}>
                    <SafeAvatar
                      name={selectedMapSubjectTeacher.firstName}
                      photoUrl={selectedMapSubjectTeacher.photoUrl}
                      apiBase={apiBase}
                      size={28}
                      color={color}
                    />
                    <Text style={styles.dropdownSelectedText}>
                      {selectedMapSubjectTeacher.firstName}{" "}
                      {selectedMapSubjectTeacher.lastName || ""}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.dropdownPlaceholder}>Select Teacher from Dropdown...</Text>
                )}
                <Ionicons name="chevron-down" size={18} color="#64748B" />
              </Pressable>
              {!!err.teacherId && <Text style={styles.err}>{err.teacherId}</Text>}

              <Label>Subject Name *</Label>
              <Input
                value={mapSubjectForm.subjectName}
                placeholder="e.g. Mathematics, Science, English"
                onChangeText={(t) => {
                  setMapSubjectForm((f) => ({ ...f, subjectName: t }));
                  setErr((e) => ({ ...e, subjectName: "" }));
                }}
              />
              {!!err.subjectName && <Text style={styles.err}>{err.subjectName}</Text>}

              <View style={{ height: 18 }} />
              <Button
                title={saving ? "Saving…" : "Save Subject Mapping"}
                color={color}
                loading={saving}
                onPress={saveMapSubjectTeacher}
              />
            </ScrollView>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Teacher Dropdown Selector Modal */}
      <Modal visible={teacherPickerTarget !== null} transparent animationType="fade">
        <View style={styles.pickerBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTeacherPickerTarget(null)} />
          <View style={styles.pickerCard}>
            <View style={styles.pickerHead}>
              <Text style={styles.pickerTitle}>Select Teacher</Text>
              <Pressable onPress={() => setTeacherPickerTarget(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </Pressable>
            </View>

            <SearchBar
              value={teacherSearch}
              onChangeText={setTeacherSearch}
              placeholder="Search by name or email…"
            />

            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
              {/* "No Teacher" option for Class Teacher selections */}
              {(teacherPickerTarget === "classTeacherForm" ||
                teacherPickerTarget === "changeClassTeacher") && (
                <Pressable
                  style={[
                    styles.pickerItem,
                    ((teacherPickerTarget === "classTeacherForm" && !form.classTeacherId) ||
                      (teacherPickerTarget === "changeClassTeacher" && !changeClassTeacherId)) && {
                      backgroundColor: color + "14",
                    },
                  ]}
                  onPress={() => {
                    if (teacherPickerTarget === "classTeacherForm") {
                      setForm((f) => ({ ...f, classTeacherId: "" }));
                    } else {
                      setChangeClassTeacherId("");
                    }
                    setTeacherPickerTarget(null);
                  }}
                >
                  <View style={[styles.noneIcon, { backgroundColor: "#FEE2E2" }]}>
                    <Ionicons name="person-remove-outline" size={20} color={Colors.danger} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pickerItemName, { color: Colors.danger }]}>
                      No Teacher
                    </Text>
                    <Text style={styles.pickerItemSub}>No primary class teacher assigned</Text>
                  </View>
                  {((teacherPickerTarget === "classTeacherForm" && !form.classTeacherId) ||
                    (teacherPickerTarget === "changeClassTeacher" && !changeClassTeacherId)) && (
                    <Ionicons name="checkmark-circle" size={20} color={color} />
                  )}
                </Pressable>
              )}

              {filteredDropdownTeachers.map((t) => {
                const isSelected =
                  teacherPickerTarget === "classTeacherForm"
                    ? form.classTeacherId === t.id
                    : teacherPickerTarget === "changeClassTeacher"
                    ? changeClassTeacherId === t.id
                    : mapSubjectForm.teacherId === t.id;

                return (
                  <Pressable
                    key={t.id}
                    style={[styles.pickerItem, isSelected && { backgroundColor: color + "14" }]}
                    onPress={() => {
                      if (teacherPickerTarget === "classTeacherForm") {
                        setForm((f) => ({ ...f, classTeacherId: t.id }));
                      } else if (teacherPickerTarget === "changeClassTeacher") {
                        setChangeClassTeacherId(t.id);
                      } else {
                        setMapSubjectForm((f) => ({ ...f, teacherId: t.id }));
                        setErr((e) => ({ ...e, teacherId: "" }));
                      }
                      setTeacherPickerTarget(null);
                    }}
                  >
                    <SafeAvatar photoUrl={t.photoUrl} name={t.firstName} apiBase={apiBase} size={36} color={color} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.pickerItemName}>
                        {t.firstName} {t.lastName || ""}
                      </Text>
                      <Text style={styles.pickerItemSub}>{t.email || t.phone || "Teacher"}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={color} />}
                  </Pressable>
                );
              })}

              {filteredDropdownTeachers.length === 0 && (
                <Text style={styles.pickerEmpty}>No teachers found</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={!!confirmDel}
        title="Delete Class"
        message={`Are you sure you want to delete ${confirmDel?.name}${confirmDel?.section ? `-${confirmDel.section}` : ""}? This will unmap teachers from this class.`}
        confirmText="Delete Class"
        destructive
        loading={deletingClass}
        onConfirm={handleDeleteClass}
        onCancel={() => !deletingClass && setConfirmDel(null)}
      />

      {/* Delete Subject Teacher Confirmation Modal */}
      <ConfirmModal
        visible={!!confirmDelSubject}
        title="Remove Subject Teacher"
        message={`Are you sure you want to remove ${confirmDelSubject?.teacherName || "this teacher"}${confirmDelSubject?.subjectName ? ` for ${confirmDelSubject.subjectName}` : ""}?`}
        confirmText="Remove"
        destructive
        loading={deletingSubject}
        onConfirm={() => {
          if (confirmDelSubject) {
            handleRemoveSubjectTeacher(confirmDelSubject.id);
          }
        }}
        onCancel={() => !deletingSubject && setConfirmDelSubject(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontWeight: "800", fontSize: 15, color: Colors.text },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  meta: { fontSize: 12, color: Colors.textMuted },
  smallBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  smallOutlineBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginBottom: 12,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: Colors.text, flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  roleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  roleBannerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  err: { color: Colors.danger, fontSize: 12, marginTop: 4, marginBottom: 4 },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    marginBottom: 8,
  },
  dropdownTriggerErr: {
    borderColor: Colors.danger,
  },
  dropdownSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: 16,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  pickerHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    marginBottom: 4,
  },
  noneIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  pickerItemSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  pickerEmpty: {
    textAlign: "center",
    paddingVertical: 20,
    color: Colors.textMuted,
    fontSize: 13,
  },
  transferBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
    gap: 10,
  },
  transferTitle: { fontSize: 13, fontWeight: "700", color: "#166534" },
  transferDesc: { fontSize: 11, color: "#15803D", marginTop: 1 },
  detailBackdrop: { flex: 1, backgroundColor: Colors.background },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  detailSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailBox: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailPersonName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  detailPersonRole: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  teacherRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  rowBorder: { borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  enrolledStudentsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  studentsIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  enrolledStudentsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  enrolledStudentsSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  viewStudentsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewStudentsText: {
    fontSize: 13,
    fontWeight: "700",
  },
  deleteWarningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    padding: 12,
    marginTop: 14,
  },
  deleteWarningTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.danger,
    marginBottom: 2,
  },
  deleteWarningDesc: {
    fontSize: 12,
    color: "#991B1B",
    lineHeight: 16,
  },
});

