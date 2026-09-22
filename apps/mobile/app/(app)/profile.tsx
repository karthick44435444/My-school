import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/hooks/useAuth";
import { api, getApiBase, getApiBaseSync, getToken, resolveMediaUrlSync } from "@/lib/api";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Button, Input, Label } from "@/components/ui";
import { PhoneField } from "@/components/PhoneField";
import { Colors, spacing, radius } from "@/constants/theme";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";
import { useToast } from "@/hooks/useToast";
import { SafeAvatar } from "@/components/ChildAvatar";
import { resolveChildren, ChildInfo } from "@/hooks/useChildren";
import { formatDateDDMMYYYY } from "@/lib/format";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const THEME_PRESETS = [
  { name: "Deep Indigo", hex: "#4338CA" },
  { name: "Royal Blue", hex: "#1D4ED8" },
  { name: "Deep Purple", hex: "#6D28D9" },
  { name: "Emerald", hex: "#047857" },
  { name: "Crimson", hex: "#BE123C" },
  { name: "Burgundy", hex: "#991B1B" },
  { name: "Dark Amber", hex: "#B45309" },
  { name: "Dark Slate", hex: "#334155" },
];

export const EXTENDED_DARK_PALETTE = [
  "#1E1B4B", "#312E81", "#4338CA", "#3730A3",
  "#172554", "#1E3A8A", "#1D4ED8", "#0369A1",
  "#2E1065", "#581C87", "#6D28D9", "#7E22CE",
  "#064E3B", "#065F46", "#047857", "#0F766E",
  "#881337", "#9F1239", "#BE123C", "#991B1B",
  "#78350F", "#92400E", "#B45309", "#334155",
];

export function isDarkThemeColor(hex: string): boolean {
  if (!hex) return false;
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return false;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  // Lightness <= 0.755 (at least 25% dark, up to 75% light accepted)
  return lightness <= 0.755;
}

