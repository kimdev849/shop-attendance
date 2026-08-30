/**
 * Palette StaffGo — modern enterprise dark theme.
 * Refined for readability on tablets and phones.
 */
export const theme = {
  colors: {
    // Backgrounds
    background: "#0F172A",
    surface: "#1E293B",
    surfaceAlt: "#334155",
    surfaceHighlight: "#475569",

    // Brand
    primary: "#3B82F6",
    primaryDark: "#2563EB",
    primaryLight: "#93C5FD",

    // Accents
    accent: "#10B981",
    accentLight: "#34D399",
    warning: "#F59E0B",
    danger: "#EF4444",
    success: "#10B981",

    // Text
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",

    // Borders & inputs
    border: "#334155",
    borderLight: "#475569",
    input: "#1A2332",

    // Cards
    card: "#1E293B",

    // Gradients
    gradient: ["#3B82F6", "#2563EB"] as const,
    gradientSuccess: ["#10B981", "#059669"] as const,
    gradientDanger: ["#EF4444", "#DC2626"] as const,
  },
  spacing: (n: number) => n * 8,
  radius: 14,
  radiusSm: 10,
  radiusLg: 20,
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  } as const,
  shadowLg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  } as const,
};
