import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/hooks/useToast";
import { Colors } from "@/constants/theme";

export type CredentialPair = {
  username?: string;
  password?: string;
  schoolCode?: string;
  email?: string;
};

export type Credentials = CredentialPair & {
  role?: string;
  student?: CredentialPair;
  parent?: CredentialPair;
};

export function CredentialsModal({
  visible,
  credentials,
  color = Colors.primary,
  title = "Account Created",
  subtitle = "Please copy and save these credentials securely.",
  onClose,
}: {
  visible: boolean;
  credentials: Credentials | null;
  color?: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.88);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, scale, opacity]);

  if (!credentials) return null;

  const isStudent = Boolean(credentials.student);

  const copyText = async (label: string, text: string) => {
    if (!text) return;
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(text);
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      toast.success(`${label} copied!`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  const copyAll = async () => {
    const lines: string[] = [];
    if (isStudent) {
      const school = credentials.student?.schoolCode || credentials.schoolCode;
      if (school) lines.push(`School Code: ${school}`);
      if (credentials.student?.username) lines.push(`Student Username: ${credentials.student.username}`);
      if (credentials.student?.password) lines.push(`Student Password: ${credentials.student.password}`);
      if (credentials.parent?.username) lines.push(`Parent Username: ${credentials.parent.username}`);
      if (credentials.parent?.password) lines.push(`Parent Password: ${credentials.parent.password}`);
    } else {
      if (credentials.schoolCode) lines.push(`School Code: ${credentials.schoolCode}`);
      if (credentials.username) lines.push(`Username: ${credentials.username}`);
      if (credentials.password) lines.push(`Password: ${credentials.password}`);
    }
    const allText = lines.join("\n");
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(allText);
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(allText);
      }
      toast.success("All credentials copied!");
    } catch {
      toast.error("Failed to copy credentials");
    }
  };

  const CredentialRow = ({
    label,
    value,
    badge,
  }: {
    label: string;
    value?: string;
    badge?: string;
  }) => {
    if (!value) return null;
    return (
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <View style={styles.labelWrapper}>
            <Text style={styles.rowLabel}>{label}</Text>
            {!!badge && <Text style={styles.badge}>{badge}</Text>}
          </View>
          <Text style={styles.rowValue} selectable>
            {value}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.copyBtn,
            { backgroundColor: color + "14" },
            pressed && { opacity: 0.6 },
          ]}
          onPress={() => copyText(label, value)}
          hitSlop={6}
        >
          <Ionicons name="copy-outline" size={16} color={color} />
        </Pressable>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={[styles.iconBadge, { backgroundColor: Colors.success + "18" }]}>
            <Ionicons name="checkmark-circle" size={36} color={Colors.success} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {isStudent ? (
              <View style={styles.sectionsContainer}>
                {/* Student Box */}
                <View style={styles.box}>
                  <View style={styles.boxHeader}>
                    <Ionicons name="school" size={14} color={color} />
                    <Text style={[styles.boxTitle, { color }]}>Student Credentials</Text>
                  </View>
                  <CredentialRow
                    label="School Code"
                    value={credentials.student?.schoolCode || credentials.schoolCode}
                  />
                  <CredentialRow
                    label="Username"
                    value={credentials.student?.username}
                  />
                  <CredentialRow
                    label="Password"
                    value={credentials.student?.password}
                    badge="DOB"
                  />
                </View>

                {/* Parent Box */}
                <View style={[styles.box, { backgroundColor: "#F5F3FF", borderColor: "#DDD6FE" }]}>
                  <View style={styles.boxHeader}>
                    <Ionicons name="people" size={14} color="#7C3AED" />
                    <Text style={[styles.boxTitle, { color: "#7C3AED" }]}>Parent Credentials</Text>
                  </View>
                  <CredentialRow
                    label="Parent Username"
                    value={credentials.parent?.username}
                  />
                  <CredentialRow
                    label="Parent Password"
                    value={credentials.parent?.password}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.box}>
                <CredentialRow
                  label="School Code"
                  value={credentials.schoolCode}
                />
                <CredentialRow
                  label="Username"
                  value={credentials.username}
                />
                <CredentialRow
                  label="Password"
                  value={credentials.password}
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.btnRow}>
            <Pressable
              style={[styles.actionBtn, styles.copyAllBtn]}
              onPress={copyAll}
            >
              <Ionicons name="copy-outline" size={16} color={Colors.text} />
              <Text style={styles.copyAllText}>Copy All</Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.doneBtn, { backgroundColor: color }]}
              onPress={onClose}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 22,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 17,
  },
  scroll: {
    width: "100%",
    maxHeight: 280,
  },
  sectionsContainer: {
    gap: 12,
  },
  box: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  boxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  labelWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  rowLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badge: {
    fontSize: 9,
    fontWeight: "700",
    backgroundColor: "#E2E8F0",
    color: Colors.text,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "monospace",
    color: Colors.text,
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 18,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  copyAllBtn: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  copyAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  doneBtn: {},
  doneText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
