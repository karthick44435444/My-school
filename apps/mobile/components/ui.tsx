import React from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Colors, radius, spacing } from "@/constants/theme";

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Subtitle({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: TextStyle;
}) {
  return <Text style={[styles.subtitle, style]}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={Colors.textMuted}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

export function Button({
  title,
  onPress,
  loading,
  variant = "primary",
  disabled,
  color,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "outline" | "ghost" | "danger";
  disabled?: boolean;
  color?: string;
}) {
  const bg =
    variant === "primary"
      ? color || Colors.primary
      : variant === "danger"
        ? Colors.danger
        : "transparent";
  const textColor =
    variant === "outline" || variant === "ghost" ? color || Colors.primary : "#fff";
  const border =
    variant === "outline" ? { borderWidth: 1.5, borderColor: color || Colors.primary } : {};

  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        Keyboard.dismiss();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: pressed || disabled || loading ? 0.7 : 1 },
        border,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.btnText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Badge({
  text,
  color = Colors.primary,
}: {
  text: string;
  color?: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "22" }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function Empty({ message }: { message: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

import { AppSplashLoader } from "./AppSplashLoader";
export { AppSplashLoader };

export function Loading({ message, color }: { message?: string; color?: string }) {
  return <AppSplashLoader message={message} themeColor={color} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: spacing.md,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: "#F1F5F9",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: "center",
  },
});
