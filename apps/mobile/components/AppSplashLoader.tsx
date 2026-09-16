import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
} from "react-native";
import { Colors } from "@/constants/theme";

const SLIDER_WIDTH = 110;
const INDICATOR_WIDTH = 45;

interface AppSplashLoaderProps {
  themeColor?: string;
}

export function AppSplashLoader({
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
        {/* Small centered App Icon with small corner radius */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: activeColor + "25",
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

        {/* Animated Slider Bar at the bottom with corner radius */}
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
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  iconImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  sliderTrack: {
    height: 3.5,
    borderRadius: 3.5,
    overflow: "hidden",
    borderWidth: 0.5,
    position: "relative",
  },
  sliderThumb: {
    height: "100%",
    borderRadius: 3.5,
  },
});
