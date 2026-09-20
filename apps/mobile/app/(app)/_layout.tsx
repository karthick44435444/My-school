import React, { useEffect, useMemo, useState } from "react";
import { Redirect, Tabs, usePathname, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Keyboard, Platform, StyleSheet, Text, View, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { useAuth } from "@/hooks/useAuth";
import { useBadges } from "@/hooks/useBadges";
import { Loading } from "@/components/ui";
import TopBar from "@/components/TopBar";
import { TabBadge } from "@/components/TabBadge";
import { Colors } from "@/constants/theme";

type TabDef = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  badge?: "notifications" | "homework" | "announcements" | "marks" | null;
};

function tabsForRole(role?: string): TabDef[] {
  switch (role) {
    case "STUDENT":
      return [
        { name: "index", title: "Home", icon: "home", iconOutline: "home-outline" },
        { name: "attendance", title: "Attendance", icon: "calendar", iconOutline: "calendar-outline" },
        { name: "homework", title: "Homework", icon: "book", iconOutline: "book-outline", badge: "homework" },
        { name: "marks", title: "Marks", icon: "ribbon", iconOutline: "ribbon-outline", badge: "marks" },
        { name: "announcements", title: "Notice", icon: "megaphone", iconOutline: "megaphone-outline", badge: "announcements" },
      ];
    case "TEACHER":
      return [
        { name: "index", title: "Home", icon: "home", iconOutline: "home-outline" },
        { name: "homework", title: "Homework", icon: "book", iconOutline: "book-outline", badge: "homework" },
        { name: "attendance", title: "Attendance", icon: "checkbox", iconOutline: "checkbox-outline" },
        { name: "marks", title: "Exams", icon: "ribbon", iconOutline: "ribbon-outline", badge: "marks" },
        { name: "announcements", title: "Notice", icon: "megaphone", iconOutline: "megaphone-outline", badge: "announcements" },
      ];
    case "PRINCIPAL":
    case "ADMIN":
      return [
        { name: "index", title: "Home", icon: "home", iconOutline: "home-outline" },
        { name: "analytics", title: "Analytics", icon: "bar-chart", iconOutline: "bar-chart-outline" },
        { name: "more", title: "More", icon: "apps", iconOutline: "apps-outline" },
        { name: "classes", title: "Classes", icon: "layers", iconOutline: "layers-outline" },
        { name: "announcements", title: "Notice", icon: "megaphone", iconOutline: "megaphone-outline", badge: "announcements" },
      ];
    case "PARENT":
      return [
        { name: "index", title: "Home", icon: "home", iconOutline: "home-outline" },
        { name: "homework", title: "Homework", icon: "book", iconOutline: "book-outline", badge: "homework" },
        { name: "attendance", title: "Attendance", icon: "calendar", iconOutline: "calendar-outline" },
        { name: "marks", title: "Marks", icon: "ribbon", iconOutline: "ribbon-outline", badge: "marks" },
        { name: "announcements", title: "Notice", icon: "megaphone", iconOutline: "megaphone-outline", badge: "announcements" },
      ];
    default:
      return [
        { name: "index", title: "Home", icon: "home", iconOutline: "home-outline" },
        { name: "more", title: "More", icon: "apps", iconOutline: "apps-outline" },
      ];
  }
}

const ALL_TAB_NAMES = [
  "index",
  "attendance",
  "homework",
  "marks",
  "more",
  "students",
  "classes",
  "teachers",
  "principals",
  "top-students",
  "announcements",
  "notifications",
  "profile",
  "settings",
  "analytics",
  "subscription",
] as const;

function FloatingTabBarBackground() {
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
    );
  }
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.92)" }]} />;
}

