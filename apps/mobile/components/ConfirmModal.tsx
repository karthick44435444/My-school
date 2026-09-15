import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "@/constants/theme";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
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

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={loading ? undefined : onCancel}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} />
        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actions}>
            <Pressable
              disabled={loading}
              style={[styles.cancelBtn, loading && { opacity: 0.5 }]}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>{cancelText}</Text>
            </Pressable>
            <Pressable
              disabled={loading}
              style={[
                styles.confirmBtn,
                { backgroundColor: destructive ? Colors.danger : Colors.primary },
                loading && { opacity: 0.75 },
              ]}
              onPress={onConfirm}
            >
              {loading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.confirmText}>Deleting...</Text>
                </View>
              ) : (
                <Text style={styles.confirmText}>{confirmText}</Text>
              )}
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
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: 18,
  },
  actions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  cancelText: { fontWeight: "700", color: Colors.text },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmText: { fontWeight: "800", color: "#fff" },
});
