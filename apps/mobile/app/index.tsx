import { useEffect } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/ui";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(app)" />;
}
