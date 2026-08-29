/**
 * Palette et espacements partagés par les écrans de la tablette. Volontairement
 * plus simple et plus contrastée que le dashboard admin: usage "kiosque",
 * lu rapidement par des utilisateurs debout, parfois avec une luminosité
 * ambiante forte (boutique).
 */
export const theme = {
  colors: {
    background: "#0F2A43",
    surface: "#15385A",
    surfaceAlt: "#1C4569",
    primary: "#2FA592",
    primaryDark: "#1F8574",
    warning: "#E0A62F",
    danger: "#D5573B",
    success: "#2FA592",
    text: "#F4F8FB",
    textMuted: "#A9C0D4",
    border: "#26507A",
  },
  spacing: (n: number) => n * 8,
  radius: 16,
};
