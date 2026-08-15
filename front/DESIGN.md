---
name: High-Contrast Operational System
colors:
  surface: '#fff9e7'
  surface-dim: '#dfdac6'
  surface-bright: '#fff9e7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f9f4df'
  surface-container: '#f4eeda'
  surface-container-high: '#eee8d4'
  surface-container-highest: '#e8e2cf'
  on-surface: '#1e1c10'
  on-surface-variant: '#4b4731'
  inverse-surface: '#333123'
  inverse-on-surface: '#f7f1dc'
  outline: '#7c785f'
  outline-variant: '#cdc7aa'
  surface-tint: '#695f00'
  primary: '#695f00'
  on-primary: '#ffffff'
  primary-container: '#ffea00'
  on-primary-container: '#736900'
  inverse-primary: '#dbc900'
  secondary: '#5556a2'
  on-secondary: '#ffffff'
  secondary-container: '#aaacfe'
  on-secondary-container: '#3b3d87'
  tertiary: '#006a68'
  on-tertiary: '#ffffff'
  tertiary-container: '#4dfffc'
  on-tertiary-container: '#007472'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#fae500'
  primary-fixed-dim: '#dbc900'
  on-primary-fixed: '#1f1c00'
  on-primary-fixed-variant: '#4f4800'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c1c1ff'
  on-secondary-fixed: '#0e0c5c'
  on-secondary-fixed-variant: '#3d3e88'
  tertiary-fixed: '#45faf7'
  tertiary-fixed-dim: '#00ddda'
  on-tertiary-fixed: '#00201f'
  on-tertiary-fixed-variant: '#00504f'
  background: '#fff9e7'
  on-background: '#1e1c10'
  surface-variant: '#e8e2cf'
  success-vibrant: '#22C55E'
  alert-error: '#EF4444'
  neutral-surface: '#F8F9FA'
  on-yellow-text: '#0F172A'
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

The design system is engineered for high-utility operational logistics where speed and legibility are paramount. The brand personality is **Dynamic, Authoritative, and Alert**, reflecting a "boots on the ground" reality where information must be processed instantly under various lighting conditions.

The design style is **High-Contrast / Bold** with a focus on **Operational Minimalism**. 

- **Maximum Visibility:** Utilizing a high-chroma yellow paired with deep navy creates a visual hierarchy that is impossible to miss. This is designed for field employees and managers who require zero ambiguity in their interface.
- **Atmosphere:** Energetic yet professional. The vibrant yellow evokes a sense of urgency and activity, while the deep navy grounds the system in corporate reliability.
- **Tactile Utility:** Interactive elements use sharp, clear boundaries and bold color blocks rather than subtle gradients, ensuring the UI remains navigable in high-stress or outdoor environments.

## Colors

The palette is derived directly from the brand's core identity to maximize recognition and functional contrast.

- **Primary (Vibrant Yellow - #FFEA00):** This is the high-visibility foundation. It is used for primary backgrounds, highlighting key status areas, and identifying the "active" zone of the application.
- **Secondary (Deep Navy - #1A1A66):** Used for critical UI elements, primary typography, and actionable buttons. Against the yellow, it provides AA and AAA accessibility contrast.
- **Neutral (Cool Gray - #F8F9FA):** A subtle background used for secondary containers to prevent "yellow fatigue" while maintaining a clean, modern workspace.

**Usage Note:** For text-heavy areas, use Deep Navy text on the Yellow or Neutral background. Pure black is avoided in favor of the branded navy to maintain a sophisticated professional feel.

## Typography

This system utilizes **Inter** to maintain a systematic, utilitarian aesthetic that scales perfectly from small mobile labels to large desktop dashboards.

- **Legibility First:** The high-contrast color pairing allows for tight, bold weights (700) to be used effectively for headlines, ensuring they "pop" against the vibrant background.
- **Functional Hierarchy:** `label-caps` is used for technical metadata and status tags to separate data points from instructional body text.
- **Mobile Adaptivity:** Headlines scale down on mobile but maintain their heavy weight to ensure they remain the primary focal point during fast-paced field use.

## Layout & Spacing

The system follows an **8px grid** (with a 4px sub-grid for icons) to ensure structural rhythm.

- **Fixed Grid (Desktop):** A 12-column grid with 16px gutters. The layout is centered with a max-width of 1280px to prevent excessive line lengths in data-heavy views.
- **Fluid Grid (Mobile):** A single-column fluid layout with fixed 16px side margins. 
- **Touch Targets:** All interactive zones (buttons, toggles, inputs) have a strict minimum height of 48px to accommodate field use.

## Elevation & Depth

To maintain the high-contrast aesthetic, this system avoids heavy shadows and instead uses **Tonal Layers** and **Bold Outlines**.

- **Surface Tiers:** Depth is created by placing Navy elements or Neutral containers on the Yellow primary surface.
- **Low-Contrast Outlines:** For subtle separation on white or light gray cards, use a 1px border (#E2E8F0).
- **Hard Elevation:** For primary buttons and urgent pop-ups, a crisp 2px Navy border is preferred over a soft shadow to maintain the "H3" brand's graphic intensity.
- **Active State:** Use a solid color shift (e.g., Navy to a slightly lighter Blue-Black) to indicate a press, rather than a blur change.

## Shapes

The design system uses a **Soft (0.25rem)** roundedness. This strikes a balance between the technical, "box-like" efficiency of the logistics industry and a modern, accessible software feel.

- **Standard Elements:** Buttons and Inputs use the base 4px (0.25rem) radius.
- **Status Pills:** High-priority status indicators use a full pill shape to break the geometric grid and attract the eye instantly.
- **Iconography:** Icons should follow a solid, filled style with slightly rounded terminals to match the font weight of Inter.

## Components

### Buttons
- **Primary Action:** Deep Navy background with white text. High contrast for immediate identification.
- **Secondary/Ghost:** 2px Deep Navy border with Navy text on a Yellow or White background.
- **Operational (Clock-In):** Success Green background with Navy text to indicate a positive, actionable state.

### Cards & Inputs
- **Data Cards:** White or Neutral backgrounds with a primary-yellow top border (4px) to tie the element into the brand ecosystem.
- **Inputs:** 1px Navy border. On focus, the border increases to 2px with a subtle yellow outer glow (2px) to signify the active field.

### Status Indicators
- **Urgent Alerts:** Red background (#EF4444) with white text. These should be the only elements that break the Navy/Yellow/Green hierarchy.
- **System Badges:** Small, high-contrast labels using `label-caps` for technical identifiers like Plate IDs or Order Numbers.

### Navigation
- **Sidebar/Header:** Deep Navy background with Yellow icons and text for active states. This creates a powerful, professional "frame" for the application content.