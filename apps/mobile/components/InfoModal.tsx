import React, { useEffect, useRef } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";

export function InfoModal({
  visible,
  title,
  message,
  buttonText = "OK",
  variant = "success",
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  buttonText?: string;
  variant?: "success" | "error" | "info";
  onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, scale, opacity]);

  const icon =
    variant === "success"
      ? "checkmark-circle"
      : variant === "error"
        ? "alert-circle"
        : "information-circle";
  const iconColor =
    variant === "success"
      ? Colors.success
      : variant === "error"
        ? Colors.danger
        : Colors.primary;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <View style={[styles.iconWrap, { backgroundColor: iconColor + "18" }]}>
            <Ionicons name={icon as any} size={36} color={iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <Pressable style={[styles.btn, { backgroundColor: iconColor }]} onPress={onClose}>
            <Text style={styles.btnText}>{buttonText}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  btn: {
    alignSelf: "stretch",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
