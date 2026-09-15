import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { useBadges } from "@/hooks/useBadges";
import { Colors, spacing, radius } from "@/constants/theme";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";

type LinkItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  href: string;
  badge?: number;
  color?: string;
};

type SectionDef = {
  title: string;
  items: LinkItem[];
};

export default function MoreScreen() {
  const { user, themeColor, logout } = useAuth();
  const badges = useBadges();
  const role = user?.role;
  const color = themeColor || Colors.primary;

  const sections: SectionDef[] = [];

  if (role === "ADMIN") {
    sections.push(
      {
        title: "Academic & People",
        items: [
          {
            icon: "shield-checkmark",
            label: "Principals",
            sub: "Manage school principals & credentials",
            href: "/(app)/principals",
            color: "#8B5CF6",
          },
          {
            icon: "people",
            label: "Teachers",
            sub: "Staff directory & subject assignments",
            href: "/(app)/teachers",
            color: "#EC4899",
          },
          {
            icon: "school",
            label: "Students",
            sub: "Student records, parent info & classes",
            href: "/(app)/students",
            color: "#0EA5E9",
          },
        ],
      },
      {
        title: "Operations & Communication",
        items: [
          {
            icon: "business",
            label: "School Profile & Settings",
            sub: "School branding, logo & contact info",
            href: "/(app)/profile?tab=school",
            color: "#64748B",
          },
        ],
      }
    );
  } else if (role === "PRINCIPAL") {
    sections.push({
      title: "Academic & People",
      items: [
        {
          icon: "people",
          label: "Teachers",
          sub: "Faculty list & assignments",
          href: "/(app)/teachers",
          color: "#EC4899",
        },
        {
          icon: "school",
          label: "Students",
          sub: "Student records & enrollment",
          href: "/(app)/students",
          color: "#0EA5E9",
        },
      ],
    });
  } else if (role === "TEACHER") {
    sections.push({
      title: "Menu",
      items: [
        {
          icon: "school",
          label: "Students",
          sub: "Assigned students & parent contacts",
          href: "/(app)/students",
          color: "#0EA5E9",
        },
        {
          icon: "ribbon",
          label: "Marks & Exams",
          sub: "Enter scores & publish report cards",
          href: "/(app)/marks",
          badge: badges.marks,
          color: "#8B5CF6",
        },
        {
          icon: "megaphone",
          label: "Notices",
          sub: "View school notices",
          href: "/(app)/announcements",
          badge: badges.announcements,
          color: "#3B82F6",
        },
        {
          icon: "settings",
          label: "Settings",
          sub: "Profile & preferences",
          href: "/(app)/settings",
          color: "#64748B",
        },
      ],
    });
  } else {
    sections.push({
      title: "Menu",
      items: [
        {
          icon: "ribbon",
          label: "Marks & Report Cards",
          sub: "Exam scores & academic performance",
          href: "/(app)/marks",
          badge: badges.marks,
          color: "#8B5CF6",
        },
        {
          icon: "megaphone",
          label: "Notices",
          sub: "School circulars & events",
          href: "/(app)/announcements",
          badge: badges.announcements,
          color: "#3B82F6",
        },
        {
          icon: "settings",
          label: "Settings",
          sub: "Password & preferences",
          href: "/(app)/settings",
          color: "#64748B",
        },
      ],
    });
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: TAB_BAR_CLEARANCE + 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.heading}>Control Center</Text>
        <Text style={styles.subHeading}>
          {role === "ADMIN" ? "School Administration & Settings" : "Quick Navigation & Options"}
        </Text>
      </View>

      {sections.map((section, sIdx) => (
        <View key={section.title + sIdx} style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.cardBox}>
            {section.items.map((item, i) => {
              const itemColor = item.color || color;
              const isLast = i === section.items.length - 1;
              return (
                <Pressable
                  key={item.href + item.label}
                  style={({ pressed }) => [
                    styles.row,
                    !isLast && styles.rowDivider,
                    pressed && { backgroundColor: "#F8FAFC" },
                  ]}
                  onPress={() => router.push(item.href as any)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: itemColor + "18" }]}>
                    <Ionicons name={item.icon} size={20} color={itemColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{item.label}</Text>
                    {!!item.sub && <Text style={styles.subText}>{item.sub}</Text>}
                  </View>
                  {!!item.badge && item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {role !== "ADMIN" && role !== "PRINCIPAL" && (
        <Pressable
          style={styles.logoutBtn}
          onPress={async () => {
            await logout();
            router.replace("/(auth)/login");
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { marginBottom: 16 },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
  },
  subHeading: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionWrap: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  cardBox: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontWeight: "700", fontSize: 15, color: Colors.text },
  subText: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  badge: {
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    borderRadius: radius.lg,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.danger,
  },
});
