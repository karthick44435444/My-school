import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { api, getApiBase, getApiBaseSync, getToken, resolveMediaUrlSync } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useBadges } from "@/hooks/useBadges";
import { useToast } from "@/hooks/useToast";
import { resolveChildren, ChildInfo } from "@/hooks/useChildren";
import { SafeAvatar } from "@/components/ChildAvatar";
import { Badge, Button, Empty, Input, Label, Loading } from "@/components/ui";
import { SearchBar, matchesSearch } from "@/components/SearchBar";
import { Colors, spacing, radius } from "@/constants/theme";
import { str, toTitleCase, formatDateDDMMYYYY, getDayWiseLabel } from "@/lib/format";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";

type HW = {
  id: string;
  title: string;
  description?: string;
  className?: string;
  section?: string;
  subject?: string;
  createdByName?: string;
  createdAt?: string;
  expiresAt?: string;
  attachments?: string[];
  attachmentUrl?: string;
};

function isImageUrl(url?: string): boolean {
  if (!url) return false;
  const clean = String(url).split("?")[0].replace(/\\/g, "/").toLowerCase();
  return (
    clean.startsWith("data:image/") ||
    clean.endsWith(".jpg") ||
    clean.endsWith(".jpeg") ||
    clean.endsWith(".png") ||
    clean.endsWith(".gif") ||
    clean.endsWith(".webp") ||
    clean.endsWith(".svg") ||
    clean.endsWith(".bmp") ||
    clean.endsWith(".heic") ||
    clean.includes(".jpg") ||
    clean.includes(".jpeg") ||
    clean.includes(".png") ||
    clean.includes(".webp") ||
    clean.includes("/image/upload/") ||
    clean.includes("/uploads/image") ||
    clean.includes("image_")
  );
}

function getFileName(url?: string): string {
  if (!url) return "Attachment";
  if (url.startsWith("data:image/")) return "Image.jpg";
  if (url.startsWith("data:application/pdf")) return "Document.pdf";
  try {
    const clean = String(url).split("?")[0].replace(/\\/g, "/");
    let name = clean.split("/").pop() || "Attachment";
    name = decodeURIComponent(name);
    const rawMatch = name.match(/^(\d{10,15})_([a-z0-9]+)\.([a-z0-9]+)$/i);
    if (rawMatch) {
      const ext = rawMatch[3].toLowerCase();
      if (ext === "pdf") return "Document.pdf";
      if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return `Image.${ext}`;
      return `Attachment.${ext}`;
    }
    return name;
  } catch {
    return "Attachment";
  }
}

