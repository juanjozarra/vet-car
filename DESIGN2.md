---
name: Neo-Industrial Noir
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#39393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#e5beb8'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#ab8984'
  outline-variant: '#5c403c'
  surface-tint: '#ffb4a9'
  primary: '#ffb4a9'
  on-primary: '#690002'
  primary-container: '#ff5544'
  on-primary-container: '#5c0001'
  inverse-primary: '#bb1913'
  secondary: '#c8c6c6'
  on-secondary: '#303030'
  secondary-container: '#494949'
  on-secondary-container: '#b9b8b8'
  tertiary: '#b6c4ff'
  on-tertiary: '#002780'
  tertiary-container: '#6889ff'
  on-tertiary-container: '#002171'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4a9'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#930004'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b6c4ff'
  on-tertiary-fixed: '#001551'
  on-tertiary-fixed-variant: '#0039b3'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
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
  xl: 48px
  gutter: 16px
  margin: 24px
---

# Design System: Neo-Industrial Noir

## Brand & Style
Neo-Industrial Noir is a design language that prioritizes focus, precision, and high-impact visual hierarchy. The style is a blend of **Minimalism** and **Brutalism**, characterized by deep dark backgrounds, stark high-contrast typography, and sharp, functional interfaces.

The brand personality is professional, modern, and authoritative. It aims to evoke a sense of technical sophistication and high performance. By stripping away unnecessary ornamentation and using a "Neutral" color variant, the design emphasizes content and action over decoration.

## Colors
The palette is rooted in a **Dark Mode** foundation, utilizing a "Neutral" variant strategy where the base color is a deep, near-black grey.

*   **Primary Background**: #131314 (Deep Slate) - The core of the interface.
*   **Secondary / Accent**: #e63b2e (Signal Red) - Used for primary actions and alerts.
*   **Tertiary**: #0055ff (Electric Blue) - Used for links and secondary interactive highlights.
*   **Neutral**: #4a4a4a (Steel Grey) - Used for borders, dividers, and secondary text.

## Typography
The typographic system utilizes a pairing of **Be Vietnam Pro** for headlines and labels with **Inter** for body text.

*   **Headlines (Be Vietnam Pro)**: Modern, geometric, and engineered. Used for all major headers.
*   **Body (Inter)**: Clean and highly legible. Used for all long-form content and data entries.
*   **Labels (Be Vietnam Pro)**: Small, often uppercase, used for functional UI labels and metadata.

### Typography Levels
*   **Headline Large**: 32px / 700 / Be Vietnam Pro
*   **Headline Medium**: 24px / 600 / Be Vietnam Pro
*   **Body Large**: 16px / 400 / Inter
*   **Label Medium**: 12px / 500 / Be Vietnam Pro / 0.05em Letter Spacing

## Layout & Spacing
The system employs a **Fluid Grid** model with a base spacing unit of 8px.

*   **Grid**: 12-column layout for desktop; 4-column for mobile.
*   **Gutter**: 16px fixed.
*   **Margin**: 24px (Desktop) / 16px (Mobile).
*   **Rhythm**: High-density spacing to facilitate complex data visualization and technical workflows.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Bold Borders**.

*   **Surfaces**: Backgrounds are dark, with higher-level containers using subtle shifts in grey.
*   **Borders**: 1px solid borders in #4a4a4a define the structural grid and component boundaries.
*   **Interactivity**: Focus and hover states are indicated by Tertiary (#0055ff) color shifts or subtle glows.

## Shapes
The shape language is **Rounded**. 
*   **Base Radius**: 8px (0.5rem) for standard components like buttons and inputs.
*   **Large Radius**: 16px (1rem) for main containers and cards.
*   The increased radius maintains a technical feel while offering a more refined and contemporary aesthetic.

## Components
*   **Buttons**: Solid #e63b2e for primary actions; outlined #0055ff for secondary.
*   **Inputs**: Dark fill with Steel Grey borders; Electric Blue focus state.
*   **Cards**: Minimalist, defined by borders rather than shadows.
*   **Chips**: Technical badges with Be Vietnam Pro labels and high-contrast backgrounds.
*   **Data Tables**: High density with clear dividers and Inter body text for maximum clarity.