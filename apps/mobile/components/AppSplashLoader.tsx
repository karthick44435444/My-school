import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Colors } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = Math.min(SCREEN_WIDTH * 0.6, 220);
const INDICATOR_WIDTH = SLIDER_WIDTH * 0.45;

interface AppSplashLoaderProps {
  message?: string;
  themeColor?: string;
}

export function AppSplashLoader({
  message = "Loading your school portal…",
  themeColor,
}: AppSplashLoaderProps) {
  const activeColor = themeColor || Colors.primary || "#6366F1";

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Fade-in entry
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // 2. Continuous breathing pulse for the icon
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.97,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 3. Smooth sliding animation for the loading progress slider
    const slideLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    slideLoop.start();

    return () => {
      pulseLoop.stop();
      slideLoop.stop();
    };
  }, [fadeAnim, pulseAnim, slideAnim]);

  // Interpolate translateX for the animated slider
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SLIDER_WIDTH - INDICATOR_WIDTH],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Animated App Icon Card with border radius 16px / 12px */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: activeColor + "33",
              shadowColor: activeColor,
            },
          ]}
        >
          <ExpoImage
            source={require("@/assets/logo.png")}
            style={styles.iconImage}
            contentFit="contain"
            transition={200}
          />
        </Animated.View>

        {/* School / App Title */}
        <Text style={styles.title}>My School</Text>
        <Text style={styles.subtitle}>Smart Education Platform</Text>

        {/* Animated Slider Bar with 12px border radius */}
        <View
          style={[
            styles.sliderTrack,
            { width: SLIDER_WIDTH, backgroundColor: activeColor + "18", borderColor: activeColor + "30" },
          ]}
        >
          <Animated.View
            style={[
              styles.sliderThumb,
              {
                width: INDICATOR_WIDTH,
                backgroundColor: activeColor,
                transform: [{ translateX }],
              },
            ]}
          />
        </View>

        {/* Subtitle / Status text */}
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    marginBottom: 16,
  },
  iconImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 22,
  },
  sliderTrack: {
    height: 6,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 14,
    position: "relative",
  },
  sliderThumb: {
    height: "100%",
    borderRadius: 6,
  },
  message: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
});
