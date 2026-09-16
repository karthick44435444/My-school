import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = Math.min(SCREEN_WIDTH * 0.55, 180);
const INDICATOR_WIDTH = SLIDER_WIDTH * 0.4;

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
      duration: 300,
      useNativeDriver: true,
    }).start();

    // 2. Subtle breathing pulse for the icon
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.98,
          duration: 1000,
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
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1200,
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
        {/* Small centered App Icon with small border radius */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: activeColor + "2A",
              shadowColor: activeColor,
            },
          ]}
        >
          <Image
            source={require("@/assets/logo.png")}
            style={styles.iconImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* School / App Title */}
        <Text style={styles.title}>My School</Text>
        <Text style={styles.subtitle}>Smart Education Platform</Text>

        {/* Animated Slider Bar with small border radius */}
        <View
          style={[
            styles.sliderTrack,
            { width: SLIDER_WIDTH, backgroundColor: activeColor + "15", borderColor: activeColor + "25" },
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
    padding: 20,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  iconImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 18,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 0.5,
    marginBottom: 12,
    position: "relative",
  },
  sliderThumb: {
    height: "100%",
    borderRadius: 4,
  },
  message: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
});
