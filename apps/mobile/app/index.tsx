import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/ui";

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/(auth)/login");
      } else {
        router.replace("/(app)");
      }
    }
  }, [user, loading]);

  return <Loading message="Starting My School…" />;
}
