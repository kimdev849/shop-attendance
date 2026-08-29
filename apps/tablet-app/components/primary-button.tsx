import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { theme } from "./theme";

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondary,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.text} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing(2.5),
    paddingHorizontal: theme.spacing(4),
    borderRadius: theme.radius,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 240,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "600",
  },
});
