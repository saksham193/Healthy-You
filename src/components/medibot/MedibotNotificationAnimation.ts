import { Animated, Easing } from "react-native";
import type { MedibotAnimationValues } from "./MedibotIdleAnimation";
import { resetMedibotAnimationValues } from "./MedibotIdleAnimation";

export const createMedibotNotificationAnimation = (
  values: MedibotAnimationValues,
  reducedMotion: boolean,
): Animated.CompositeAnimation => {
  resetMedibotAnimationValues(values);

  if (reducedMotion) {
    values.glow.setValue(0.7);
    return Animated.sequence([
      Animated.timing(values.glow, { toValue: 0.7, duration: 300, useNativeDriver: true }),
      Animated.timing(values.glow, { toValue: 0.25, duration: 700, useNativeDriver: true }),
    ]);
  }

  return Animated.sequence([
    Animated.parallel([
      Animated.timing(values.float, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: true,
      }),
      Animated.timing(values.ring, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(values.glow, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]),
    Animated.parallel([
      Animated.timing(values.float, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(values.ring, {
        toValue: 0,
        duration: 820,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(values.glow, {
        toValue: 0,
        duration: 720,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]),
  ]);
};
