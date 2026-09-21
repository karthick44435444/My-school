import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
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
  const [loading, setLoading] = useState(Boolean(photoUrl));
  const base = apiBase || getApiBaseSync();
  const uri = !failed ? resolveMediaUrlSync(photoUrl || undefined, base) : null;
  const letter = ((name || "?").trim()[0] || "?").toUpperCase();
  const radius = borderRadius !== undefined ? borderRadius : round ? Math.round(size / 2) : Math.round(size * 0.32);

  useEffect(() => {
    setFailed(false);
    if (photoUrl) setLoading(true);
  }, [photoUrl, apiBase, isParent]);

  if (uri && !failed) {
    return (
      <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", position: "relative" }}>
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
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => {
            setFailed(true);
            setLoading(false);
          }}
          cachePolicy="memory-disk"
        />
        {loading && (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(226,232,240,0.6)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size={size > 60 ? "small" : 12} color={color} />
          </View>
        )}
      </View>
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
