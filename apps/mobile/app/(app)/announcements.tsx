import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useBadges } from "@/hooks/useBadges";
import { useToast } from "@/hooks/useToast";
import { Badge, Button, Empty, Input, Label, Loading } from "@/components/ui";
import { SearchBar, matchesSearch } from "@/components/SearchBar";
import { Colors, spacing, radius } from "@/constants/theme";
import { str, formatDateTimeDDMMYYYY, getDayWiseLabel } from "@/lib/format";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";
import { ConfirmModal } from "@/components/ConfirmModal";

type Item = {
  id: string;
  title: string;
  content?: string;
  target?: string;
  className?: string;
  section?: string;
  createdById?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt?: string;
};

function formatNoticeDate(iso?: string) {
  return formatDateTimeDDMMYYYY(iso);
}

export default function AnnouncementsScreen() {
  const { user, themeColor } = useAuth();
  const badges = useBadges();
  const badgesRef = useRef(badges);
  badgesRef.current = badges;
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstSearch = useRef(true);
  const toast = useToast();
  const params = useLocalSearchParams<{ highlightId?: string }>();
  const color = themeColor || Colors.primary;
  const canPost = ["ADMIN", "PRINCIPAL", "TEACHER"].includes(user?.role || "");

  const [list, setList] = useState<Item[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const qRef = useRef("");
  qRef.current = q;
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "",
    content: "",
    target: user?.role === "TEACHER" ? "CLASS" : "ALL",
  });
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [formErr, setFormErr] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [highlightId, setHighlightId] = useState<string | undefined>(
    params.highlightId
  );

  const fetchClassesMeta = useCallback(async () => {
    if (user?.role === "TEACHER") {
      try {
        const tc = await api<any>("/api/teacher-classes");
        const raw = tc.classes || [];
        const seen = new Set<string>();
        const filtered = raw.filter((c: any) => {
          const k = `${c.className || c.name || ""}|${c.section || ""}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        setClasses(filtered);
        if (filtered.length > 0 && selectedClasses.length === 0) {
          const first = filtered[0];
          setSelectedClasses([`${first.className || first.name || ""}|${first.section || ""}`]);
        }
      } catch {
        setClasses([]);
      }
    } else if (user?.role === "PRINCIPAL" || user?.role === "ADMIN") {
      try {
        const c = await api<any>("/api/classes");
        const cls = c.classes || [];
        setClasses(cls);
      } catch {
        setClasses([]);
      }
    }
  }, [user?.role]);

  const fetchAnnouncements = useCallback(
    async (targetPage = 1, append = false, searchQuery = qRef.current, isSearch = false) => {
      if (isSearch) {
        setListLoading(true);
      }
      try {
        let url = `/api/announcements?page=${targetPage}&limit=20`;
        if (searchQuery && searchQuery.trim()) {
          url += `&q=${encodeURIComponent(searchQuery.trim())}`;
        }
        const data = await api<{ announcements?: Item[]; total?: number; totalPages?: number; page?: number }>(url);
        const next = data.announcements || [];
        if (append) {
          setList((prev) => {
            const existingIds = new Set(prev.map((x) => x.id));
            const newItems = next.filter((x) => !existingIds.has(x.id));
            return [...prev, ...newItems];
          });
        } else {
          setList(next);
        }
        setPage(data.page || targetPage);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || next.length);

        const unseenIds = next.map((x) => x.id).filter((id) => id && !seenIdsRef.current.has(id));
        if (unseenIds.length) {
          unseenIds.forEach((id) => seenIdsRef.current.add(id));
          badgesRef.current?.markAnnouncementsSeen(unseenIds);
        }
      } catch {
        if (!append) setList([]);
      } finally {
        setLoading(false);
        setListLoading(false);
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
      fetchClassesMeta();
      fetchAnnouncements(1, false, "", false);
      if (params.highlightId) {
        setHighlightId(String(params.highlightId));
        const t = setTimeout(() => setHighlightId(undefined), 4000);
        return () => clearTimeout(t);
      }
      return () => {
        setQ("");
        qRef.current = "";
      };
    }, [fetchClassesMeta, fetchAnnouncements, params.highlightId])
  );

  // Debounced search
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    setListLoading(true);
    const timer = setTimeout(() => {
      fetchAnnouncements(1, false, q, true);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, fetchAnnouncements]);

  const handleLoadMore = () => {
    if (loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchAnnouncements(page + 1, true, qRef.current);
  };

  const openAdd = () => {
    const first = classes[0];
    const initialClasses = first ? [`${first.className || first.name || ""}|${first.section || ""}`] : [];
    setSelectedClasses(initialClasses);
    setForm({
      title: "",
      content: "",
      target: user?.role === "TEACHER" ? "CLASS" : "ALL",
    });
    setTargetPickerOpen(false);
    setFormErr({});
    setModal(true);
  };

  const toggleClassSelection = (key: string) => {
    setSelectedClasses((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
    setFormErr((e) => ({ ...e, classes: "" }));
  };

  const selectAllClasses = () => {
    if (selectedClasses.length === classes.length) {
      // Keep only first
      if (classes[0]) {
        setSelectedClasses([`${classes[0].className || classes[0].name || ""}|${classes[0].section || ""}`]);
      }
    } else {
      setSelectedClasses(
        classes.map((c: any) => `${c.className || c.name || ""}|${c.section || ""}`)
      );
    }
    setFormErr((e) => ({ ...e, classes: "" }));
  };

  const save = async () => {
    if (saving) return;
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.content.trim()) e.content = "Content is required";
    if ((user?.role === "TEACHER" || form.target === "CLASS") && selectedClasses.length === 0) {
      e.classes = "Please select at least one class";
    }
    setFormErr(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const classObjs = selectedClasses.map((k) => {
        const [cn, sec] = k.split("|");
        return { className: cn, section: sec || undefined };
      });
      await api("/api/announcements", {
        method: "POST",
        body: {
          title: form.title.trim(),
          content: form.content.trim(),
          target: form.target,
          classes: classObjs,
          className: classObjs.map((c) => (c.section ? `${c.className}-${c.section}` : c.className)).join(", "),
        },
      });
      setModal(false);
      toast.success("Notice posted");
      await fetchAnnouncements(1, false, "");
    } catch (err: any) {
      toast.error(err?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const onLongPress = (item: Item) => {
    const own = item.createdById === user?.id;
    if (!own) {
      toast.error("You can only delete your own notices");
      return;
    }
    setConfirmDel(item);
  };

  if (loading && list.length === 0) return <Loading />;

  return (
    <View style={styles.root}>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search notices…" />
      {canPost && (
        <View style={{ paddingHorizontal: spacing.md, marginBottom: 4 }}>
          <Button title="+ Add Notice" color={color} onPress={openAdd} />
        </View>
      )}
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
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
          paddingTop: 4,
          flexGrow: 1,
          paddingBottom: TAB_BAR_CLEARANCE,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchClassesMeta();
              fetchAnnouncements(1, false, qRef.current);
            }}
            tintColor={color}
          />
        }
        ListEmptyComponent={
          listLoading ? (
            <ActivityIndicator size="large" color={color} style={{ marginVertical: 32 }} />
          ) : (
            <Empty message={q.trim() ? "No matching notices found" : "No notices yet"} />
          )
        }
        renderItem={({ item, index }) => {
          const currDay = getDayWiseLabel(item.createdAt);
          const prevDay = index > 0 ? getDayWiseLabel(list[index - 1]?.createdAt) : null;
          const showDayHeader = currDay !== prevDay;
          const hi = highlightId && highlightId === item.id;

          return (
            <View key={item.id}>
              {showDayHeader && (
                <View style={styles.daySeparatorWrap}>
                  <View style={styles.daySeparatorLine} />
                  <View style={styles.daySeparatorBadge}>
                    <Text style={styles.daySeparatorText}>{currDay}</Text>
                  </View>
                  <View style={styles.daySeparatorLine} />
                </View>
              )}
              <Pressable
                onLongPress={() => canPost && onLongPress(item)}
                delayLongPress={450}
                style={[
                  styles.card,
                  hi ? { borderColor: color, borderWidth: 2, backgroundColor: color + "10" } : undefined,
                ]}
              >
                <View style={styles.row}>
                  <Text style={styles.title}>{str(item.title)}</Text>
                  {item.target ? <Badge text={str(item.target)} color={color} /> : null}
                </View>
                {item.content ? (
                  <Text style={styles.body}>{str(item.content)}</Text>
                ) : null}
                <View style={styles.cardFooter}>
                  <Text style={styles.authorText} numberOfLines={1}>
                    {item.createdByName || ""}
                  </Text>
                  <Text style={styles.dateText}>
                    {formatNoticeDate(item.createdAt)}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        }}
      />

      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>New Notice</Text>
              <Pressable onPress={() => setModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="always">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, title: t }));
                  setFormErr((e) => ({ ...e, title: "" }));
                }}
              />
              {!!formErr.title && <Text style={styles.err}>{formErr.title}</Text>}
              <Label>Content *</Label>
              <Input
                value={form.content}
                multiline
                style={{ minHeight: 100, textAlignVertical: "top" }}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, content: t }));
                  setFormErr((e) => ({ ...e, content: "" }));
                }}
              />
              {!!formErr.content && <Text style={styles.err}>{formErr.content}</Text>}

              {/* Target / Who can receive dropdown field */}
              <View style={{ marginTop: 12 }}>
                <Label>Who Can Receive *</Label>
                {(() => {
                  const targetOptions = user?.role === "TEACHER"
                    ? ([
                        { id: "CLASS", label: "Students & Parents" },
                        { id: "STUDENTS_ONLY", label: "Students only" },
                        { id: "PARENTS_ONLY", label: "Parents only" },
                      ] as const)
                    : ([
                        { id: "ALL", label: "Everyone" },
                        { id: "CLASS", label: "Specific Classes" },
                        { id: "STUDENTS_ONLY", label: "Students only" },
                        { id: "PARENTS_ONLY", label: "Parents only" },
                        { id: "TEACHERS_ONLY", label: "Teachers only" },
                      ] as const);

                  const activeOption = targetOptions.find((o) => o.id === form.target) || targetOptions[0];

                  return (
                    <View style={{ marginTop: 4 }}>
                      <Pressable
                        onPress={() => setTargetPickerOpen((v) => !v)}
                        style={styles.dropdownBtn}
                      >
                        <Text style={styles.dropdownBtnText}>{activeOption?.label}</Text>
                        <Ionicons
                          name={targetPickerOpen ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={Colors.textMuted}
                        />
                      </Pressable>

                      {targetPickerOpen && (
                        <View style={styles.dropdownMenu}>
                          {targetOptions.map((opt) => {
                            const on = form.target === opt.id;
                            return (
                              <Pressable
                                key={opt.id}
                                onPress={() => {
                                  setForm((f) => ({ ...f, target: opt.id }));
                                  setTargetPickerOpen(false);
                                }}
                                style={[styles.dropdownItem, on && { backgroundColor: color + "12" }]}
                              >
                                <Text style={[styles.dropdownItemText, on && { color, fontWeight: "700" }]}>
                                  {opt.label}
                                </Text>
                                {on && <Ionicons name="checkmark-circle" size={18} color={color} />}
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>

              {/* Multi-Select Class Section */}
              {(user?.role === "TEACHER" || form.target === "CLASS" || form.target === "STUDENTS_ONLY" || form.target === "PARENTS_ONLY") && classes.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Label>Select Classes (Multi-select) *</Label>
                    <Pressable onPress={selectAllClasses} style={{ paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color }}>
                        {selectedClasses.length === classes.length ? "Deselect All" : "Select All"}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 2 }}>
                    {classes.map((c: any, i: number) => {
                      const cn = c.className || c.name || "";
                      const sec = c.section || "";
                      const key = `${cn}|${sec}`;
                      const isSelected = selectedClasses.includes(key);
                      return (
                        <Pressable
                          key={i}
                          onPress={() => toggleClassSelection(key)}
                          style={[
                            styles.chip,
                            isSelected && { backgroundColor: color, borderColor: color },
                          ]}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Ionicons
                              name={isSelected ? "checkbox" : "square-outline"}
                              size={15}
                              color={isSelected ? "#fff" : Colors.textMuted}
                            />
                            <Text style={[styles.chipText, isSelected && { color: "#fff" }]}>
                              {cn}{sec ? `-${sec}` : ""}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  {!!formErr.classes && <Text style={styles.err}>{formErr.classes}</Text>}
                </View>
              )}

              <Button
                title="Post Notice"
                color={color}
                loading={saving}
                onPress={save}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ConfirmModal
        visible={!!confirmDel}
        title="Remove notice?"
        message={confirmDel?.title}
        confirmText="Delete"
        destructive
        loading={deleting}
        onCancel={() => !deleting && setConfirmDel(null)}
        onConfirm={async () => {
          const item = confirmDel;
          if (!item) return;
          setDeleting(true);
          try {
            await api(`/api/announcements?id=${encodeURIComponent(item.id)}`, {
              method: "DELETE",
            });
            toast.success("Notice removed");
            setConfirmDel(null);
            await fetchAnnouncements(1, false, qRef.current);
          } catch (e: any) {
            toast.error(e?.message || "Could not delete");
          } finally {
            setDeleting(false);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  daySeparatorWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  daySeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  daySeparatorBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  daySeparatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  title: { fontWeight: "700", fontSize: 16, color: Colors.text, flex: 1 },
  body: { fontSize: 13, color: Colors.text, marginTop: 8, lineHeight: 19 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  authorText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    textAlign: "right",
    marginLeft: 8,
  },
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
    maxHeight: "90%",
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  err: { color: Colors.danger, fontSize: 12, marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
    marginTop: 6,
  },
  chipText: { fontWeight: "700", fontSize: 12, color: Colors.text },
  audience: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  dropdownBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  dropdownMenu: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius.md,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "40",
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.text,
  },
});
