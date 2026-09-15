import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/hooks/useAuth";
import { BadgeProvider } from "@/hooks/useBadges";
import { ToastProvider } from "@/hooks/useToast";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <BadgeProvider>
          <ToastProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(app)" />
          </Stack>
        </ToastProvider>
        </BadgeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
