import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { api, getApiBase, getApiBaseSync, resolveMediaUrlSync } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Colors } from "@/constants/theme";

type School = {
  name?: string;
  schoolCode?: string;
  phone?: string;
  email?: string;
  location?: string;
  logoUrl?: string;
  themeColor?: string;
  address?: string;
  principalName?: string;
};

export function SchoolDetailsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user, themeColor } = useAuth();
  const [school, setSchool] = useState<School | null>(() => ({
    name: user?.schoolName || "My School",
    schoolCode: (user as any)?.schoolCode || "",
    logoUrl: (user as any)?.schoolLogo || undefined,
    themeColor: themeColor || Colors.primary,
  }));
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [apiBase, setApiBase] = useState(() => getApiBaseSync());
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    getApiBase().then((b) => {
      if (b) setApiBase(b);
    });

    setLoadingDetails(true);
    (async () => {
      try {
        const data = await api<any>("/api/school");
        if (data?.school) {
          setSchool(data.school);
        }
      } catch {
        /* keep current cached school info */
      } finally {
        setLoadingDetails(false);
      }
    })();

    scale.setValue(0.88);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7.5, tension: 100, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  const color = school?.themeColor || themeColor || Colors.primary;
  const rawLogo = school?.logoUrl || (user as any)?.schoolLogo || null;
  const logo = resolveMediaUrlSync(rawLogo, apiBase);

  const call = () => {
    if (school?.phone) Linking.openURL(`tel:${school.phone.replace(/[^\d+]/g, "")}`);
  };
  const mail = () => {
    if (school?.email) Linking.openURL(`mailto:${school.email.trim()}`);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          {/* Top Hero Banner */}
          <View style={[styles.hero, { backgroundColor: color }]}>
            {/* Top Right Close Button (Only One Close Button) */}
            <Pressable
              style={styles.topCloseBtn}
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close school details"
            >
              <Ionicons name="close" size={20} color="#ffffff" />
            </Pressable>

            {/* Glowing Logo Container */}
            <View style={styles.logoOuterRing}>
              {logo ? (
                <Image
                  source={{ uri: logo }}
                  style={styles.logo}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.logoPh}>
                  <Text style={styles.logoLetter}>
                    {(school?.name || user?.schoolName || "S")[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {/* School Name */}
            <Text style={styles.name} numberOfLines={2}>
              {school?.name || user?.schoolName || "My School"}
            </Text>

            {/* Code Badge */}
            {(school?.schoolCode || user?.schoolCode) && (
              <View style={styles.codeBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#ffffff" />
                <Text style={styles.codeText}>
                  CODE: {school?.schoolCode || user?.schoolCode}
                </Text>
              </View>
            )}
          </View>

          {/* Card Body */}
          <View style={styles.body}>
            {loadingDetails ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="small" color={color} />
                <Text style={styles.loaderText}>Loading school details…</Text>
              </View>
            ) : (
              <View style={styles.detailsList}>
                {/* Location / Address */}
                <View style={styles.infoCard}>
                  <View style={[styles.iconBox, { backgroundColor: color + "18" }]}>
                    <Ionicons name="location" size={19} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>Location & Address</Text>
                    <Text style={styles.infoValue}>
                      {school?.location || school?.address || "School Campus"}
                    </Text>
                  </View>
                </View>

                {/* Phone Number */}
                {school?.phone ? (
                  <Pressable
                    style={({ pressed }) => [styles.infoCard, pressed && { opacity: 0.85 }]}
                    onPress={call}
                  >
                    <View style={[styles.iconBox, { backgroundColor: "#10B98118" }]}>
                      <Ionicons name="call" size={19} color="#10B981" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Phone Number</Text>
                      <Text style={[styles.infoValue, { color: "#059669" }]}>
                        {school.phone}
                      </Text>
                    </View>
                    <View style={styles.actionIconBtnGreen}>
                      <Ionicons name="call" size={15} color="#059669" />
                    </View>
                  </Pressable>
                ) : null}

                {/* Email Address */}
                {school?.email ? (
                  <Pressable
                    style={({ pressed }) => [styles.infoCard, pressed && { opacity: 0.85 }]}
                    onPress={mail}
                  >
                    <View style={[styles.iconBox, { backgroundColor: "#3B82F618" }]}>
                      <Ionicons name="mail" size={19} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Email Address</Text>
                      <Text style={[styles.infoValue, { color: "#2563EB" }]}>
                        {school.email}
                      </Text>
                    </View>
                    <View style={styles.actionIconBtnBlue}>
                      <Ionicons name="open-outline" size={16} color="#2563EB" />
                    </View>
                  </Pressable>
                ) : null}

                {/* Verified Institution Footer */}
                <View style={styles.footerNote}>
                  <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                  <Text style={styles.footerNoteText}>Verified Educational Institution</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  hero: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: "relative",
  },
  topCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logoOuterRing: {
    width: 80,
    height: 80,
    borderRadius: 26,
    padding: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logo: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
    backgroundColor: "#ffffff",
  },
  logoPh: {
    width: "100%",
    height: "100%",
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 32,
  },
  name: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 20,
    textAlign: "center",
    lineHeight: 26,
    letterSpacing: -0.2,
    paddingHorizontal: 12,
  },
  codeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.22)",
  },
  codeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  body: {
    padding: 20,
    backgroundColor: "#ffffff",
  },
  loaderBox: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  detailsList: {
    gap: 12,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 2,
  },
  actionIconBtnGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  actionIconBtnBlue: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
  },
  footerNoteText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
});
