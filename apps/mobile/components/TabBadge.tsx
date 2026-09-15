import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function TabBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -8,
    top: -4,
    backgroundColor: "#EF4444",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  text: { color: "#fff", fontSize: 9, fontWeight: "800" },
});
