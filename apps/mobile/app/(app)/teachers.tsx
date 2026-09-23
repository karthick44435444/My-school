import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { api, getApiBase, getApiBaseSync, getToken, resolveMediaUrlSync } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Badge, Button, Empty, Input, Label, Loading } from "@/components/ui";
import { PhoneField } from "@/components/PhoneField";
import { SearchBar, matchesSearch } from "@/components/SearchBar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Colors, spacing, radius } from "@/constants/theme";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";
import { str } from "@/lib/format";
import { SafeAvatar } from "@/components/ChildAvatar";
import { Linking } from "react-native";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "MALE",
  education: "",
  photoUrl: "",
};

function AnimatedStatCard({
  label,
  value,
  icon,
  bgColor,
  borderColor,
  activeBorderColor,
  textColor,
  shapeBg1,
  shapeBg2,
  isSelected,
  onPress,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  borderColor: string;
  activeBorderColor: string;
  textColor: string;
  shapeBg1: string;
  shapeBg2: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View style={[{ flex: 1, transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.statCard,
          {
            backgroundColor: bgColor,
            borderColor: isSelected ? activeBorderColor : borderColor,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        <View style={[styles.cardShape1, { backgroundColor: shapeBg1 }]} />
        <View style={[styles.cardShape2, { backgroundColor: shapeBg2 }]} />

        <View style={styles.cardHeaderRow}>
          <View style={[styles.cardIconWrap, { backgroundColor: shapeBg1 }]}>
            <Ionicons name={icon} size={14} color={textColor} />
          </View>
          {isSelected && (
            <View style={[styles.activeIndicator, { backgroundColor: activeBorderColor }]}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>

        <Text style={[styles.statNum, { color: textColor }]}>{value}</Text>
        <Text style={[styles.statLbl, { color: textColor }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function TeachersScreen() {
  const { user, themeColor } = useAuth();
  const toast = useToast();
  const color = themeColor || Colors.primary;
  const canManage = user?.role === "PRINCIPAL" || user?.role === "ADMIN";

  const [list, setList] = useState<any[]>([]);
  const [checkStats, setCheckStats] = useState({
    total: 0,
    checkedIn: 0,
    notCheckedIn: 0,
  });
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const filterRef = useRef<"all" | "in" | "out">("all");
  filterRef.current = filter;
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const qRef = useRef("");
  qRef.current = q;
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [apiBase, setApiBase] = useState(() => getApiBaseSync());
  const [confirmDel, setConfirmDel] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const fetchTeachers = useCallback(
    async (targetPage = 1, append = false, searchQuery = qRef.current, statusFilter = filterRef.current) => {
      try {
        getApiBase().then(setApiBase);
        const today = new Date().toISOString().slice(0, 10);
        let url = `/api/attendance/teachers?date=${today}&page=${targetPage}&limit=20&filter=${statusFilter}`;
        if (searchQuery && searchQuery.trim()) {
          url += `&q=${encodeURIComponent(searchQuery.trim())}`;
        }
        const rep = await api<any>(url);
        setCheckStats({
          total: rep.totalTeachers || rep.total || 0,
          checkedIn: rep.checkedInToday || 0,
          notCheckedIn: rep.notCheckedInToday || 0,
        });

        const fetched = rep.teachers || [];
        if (append) {
          setList((prev) => {
            const existingIds = new Set(prev.map((u) => u.id));
            const newItems = fetched.filter((u: any) => !existingIds.has(u.id));
            return [...prev, ...newItems];
          });
        } else {
          setList(fetched);
        }
        setPage(rep.page || targetPage);
        setTotalPages(rep.totalPages || 1);
        setTotal(rep.total || fetched.length);
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
      setFilter("all");
      filterRef.current = "all";
      setPage(1);
      setLoading(true);
      fetchTeachers(1, false, "", "all");
      return () => {
        setQ("");
        qRef.current = "";
        setFilter("all");
        filterRef.current = "all";
      };
    }, [fetchTeachers])
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeachers(1, false, q, filterRef.current);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, fetchTeachers]);

  const onSelectFilter = (f: "all" | "in" | "out") => {
    if (f === filter && !loading) return;
    setFilter(f);
    filterRef.current = f;
    setPage(1);
    setLoading(true);
    fetchTeachers(1, false, qRef.current, f);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchTeachers(page + 1, true, qRef.current, filterRef.current);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Invalid email";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (form.phone.replace(/\D/g, "").length < 8) e.phone = "Enter a valid phone number";
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
        name: "teacher.jpg",
        type: "image/jpeg",
      } as any);
      const base = await getApiBase();
      const token = await getToken();
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
    setForm(emptyForm);
    setErrors({});
    setModal(true);
  };

  const openEdit = (t: any) => {
    setEditingId(t.id);
    setForm({
      firstName: t.firstName || "",
      lastName: t.lastName || "",
      email: t.email || "",
      phone: t.phone || "",
      gender: t.gender || "MALE",
      education: t.education || "",
      photoUrl: t.photoUrl || "",
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
            education: form.education,
            photoUrl: form.photoUrl || undefined,
          },
        });
        toast.success("Teacher updated");
      } else {
        const res = await api<any>("/api/users/create", {
          method: "POST",
          body: {
            role: "TEACHER",
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            gender: form.gender,
            education: form.education,
            photoUrl: form.photoUrl || undefined,
          },
        });
        toast.success("Teacher created! Login credentials sent to email.");
      }
      setModal(false);
      await fetchTeachers(1, false, qRef.current, filterRef.current);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  const photoUri = resolveMediaUrlSync(form.photoUrl, apiBase);

  return (
    <View style={styles.root}>
      <View style={styles.statsRow}>
        <AnimatedStatCard
          label="Total"
          value={checkStats.total}
          icon="people"
          bgColor="#EEF2FF"
          borderColor="#E0E7FF"
          activeBorderColor={color}
          textColor="#4338CA"
          shapeBg1="rgba(99, 102, 241, 0.16)"
          shapeBg2="rgba(99, 102, 241, 0.08)"
          isSelected={filter === "all"}
          onPress={() => onSelectFilter("all")}
        />
        <AnimatedStatCard
          label="Checked in"
          value={checkStats.checkedIn}
          icon="checkmark-done-circle"
          bgColor="#ECFDF5"
          borderColor="#D1FAE5"
          activeBorderColor={Colors.success}
          textColor={Colors.success}
          shapeBg1="rgba(16, 185, 129, 0.18)"
          shapeBg2="rgba(16, 185, 129, 0.08)"
          isSelected={filter === "in"}
          onPress={() => onSelectFilter("in")}
        />
        <AnimatedStatCard
          label="Not in"
          value={checkStats.notCheckedIn}
          icon="close-circle"
          bgColor="#FFF1F2"
          borderColor="#FFE4E6"
          activeBorderColor={Colors.danger}
          textColor={Colors.danger}
          shapeBg1="rgba(244, 63, 94, 0.16)"
          shapeBg2="rgba(244, 63, 94, 0.08)"
          isSelected={filter === "out"}
          onPress={() => onSelectFilter("out")}
        />
      </View>

      <SearchBar value={q} onChangeText={setQ} placeholder="Search name, email…" />
      {canManage && (
        <View style={{ paddingHorizontal: spacing.md }}>
          <Button title="+ Add teacher" color={color} onPress={openAdd} />
        </View>
      )}

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
              fetchTeachers(1, false, qRef.current, filterRef.current);
            }}
            tintColor={color}
          />
        }
        ListEmptyComponent={<Empty message="No teachers found" />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => setDetail(item)}
            onLongPress={() => canManage && setConfirmDel(item)}
            delayLongPress={450}
          >
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
                {item.classLabel || item.teacherType || "Teacher"}
              </Text>
              {item.phone ? <Text style={styles.meta}>{str(item.phone)}</Text> : null}
            </View>
            <Badge
              text={item.checkedIn ? "In" : "Out"}
              color={item.checkedIn ? Colors.success : Colors.danger}
            />
          </Pressable>
        )}
      />

      {/* Detail sheet */}
      <Modal visible={!!detail} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Teacher details</Text>
              <Pressable onPress={() => setDetail(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            {detail && (
              <ScrollView>
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <SafeAvatar
                    photoUrl={detail.photoUrl}
                    name={detail.firstName}
                    apiBase={apiBase}
                    size={88}
                    color={color}
                  />
                  <Text style={[styles.name, { fontSize: 18, marginTop: 10 }]}>
                    {detail.firstName} {detail.lastName || ""}
                  </Text>
                  <Badge
                    text={detail.checkedIn ? "Checked in today" : "Not checked in"}
                    color={detail.checkedIn ? Colors.success : Colors.danger}
                  />
                </View>
                {!!detail.phone && (
                  <Pressable
                    style={styles.infoRow}
                    onPress={() => Linking.openURL(`tel:${detail.phone}`)}
                  >
                    <Ionicons name="call" size={18} color={color} />
                    <Text style={styles.infoText}>{detail.phone}</Text>
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
                {!!detail.education && (
                  <View style={styles.infoRow}>
                    <Ionicons name="school" size={18} color={color} />
                    <Text style={styles.infoText}>{detail.education}</Text>
                  </View>
                )}
                {!!detail.classLabel && (
                  <View style={styles.infoRow}>
                    <Ionicons name="albums" size={18} color={color} />
                    <Text style={styles.infoText}>{detail.classLabel}</Text>
                  </View>
                )}
                {canManage && (
                  <Button
                    title="Edit teacher"
                    color={color}
                    onPress={() => {
                      setDetail(null);
                      openEdit(detail);
                    }}
                  />
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add/Edit modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                {editingId ? "Edit teacher" : "Add teacher"}
              </Text>
              <Pressable onPress={() => setModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Pressable style={styles.photoPick} onPress={pickPhoto}>
                {photoUri ? (
                  <ExpoImage source={{ uri: photoUri }} style={styles.photoBig} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <View style={[styles.photoBig, styles.photoPh]}>
                    <Ionicons name="camera" size={28} color={Colors.textMuted} />
                    <Text style={styles.photoHint}>
                      {uploading ? "Uploading..." : "Add photo"}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Label>First name *</Label>
              <Input
                value={form.firstName}
                onChangeText={(txt) => setForm((f) => ({ ...f, firstName: txt }))}
              />
              {!!errors.firstName && <Text style={styles.err}>{errors.firstName}</Text>}
              <Label>Last name</Label>
              <Input
                value={form.lastName}
                onChangeText={(txt) => setForm((f) => ({ ...f, lastName: txt }))}
              />
              <Label>Email *</Label>
              <Input
                value={form.email}
                autoCapitalize="none"
                onChangeText={(txt) => setForm((f) => ({ ...f, email: txt }))}
              />
              {!!errors.email && <Text style={styles.err}>{errors.email}</Text>}
              <Label>Phone *</Label>
              <PhoneField
                value={form.phone}
                onChange={(full) => setForm((f) => ({ ...f, phone: full }))}
                error={errors.phone}
              />
              <Label>Gender</Label>
              <View style={styles.rowChips}>
                {["MALE", "FEMALE", "OTHER"].map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setForm((f) => ({ ...f, gender: g }))}
                    style={[
                      styles.chip,
                      form.gender === g && { backgroundColor: color, borderColor: color },
                    ]}
                  >
                    <Text style={[styles.chipText, form.gender === g && { color: "#fff" }]}>
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Label>Education</Label>
              <Input
                value={form.education}
                placeholder="e.g. B.Ed, M.Sc, Ph.D"
                onChangeText={(txt) => setForm((f) => ({ ...f, education: txt }))}
              />
              <Button
                title={editingId ? "Save changes" : "Create teacher"}
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
        title="Remove teacher?"
        message={
          confirmDel
            ? `${confirmDel.firstName || ""} ${confirmDel.lastName || ""}`.trim()
            : ""
        }
        confirmText="Delete"
        destructive
        loading={deleting}
        onCancel={() => !deleting && setConfirmDel(null)}
        onConfirm={async () => {
          const t = confirmDel;
          if (!t?.id) return;
          setDeleting(true);
          try {
            await api(`/api/users/${t.id}`, { method: "DELETE" });
            toast.success("Teacher removed");
            setConfirmDel(null);
            await fetchTeachers(1, false, qRef.current, filterRef.current);
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
  statsRow: {
    paddingHorizontal: spacing.md,
    paddingTop: 4,
    paddingBottom: 2,
    marginTop: 2,
    marginBottom: 2,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  statCard: {
    borderRadius: 13,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: "flex-start",
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardShape1: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    top: -12,
    right: -12,
  },
  cardShape2: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    bottom: -6,
    left: -6,
  },
  cardHeaderRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  cardIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  statNum: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  statLbl: { fontSize: 10, fontWeight: "700", marginTop: 1, opacity: 0.9 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
  },
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
  err: { color: Colors.danger, fontSize: 12, marginTop: 4 },
  rowChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipText: { fontWeight: "700", fontSize: 12, color: Colors.text },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoText: { flex: 1, fontWeight: "600", color: Colors.text },
});
