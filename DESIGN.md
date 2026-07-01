---
name: Midnight Tech
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#38393a'
  surface-container-lowest: '#0c0f0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#bbc9ca'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#869394'
  outline-variant: '#3c494a'
  surface-tint: '#55d8e1'
  primary: '#55d8e1'
  on-primary: '#003739'
  primary-container: '#00adb5'
  on-primary-container: '#003a3d'
  inverse-primary: '#00696e'
  secondary: '#c1c7d3'
  on-secondary: '#2b313a'
  secondary-container: '#414751'
  on-secondary-container: '#b0b5c1'
  tertiary: '#c2c7d0'
  on-tertiary: '#2c3138'
  tertiary-container: '#989ca6'
  on-tertiary-container: '#2f343c'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#75f5fd'
  primary-fixed-dim: '#55d8e1'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f53'
  secondary-fixed: '#dde3ef'
  secondary-fixed-dim: '#c1c7d3'
  on-secondary-fixed: '#161c25'
  on-secondary-fixed-variant: '#414751'
  tertiary-fixed: '#dee2ed'
  tertiary-fixed-dim: '#c2c7d0'
  on-tertiary-fixed: '#171c23'
  on-tertiary-fixed-variant: '#42474f'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  headline-lg:
    fontFamily: Jetbrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Jetbrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Jetbrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
---

# Design System: Midnight Tech

## Brand & Style
The brand identity has evolved into a sophisticated "Midnight Tech" persona. This style is deeply rooted in modern minimalism with a heavy influence from developer-centric aesthetics (Brutalism-lite), now featuring a vibrant cyan-forward primary palette.

The emotional response should be one of precision, technical authority, and calm focus. By utilizing a dark color mode, prominent cyan actions, and monospaced accents, the UI evokes a high-performance environment suitable for technical tools, coding platforms, or premium hardware interfaces.

## Colors
The palette is built on a high-contrast dark foundation with a vibrant primary highlight.

*   **Primary (#00ADB5):** The vibrant cyan "Action" color used for main branding, primary buttons, and active states.
*   **Secondary (#222831):** The deep foundation color used for main surfaces, sidebars, and primary background layers.
*   **Tertiary (#393E46):** Used for elevated surfaces, component containers, and subtle structural separation.
*   **Neutral (#EEEEEE):** A near-white off-grey used for high-readability text and primary icons.

## Typography
The typography strategy pairs technical precision with human readability.

*   **Headlines & Labels:** **Jetbrains Mono** provides a distinct "code-inspired" character. Headlines are bold and rhythmic, while labels provide a clear, data-heavy feel for metadata.
*   **Body:** **Inter** is used for all long-form text and interface copy to ensure maximum legibility and a modern, neutral feel.

## Layout & Spacing
The layout follows a strict 8px-based rhythmic grid. The system uses a fluid grid that collapses into a single column for mobile devices, maintaining a consistent gutter and margin profile. Space is used as a functional separator, keeping technical information dense but organized.

## Elevation & Depth
In this dark theme, depth is communicated through **Tonal Layering**. Surfaces that are "higher" in the stack use progressively lighter shades of grey (utilizing the Tertiary and Secondary palettes). Subtle, low-opacity borders define component boundaries, maintaining a flat, architectural feel.

## Shapes
The UI features a **Rounded** (Level 2) shape language. Standard components feature an 8px (0.5rem) corner radius. This softening of the corners balances the "harshness" of the monospaced typography and the dark color palette.

## Components
*   **Buttons:** Primary buttons use the Primary cyan background with dark Secondary text. Secondary buttons use a Tertiary grey background with Neutral text.
*   **Inputs:** Dark backgrounds with subtle Tertiary borders. Focus states are highlighted with a Primary cyan border.
*   **Cards:** Use the Tertiary color to pop against the Secondary background, featuring the 8px rounded corners.
*   **Code Blocks:** Utilize Jetbrains Mono and appear slightly darker than surrounding containers for distinction.