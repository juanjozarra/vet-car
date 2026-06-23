export const motionTokens = {
  duration: {
    fast: 0.18,
    normal: 0.35,
    slow: 0.6,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  distance: {
    sm: 8,
    md: 16,
    lg: 24,
  },
  // Reusable interaction presets — spread into whileHover/whileTap/transition props
  interaction: {
    hoverLift: { y: -4 },
    hoverScale: { scale: 1.02 },
    tapPress: { scale: 0.97, transition: { duration: 0.1 } },
  },
  // Design-system interaction colors
  colors: {
    // Electric Blue — focus rings, outlined buttons, link highlights
    focus: '#0055ff',
    // Signal Red glow — decorative ambient elements
    accentGlow: '#ff5544',
    // Outline — hover borders on cards and inputs
    hoverBorder: '#ab8984',
  },
}
