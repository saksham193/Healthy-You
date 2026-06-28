import { Animated, Easing } from "react-native";
import type { MedibotAnimationValues } from "./MedibotIdleAnimation";
import { resetMedibotAnimationValues } from "./MedibotIdleAnimation";

export const createMedibotListeningAnimation = (
  values: MedibotAnimationValues,
  reducedMotion: boolean,
): Animated.CompositeAnimation => {
  resetMedibotAnimationValues(values);

  if (reducedMotion) {
    values.ring.setValue(0.35);
    values.breathe.setValue(0.35);
    return Animated.timing(values.ring, { toValue: 0.35, duration: 1, useNativeDriver: true });
  }

  return Animated.loop(
    Animated.parallel([
      Animated.sequence([
        Animated.timing(values.ring, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(values.ring, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(values.breathe, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(values.breathe, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(values.tilt, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]),
  );
};
