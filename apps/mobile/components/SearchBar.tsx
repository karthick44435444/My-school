import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, radius } from "@/constants/theme";

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search…",
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={18} color={Colors.textMuted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

/** Case-insensitive match across common fields */
export function matchesSearch(item: any, q: string, keys?: string[]): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  const fields =
    keys ||
    [
      "firstName",
      "lastName",
      "name",
      "title",
      "email",
      "className",
      "section",
      "subject",
      "status",
      "description",
      "content",
      "studentName",
      "username",
      "phone",
      "role",
    ];
  for (const k of fields) {
    const v = item?.[k];
    if (v != null && String(v).toLowerCase().includes(needle)) return true;
  }
  // combined name
  const full = `${item?.firstName || ""} ${item?.lastName || ""}`.toLowerCase();
  if (full.includes(needle)) return true;
  return false;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text, paddingVertical: 2 },
});
