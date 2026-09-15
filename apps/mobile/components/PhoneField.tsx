import React, { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Colors, radius } from "@/constants/theme";

const COUNTRIES = [
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+971", flag: "🇦🇪", name: "UAE" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
];

function parse(value?: string) {
  const raw = (value || "").trim();
  if (!raw) return { code: "+91", national: "" };
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (raw.startsWith(c.code)) {
      return { code: c.code, national: raw.slice(c.code.length).replace(/\D/g, "") };
    }
    if (raw.startsWith(c.code.replace("+", "")) && raw.length > 2) {
      return {
        code: c.code,
        national: raw.slice(c.code.replace("+", "").length).replace(/\D/g, ""),
      };
    }
  }
  // bare digits only
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) {
    return { code: "+91", national: digits.slice(-10) };
  }
  return { code: "+91", national: digits };
}

export function PhoneField({
  value,
  onChange,
  error,
}: {
  value?: string;
  onChange: (full: string) => void;
  error?: string;
}) {
  const [code, setCode] = useState("+91");
  const [national, setNational] = useState("");
  const [open, setOpen] = useState(false);

  // Sync when parent value changes (e.g. profile loads)
  useEffect(() => {
    const p = parse(value);
    setCode(p.code);
    setNational(p.national);
  }, [value]);

  const emit = (c: string, n: string) => {
    const digits = n.replace(/\D/g, "");
    onChange(digits ? `${c}${digits}` : "");
  };

  return (
    <View>
      <View style={[styles.wrap, error ? styles.errBorder : null]}>
        <Pressable style={styles.codeBtn} onPress={() => setOpen(true)}>
          <Text style={styles.codeText}>
            {COUNTRIES.find((x) => x.code === code)?.flag || "🌐"} {code}
          </Text>
        </Pressable>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          placeholder="Phone number"
          placeholderTextColor={Colors.textMuted}
          value={national}
          onChangeText={(t) => {
            const n = t.replace(/\D/g, "").slice(0, 15);
            setNational(n);
            emit(code, n);
          }}
        />
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Country code</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {COUNTRIES.map((c) => (
                <Pressable
                  key={c.code}
                  style={styles.row}
                  onPress={() => {
                    setCode(c.code);
                    emit(c.code, national);
                    setOpen(false);
                  }}
                >
                  <Text style={{ fontSize: 16 }}>
                    {c.flag}  {c.name}  ({c.code})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errBorder: { borderColor: Colors.danger },
  codeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  codeText: { fontWeight: "700", fontSize: 14, color: Colors.text },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  error: { color: Colors.danger, fontSize: 12, marginTop: 4 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  sheetTitle: { fontWeight: "800", fontSize: 16, marginBottom: 8 },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
});
