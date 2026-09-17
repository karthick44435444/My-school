import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/theme";

const SLIDER_WIDTH = 150;
const INDICATOR_WIDTH = 55;

interface AppSplashLoaderProps {
  themeColor?: string;
  appName?: string;
}

export function AppSplashLoader({
  themeColor,
  appName = "My School",
}: AppSplashLoaderProps) {
  const activeColor = themeColor || Colors.primary || "#4F46E5";

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

    // 2. Subtle gentle breathing pulse for the center logo
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.98,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    // 3. Smooth sliding animation for the bottom progress indicator
    const slideLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    slideLoop.start();

    return () => {
      pulseLoop.stop();
      slideLoop.stop();
    };
  }, [fadeAnim, pulseAnim, slideAnim]);

  // Interpolate translateX for the animated slider thumb
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SLIDER_WIDTH - INDICATOR_WIDTH],
  });

  return (
    <View style={styles.container}>
      {/* Center Section: Large App Logo & Title */}
      <Animated.View style={[styles.centerContent, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: activeColor + "20",
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

        <Text style={styles.appNameText}>{appName}</Text>
        <Text style={styles.appSubText}>School Management</Text>
      </Animated.View>

      {/* Bottom Center Section: Sleek Sliding Loader */}
      <Animated.View style={[styles.bottomContainer, { opacity: fadeAnim }]}>
        <View
          style={[
            styles.sliderTrack,
            {
              width: SLIDER_WIDTH,
              backgroundColor: activeColor + "18",
              borderColor: activeColor + "25",
            },
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
  },
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 16,
  },
  iconImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  appNameText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  appSubText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 54,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderTrack: {
    height: 4.5,
    borderRadius: 99,
    overflow: "hidden",
    borderWidth: 0.5,
    position: "relative",
  },
  sliderThumb: {
    height: "100%",
    borderRadius: 99,
  },
});