export default function HomeworkScreen() {
  const { user, themeColor } = useAuth();
  const badges = useBadges();
  const badgesRef = useRef(badges);
  badgesRef.current = badges;
  const seenHwIdsRef = useRef<Set<string>>(new Set());
  const isFirstSearch = useRef(true);
  const toast = useToast();
  const params = useLocalSearchParams<{ highlightId?: string }>();
  const [highlightId, setHighlightId] = useState<string | undefined>(params.highlightId);
  const color = themeColor || Colors.primary;
  const [list, setList] = useState<HW[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const qRef = useRef("");
  qRef.current = q;
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const childrenRef = useRef<ChildInfo[]>([]);
  childrenRef.current = children;
  const [childIdx, setChildIdx] = useState(0);
  const childIdxRef = useRef(0);
  childIdxRef.current = childIdx;
  const [apiBase, setApiBase] = useState(() => getApiBaseSync());
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    className: "",
    section: "",
    subject: "",
  });
  const [attachments, setAttachments] = useState<{ uri: string; name: string; url?: string }[]>([]);
  const [uploadingAtt, setUploadingAtt] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<Record<string, string>>({});
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN" || user?.role === "PRINCIPAL";
  const isParent = user?.role === "PARENT";

  const fetchMeta = useCallback(async () => {
    getApiBase().then(setApiBase);
    if (isParent) {
      const kids = await resolveChildren(user);
      setChildren(kids);
      childrenRef.current = kids;
      return kids;
    }
    if (isTeacher) {
      try {
        const tc = await api<any>("/api/teacher-classes");
        const raw = tc.classes || [];
        const seen = new Set<string>();
        const uniq = raw.filter((c: any) => {
          const k = `${c.className || c.name || ""}|${c.section || ""}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        setClasses(uniq);
      } catch {
        try {
          const c = await api<any>("/api/classes");
          setClasses(c.classes || []);
        } catch {
          setClasses([]);
        }
      }
    }
    return [];
  }, [user, isParent, isTeacher]);

  const fetchHomework = useCallback(
    async (targetPage = 1, append = false, searchQuery = qRef.current, kidIndex = childIdxRef.current, kidsList = childrenRef.current) => {
      try {
        let url = `/api/homework?page=${targetPage}&limit=20`;
        if (searchQuery && searchQuery.trim()) {
          url += `&q=${encodeURIComponent(searchQuery.trim())}`;
        }
        if (isParent && kidsList && kidsList[kidIndex]) {
          const activeKid = kidsList[kidIndex];
          if (activeKid.className) {
            url += `&className=${encodeURIComponent(activeKid.className)}`;
            if (activeKid.section) {
              url += `&section=${encodeURIComponent(activeKid.section)}`;
            }
          }
        }
        const data = await api<{ homeworks?: HW[]; total?: number; totalPages?: number; page?: number }>(url);
        const next = data.homeworks || [];
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

        const unseenIds = next.map((x) => x.id).filter((id) => id && !seenHwIdsRef.current.has(id));
        if (unseenIds.length) {
          unseenIds.forEach((id) => seenHwIdsRef.current.add(id));
          badgesRef.current?.markHomeworkSeen(unseenIds);
        }
      } catch {
        if (!append) setList([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [isParent]
  );

  useFocusEffect(
    useCallback(() => {
      setQ("");
      qRef.current = "";
      setPage(1);
      setLoading(true);
      (async () => {
        const kids = await fetchMeta();
        fetchHomework(1, false, "", 0, kids);
      })();
      if (params.highlightId) {
        setHighlightId(String(params.highlightId));
        const t = setTimeout(() => setHighlightId(undefined), 4000);
        return () => clearTimeout(t);
      }
      return () => {
        setQ("");
        qRef.current = "";
      };
    }, [fetchMeta, fetchHomework, params.highlightId])
  );

  // Debounced search
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchHomework(1, false, q, childIdxRef.current, childrenRef.current);
    }, 250);
    return () => clearTimeout(timer);
  }, [q, fetchHomework]);

  const onSelectChild = (idx: number) => {
    if (idx === childIdx && !loading) return;
    setChildIdx(idx);
    childIdxRef.current = idx;
    setPage(1);
    setLoading(true);
    fetchHomework(1, false, qRef.current, idx, children);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchHomework(page + 1, true, qRef.current, childIdxRef.current, children);
  };

  const openAdd = () => {
    const first = classes[0];
    setForm({
      title: "",
      description: "",
      className: first?.className || first?.name || "",
      section: first?.section || "",
      subject: "",
    });
    setAttachments([]);
    setFormErr({});
    setModal(true);
  };

  const doUploadAttachment = async (uri: string, name: string, mime: string) => {
    setUploadingAtt(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
        name,
        type: mime || "application/octet-stream",
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
      setAttachments((prev) => [...prev, { uri, name, url: data.url }].slice(0, 2));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploadingAtt(false);
    }
  };

  const pickAttachment = () => {
    if (attachments.length >= 2) {
      toast.error("Maximum 2 attachments");
      return;
    }
    Alert.alert(
      "Add Attachment",
      "Choose attachment type:",
      [
        {
          text: "Photo / Image",
          onPress: async () => {
            try {
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) {
                toast.error("Allow file access");
                return;
              }
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
              });
              if (res.canceled || !res.assets?.[0]) return;
              const asset = res.assets[0];
              const uri = asset.uri;
              const name = asset.fileName || uri.split("/").pop() || `image_${attachments.length + 1}.jpg`;
              const mime = asset.mimeType || "image/jpeg";
              await doUploadAttachment(uri, name, mime);
            } catch (err: any) {
              toast.error(err?.message || "Could not pick image");
            }
          },
        },
        {
          text: "Document (PDF / File)",
          onPress: async () => {
            try {
              const doc = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
                multiple: false,
              });
              if (doc.canceled || !doc.assets?.[0]) return;
              const asset = doc.assets[0];
              const uri = asset.uri;
              const name = asset.name || `file_${attachments.length + 1}`;
              const mime = asset.mimeType || "application/octet-stream";
              await doUploadAttachment(uri, name, mime);
            } catch (err: any) {
              toast.error(err?.message || "Could not pick document");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const saveHw = async () => {
    if (saving || uploadingAtt) return;
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.className.trim()) e.className = "Class is required";
    if (!form.subject.trim()) e.subject = "Subject is required";
    setFormErr(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const urls = attachments.map((a) => a.url).filter(Boolean) as string[];
      await api("/api/homework", {
        method: "POST",
        body: {
          title: form.title.trim(),
          description: form.description.trim(),
          className: form.className.trim(),
          section: form.section.trim() || undefined,
          subject: form.subject.trim() || undefined,
          attachments: urls,
          attachmentUrl: urls[0],
        },
      });
      setModal(false);
      toast.success("Homework created");
      await fetchHomework(1, false, qRef.current, childIdxRef.current, children);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create homework");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async (rawUrl: string) => {
    if (downloadingUrl) return;
    setDownloadingUrl(rawUrl);
    try {
      const resolved = resolveMediaUrlSync(rawUrl, apiBase);
      if (!resolved) {
        toast.error("Invalid attachment URL");
        return;
      }
      const fileName = getFileName(rawUrl);
      const isImg = isImageUrl(rawUrl);

      const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
      const localUri = `${targetDir}${Date.now()}_${fileName}`;
      const downloadRes = await FileSystem.downloadAsync(resolved, localUri);

      // If it's an image, try to save directly to user's Photo Gallery
      if (isImg) {
        try {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === "granted") {
            await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
            toast.success(`"${fileName}" saved to your Gallery!`);
            return;
          }
        } catch {
          // fallback to sharing
        }
      }

      // If expo-sharing is available, open share / save dialog
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri, {
          dialogTitle: `Download ${fileName}`,
          mimeType: isImg ? "image/*" : fileName.toLowerCase().endsWith(".pdf") ? "application/pdf" : undefined,
          UTI: isImg ? "public.image" : fileName.toLowerCase().endsWith(".pdf") ? "com.adobe.pdf" : undefined,
        });
        return;
      }

      toast.success(`"${fileName}" downloaded!`);
    } catch (err: any) {
      toast.error(err?.message || "Could not download attachment");
    } finally {
      setDownloadingUrl(null);
    }
  };

  const [deleteItem, setDeleteItem] = useState<HW | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteHomework = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await api(`/api/homework?id=${deleteItem.id}`, { method: "DELETE" });
      setList((prev) => prev.filter((h) => h.id !== deleteItem.id));
      toast.success("Homework deleted successfully");
      setDeleteItem(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete homework");
    } finally {
      setDeleting(false);
    }
  };

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
          <Ionicons name="document-text-outline" size={36} color="#D97706" />
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
      {/* Child Switcher Tabs (ONLY if children.length > 1) */}
      {isParent && children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childTabs}>
          {children.map((c, i) => {
            const on = i === childIdx;
            const hwBadge = badges.childBadges?.[c.id]?.homework || 0;
            return (
              <Pressable
                key={c.id}
                onPress={() => onSelectChild(i)}
                style={[styles.childTab, on && { borderColor: color, backgroundColor: color }]}
              >
                <SafeAvatar photoUrl={c.photoUrl} name={c.firstName} apiBase={apiBase} size={24} color={on ? "#ffffff" : color} />
                <Text style={[styles.childName, on && { color: "#ffffff" }]}>
                  {toTitleCase(c.firstName)}{" "}
                  <Text style={[styles.childClass, on && { color: "rgba(255,255,255,0.85)" }]}>
                    ({c.className || ""}{c.section ? `-${c.section}` : ""})
                  </Text>
                </Text>
                {hwBadge > 0 && !on && (
                  <View style={{ backgroundColor: "#EF4444", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, marginLeft: 2 }}>
                    <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "800" }}>{hwBadge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <SearchBar value={q} onChangeText={setQ} placeholder="Search homework, subject, class…" />

      {isTeacher && (classes.length > 0 || user?.role !== "TEACHER") && (
        <View style={{ paddingHorizontal: spacing.md, marginBottom: 4 }}>
          <Button title="+ Add homework" color={color} onPress={openAdd} />
        </View>
      )}

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
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
              fetchMeta();
              fetchHomework(1, false, qRef.current, childIdxRef.current, children);
            }}
            tintColor={color}
          />
        }
        ListEmptyComponent={<Empty message="No homework found" />}
        renderItem={({ item, index }) => {
          const currDay = getDayWiseLabel(item.createdAt || item.expiresAt);
          const prevDay = index > 0 ? getDayWiseLabel(list[index - 1]?.createdAt || list[index - 1]?.expiresAt) : null;
          const showDayHeader = currDay !== prevDay;

          const allAttachments: string[] = Array.from(
            new Set(
              [
                ...(Array.isArray(item.attachments) ? item.attachments : []),
                item.attachmentUrl,
              ].filter((u): u is string => Boolean(u && typeof u === "string"))
            )
          );

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
                onLongPress={isTeacher ? () => setDeleteItem(item) : undefined}
                delayLongPress={400}
                style={({ pressed }) => [
                  styles.card,
                  highlightId === item.id && {
                    borderWidth: 2,
                    borderColor: color,
                    backgroundColor: Colors.card,
                  },
                  pressed && isTeacher && { opacity: 0.9 },
                ]}
              >
                <View style={styles.row}>
                  <Text style={styles.title}>{toTitleCase(str(item.title))}</Text>
                  {item.subject ? <Badge text={toTitleCase(str(item.subject))} color={color} /> : null}
                </View>
                {(item.className || item.section) && (
                  <Text style={styles.meta}>
                    Class {str(item.className)}{item.section ? `-${str(item.section)}` : ""}
                  </Text>
                )}
                {item.description ? (
                  <View style={{ marginTop: 6 }}>
                    <Text
                      style={styles.desc}
                      numberOfLines={expandedIds[item.id] ? undefined : 3}
                    >
                      {str(item.description)}
                    </Text>
                    {item.description.length > 120 && (
                      <Pressable
                        onPress={() =>
                          setExpandedIds((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }))
                        }
                        style={{ marginTop: 4, alignSelf: "flex-start", paddingVertical: 2 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color }}>
                          {expandedIds[item.id] ? "Show less" : "Show more..."}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}

                {/* Attachments Section */}
                {allAttachments.length > 0 && (
                  <View style={styles.attSection}>
                    <Text style={styles.attSectionTitle}>
                      Attachments ({allAttachments.length})
                    </Text>
                    {allAttachments.map((url, i) => {
                      const isImg = isImageUrl(url);
                      const fileName = getFileName(url);
                      const resolved = resolveMediaUrlSync(url, apiBase) || url;
                      const isPdf = /\.pdf(\?.*)?$/i.test(url) || fileName.toLowerCase().endsWith(".pdf");
                      const isSheet = /\.(xls|xlsx|csv)(\?.*)?$/i.test(url);

                      if (isImg) {
                        return (
                          <View key={i} style={styles.imageAttCard}>
                            <Pressable
                              onPress={() => setPreviewImage(resolved)}
                              style={styles.imageAttThumbBox}
                            >
                              <ExpoImage
                                source={{ uri: resolved }}
                                style={styles.imageAttThumb}
                                contentFit="cover"
                                transition={150}
                                cachePolicy="memory-disk"
                              />
                              <View style={styles.imageAttZoomIcon}>
                                <Ionicons name="expand" size={10} color="#fff" />
                              </View>
                            </Pressable>
                            <View style={styles.imageAttMeta}>
                              <Text style={styles.imageAttTitle} numberOfLines={1}>
                                {fileName}
                              </Text>
                              <Text style={styles.imageAttSub}>Image attachment</Text>
                              <View style={styles.imageAttActionsRow}>
                                <Pressable
                                  onPress={() => setPreviewImage(resolved)}
                                  style={[styles.attActionBtn, { backgroundColor: color + "15" }]}
                                >
                                  <Ionicons name="eye-outline" size={13} color={color} />
                                  <Text style={[styles.attActionText, { color }]}>View</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => handleDownload(url)}
                                  disabled={downloadingUrl === url}
                                  style={[styles.attActionBtn, { backgroundColor: "#F1F5F9" }]}
                                >
                                  {downloadingUrl === url ? (
                                    <ActivityIndicator size="small" color="#475569" style={{ transform: [{ scale: 0.7 }] }} />
                                  ) : (
                                    <Ionicons name="download-outline" size={13} color="#475569" />
                                  )}
                                  <Text style={[styles.attActionText, { color: "#475569" }]}>
                                    {downloadingUrl === url ? "Saving..." : "Download"}
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          </View>
                        );
                      }

                      return (
                        <View key={i} style={styles.docAttCard}>
                          <View
                            style={[
                              styles.docAttIconBox,
                              { backgroundColor: isPdf ? "#FEE2E2" : isSheet ? "#DCFCE7" : color + "15" },
                            ]}
                          >
                            <Ionicons
                              name={isPdf ? "document-text" : isSheet ? "grid" : "document-attach"}
                              size={22}
                              color={isPdf ? "#DC2626" : isSheet ? "#16A34A" : color}
                            />
                          </View>
                          <View style={styles.docAttMeta}>
                            <Text style={styles.docAttTitle} numberOfLines={1}>
                              {fileName}
                            </Text>
                            <Text style={styles.docAttSub}>
                              {isPdf ? "PDF Document" : isSheet ? "Spreadsheet" : "Document file"}
                            </Text>
                            <View style={styles.imageAttActionsRow}>
                              <Pressable
                                onPress={() => {
                                  if (resolved) {
                                    Linking.openURL(resolved).catch(() => toast.error("Could not open file"));
                                  }
                                }}
                                style={[styles.attActionBtn, { backgroundColor: color + "15" }]}
                              >
                                <Ionicons name="open-outline" size={13} color={color} />
                                <Text style={[styles.attActionText, { color }]}>Open</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => handleDownload(url)}
                                disabled={downloadingUrl === url}
                                style={[styles.attActionBtn, { backgroundColor: "#F1F5F9" }]}
                              >
                                {downloadingUrl === url ? (
                                  <ActivityIndicator size="small" color="#475569" style={{ transform: [{ scale: 0.7 }] }} />
                                ) : (
                                  <Ionicons name="download-outline" size={13} color="#475569" />
                                )}
                                <Text style={[styles.attActionText, { color: "#475569" }]}>
                                  {downloadingUrl === url ? "Saving..." : "Download"}
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Author Info & Date in Bottom Right Corner */}
                <View style={styles.cardFooterRow}>
                  {item.createdByName ? (
                    <Text style={styles.authorText}>By {toTitleCase(item.createdByName)}</Text>
                  ) : (
                    <View />
                  )}
                  <Text style={styles.dateCornerText}>
                    {item.createdAt
                      ? formatDateDDMMYYYY(item.createdAt)
                      : item.expiresAt
                      ? formatDateDDMMYYYY(item.expiresAt)
                      : ""}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        }}
      />

      {/* Lightbox Modal for Image Previews */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.lightboxBg}>
          <View style={styles.lightboxHeader}>
            <Pressable
              onPress={() => previewImage && handleDownload(previewImage)}
              disabled={!!downloadingUrl}
              style={styles.lightboxDownloadBtn}
            >
              {downloadingUrl === previewImage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="download-outline" size={18} color="#fff" />
              )}
              <Text style={styles.lightboxDownloadText}>
                {downloadingUrl === previewImage ? "Saving..." : "Download"}
              </Text>
            </Pressable>
            <Pressable onPress={() => setPreviewImage(null)} style={styles.lightboxCloseBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.lightboxBody}>
            {previewImage && (
              <ExpoImage
                source={{ uri: previewImage }}
                style={styles.lightboxImage}
                contentFit="contain"
                transition={200}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Create Homework Modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Create Homework</Text>
              <Pressable onPress={() => setModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="always">
              <Label>Homework Title *</Label>
              <Input
                placeholder="e.g. Chapter 4 Math Exercises"
                value={form.title}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, title: t }));
                  setFormErr((e) => ({ ...e, title: "" }));
                }}
              />
              {!!formErr.title && <Text style={styles.err}>{formErr.title}</Text>}

              <Label>Class & Section *</Label>
              {classes.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {classes.map((c: any, i: number) => {
                    const cn = c.className || c.name || "";
                    const sec = c.section || "";
                    const on = form.className === cn && form.section === sec;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => setForm((f) => ({ ...f, className: cn, section: sec }))}
                        style={[styles.classChip, on && { backgroundColor: color, borderColor: color }]}
                      >
                        <Text style={[styles.classChipText, on && { color: "#fff" }]}>
                          {cn}
                          {sec ? `-${sec}` : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <Input
                  value={form.className}
                  placeholder="e.g. Class 10"
                  onChangeText={(t) => setForm((f) => ({ ...f, className: t }))}
                />
              )}
              {!!formErr.className && <Text style={styles.err}>{formErr.className}</Text>}

              <Label>Subject *</Label>
              <Input
                placeholder="e.g. Mathematics"
                value={form.subject}
                onChangeText={(t) => {
                  setForm((f) => ({ ...f, subject: t }));
                  setFormErr((e) => ({ ...e, subject: "" }));
                }}
              />
              {!!formErr.subject && <Text style={styles.err}>{formErr.subject}</Text>}

              <Label>Description / Instructions</Label>
              <Input
                placeholder="Instructions for students..."
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                multiline
                style={{ minHeight: 85, textAlignVertical: "top" }}
              />

              <Label>Attachments (max 2 files or images)</Label>
              <Pressable
                onPress={pickAttachment}
                disabled={uploadingAtt || attachments.length >= 2}
                style={{
                  borderWidth: 1.5,
                  borderColor: uploadingAtt ? color : Colors.border,
                  borderStyle: "dashed",
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 8,
                  backgroundColor: uploadingAtt ? color + "08" : "transparent",
                  opacity: attachments.length >= 2 ? 0.5 : 1,
                }}
              >
                {uploadingAtt ? (
                  <>
                    <ActivityIndicator size="small" color={color} />
                    <Text style={{ fontWeight: "700", color }}>Uploading attachment...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="attach-outline" size={18} color={color} />
                    <Text style={{ fontWeight: "700", color }}>+ Add attachment</Text>
                  </>
                )}
              </Pressable>
              {attachments.map((a, i) => {
                const isImg = isImageUrl(a.uri || a.url || a.name);
                const resolved = a.url ? resolveMediaUrlSync(a.url, apiBase) : a.uri;
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      backgroundColor: "#F8FAFC",
                      padding: 8,
                      borderRadius: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    {isImg ? (
                      <ExpoImage
                        source={{ uri: resolved || a.uri }}
                        style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: "#E2E8F0" }}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          backgroundColor: color + "15",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons name="document-text" size={20} color={color} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#1E293B" }} numberOfLines={1}>
                        {a.name}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                        {isImg ? "Image attachment ready" : "Document attached"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={22} color={Colors.danger} />
                    </Pressable>
                  </View>
                );
              })}
              <Button title="Create Homework" color={color} loading={saving || uploadingAtt} onPress={saveHw} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal visible={!!deleteItem} transparent animationType="fade">
        <View style={styles.confirmModalBg}>
          <View style={styles.confirmModalCard}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="trash-outline" size={28} color={Colors.danger} />
            </View>
            <Text style={styles.confirmTitle}>Delete Homework</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete{" "}
              <Text style={{ fontWeight: "700", color: Colors.text }}>
                "{deleteItem?.title ? toTitleCase(deleteItem.title) : "this homework"}"
              </Text>
              ? This action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setDeleteItem(null)}
                disabled={deleting}
                style={styles.confirmCancelBtn}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmDeleteHomework}
                disabled={deleting}
                style={[styles.confirmDeleteBtn, deleting && { opacity: 0.7 }]}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  childTabs: { maxHeight: 48, flexGrow: 0, flexShrink: 0, paddingHorizontal: 12, marginTop: 8, marginBottom: 4 },
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
  card: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: 30,
    marginBottom: spacing.sm,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: { fontWeight: "700", fontSize: 16, color: Colors.text, flex: 1 },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 4, fontWeight: "600" },
  desc: { fontSize: 13, color: Colors.text, marginTop: 8, lineHeight: 19 },
  attSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 8,
  },
  attSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  imageAttCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  imageAttThumbBox: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    position: "relative",
  },
  imageAttThumb: {
    width: "100%",
    height: "100%",
  },
  imageAttZoomIcon: {
    position: "absolute",
    bottom: 3,
    right: 3,
    backgroundColor: "rgba(0,0,0,0.55)",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  imageAttMeta: {
    flex: 1,
    minWidth: 0,
  },
  imageAttTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  imageAttSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
    marginBottom: 4,
    fontWeight: "500",
  },
  imageAttActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  docAttCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  docAttIconBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  docAttMeta: {
    flex: 1,
    minWidth: 0,
  },
  docAttTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  docAttSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
    marginBottom: 4,
    fontWeight: "500",
  },
  attRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  attName: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
  attActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attActionText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardFooterRow: {
    position: "absolute",
    bottom: 8,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  dateCornerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
    textAlign: "right",
  },
  lightboxBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "space-between",
  },
  lightboxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  lightboxDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  lightboxDownloadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  lightboxCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  lightboxBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
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
  classChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
  },
  classChipText: { fontWeight: "700", fontSize: 13, color: Colors.text },
  confirmModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmModalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  confirmIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  confirmMessage: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});



