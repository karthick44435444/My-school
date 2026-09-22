import React, { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Button, Input, Label, Title, Subtitle } from "@/components/ui";
import { Colors, spacing } from "@/constants/theme";
import { getApiBase, setApiBase } from "@/lib/api";

export default function LoginScreen() {
  const { login } = useAuth();
  const [schoolCode, setSchoolCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    schoolCode?: string;
    username?: string;
    password?: string;
  }>({});

  const onSubmit = async () => {
    const fe: typeof fieldErrors = {};
    if (!schoolCode.trim()) fe.schoolCode = "School code is required";
    if (!username.trim()) fe.username = "Username is required";
    if (!password) fe.password = "Password is required";
    setFieldErrors(fe);
    setError("");
    if (Object.keys(fe).length) return;

    setLoading(true);
    try {
      await login(schoolCode.trim(), username.trim(), password);
      router.replace("/(app)");
    } catch (e: any) {
      const msg = e?.message || "Login failed";
      setError(msg);
      if (/invalid|credential|unauthorized/i.test(msg)) {
        setFieldErrors({ password: "Invalid school code, username or password" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Image
              source={require("@/assets/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <Title style={{ textAlign: "center", color: "#fff" }}>SchoolVajo</Title>
          <Subtitle
            style={{ textAlign: "center", color: "rgba(255,255,255,0.85)" }}
          >
            Sign in to continue
          </Subtitle>
        </View>

        <View style={styles.form}>
          <Label>School Code</Label>
          <Input
            placeholder="SCH-XXXXXX"
            autoCapitalize="characters"
            value={schoolCode}
            onChangeText={(t) => {
              setSchoolCode(t);
              setFieldErrors((p) => ({ ...p, schoolCode: undefined }));
              setError("");
            }}
          />
          {!!fieldErrors.schoolCode && (
            <Text style={styles.fieldErr}>{fieldErrors.schoolCode}</Text>
          )}

          <Label>Username</Label>
          <Input
            placeholder="Username or email"
            autoCapitalize="none"
            value={username}
            onChangeText={(t) => {
              setUsername(t);
              setFieldErrors((p) => ({ ...p, username: undefined }));
              setError("");
            }}
          />
          {!!fieldErrors.username && (
            <Text style={styles.fieldErr}>{fieldErrors.username}</Text>
          )}

          <Label>Password</Label>
          <View style={styles.passWrap}>
            <TextInput
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setFieldErrors((p) => ({ ...p, password: undefined }));
                setError("");
              }}
              style={styles.passInput}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPass((s) => !s)} hitSlop={10} style={styles.eyeBtn}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={22} color={Colors.textMuted} />
            </Pressable>
          </View>
          {!!fieldErrors.password && (
            <Text style={styles.fieldErr}>{fieldErrors.password}</Text>
          )}

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button title="Sign In" onPress={onSubmit} loading={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: Colors.primary,
    paddingTop: 64,
    paddingBottom: 36,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoImg: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  form: { padding: spacing.lg, marginTop: -spacing.md },
  fieldErr: { color: Colors.danger, fontSize: 12, marginTop: 4 },
  tip: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 15,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: Colors.danger, fontSize: 13, lineHeight: 18 },
  passWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingRight: 4,
  },
  passInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

});
