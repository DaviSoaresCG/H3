---
name: EventPoint Operational System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006e2f'
  on-secondary: '#ffffff'
  secondary-container: '#6bff8f'
  on-secondary-container: '#007432'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0b1c30'
  on-tertiary-container: '#75859d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#6bff8f'
  secondary-fixed-dim: '#4ae176'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005321'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  success-vibrant: '#22C55E'
  navy-deep: '#0F172A'
  slate-serious: '#64748B'
  alert-warning: '#F59E0B'
  alert-error: '#EF4444'
  surface-card: '#FFFFFF'
  border-subtle: '#E2E8F0'
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
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base-unit: 4px
  margin-mobile: 16px
  margin-desktop: 32px
  gutter: 16px
  container-max-width: 1280px
---

## Brand & Style

The design system is engineered for **EventPoint**, a high-utility operational platform for event logistics. The brand personality is rooted in **Reliability, Efficiency, and Transparency**. It serves a dual-persona ecosystem: field employees (montadores/motoristas) who need high-speed interaction on mobile devices, and managers who require data density and clarity on desktop.

The chosen design style is **Corporate / Modern** with a strong emphasis on **Operational Minimalism**. 

- **Operational Focus:** Every UI element is designed for "at-a-glance" comprehension. In field environments, contrast is prioritized over decorative flourishes.
- **Atmosphere:** Professional and secure. The use of deep navy conveys institutional trust, while vibrant green highlights provide immediate positive reinforcement for critical actions like clocking in.
- **Tactile Clarity:** Interactive elements use subtle depth to distinguish themselves from static data, ensuring the UI remains navigable even in high-stress, outdoor environments.

## Colors

The palette is strategically limited to ensure focus and reduce cognitive load during field operations.

- **Primary (Navy Deep - #0F172A):** Used for navigation, headers, and primary typography. It establishes a foundation of authority and professionalism.
- **Secondary (Success Green - #22C55E):** Reserved for "Success" actions, specifically for clocking in/out and vehicle returns. Its vibrancy ensures high visibility in sunlight.
- **Tertiary (Slate Serious - #64748B):** Applied to secondary information, icons, and metadata to maintain hierarchy without cluttering the visual field.
- **Neutral (#F8FAFC):** A cool-tinted light gray used for backgrounds to reduce glare compared to pure white.

**Usage Note:** For mobile "Clock-In" buttons, use the Success Green as the background color with white text to maximize the "Success" mental model.

## Typography

This design system utilizes **Inter** for all levels to ensure maximum legibility and a systematic, utilitarian aesthetic.

- **Scale:** On mobile, font sizes are slightly enlarged to accommodate outdoor viewing and touch targets. 
- **Hierarchy:** Bold weights (700) are used strictly for headlines and primary buttons. Medium weights (500-600) are used for labels and card titles to differentiate from standard body text.
- **Functional Caps:** The `label-caps` style is used for non-interactive status indicators (e.g., "ON_ROAD", "GARAGE") to distinguish them from actionable text.

## Layout & Spacing

The system follows an **8px grid** (with a 4px sub-grid for icons and small labels) to ensure alignment and rhythm.

- **Mobile (PWA):** Fluid 1-column layout. Horizontal margins are fixed at 16px. Vertical spacing between functional cards should be 12px to allow for a high density of information without feeling cramped.
- **Desktop (Admin):** 12-column fluid grid. The sidebar is fixed at 280px. Gutters are fixed at 16px.
- **Touch Targets:** All interactive elements (buttons, inputs) must have a minimum height of 48px on mobile to ensure ease of use for field workers who may be wearing gloves or moving.

## Elevation & Depth

To maintain an "Operational" feel, depth is used sparingly to indicate interactivity or urgent messaging.

- **Tonal Layers:** The primary background uses the neutral gray, while cards and containers use pure white (#FFFFFF). This subtle contrast creates depth without the need for heavy shadows.
- **Low-Contrast Outlines:** All cards and inputs utilize a 1px border (`#E2E8F0`). 
- **Functional Shadows:** Use a single, soft elevation level for primary action buttons and floating "Alert" cards. 
  - *Shadow spec:* `0px 4px 6px -1px rgba(15, 23, 42, 0.1), 0px 2px 4px -2px rgba(15, 23, 42, 0.1)`.
- **Active State:** When a card or button is pressed, the shadow is removed, and the element is shifted 1px down to simulate a physical "press."

## Shapes

The design system uses **Soft (0.25rem)** roundedness to maintain a serious, professional appearance while avoiding the harshness of sharp 0px corners.

- **Standard Elements:** Buttons, Input fields, and small Chips use the base 4px (0.25rem) radius.
- **Cards & Containers:** Large cards (Vehicle status, Alerts) use `rounded-lg` (8px / 0.5rem) to differentiate structural containers from interactive components.
- **Status Pills:** Status indicators (e.g., "IN_USE") use the `rounded-full` (pill) shape to clearly separate them from square-ish functional buttons.

## Components

### Buttons
- **Primary:** Navy background, White text. Hover: Lighten navy by 10%. Active: Scale 0.98.
- **Success (Clock-In):** Green background, White text. Large padding (16px top/bottom).
- **Disabled:** Slate background at 30% opacity, White text. No hover effects.

### Cards (Operational)
- **Status Cards:** White background with a 4px left-border accent colored by status (Green for OK, Red for Alert, Navy for Neutral).
- **Fleet Cards:** Display Vehicle Name in bold, Plate in `body-sm`, and a right-aligned Status Pill.

### Inputs
- **Standard:** 1px border (#E2E8F0), 12px horizontal padding. Focus state: 2px border using Primary Navy.
- **Audio Recorder:** A specialized large circular button with a pulse animation when active. Must show a "Waveform" placeholder to indicate recording.

### Alerts & Status
- **Alert Cards:** Use a light red background (#FEF2F2) with dark red text (#991B1B) for critical exceptions (e.g., Vehicle Overdue).
- **Success Toast:** Brief 2-second overlay after clock-in, using the Green-Vibrant color.

### Checkboxes & Radios
- Uses the Primary Navy for the checked state. Large 24px x 24px hit areas for mobile reliability.