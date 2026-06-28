import { Animated, Easing } from "react-native";

export type MedibotAnimationValues = {
  float: Animated.Value;
  breathe: Animated.Value;
  glow: Animated.Value;
  tilt: Animated.Value;
  ring: Animated.Value;
  sparkle: Animated.Value;
  talk: Animated.Value;
  orbit: Animated.Value;
};

const reset = (value: Animated.Value): void => {
  value.stopAnimation();
  value.setValue(0);
};

export const resetMedibotAnimationValues = (values: MedibotAnimationValues): void => {
  Object.values(values).forEach(reset);
};

export const createMedibotIdleAnimation = (
  values: MedibotAnimationValues,
  reducedMotion: boolean,
): Animated.CompositeAnimation => {
  resetMedibotAnimationValues(values);

  if (reducedMotion) {
    values.float.setValue(0.5);
    values.breathe.setValue(0.5);
    values.glow.setValue(0.35);
    values.sparkle.setValue(0.55);
    return Animated.timing(values.glow, { toValue: 0.35, duration: 1, useNativeDriver: true });
  }

  return Animated.loop(
    Animated.parallel([
      Animated.sequence([
        Animated.timing(values.float, {
          toValue: 1,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(values.float, {
          toValue: 0,
          duration: 3400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(values.breathe, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(values.breathe, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(values.glow, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(values.glow, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(values.sparkle, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(values.sparkle, {
          toValue: 0,
          duration: 2300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]),
  );
};