export default function AppLayout() {
  const { user, loading, themeColor, logout, refresh } = useAuth();
  const badges = useBadges();
  const pathname = usePathname();

  const roleTabs = useMemo(() => tabsForRole(user?.role), [user?.role]);
  const visible = useMemo(() => new Set(roleTabs.map((t) => t.name)), [roleTabs]);
  const color = themeColor || Colors.primary;
  const [kbOpen, setKbOpen] = useState(false);

  const isMoreSubPage =
    user?.role === "ADMIN"
      ? ["/principals", "/teachers", "/students", "/profile", "/top-students", "/subscription"].includes(pathname)
      : user?.role === "PRINCIPAL"
      ? ["/teachers", "/students", "/top-students"].includes(pathname)
      : false;

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKbOpen(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbOpen(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (loading) return <Loading />;
  if (!user) return <Redirect href="/(auth)/login" />;

  const isExpired =
    user.isSubscriptionExpired ||
    user.planStatus === "EXPIRED" ||
    (user.planExpiresAt ? new Date(user.planExpiresAt).getTime() <= Date.now() : false);

  if (isExpired && user.role !== "ADMIN") {
    return (
      <View style={{ flex: 1, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", padding: 24 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#FFE4E6", justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
          <Ionicons name="shield-outline" size={44} color="#E11D48" />
        </View>

        <View style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: "#FFE4E6", borderRadius: 100, marginBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#BE123C", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Subscription Expired
          </Text>
        </View>

        <Text style={{ fontSize: 22, fontWeight: "800", color: "#0F172A", textAlign: "center", marginBottom: 8 }}>
          School Access Inactive
        </Text>

        <Text style={{ fontSize: 14, color: "#475569", textAlign: "center", lineHeight: 22, marginBottom: 24 }}>
          The subscription plan for <Text style={{ fontWeight: "700", color: "#0F172A" }}>{user.schoolName || "your school"}</Text> has expired. Access to attendance, marks, homework, and timetable features is temporarily paused.
        </Text>

        <View style={{ backgroundColor: "#FEF3C7", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#FDE68A", width: "100%", marginBottom: 28, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          <Ionicons name="information-circle" size={22} color="#D97706" style={{ marginTop: 2 }} />
          <Text style={{ fontSize: 12, color: "#92400E", flex: 1, lineHeight: 18 }}>
            Please contact your <Text style={{ fontWeight: "700" }}>School Administrator</Text> to renew the school plan. All records and data remain safe.
          </Text>
        </View>

        <View style={{ width: "100%", gap: 12 }}>
          <Pressable
            onPress={() => refresh()}
            style={({ pressed }: { pressed: boolean }) => ({
              backgroundColor: color,
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>Check Status</Text>
          </Pressable>

          <Pressable
            onPress={() => logout()}
            style={({ pressed }: { pressed: boolean }) => ({
              backgroundColor: "#F1F5F9",
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="log-out-outline" size={18} color="#64748B" />
            <Text style={{ color: "#475569", fontSize: 14, fontWeight: "600" }}>Logout</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const badgeCount = (key?: TabDef["badge"]) => {
    if (key === "homework") return badges.homework;
    if (key === "announcements") return badges.announcements;
    if (key === "notifications") return badges.notifications;
    if (key === "marks") return badges.marks;
    return 0;
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <TopBar />
      {isExpired && user.role === "ADMIN" && pathname !== "/subscription" && (
        <Pressable
          onPress={() => router.push("/(app)/subscription" as any)}
          style={({ pressed }: { pressed: boolean }) => ({
            backgroundColor: "#BE123C",
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700", flex: 1 }}>
              School Plan Expired! Tap to recharge now
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </Pressable>
      )}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: color,
          tabBarInactiveTintColor: "#94A3B8",
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            marginBottom: 2,
          },
          tabBarStyle: kbOpen
            ? {
                position: "absolute",
                left: 0,
                right: 0,
                bottom: -120,
                height: 0,
                opacity: 0,
                overflow: "hidden",
                borderTopWidth: 0,
                elevation: 0,
                zIndex: -1,
              }
            : {
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 16,
                height: 64,
                borderRadius: 32,
                backgroundColor: "transparent",
                borderTopWidth: 0,
                elevation: 16,
                shadowColor: "#0F172A",
                shadowOpacity: 0.12,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
                paddingBottom: 6,
                paddingTop: 6,
                overflow: "hidden",
              },
          tabBarHideOnKeyboard: true,
          tabBarBackground: () => (kbOpen ? null : <FloatingTabBarBackground />),
          tabBarItemStyle: {
            borderRadius: 24,
          },
        }}
      >
        {/* Render visible tabs in exact role order */}
        {roleTabs.map((def) => {
          const count = badgeCount(def.badge);
          return (
            <Tabs.Screen
              key={def.name}
              name={def.name}
              options={{
                title: def.title,
                tabBarIcon: ({ color: c, focused, size }) => {
                  const active = focused || (def.name === "more" && isMoreSubPage);
                  return (
                    <View style={{ alignItems: "center", justifyContent: "center" }}>
                      <Ionicons
                        name={active ? def.icon : def.iconOutline}
                        size={size}
                        color={active ? color : c}
                      />
                      <TabBadge count={count} />
                    </View>
                  );
                },
                tabBarLabel: ({ focused, color: c }) => {
                  const active = focused || (def.name === "more" && isMoreSubPage);
                  return (
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        marginBottom: 2,
                        color: active ? color : c,
                      }}
                    >
                      {def.title}
                    </Text>
                  );
                },
              }}
            />
          );
        })}

        {/* Hidden screen tabs */}
        {ALL_TAB_NAMES.filter((name) => !visible.has(name)).map((name) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{ href: null, title: name }}
          />
        ))}
      </Tabs>
    </View>
  );
}
