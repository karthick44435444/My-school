import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button, Card, Input, Label, Title, Subtitle } from "@/components/ui";
import { Colors, spacing } from "@/constants/theme";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";

export default function SettingsScreen() {
  const { user, themeColor } = useAuth();
  const canChangePw = user?.role !== "STUDENT";
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [loading, setLoading] = useState(false);

  const changePw = async () => {
    if (!canChangePw) {
      Alert.alert("Not allowed", "Students cannot change password here");
      return;
    }
    if (!oldPassword || newPassword.length < 6) {
      Alert.alert("Invalid", "Enter current password and new password (min 6)");
      return;
    }
    setLoading(true);
    try {
      await api("/api/password", {
        method: "POST",
        body: { action: "change", oldPassword, newPassword },
      });
      Alert.alert("Success", "Password changed");
      setOld("");
      setNew("");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const [pushTesting, setPushTesting] = useState(false);

  const handleTestPush = async () => {
    setPushTesting(true);
    try {
      const { triggerLocalNotification, setupPushForUser } = await import("@/lib/notifications");
      // 1. Ensure token registered
      await setupPushForUser();
      // 2. Trigger local pop-up banner immediately
      await triggerLocalNotification({
        title: "🔔 Push Notification Working!",
        body: "Local & remote notifications are configured and active on your device.",
        data: { type: "GENERAL" },
      });
      // 3. Trigger remote server push
      const res = await api<any>("/api/push", {
        method: "POST",
        body: { action: "test" },
      });
      Alert.alert(
        "Notification Sent!",
        `Push test dispatched. Registered devices: ${res?.registeredTokensCount ?? 1}`
      );
    } catch (err: any) {
      Alert.alert("Notification Info", err?.message || "Failed to trigger test push");
    } finally {
      setPushTesting(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: spacing.md, paddingBottom: TAB_BAR_CLEARANCE }}>
      <Card style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Ionicons name="notifications" size={20} color={themeColor} />
          <Text style={styles.cardTitle}>Push Notifications</Text>
        </View>
        <Text style={styles.muted}>
          Test sound, banner, and device delivery for announcements, homework, and attendance alerts.
        </Text>
        <View style={{ marginTop: 12 }}>
          <Button
            title="Send Test Notification"
            onPress={handleTestPush}
            loading={pushTesting}
            color={themeColor}
          />
        </View>
      </Card>

      {canChangePw ? (
        <Card>
          <Text style={styles.cardTitle}>Change password</Text>
          <Label>Current password</Label>
          <Input secureTextEntry value={oldPassword} onChangeText={setOld} />
          <Label>New password</Label>
          <Input secureTextEntry value={newPassword} onChangeText={setNew} />
          <Button title="Update password" onPress={changePw} loading={loading} color={themeColor} />
        </Card>
      ) : (
        <Card>
          <Text style={styles.muted}>Students use DOB-based passwords managed by school admin.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontWeight: "800", fontSize: 15, marginBottom: 8, color: Colors.text },
  muted: { color: Colors.textMuted, fontSize: 13, lineHeight: 19 },
});
