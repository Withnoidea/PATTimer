---
name: Focus Precision
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#434655'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#ab0b1c'
  on-tertiary: '#ffffff'
  tertiary-container: '#cf2c30'
  on-tertiary-container: '#ffecea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  timer-display:
    fontFamily: JetBrains Mono
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  button-text:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  timer-sm:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 16px
  element-gap: 8px
  section-margin: 12px
---

## Brand & Style

This design system is engineered for high-performance cognitive work. It adopts a **Modern Technical** aesthetic that prioritizes clarity, utility, and deep focus. By blending the structured rigors of an IDE with the clean lightness of modern productivity tools, the UI stays out of the user's way while providing critical temporal data at a glance.

The brand personality is professional, unobtrusive, and highly efficient. It avoids decorative flourishes in favor of functional precision, ensuring that the browser plugin feels like a native extension of the developer's workflow rather than a distraction.

## Colors

The color palette is strictly functional. A base of pure white and soft gray borders creates a clean "technical canvas." 

- **Focus Blue (#2563EB):** Reserved for primary actions, active states, and focus indicators. It draws the eye to the most important interactive elements.
- **Success Green (#10B981):** Communicates completion and positive progress.
- **Warning Red (#EF4444):** Used sparingly for low-time alerts or critical errors.
- **Neutrals:** Medium grays are used for labels and secondary information to maintain a low-distraction environment.

## Typography

This system uses a dual-font strategy. **Inter** provides high readability for labels, instructions, and interface controls. **JetBrains Mono** is utilized exclusively for time-based data and numeric displays, creating a subtle psychological link to the coding environment.

Timer digits should always use monospaced figures to prevent layout "shimmering" or jumping as numbers change. For the plugin context, typography remains compact but legible.

## Layout & Spacing

As a browser plugin, the layout follows a **Fixed Grid** model constrained by the small viewport of a floating panel or sidebar. 

- Use a **4px base unit** for all spacing.
- Standard internal padding for the timer container is **16px**.
- Horizontal layouts for controls (buttons, toggles) should utilize an **8px gap**.
- The layout must remain compact to ensure it does not obscure the primary coding interface of the PTA platform.

## Elevation & Depth

To distinguish the plugin from the underlying website, this system uses **Ambient Shadows** and **Tonal Layers**. 

Since the plugin "floats" over the content, it requires a medium-soft shadow (12% opacity black, 8px blur, 4px Y-offset) to provide depth. Sub-containers within the plugin should use a light gray background (#F9FAFB) or a 1px border (#E5E7EB) rather than additional shadows to avoid visual clutter.

## Shapes

The shape language is modern and approachable without being overly playful. 

- **Standard Radius:** 8px (0.5rem) for main containers and buttons.
- **Large Radius:** 16px (1rem) for the primary outer container of the floating timer.
- Components like progress bars should use rounded caps to maintain the soft technical feel.

## Components

### Buttons
Primary buttons use a solid **Focus Blue** background with white text. Secondary and icon-only buttons use a white background with a 1px border (#E5E7EB) and gray icons, transitioning to blue on hover.

### Timer Display
The centerpiece of the UI. Encased in a soft-gray well (#F3F4F6) with JetBrains Mono digits. It should be large enough to be seen in peripheral vision but not dominant enough to distract.

### Control Chips
Small, icon-centric buttons for "Play", "Pause", and "Reset". Use subtle background fills for the active state (e.g., a very light blue for active play).

### Input Fields
Used for setting time limits. Use a clear 1px border that thickens and turns **Focus Blue** when focused.

### Progress Indicators
A thin horizontal bar or circular ring. Use **Success Green** to indicate time elapsed and **Warning Red** when the time remaining drops below 10%.