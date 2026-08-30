import { ReactNode, useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "./theme";

export function ScreenContainer({
  children,
  style,
  center = true,
}: {
  children: ReactNode;
  style?: any;
  center?: boolean;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View
        style={[
          center ? styles.container : styles.containerStretch,
          style,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        {children}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  containerStretch: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
