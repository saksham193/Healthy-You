import { Animated, Easing } from "react-native";
import type { MedibotAnimationValues } from "./MedibotIdleAnimation";
import { resetMedibotAnimationValues } from "./MedibotIdleAnimation";

export const createMedibotTalkAnimation = (
  values: MedibotAnimationValues,
  reducedMotion: boolean,
): Animated.CompositeAnimation => {
  resetMedibotAnimationValues(values);

  if (reducedMotion) {
    values.float.setValue(0.5);
    values.talk.setValue(0.45);
    values.sparkle.setValue(0.65);
    return Animated.timing(values.talk, { toValue: 0.45, duration: 1, useNativeDriver: true });
  }

  return Animated.loop(
    Animated.parallel([
      Animated.sequence([
        Animated.timing(values.float, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(values.float, {
          toValue: 0,
          duration: 450,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(values.talk, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(values.talk, {
          toValue: 0,
          duration: 240,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(values.talk, {
          toValue: 0.65,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(values.talk, {
          toValue: 0,
          duration: 320,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(values.sparkle, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(values.sparkle, {
          toValue: 0,
          duration: 540,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]),
  );
};
