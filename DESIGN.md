---
name: Precision Dark
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c3c6d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#8d90a0'
  outline-variant: '#434655'
  surface-tint: '#b4c5ff'
  primary: '#b4c5ff'
  on-primary: '#002a78'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#0053db'
  secondary: '#b7c8e1'
  on-secondary: '#213145'
  secondary-container: '#3a4a5f'
  on-secondary-container: '#a9bad3'
  tertiary: '#ffb596'
  on-tertiary: '#581e00'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
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
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  max-width: 1280px
---

## Brand & Style
The design system adopts a **Modern Corporate** aesthetic optimized for deep-focus environments. It prioritizes clarity, technical precision, and a high-performance feel. By utilizing a dark-mode-first approach, it reduces eye strain for long-duration tasks while maintaining an air of sophisticated authority.

The style leans into **Minimalism** with a focus on functional hierarchy. It avoids unnecessary decoration, instead using subtle tonal shifts and precise primary accents to guide the user’s eye through complex data structures and service workflows.

## Colors
The palette is rooted in a deep navy and charcoal foundation to provide a stable, low-light environment. 

- **Primary:** A vibrant Blue (#2563EB) used exclusively for interactive elements, progress indicators, and primary actions.
- **Surface Strategy:** We use a "Leveling" approach. The base background is the darkest (`surface-dim`), while content cards and containers sit on `surface` or `surface-bright` to create a logical stack of importance.
- **Contrast:** Text is strictly high-contrast light gray or white to ensure WCAG AAA readability against the dark backgrounds.

## Typography
This design system utilizes **Inter** across all levels to maintain a systematic and utilitarian feel. 

- **Headlines:** Use Bold weights with slight negative letter-spacing to create a "tight" professional look for headers.
- **Body:** Standardized on 16px for readability, utilizing a slightly generous line-height to ensure text remains legible against dark backgrounds (where "halation" or light bleed can occur).
- **Labels:** Use Medium weight and all-caps for utility labels to differentiate them from body copy.

## Layout & Spacing
The system follows a **Fluid Grid** logic within a maximum container width.

- **Grid:** A 12-column system for desktop, collapsing to 4 columns on mobile.
- **Rhythm:** All margins and paddings must be multiples of the 8px base unit. 
- **Adaptation:** On mobile, horizontal page margins shrink to 16px, and vertical spacing between stacked cards increases to maintain breathing room.

## Elevation & Depth
In this dark UI, depth is communicated through **Tonal Layers** rather than heavy shadows. 

- **Z-Index Hierarchy:** Higher elevation elements are represented by lighter surface colors (e.g., a modal uses `surface-bright`, while the page background uses `surface-dim`).
- **Outlines:** Use low-contrast "Ghost Borders" (`#334155`) to define element boundaries without adding visual noise.
- **Inner Glows:** For primary buttons or active states, a subtle 1px inner border can be used to simulate a slight "lift" against the dark backdrop.

## Shapes
The shape language is strictly defined by an **8px (0.5rem)** base radius. This provides a balance between a friendly modern interface and a structured, professional tool.

- **Standard:** Buttons, Input fields, and Small Cards use the 8px radius.
- **Large:** Main content containers and Modals use 16px (`rounded-lg`) to anchor the layout.

## Components
- **Buttons:** Primary buttons are solid Blue (#2563EB) with white text. Secondary buttons use an outline style with the `on-surface-variant` color.
- **Inputs:** Fields use a `container-low` background with a subtle 1px border. On focus, the border transitions to the primary blue.
- **Chips:** Small, low-contrast capsules used for tagging, utilizing `container-high` backgrounds and `on-surface` text.
- **Cards:** Cards should not have shadows. Use a solid `surface` background and a 1px border of `container-high` to separate them from the base background.
- **Lists:** Use subtle dividers (1px, 10% opacity white) between list items to maintain vertical rhythm without breaking the visual flow.
- **Data Tables:** High-density rows with `surface-dim` headers and `surface` alternating row stripes for maximum data readability.