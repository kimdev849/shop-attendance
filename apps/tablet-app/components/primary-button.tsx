import { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "./theme";

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
  fullWidth,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "success";
  icon?: React.ReactNode;
  fullWidth?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
    >
      <Animated.View
        style={[
          styles.button,
          variant === "secondary" && styles.secondary,
          variant === "danger" && styles.danger,
          variant === "success" && styles.success,
          isDisabled && styles.disabled,
          fullWidth && styles.fullWidth,
          { transform: [{ scale }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === "secondary" ? theme.colors.textMuted : "#fff"}
            size="small"
          />
        ) : (
          <View style={styles.inner}>
            {icon && <View style={styles.iconWrap}>{icon}</View>}
            <Text
              style={[
                styles.label,
                variant === "secondary" && styles.labelSecondary,
                variant === "danger" && styles.labelDanger,
                variant === "success" && styles.labelSuccess,
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    ...theme.shadow,
  },
  fullWidth: {
    width: "100%",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: theme.colors.borderLight,
    shadowOpacity: 0,
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
  success: {
    backgroundColor: theme.colors.success,
  },
  disabled: {
    opacity: 0.4,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  iconWrap: {
    marginRight: 2,
  },
  label: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  labelSecondary: {
    color: theme.colors.textSecondary,
  },
  labelDanger: {
    color: "#fff",
  },
  labelSuccess: {
    color: "#fff",
  },
});
