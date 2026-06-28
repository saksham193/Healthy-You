import { Animated, Easing } from "react-native";
import type { MedibotAnimationValues } from "./MedibotIdleAnimation";
import { resetMedibotAnimationValues } from "./MedibotIdleAnimation";

export const createMedibotThinkingAnimation = (
  values: MedibotAnimationValues,
  reducedMotion: boolean,
): Animated.CompositeAnimation => {
  resetMedibotAnimationValues(values);

  if (reducedMotion) {
    values.tilt.setValue(0.5);
    values.glow.setValue(0.5);
    values.sparkle.setValue(0.45);
    return Animated.timing(values.glow, { toValue: 0.5, duration: 1, useNativeDriver: true });
  }

  return Animated.loop(
    Animated.parallel([
      Animated.sequence([
        Animated.timing(values.tilt, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(values.tilt, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(values.glow, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(values.glow, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(values.orbit, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]),
  );
};
