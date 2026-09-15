import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";

type ToastKind = "success" | "error" | "info";

type ToastCtx = {
  show: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const Ctx = createContext<ToastCtx>({
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

function stripSymbols(message: string): string {
  // Keep ASCII letters/digits/punctuation only for stable Metro parsing (no unicode character classes)
  return String(message)
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setVisible(false);
    });
  }, [anim]);

  const show = useCallback(
    (message: string, _k: ToastKind = "info") => {
      if (timer.current) clearTimeout(timer.current);
      setMsg(stripSymbols(message));
      setVisible(true);
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
      timer.current = setTimeout(hide, 2800);
    },
    [anim, hide]
  );

  const value = useMemo(
    () => ({
      show,
      success: (m: string) => show(m, "success"),
      error: (m: string) => show(m, "error"),
      info: (m: string) => show(m, "info"),
    }),
    [show]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            {
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.text} numberOfLines={3}>
            {msg}
          </Text>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 96,
    alignSelf: "center",
    left: 24,
    right: 24,
    zIndex: 999999,
    elevation: 999999,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.78)",
  },
  text: {
    color: "#E2E8F0",
    fontWeight: "600",
    fontSize: 14,
    flexShrink: 1,
    textAlign: "center",
    lineHeight: 19,
  },
});
