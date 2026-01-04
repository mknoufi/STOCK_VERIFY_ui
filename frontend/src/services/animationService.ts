/**
 * Animation Service - Smooth animations and transitions
 */

import { Animated, Easing } from "react-native";

/**
 * Animation Service
 */
export class AnimationService {
  /**
   * Create fade in animation
   */
  static createFadeIn(duration: number = 300): Animated.Value {
    const opacity = new Animated.Value(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
    return opacity;
  }

  /**
   * Create fade out animation
   */
  static createFadeOut(duration: number = 300): Animated.Value {
    const opacity = new Animated.Value(1);
    Animated.timing(opacity, {
      toValue: 0,
      duration,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
    return opacity;
  }

  /**
   * Create slide in from bottom
   */
  static createSlideInBottom(duration: number = 300): Animated.Value {
    const translateY = new Animated.Value(100);
    Animated.timing(translateY, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return translateY;
  }

  /**
   * Create slide in from top
   */
  static createSlideInTop(duration: number = 300): Animated.Value {
    const translateY = new Animated.Value(-100);
    Animated.timing(translateY, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return translateY;
  }

  /**
   * Create scale animation
   */
  static createScale(
    from: number = 0,
    to: number = 1,
    _duration: number = 300,
  ): Animated.Value {
    const scale = new Animated.Value(from);
    Animated.spring(scale, {
      toValue: to,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
    return scale;
  }

  /**
   * Create bounce animation
   */
  static createBounce(duration: number = 600): Animated.Value {
    const scale = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: duration / 2,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: duration / 2,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
    return scale;
  }

  /**
   * Create shake animation
   */
  static createShake(): Animated.Value {
    const translateX = new Animated.Value(0);
    Animated.sequence([
      Animated.timing(translateX, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
    return translateX;
  }

  /**
   * Create pulse animation
   */
  static createPulse(duration: number = 1000): Animated.Value {
    const scale = new Animated.Value(1);
    const pulse = () => {
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: duration / 2,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(pulse);
    };
    pulse();
    return scale;
  }
}
