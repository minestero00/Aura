import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, ToastAndroid } from "react-native";

interface ToastMessageProps {
  message: string | null;
  onHide: () => void;
  durationMs?: number;
}

const DEFAULT_DURATION_MS = 1800;

/**
 * 가벼운 알림용 toast — App.tsx의 ToastAndroid.show("한 번 더 누르면 종료됩니다")와
 * 같은 결의 짧은 안내. Android는 system Toast, iOS는 fade in/out 자체 구현.
 *
 * controlled 패턴 — message가 truthy해질 때 표시되고 자동 dismiss 후 onHide 호출.
 * 같은 메시지로 다시 띄우려면 한 번 null로 reset 후 다시 set.
 */
export function ToastMessage({ message, onHide, durationMs = DEFAULT_DURATION_MS }: ToastMessageProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;

    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      const timer = setTimeout(onHide, durationMs);
      return () => clearTimeout(timer);
    }

    const animation = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(Math.max(400, durationMs - 400)),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true })
    ]);
    animation.start(({ finished }) => {
      if (finished) onHide();
    });
    return () => {
      animation.stop();
    };
  }, [message, durationMs, onHide, opacity]);

  if (Platform.OS === "android" || !message) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 90,
    alignSelf: "center",
    backgroundColor: "rgba(20,20,32,0.92)",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    maxWidth: "84%"
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center"
  }
});
