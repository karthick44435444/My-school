import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { getApiBaseSync, resolveMediaUrlSync } from "@/lib/api";
import { Colors } from "@/constants/theme";

/**
 * Avatar with letter fallback. Uses expo-image for broader format support.
 * Default is circular (round=true).
 */
export function SafeAvatar({
  photoUrl,
  name,
  apiBase,
  size = 40,
  color = Colors.primary,
  round = true,
  borderRadius,
  isParent,
}: {
  photoUrl?: string | null;
  name?: string;
  apiBase?: string;
  size?: number;
  color?: string;
  round?: boolean;
  borderRadius?: number;
  isParent?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const base = apiBase || getApiBaseSync();
  const uri = !failed ? resolveMediaUrlSync(photoUrl || undefined, base) : null;
  const letter = ((name || "?").trim()[0] || "?").toUpperCase();
  const radius = borderRadius !== undefined ? borderRadius : round ? Math.round(size / 2) : Math.round(size * 0.32);

  useEffect(() => {
    setFailed(false);
  }, [photoUrl, apiBase, isParent]);

  if (uri && !failed) {
    return (
      <ExpoImage
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: "#E2E8F0",
        }}
        contentFit="cover"
        transition={150}
        onError={() => setFailed(true)}
        cachePolicy="memory-disk"
      />
    );
  }

  if (isParent && !photoUrl) {
    return (
      <ExpoImage
        source={require("@/assets/parent-avatar.png")}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: "#E2E8F0",
        }}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />
    );
  }

  const fontSize = Math.round(size * 0.46);
  const isWhite = color === "#ffffff" || color === "#fff";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: isWhite ? "rgba(255,255,255,0.25)" : color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontWeight: "800",
          color: "#ffffff",
          fontSize,
          lineHeight: fontSize * 1.15,
          textAlign: "center",
          textAlignVertical: "center",
          includeFontPadding: false,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}

export const ChildAvatar = SafeAvatar;
