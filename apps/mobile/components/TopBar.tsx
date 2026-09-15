import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useBadges } from "@/hooks/useBadges";
import { api, getApiBase, getApiBaseSync, resolveMediaUrlSync } from "@/lib/api";
import { SchoolDetailsModal } from "@/components/SchoolDetailsModal";
import { SafeAvatar } from "@/components/ChildAvatar";

export default function TopBar() {
  const insets = useSafeAreaInsets();
  const { user, themeColor } = useAuth();
  const { notifications } = useBadges();
  const pathname = usePathname();
  const color = themeColor || "#6366F1";
  const [apiBase, setApiBase] = useState(() => getApiBaseSync());
  const [logoFailed, setLogoFailed] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(
    (user as any)?.schoolLogo || null
  );

  const subTitles = useMemo(() => {
    const map: Record<string, string> = {
      "/notifications": "Notifications",
    };
    if (user?.role === "ADMIN") {
      map["/principals"] = "Principals";
      map["/teachers"] = "Teachers";
      map["/students"] = "Students";
      map["/profile"] = "Profile";
      map["/settings"] = "Settings";
      map["/top-students"] = "Top Students";
    } else if (user?.role === "PRINCIPAL") {
      map["/teachers"] = "Teachers";
      map["/students"] = "Students";
      map["/profile"] = "Profile";
      map["/settings"] = "Settings";
      map["/top-students"] = "Top Students";
    } else {
      // TEACHER, STUDENT, PARENT
      map["/profile"] = "Profile";
      map["/settings"] = "Settings";
    }
    return map;
  }, [user?.role]);

  const isMoreSubPage = Boolean(subTitles[pathname]);
  const pageTitle = subTitles[pathname];

  useEffect(() => {
    getApiBase().then((b) => {
      if (b) setApiBase(b);
    });
    setLogoFailed(false);
    setSchoolLogo((user as any)?.schoolLogo || null);
    (async () => {
      try {
        const data = await api<any>("/api/school");
        if (data?.school?.logoUrl) setSchoolLogo(data.school.logoUrl);
      } catch {
        /* keep auth logo */
      }
    })();
  }, [user?.photoUrl, (user as any)?.schoolLogo, user?.id]);

  useEffect(() => {
    setLogoFailed(false);
  }, [schoolLogo, apiBase, (user as any)?.schoolLogo]);

  const currentBase = apiBase || getApiBaseSync();
  const rawLogo = schoolLogo || (user as any)?.schoolLogo || null;
  const logoUri = !logoFailed ? resolveMediaUrlSync(rawLogo, currentBase) : undefined;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6, backgroundColor: color }]}>
      <View style={styles.row}>
        {isMoreSubPage ? (
          <View style={styles.left}>
            <Pressable
              style={styles.backBtn}
              onPress={() => {
                if (pathname === "/notifications" || pathname === "/top-students") {
                  router.replace("/(app)");
                } else if (pathname === "/settings") {
                  router.replace("/(app)/profile");
                } else if (pathname === "/profile") {
                  if (user?.role === "ADMIN") {
                    router.replace("/(app)/more");
                  } else {
                    // TEACHER, STUDENT, PARENT, PRINCIPAL
                    router.replace("/(app)");
                  }
                } else {
                  router.replace("/(app)/more");
                }
              }}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.subPageTitle} numberOfLines={1}>
              {pageTitle}
            </Text>
          </View>
        ) : (
          <Pressable
            style={styles.left}
            onPress={() => setSchoolOpen(true)}
          >
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                style={styles.logo}
                contentFit="cover"
                onError={() => setLogoFailed(true)}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.defaultLogoBox}>
                <Image
                  source={require("@/assets/logo.png")}
                  style={styles.defaultLogo}
                  contentFit="contain"
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.school} numberOfLines={1}>
                {user?.schoolName || "My School"}
              </Text>
              <Text style={styles.role} numberOfLines={1}>
                {user?.role === "ADMIN" ? "Administrator" : user?.role}
              </Text>
            </View>
          </Pressable>
        )}

        <View style={styles.right}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push("/(app)/notifications")}
            hitSlop={8}
          >
            <Ionicons name="notifications" size={22} color="#fff" />
            {notifications > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notifications > 99 ? "99+" : notifications}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={styles.avatarWrap}
            onPress={() => router.push("/(app)/profile?tab=my" as any)}
            hitSlop={8}
          >
            <SafeAvatar
              photoUrl={user?.photoUrl}
              name={user?.firstName || "U"}
              apiBase={currentBase}
              size={36}
              color="#ffffff"
              isParent={user?.role === "PARENT"}
            />
          </Pressable>
        </View>
      </View>
      <SchoolDetailsModal visible={schoolOpen} onClose={() => setSchoolOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  subPageTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    letterSpacing: 0.2,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  defaultLogoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  defaultLogo: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  school: { color: "#fff", fontWeight: "800", fontSize: 16 },
  role: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 1 },
  right: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { padding: 4 },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.65)",
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
});
