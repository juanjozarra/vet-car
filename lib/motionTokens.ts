export const motionTokens = {
  duration: {
    fast: 0.18,
    normal: 0.35,
    slow: 0.7,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
    // Heavy-mass curve for entrances and layout shifts (matches --ease-fluid)
    fluid: [0.32, 0.72, 0, 1] as [number, number, number, number],
  },
  distance: {
    sm: 8,
    md: 16,
    lg: 28,
  },
  // Reusable interaction presets — spread into whileHover/whileTap/transition props
  interaction: {
    hoverLift: { y: -4 },
    hoverScale: { scale: 1.02 },
    tapPress: { scale: 0.98, transition: { duration: 0.1 } },
  },
  // Design-system interaction colors (Night Garage)
  colors: {
    // Amber signal — focus rings, selected states, link highlights
    focus: '#f2b350',
    // Amber glow — decorative ambient elements
    accentGlow: 'rgba(242, 179, 80, 0.35)',
    // Hairline hover — borders on cards and inputs
    hoverBorder: 'rgba(255, 255, 255, 0.18)',
  },
}

/**
 * The first-render entrance every view owes its sections: fade-up with blur.
 * Spread onto the top-level `motion.*` element of each section, staggering
 * `delay` in reading order. See DESIGN.md § Motion.
 */
export const enter = (delay = 0) => ({
  initial: { opacity: 0, y: motionTokens.distance.md, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.6, ease: motionTokens.easing.fluid, delay },
})
