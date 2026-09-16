import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { AppSplashLoader } from "@/components/AppSplashLoader";

export default function Index() {
  const { user, loading, themeColor } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/(auth)/login");
      } else {
        router.replace("/(app)");
      }
    }
  }, [user, loading]);

  return <AppSplashLoader themeColor={themeColor} />;
}
