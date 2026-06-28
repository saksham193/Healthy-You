import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  type ImageSourcePropType,
  StyleSheet,
  useColorScheme,
  View,
  type ViewStyle,
} from "react-native";
import { createMedibotIdleAnimation, type MedibotAnimationValues } from "./MedibotIdleAnimation";
import { createMedibotListeningAnimation } from "./MedibotListeningAnimation";
import { createMedibotNotificationAnimation } from "./MedibotNotificationAnimation";
import { createMedibotTalkAnimation } from "./MedibotTalkAnimation";
import { createMedibotThinkingAnimation } from "./MedibotThinkingAnimation";

export type MedibotAnimationState = "idle" | "thinking" | "talking" | "listening" | "notification";

type AnimatedMedibotProps = {
  state?: MedibotAnimationState;
  size?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const mascotSource = require("../../../assets/medibot/medibot-static.png") as ImageSourcePropType;

const GLOW = {
  primary: "#5A3FFF",
  secondary: "#6CE5FF",
  accent: "#FF8A00",
};

const createValues = (): MedibotAnimationValues => ({
  float: new Animated.Value(0),
  breathe: new Animated.Value(0),
  glow: new Animated.Value(0),
  tilt: new Animated.Value(0),
  ring: new Animated.Value(0),
  sparkle: new Animated.Value(0),
  talk: new Animated.Value(0),
  orbit: new Animated.Value(0),
});

const useReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReducedMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reducedMotion;
};

function AnimatedMedibotComponent({
  state = "idle",
  size = 72,
  style,
  accessibilityLabel = "Medibot assistant",
}: AnimatedMedibotProps) {
  const values = useRef(createValues()).current;
  const activeAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const reducedMotion = useReducedMotion();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const frameSize = Math.round(size * 1.18);
  const imageWidth = size;
  const imageHeight = Math.round(size * 1.33);
  const glowColor = state === "notification" ? GLOW.accent : state === "listening" ? GLOW.secondary : GLOW.primary;
  const ringColor = state === "notification" ? GLOW.accent : GLOW.secondary;

  useEffect(() => {
    activeAnimation.current?.stop();
    const nextAnimation =
      state === "thinking"
        ? createMedibotThinkingAnimation(values, reducedMotion)
        : state === "talking"
          ? createMedibotTalkAnimation(values, reducedMotion)
          : state === "listening"
            ? createMedibotListeningAnimation(values, reducedMotion)
            : state === "notification"
              ? createMedibotNotificationAnimation(values, reducedMotion)
              : createMedibotIdleAnimation(values, reducedMotion);

    activeAnimation.current = nextAnimation;
    nextAnimation.start();

    return () => {
      nextAnimation.stop();
    };
  }, [reducedMotion, state, values]);

  const transformStyle = useMemo(() => {
    const translateRange = state === "notification" ? [0, -7] : state === "talking" ? [-2, 2] : [-5, 5];
    const scale = state === "talking"
      ? values.talk.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] })
      : values.breathe.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1.02] });
    const rotate = state === "thinking"
      ? values.tilt.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] })
      : state === "listening"
        ? values.tilt.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "2deg"] })
        : "0deg";

    return {
      transform: [
        {
          translateY: values.float.interpolate({
            inputRange: [0, 1],
            outputRange: translateRange,
          }),
        },
        { scale },
        { rotate },
      ],
    };
  }, [state, values]);

  const glowOpacity = values.glow.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? 0.18 : 0.22, isDark ? 0.5 : 0.42],
  });
  const ringOpacity = values.ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0, state === "notification" ? 0.52 : 0.38],
  });
  const ringScale = values.ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, state === "notification" ? 1.24 : 1.14],
  });
  const sparkleOpacity = values.sparkle.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.92],
  });
  const orbitRotate = values.orbit.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      accessibilityIgnoresInvertColors
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[styles.root, { height: frameSize, width: frameSize }, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            borderColor: ringColor,
            borderRadius: frameSize / 2,
            height: frameSize,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
            width: frameSize,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: glowColor,
            borderRadius: frameSize / 2,
            height: frameSize * 0.88,
            opacity: glowOpacity,
            width: frameSize * 0.88,
          },
        ]}
      />
      {state === "thinking" && !reducedMotion ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.orbit,
            {
              height: frameSize,
              transform: [{ rotate: orbitRotate }],
              width: frameSize,
            },
          ]}
        >
          <View style={[styles.particle, styles.particleTop]} />
          <View style={[styles.particle, styles.particleSide]} />
          <View style={[styles.particle, styles.particleBottom]} />
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.mascotWrap, transformStyle]}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={mascotSource}
          style={{ height: imageHeight, width: imageWidth }}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sparkle,
          {
            backgroundColor: state === "notification" ? GLOW.accent : GLOW.secondary,
            opacity: sparkleOpacity,
            right: frameSize * 0.24,
            top: frameSize * 0.21,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  ring: {
    borderWidth: 2,
    position: "absolute",
  },
  glow: {
    position: "absolute",
  },
  orbit: {
    position: "absolute",
  },
  particle: {
    backgroundColor: GLOW.secondary,
    borderRadius: 3,
    height: 6,
    opacity: 0.72,
    position: "absolute",
    width: 6,
  },
  particleTop: {
    left: "50%",
    top: 1,
  },
  particleSide: {
    right: 4,
    top: "42%",
  },
  particleBottom: {
    bottom: 6,
    left: "28%",
  },
  mascotWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  sparkle: {
    borderRadius: 3,
    height: 6,
    position: "absolute",
    width: 6,
  },
});

export default memo(AnimatedMedibotComponent);
