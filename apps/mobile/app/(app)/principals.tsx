import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Linking,
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
import * as ImagePicker from "expo-image-picker";
import { api, getApiBase, getApiBaseSync, getToken, resolveMediaUrlSync } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button, Empty, Input, Label, Loading } from "@/components/ui";
import { SafeAvatar } from "@/components/ChildAvatar";
import { PhoneField } from "@/components/PhoneField";
import { SearchBar, matchesSearch } from "@/components/SearchBar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { CredentialsModal, Credentials } from "@/components/CredentialsModal";
import { Colors, spacing, radius } from "@/constants/theme";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "MALE",
  education: "",
  photoUrl: "",
};

export default function PrincipalsScreen() {
  const { user, themeColor } = useAuth();
  const toast = useToast();
  const color = themeColor || Colors.primary;
  const canManage = user?.role === "ADMIN";

  const [list, setList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [apiBase, setApiBase] = useState(() => getApiBaseSync());
  const [confirmDel, setConfirmDel] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  const openModal = (type: "create" | "edit", item?: any) => {
    setErrors({});
    if (type === "edit" && item) {
      setEditingId(item.id);
      setForm({
        firstName: item.firstName || "",
        lastName: item.lastName || "",
        email: item.email || "",
        phone: item.phone || "",
        gender: item.gender || "MALE",
        education: item.education || "",
        photoUrl: item.photoUrl || "",
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setModal(type);
  };

  const closeModal = () => {
    setModal(null);
    setEditingId(null);
  };

  const load = useCallback(async () => {
    try {
      getApiBase().then(setApiBase);
      const data = await api<any>("/api/users/list?role=PRINCIPAL");
      setList(data.users || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setQ("");
      setLoading(true);
      load();
      return () => {
        setQ("");
      };
    }, [load])
  );

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
        name: "principal.jpg",
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
      toast.success("Photo uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "First name required";
    if (!form.email.trim()) e.email = "Email required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = "Invalid email";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (form.phone.replace(/\D/g, "").length < 8) e.phone = "Enter a valid phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (modal === "edit" && editingId) {
        await api(`/api/users/${editingId}`, {
          method: "PATCH",
          body: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            gender: form.gender,
            education: form.education.trim(),
            photoUrl: form.photoUrl || undefined,
          },
        });
        toast.success("Principal updated successfully");
        closeModal();
        await load();
      } else {
        const res = await api<any>("/api/users/create", {
          method: "POST",
          body: {
            role: "PRINCIPAL",
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            gender: form.gender,
            education: form.education.trim(),
            photoUrl: form.photoUrl || undefined,
          },
        });
        toast.success("Principal created successfully");
        closeModal();
        if (res.credentials) {
          setCredentials(res.credentials);
        }
        await load();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel || deleting) return;
    setDeleting(true);
    try {
      await api(`/api/users/${confirmDel.id}`, { method: "DELETE" });
      toast.success("Principal removed");
      setConfirmDel(null);
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [q]);

  const filtered = useMemo(() => {
    return list.filter((item) =>
      matchesSearch(
        {
          ...item,
          name: `${item.firstName} ${item.lastName || ""}`,
          email: item.email,
          phone: item.phone,
          username: item.username,
          education: item.education,
        },
        q,
        ["name", "email", "phone", "username", "education"]
      )
    );
  }, [list, q]);

  const visiblePrincipals = useMemo(() => {
    return filtered.slice(0, page * 20);
  }, [filtered, page]);

  const hasMore = visiblePrincipals.length < filtered.length;

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setPage((p) => p + 1);
      setLoadingMore(false);
    }, 250);
  };

  if (loading) return <Loading />;

  const photoUri = form.photoUrl ? resolveMediaUrlSync(form.photoUrl, apiBase) : null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <SearchBar
          value={q}
          onChangeText={setQ}
          placeholder="Search principal by name, email, qualification…"
        />
        {canManage && (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: 8 }}>
            <Button
              title="+ Add Principal"
              color={color}
              onPress={() => openModal("create")}
            />
          </View>
        )}
      </View>

      <FlatList
        data={visiblePrincipals}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} color={color} />
          ) : null
        }
        contentContainerStyle={{ padding: spacing.md, paddingBottom: TAB_BAR_CLEARANCE }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={color}
          />
        }
        ListEmptyComponent={
          <Empty
            message={q ? "No results matching your search" : "No principals added yet. Tap '+ Add Principal' to create one."}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => setDetail(item)}
            onLongPress={() => canManage && setConfirmDel(item)}
            delayLongPress={450}
          >
            <View style={styles.cardTop}>
              <SafeAvatar
                photoUrl={item.photoUrl}
                name={item.firstName}
                apiBase={apiBase}
                size={48}
                color={color}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {item.firstName} {item.lastName || ""}
                </Text>
                <Text style={styles.username}>@{item.username}</Text>
                {!!item.education && (
                  <View style={styles.eduBadge}>
                    <Ionicons name="school-outline" size={12} color={color} />
                    <Text style={[styles.eduBadgeText, { color }]}>{item.education}</Text>
                  </View>
                )}
                {!!item.email && (
                  <View style={styles.cardInfoRow}>
                    <Ionicons name="mail-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.email} numberOfLines={1}>
                      {item.email}
                    </Text>
                  </View>
                )}
                {!!item.phone && (
                  <View style={styles.cardInfoRow}>
                    <Ionicons name="call-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.phone}>{item.phone}</Text>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        )}
      />

      {/* Detail Modal */}
      <Modal visible={!!detail} animationType="slide" transparent onRequestClose={() => setDetail(null)}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailCard}>
            <View style={styles.detailHead}>
              <Text style={styles.detailTitle}>Principal Details</Text>
              <Pressable onPress={() => setDetail(null)} hitSlop={8} style={styles.closeBtn}>
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
                    {detail.firstName} {detail.lastName || ""}
                  </Text>
                  <Text style={styles.username}>@{detail.username}</Text>
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

                {canManage && (
                  <View style={{ marginTop: 16 }}>
                    <Button
                      title="Edit Principal"
                      color={color}
                      onPress={() => {
                        const itemToEdit = detail;
                        setDetail(null);
                        openModal("edit", itemToEdit);
                      }}
                    />
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal visible={!!modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                {modal === "edit" ? "Edit Principal" : "Add Principal"}
              </Text>
              <Pressable onPress={closeModal} hitSlop={12} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Photo Upload Area - Same UI as Teacher and Student */}
              <Pressable style={styles.photoPick} onPress={pickPhoto} disabled={uploading}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoBig} />
                ) : (
                  <View style={[styles.photoBig, styles.photoPh]}>
                    <Ionicons name="camera" size={28} color={Colors.textMuted} />
                    <Text style={styles.photoHint}>
                      {uploading ? "Uploading..." : "Add photo"}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Label>First Name *</Label>
              <Input
                value={form.firstName}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, firstName: t }));
                  setErrors((e) => ({ ...e, firstName: undefined }));
                }}
              />
              {!!errors.firstName && <Text style={styles.errText}>{errors.firstName}</Text>}

              <Label>Last Name</Label>
              <Input
                value={form.lastName}
                onChangeText={(t) => setForm((f) => ({ ...f, lastName: t }))}
              />

              <Label>Email *</Label>
              <Input
                value={form.email}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, email: t }));
                  setErrors((e) => ({ ...e, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {!!errors.email && <Text style={styles.errText}>{errors.email}</Text>}

              <Label>Phone Number *</Label>
              <PhoneField
                value={form.phone}
                onChange={(p: string) => {
                  setForm((f) => ({ ...f, phone: p }));
                  setErrors((e) => ({ ...e, phone: undefined }));
                }}
                error={errors.phone}
              />

              <Label>Education</Label>
              <Input
                value={form.education}
                onChangeText={(t) => setForm((f) => ({ ...f, education: t }))}
                placeholder="e.g. M.Ed, M.Sc, Ph.D"
              />

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
                        styles.genderChipText,
                        form.gender === g && { color: "#fff", fontWeight: "700" },
                      ]}
                    >
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ height: 16 }} />
              <Button
                title={saving ? "Saving…" : modal === "edit" ? "Update Principal" : "Create Principal"}
                color={color}
                onPress={handleSave}
                disabled={saving || uploading}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmModal
        visible={!!confirmDel}
        title="Delete Principal"
        message={`Are you sure you want to remove ${confirmDel?.firstName} ${confirmDel?.lastName || ""}? This will disable their login access.`}
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmDel(null)}
      />

      {/* Newly Created Credentials Modal */}
      <CredentialsModal
        visible={!!credentials}
        credentials={credentials}
        color={color}
        title="Principal Account Created"
        onClose={() => setCredentials(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: Colors.border },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardInfoRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  name: { fontSize: 16, fontWeight: "800", color: Colors.text },
  username: { fontSize: 12, color: Colors.primary, fontWeight: "600", marginTop: 1 },
  eduBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  eduBadgeText: { fontSize: 11, fontWeight: "700" },
  email: { fontSize: 12, color: Colors.textMuted },
  phone: { fontSize: 12, color: Colors.textMuted },
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
  photoBig: {
    width: 96,
    height: 96,
    borderRadius: 28,
  },
  photoPh: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  photoHint: { fontSize: 12, color: Colors.textMuted, marginTop: 4, fontWeight: "600" },
  errText: { color: Colors.danger, fontSize: 11, marginTop: 2, marginBottom: 4 },
  genderRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  genderChipText: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  detailBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "flex-end",
  },
  detailCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  detailHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600",
  },
});