export default function ProfileScreen() {
  const { user, themeColor, refresh, logout } = useAuth();
  const searchParams = useLocalSearchParams<{ tab?: string }>();
  const toast = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"profile" | "school">(
    searchParams.tab === "school" && isAdmin ? "school" : "profile"
  );
  const [editing, setEditing] = useState(false);
  const [editingSchool, setEditingSchool] = useState(false);
  const [firstChild, setFirstChild] = useState<ChildInfo | null>(null);

  // Reset editing mode and active tab whenever navigating to/from other tabs or screens
  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
      if (searchParams.tab === "school" && isAdmin) {
        setActiveTab("school");
      } else {
        setActiveTab("profile");
      }
      setEditing(false);
      setEditingSchool(false);
      setFieldErr({});
    }, [searchParams.tab, isAdmin, refresh])
  );

  // User profile state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || "");

  // School profile state (Admin)
  const [school, setSchool] = useState({
    name: (user as any)?.schoolFullName || user?.schoolName || "",
    displayName: (user as any)?.schoolDisplayName || "",
    location: "",
    phone: "",
    themeColor: themeColor || "#4338CA",
    logoUrl: (user as any)?.schoolLogo || "",
    schoolCode: (user as any)?.schoolCode || "",
  });
  const [initialSchool, setInitialSchool] = useState({
    name: (user as any)?.schoolFullName || user?.schoolName || "",
    displayName: (user as any)?.schoolDisplayName || "",
    location: "",
    phone: "",
    themeColor: themeColor || "#4338CA",
    logoUrl: (user as any)?.schoolLogo || "",
    schoolCode: (user as any)?.schoolCode || "",
  });

  const [saving, setSaving] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [apiBase, setApiBase] = useState(() => getApiBaseSync());
  const [fieldErr, setFieldErr] = useState<{ firstName?: string; email?: string; phone?: string }>({});
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getApiBase().then(setApiBase);
    Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    if (isAdmin) {
      api<any>("/api/schools/update")
        .then((d) => {
          if (d?.school) {
            const loaded = {
              name: d.school.name || "",
              displayName: d.school.displayName || "",
              location: d.school.location || "",
              phone: d.school.phone || "",
              themeColor: d.school.themeColor || "#4338CA",
              logoUrl: d.school.logoUrl || "",
              schoolCode: d.school.schoolCode || d.school.code || (user as any)?.schoolCode || "",
            };
            setSchool(loaded);
            setInitialSchool(loaded);
          }
        })
        .catch(() => {});
    }
  }, [fade, isAdmin, user]);

  useEffect(() => {
    if (searchParams.tab === "school" && isAdmin) {
      setActiveTab("school");
    } else if (searchParams.tab === "my" || searchParams.tab === "profile") {
      setActiveTab("profile");
    }
  }, [searchParams.tab, isAdmin]);

  useEffect(() => {
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setPhone(user?.phone || "");
    setEmail(user?.email || "");
    setPhotoUrl(user?.photoUrl || (user as any)?.avatar || (user as any)?.photo || (user as any)?.image || "");
  }, [user]);

  const isStudent = user?.role === "STUDENT";
  const isParent = user?.role === "PARENT";
  const canEditProfile = !isStudent && !isParent;

  useEffect(() => {
    if (isParent && user) {
      resolveChildren(user)
        .then((kids) => {
          if (kids.length > 0) setFirstChild(kids[0]);
        })
        .catch(() => {});
    }
  }, [isParent, user]);

  const schoolLogoUri = resolveMediaUrlSync(school.logoUrl, apiBase);
  const color = themeColor || Colors.primary;

  const toggleEdit = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (editing) {
      setFirstName(user?.firstName || "");
      setLastName(user?.lastName || "");
      setPhone(user?.phone || "");
      setEmail(user?.email || "");
    }
    setEditing((e) => !e);
    setFieldErr({});
  };

  const toggleEditSchool = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (editingSchool) {
      setSchool(initialSchool);
    }
    setEditingSchool((e) => !e);
  };

  const switchTab = (tab: "profile" | "school") => {
    if (activeTab === tab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (editing) {
      setFirstName(user?.firstName || "");
      setLastName(user?.lastName || "");
      setPhone(user?.phone || "");
      setEmail(user?.email || "");
      setEditing(false);
      setFieldErr({});
    }
    if (editingSchool) {
      setSchool(initialSchool);
      setEditingSchool(false);
    }
    setActiveTab(tab);
  };

  const uploadFile = async (uri: string, filename: string) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: filename,
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
    return data.url as string;
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Allow photo library access");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets?.[0]) return;
    setUploading(true);
    try {
      const url = await uploadFile(res.assets[0].uri, "profile.jpg");
      setPhotoUrl(url);
      if (user) {
        await api(`/api/users/${user.id}`, {
          method: "PATCH",
          body: { photoUrl: url },
        });
        await refresh();
      }
      toast.success("Profile photo updated");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const pickSchoolLogo = async () => {
    if (!editingSchool) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Allow photo library access");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets?.[0]) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(res.assets[0].uri, "school_logo.png");
      setSchool((prev) => ({ ...prev, logoUrl: url }));
      toast.success("School logo uploaded");
    } catch (e: any) {
      toast.error(e?.message || "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveProfile = async () => {
    const err: typeof fieldErr = {};
    if (!firstName.trim()) err.firstName = "First name is required";
    if (!email.trim()) err.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) err.email = "Invalid email";
    if (phone && phone.replace(/\D/g, "").length < 8) err.phone = "Invalid phone";
    setFieldErr(err);
    if (Object.keys(err).length) return;

    setSaving(true);
    try {
      await api(`/api/users/${user?.id}`, {
        method: "PATCH",
        body: {
          firstName,
          lastName,
          phone,
          email,
          photoUrl: photoUrl || undefined,
        },
      });
      await refresh();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditing(false);
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const saveSchool = async () => {
    const schoolNameTrimmed = (school.name || "").trim();
    if (!schoolNameTrimmed) {
      toast.error("School name is required");
      return;
    }
    if (schoolNameTrimmed.length > 20) {
      if (!school.displayName || !school.displayName.trim()) {
        toast.error("Display Name is required when school name exceeds 20 characters");
        return;
      }
      if (school.displayName.trim().length > 20) {
        toast.error("Display Name must be 20 characters or less");
        return;
      }
    }
    if (!isDarkThemeColor(school.themeColor)) {
      toast.error("Theme color must be at least 25% dark (up to 75% light accepted)");
      return;
    }
    setSavingSchool(true);
    try {
      const payload = {
        name: schoolNameTrimmed,
        displayName: schoolNameTrimmed.length > 20 ? school.displayName.trim() : (school.displayName?.trim() || ""),
        location: school.location,
        phone: school.phone,
        themeColor: school.themeColor,
        logoUrl: school.logoUrl,
      };
      await api("/api/schools/update", {
        method: "PATCH",
        body: payload,
      });
      const savedSchool = {
        ...school,
        ...payload,
      };
      setSchool(savedSchool);
      setInitialSchool(savedSchool);
      await refresh();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditingSchool(false);
      toast.success("School details updated successfully");
    } catch (e: any) {
      toast.error(e?.message || "Could not save school details");
    } finally {
      setSavingSchool(false);
    }
  };

  const onLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/(auth)/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const roleLabel =
    user?.role === "ADMIN"
      ? "Administrator"
      : user?.role === "PRINCIPAL"
      ? "Principal"
      : user?.role === "TEACHER"
      ? "Teacher"
      : user?.role === "STUDENT"
      ? "Student"
      : "Parent";

  const roleIcon: keyof typeof Ionicons.glyphMap =
    user?.role === "ADMIN"
      ? "shield-checkmark"
      : user?.role === "PRINCIPAL"
      ? "ribbon"
      : user?.role === "TEACHER"
      ? "school"
      : user?.role === "STUDENT"
      ? "book"
      : "people";

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: TAB_BAR_CLEARANCE + 20 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fade }}>
        {/* Admin Dual Tab Switcher */}
        {isAdmin && (
          <View style={styles.tabSwitcher}>
            <Pressable
              style={[styles.switcherTab, activeTab === "profile" && { backgroundColor: color }]}
              onPress={() => switchTab("profile")}
            >
              <Ionicons
                name="person-circle-outline"
                size={17}
                color={activeTab === "profile" ? "#fff" : "#64748B"}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.switcherTabText, activeTab === "profile" && { color: "#fff" }]}>
                My Profile
              </Text>
            </Pressable>
            <Pressable
              style={[styles.switcherTab, activeTab === "school" && { backgroundColor: color }]}
              onPress={() => switchTab("school")}
            >
              <Ionicons
                name="business-outline"
                size={17}
                color={activeTab === "school" ? "#fff" : "#64748B"}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.switcherTabText, activeTab === "school" && { color: "#fff" }]}>
                School Profile & Logo
              </Text>
            </Pressable>
          </View>
        )}

        {/* ================= MY PROFILE TAB (ALL ROLES) ================= */}
        {activeTab === "profile" && (
          <>
            {/* Hero Profile Card with Cover Banner & Floating Avatar */}
            <View style={styles.heroCard}>
              {/* Cover Banner */}
              <View style={styles.coverWrapper}>
                <Image
                  source={require("@/assets/profile-cover.png")}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
                <View style={styles.coverOverlay} />
                {(user?.schoolCode || (user as any)?.code) ? (
                  <View style={styles.schoolCodeBadge}>
                    <Text style={styles.schoolCodeText}>
                      {user?.schoolCode || (user as any)?.code}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Profile Header Information */}
              <View style={styles.profileHeaderContent}>
                {/* Centered Half-Floating Profile Avatar */}
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarRing}>
                    <SafeAvatar
                      photoUrl={photoUrl || user?.photoUrl || (user as any)?.avatar || (user as any)?.photo || (user as any)?.image}
                      name={user?.firstName || (user as any)?.name || user?.username || "U"}
                      apiBase={apiBase || getApiBaseSync()}
                      size={100}
                      color={color}
                      round={true}
                      isParent={isParent}
                    />
                    {uploading && (
                      <View style={styles.uploadingOverlay}>
                        <ActivityIndicator color="#fff" size="small" />
                      </View>
                    )}
                  </View>

                  {/* Camera upload badge */}
                  {canEditProfile && (
                    <Pressable
                      onPress={pickPhoto}
                      disabled={uploading}
                      style={[styles.cameraButton, { backgroundColor: color }]}
                    >
                      <Ionicons name="camera" size={15} color="#fff" />
                    </Pressable>
                  )}
                </View>

                {/* Name & Badges */}
                <Text style={styles.profileName}>
                  {user?.firstName} {user?.lastName || ""}
                </Text>
                {isStudent && user?.className ? (
                  <View style={[styles.topClassPill, { borderColor: "#E0E7FF", backgroundColor: "#EEF2FF" }]}>
                    <Ionicons name="school" size={13} color={color} style={{ marginRight: 5 }} />
                    <Text style={[styles.topClassPillText, { color }]}>
                      Class {user.className}{user.section ? ` · Section ${user.section}` : ""}
                    </Text>
                  </View>
                ) : null}
                {user?.username ? (
                  <Text style={styles.profileUsername}>@{user.username}</Text>
                ) : null}

                <View style={styles.badgeRow}>
                  <View style={[styles.roleBadge, { backgroundColor: "#EEF2FF", borderColor: "#E0E7FF" }]}>
                    <Ionicons name={roleIcon} size={13} color={color} style={{ marginRight: 4 }} />
                    <Text style={[styles.roleBadgeText, { color }]}>{roleLabel}</Text>
                  </View>
                  {isStudent && ((user as any)?.rollNumber || (user as any)?.rollNo) ? (
                    <View style={[styles.roleBadge, { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }]}>
                      <Ionicons name="id-card-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
                      <Text style={[styles.roleBadgeText, { color: "#334155" }]}>
                        Roll #{(user as any).rollNumber || (user as any).rollNo}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.schoolBadge}>
                    <Ionicons name="business-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
                    <Text style={styles.schoolBadgeText} numberOfLines={1}>
                      {user?.schoolName || "My School"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Personal Information Card */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardHeadLeft}>
                  <View style={[styles.headIconBox, { backgroundColor: "#EEF2FF" }]}>
                    <Ionicons name="person" size={16} color={color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>Personal Details</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>Manage your account details</Text>
                  </View>
                </View>
                {canEditProfile && (
                  <Pressable
                    onPress={toggleEdit}
                    style={[
                      styles.editBtn,
                      {
                        borderColor: editing ? "#CBD5E1" : color,
                        backgroundColor: editing ? "#F8FAFC" : "#EEF2FF",
                      },
                    ]}
                  >
                    <Ionicons
                      name={editing ? "close" : "pencil"}
                      size={13}
                      color={editing ? "#64748B" : color}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.editBtnText, { color: editing ? "#64748B" : color }]}>
                      {editing ? "Cancel" : "Edit"}
                    </Text>
                  </Pressable>
                )}
              </View>

              {!editing ? (
                <View style={styles.infoList}>
                  <InfoRow icon="person-outline" label="Full Name" value={`${user?.firstName || ""} ${user?.lastName || ""}`} />
                  {isStudent ? (
                    <InfoRow icon="id-card-outline" label="Roll Number" value={(user as any)?.rollNumber || (user as any)?.rollNo || "—"} />
                  ) : ((user as any)?.rollNumber || (user as any)?.rollNo) ? (
                    <InfoRow icon="id-card-outline" label="Roll Number" value={(user as any)?.rollNumber || (user as any)?.rollNo} />
                  ) : null}
                  {isStudent ? (
                    <>
                      <InfoRow
                        icon="mail-outline"
                        label="Parent Email"
                        value={(user as any)?.parentEmail || (!user?.email?.includes("@student.local") ? user?.email : "—")}
                      />
                      {!!(user as any)?.parentName && (
                        <InfoRow
                          icon="people-outline"
                          label="Parent Name"
                          value={(user as any)?.parentName}
                        />
                      )}
                    </>
                  ) : (
                    <InfoRow icon="mail-outline" label="Email Address" value={user?.email} />
                  )}
                  <InfoRow
                    icon="call-outline"
                    label={isStudent ? "Contact Phone" : "Phone Number"}
                    value={(isParent ? (firstChild?.phone || user?.phone) : user?.phone) || "—"}
                  />
                  {isStudent && !!(user as any)?.dateOfBirth && (
                    <InfoRow
                      icon="calendar-outline"
                      label="Date of Birth"
                      value={formatDateDDMMYYYY((user as any).dateOfBirth)}
                    />
                  )}
                  <InfoRow icon="at-outline" label="Username" value={user?.username} />
                  <InfoRow icon="business-outline" label="School" value={user?.schoolName || user?.schoolCode} />
                  {user?.className ? (
                    <InfoRow
                      icon="albums-outline"
                      label="Class & Section"
                      value={`${user.className}${user.section ? ` · ${user.section}` : ""}`}
                    />
                  ) : null}
                </View>
              ) : (
                <View style={styles.editBox}>
                  <Label>First name</Label>
                  <Input value={firstName} onChangeText={setFirstName} placeholder="First name" />
                  {!!fieldErr.firstName && <Text style={styles.err}>{fieldErr.firstName}</Text>}
                  <Label>Last name</Label>
                  <Input value={lastName} onChangeText={setLastName} placeholder="Last name" />
                  <Label>Email</Label>
                  <Input value={email} autoCapitalize="none" onChangeText={setEmail} placeholder="email@example.com" />
                  {!!fieldErr.email && <Text style={styles.err}>{fieldErr.email}</Text>}
                  <Label>Phone</Label>
                  <PhoneField value={phone} onChange={setPhone} error={fieldErr.phone} />
                  <View style={{ marginTop: 12 }}>
                    <Button title="Save changes" onPress={saveProfile} loading={saving} color={color} />
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        {/* ================= SCHOOL PROFILE TAB (ADMIN ONLY) ================= */}
        {activeTab === "school" && (
          <>
            {/* School Hero Card with Cover Banner & Floating Logo */}
            <View style={styles.heroCard}>
              <View style={styles.coverWrapper}>
                <Image
                  source={require("@/assets/profile-cover.png")}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
                <View style={styles.coverOverlay} />
                <View style={styles.coverBottomTitle}>
                  <Text style={styles.coverSubText}>INSTITUTION SETTINGS</Text>
                  <Text style={styles.coverMainText} numberOfLines={1}>
                    {school.name || user?.schoolName || "My School"}
                  </Text>
                </View>
              </View>

              {/* School Logo Floating Header */}
              <View style={styles.profileHeaderContent}>
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatarRing, { borderRadius: 24 }]}>
                    {schoolLogoUri ? (
                      <ExpoImage
                        source={{ uri: schoolLogoUri }}
                        style={{ width: 92, height: 92, borderRadius: 20 }}
                        contentFit="contain"
                      />
                    ) : (
                      <View style={[styles.schoolLogoFallback, { backgroundColor: color }]}>
                        <Text style={styles.schoolLogoLetter}>
                          {(school.name || "S")[0]?.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {uploadingLogo && (
                      <View style={[styles.uploadingOverlay, { borderRadius: 24 }]}>
                        <ActivityIndicator color="#fff" size="small" />
                      </View>
                    )}
                  </View>

                  {editingSchool && (
                    <Pressable
                      onPress={pickSchoolLogo}
                      disabled={uploadingLogo}
                      style={[styles.cameraButton, { backgroundColor: color }]}
                    >
                      <Ionicons name="camera" size={15} color="#fff" />
                    </Pressable>
                  )}
                </View>

                <Text style={styles.profileName}>{school.name || "School Name"}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.schoolBadge}>
                    <Text style={styles.schoolBadgeText}>
                      Code: <Text style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontWeight: "800" }}>{school.schoolCode || (user as any)?.schoolCode || "—"}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* School Profile Information Card */}
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.cardHeadLeft}>
                  <View style={[styles.headIconBox, { backgroundColor: "#EEF2FF" }]}>
                    <Ionicons name="business" size={16} color={color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>School Branding</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>Institution details & theme</Text>
                  </View>
                </View>
                <Pressable
                  onPress={toggleEditSchool}
                  style={[
                    styles.editBtn,
                    {
                      borderColor: editingSchool ? "#CBD5E1" : color,
                      backgroundColor: editingSchool ? "#F8FAFC" : "#EEF2FF",
                    },
                  ]}
                >
                  <Ionicons
                    name={editingSchool ? "close" : "pencil"}
                    size={13}
                    color={editingSchool ? "#64748B" : color}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.editBtnText, { color: editingSchool ? "#64748B" : color }]}>
                    {editingSchool ? "Cancel" : "Edit"}
                  </Text>
                </Pressable>
              </View>

              {!editingSchool ? (
                <View style={styles.infoList}>
                  <InfoRow icon="business-outline" label="School Name" value={school.name} />
                  {((school.name || "").length > 20 || !!school.displayName) && (
                    <InfoRow icon="pricetag-outline" label="Display Name (Short)" value={school.displayName || "—"} />
                  )}
                  <InfoRow icon="key-outline" label="School Code" value={school.schoolCode || (user as any)?.schoolCode} />
                  <InfoRow icon="location-outline" label="Location / Address" value={school.location || "—"} />
                  <InfoRow icon="call-outline" label="Official School Phone" value={school.phone || "—"} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="color-palette-outline" size={16} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Brand Theme Color</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            backgroundColor: school.themeColor || color,
                            borderWidth: 1,
                            borderColor: "rgba(0,0,0,0.1)",
                          }}
                        />
                        <Text style={styles.infoValue}>{school.themeColor || color}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.editBox}>
                  <Label>School Name</Label>
                  <Input value={school.name} onChangeText={(v) => setSchool({ ...school, name: v })} placeholder="School Name" />

                  {/* Display Name (Required & shown only when School Name exceeds 20 characters) */}
                  {(school.name || "").trim().length > 20 && (
                    <View style={styles.displayNameBox}>
                      <View style={styles.displayNameHeaderRow}>
                        <Text style={styles.displayNameLabel}>
                          DISPLAY NAME (SHORT NAME) <Text style={{ color: "#E11D48" }}>*</Text>
                        </Text>
                        <Text
                          style={[
                            styles.displayNameCounter,
                            { color: (school.displayName || "").length > 20 ? "#E11D48" : color },
                          ]}
                        >
                          {(school.displayName || "").length}/20 chars
                        </Text>
                      </View>
                      <Text style={styles.displayNameHelp}>
                        Your school name exceeds 20 characters. This display name (up to 20 characters) is used across app headers, navigation, and reports.
                      </Text>
                      <Input
                        value={school.displayName || ""}
                        onChangeText={(v) => setSchool({ ...school, displayName: v })}
                        placeholder="e.g. DPS International"
                        maxLength={20}
                      />
                    </View>
                  )}

                  <Label>Location / Address</Label>
                  <Input value={school.location} onChangeText={(v) => setSchool({ ...school, location: v })} placeholder="Address / Location" />
                  <Label>Official School Phone</Label>
                  <PhoneField value={school.phone} onChange={(v) => setSchool({ ...school, phone: v })} />

                  {/* Brand Theme Color Selector */}
                  <View style={styles.themeSection}>
                    <View style={styles.themeHeaderRow}>
                      <Text style={styles.themeTitle}>BRAND THEME COLOR</Text>
                      <Text
                        style={[
                          styles.themeValidationText,
                          { color: isDarkThemeColor(school.themeColor) ? "#059669" : "#E11D48" },
                        ]}
                      >
                        {isDarkThemeColor(school.themeColor) ? "✓ Valid Theme" : "⚠ Must be ≥ 25% dark"}
                      </Text>
                    </View>
                    <Text style={styles.themeSub}>
                      Theme color must be at least 25% dark (up to 75% light accepted) to ensure high contrast and readable text across the app.
                    </Text>

                    {/* Presets Row */}
                    <Text style={styles.presetLabel}>Recommended Presets:</Text>
                    <View style={styles.presetGrid}>
                      {THEME_PRESETS.map((p) => {
                        const active = (school.themeColor || "").toLowerCase() === p.hex.toLowerCase();
                        return (
                          <Pressable
                            key={p.hex}
                            onPress={() => setSchool({ ...school, themeColor: p.hex })}
                            style={[
                              styles.presetChip,
                              active && { borderColor: "#0F172A", backgroundColor: "#0F172A" },
                            ]}
                          >
                            <View style={[styles.presetDot, { backgroundColor: p.hex }]} />
                            <Text style={[styles.presetChipText, active && { color: "#fff" }]}>
                              {p.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Extended Dark Palette Grid */}
                    <Text style={[styles.presetLabel, { marginTop: 12 }]}>Color Palette Swatches:</Text>
                    <View style={styles.swatchGrid}>
                      {EXTENDED_DARK_PALETTE.map((hex) => {
                        const isSelected = (school.themeColor || "").toLowerCase() === hex.toLowerCase();
                        return (
                          <Pressable
                            key={hex}
                            onPress={() => setSchool({ ...school, themeColor: hex })}
                            style={[
                              styles.swatchItem,
                              { backgroundColor: hex },
                              isSelected && styles.swatchItemSelected,
                            ]}
                          >
                            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Hex Code Input */}
                    <View style={styles.hexInputRow}>
                      <View
                        style={[
                          styles.hexColorPreview,
                          { backgroundColor: school.themeColor || "#4338CA" },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Input
                          value={school.themeColor}
                          onChangeText={(v) => setSchool({ ...school, themeColor: v })}
                          placeholder="#4338CA"
                          autoCapitalize="characters"
                          maxLength={7}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={{ marginTop: 16 }}>
                    <Button
                      title="Save School Details"
                      onPress={saveSchool}
                      loading={savingSchool}
                      color={color}
                    />
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        {/* Security & Password Card */}
        {!isStudent && (
          <View style={styles.card}>
            <View style={styles.securityHeader}>
              <View style={[styles.headIconBox, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="key" size={16} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Settings & Password</Text>
                <Text style={styles.cardSub}>Manage account credentials and security</Text>
              </View>
            </View>
            <Pressable
              style={styles.securityButton}
              onPress={() => router.push("/(app)/settings")}
            >
              <View style={styles.securityBtnLeft}>
                <View style={styles.lockIconBox}>
                  <Ionicons name="lock-closed" size={18} color="#475569" />
                </View>
                <View>
                  <Text style={styles.securityBtnTitle}>Change Password</Text>
                  <Text style={styles.securityBtnSub}>
                    Update your login credentials regularly
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color} />
            </Pressable>
          </View>
        )}

        {/* Log Out Button */}
        <Pressable
          style={styles.logoutBtn}
          onPress={() => setLogoutConfirm(true)}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color="#E11D48" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#E11D48" style={{ marginRight: 6 }} />
              <Text style={styles.logoutBtnText}>Log Out of Account</Text>
            </>
          )}
        </Pressable>

        <ConfirmModal
          visible={logoutConfirm}
          title="Log out?"
          message="You will need to sign in again to access your account."
          confirmText="Log out"
          cancelText="Cancel"
          destructive
          onCancel={() => setLogoutConfirm(false)}
          onConfirm={async () => {
            setLogoutConfirm(false);
            await onLogout();
          }}
        />
      </Animated.View>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  switcherTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  switcherTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  coverWrapper: {
    height: 140,
    width: "100%",
    backgroundColor: "#F1F5F9",
    position: "relative",
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  schoolCodeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  schoolCodeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1E293B",
  },
  coverBottomTitle: {
    position: "absolute",
    bottom: 10,
    left: 14,
    right: 14,
  },
  coverSubText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  coverMainText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  profileHeaderContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    alignItems: "center",
  },
  avatarContainer: {
    marginTop: -50,
    marginBottom: 10,
    position: "relative",
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraButton: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  schoolLogoFallback: {
    width: 92,
    height: 92,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  schoolLogoLetter: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
  },
  profileUsername: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  topClassPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  topClassPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  schoolBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    maxWidth: 200,
  },
  schoolBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
    marginBottom: 8,
    gap: 10,
  },
  cardHeadLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  cardSub: { fontSize: 11, color: "#64748B", marginTop: 1 },
  infoList: { gap: 2 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },
  infoValue: { fontSize: 13, color: Colors.text, fontWeight: "700", marginTop: 1 },
  editBox: { marginTop: 8 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexShrink: 0,
  },
  editBtnText: {
    fontWeight: "700",
    fontSize: 11,
  },
  err: { color: Colors.danger, fontSize: 11, marginTop: 2, marginBottom: 4 },
  themeSection: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  themeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  themeTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  themeValidationText: {
    fontSize: 11,
    fontWeight: "800",
  },
  themeSub: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 10,
    lineHeight: 15,
  },
  presetLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
    gap: 5,
  },
  presetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },
  swatchItem: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  swatchItemSelected: {
    borderWidth: 2,
    borderColor: "#FFFFFF",
    transform: [{ scale: 1.15 }],
  },
  hexInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  hexColorPreview: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  securityButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 12,
  },
  securityBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  lockIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  securityBtnTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  securityBtnSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#E11D48",
  },
  displayNameBox: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
    gap: 6,
  },
  displayNameHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  displayNameLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#312E81",
    letterSpacing: 0.5,
  },
  displayNameCounter: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "700",
  },
  displayNameHelp: {
    fontSize: 11,
    color: "#4338CA",
    lineHeight: 15,
  },
});
