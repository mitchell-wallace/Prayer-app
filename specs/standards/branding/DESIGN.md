# Prayer Rhythm Design System

This document outlines the visual design guidelines for the Prayer Rhythm app.

## Color System

### Overview

The color system uses DaisyUI-inspired naming with a consistent scale:
- **100** = darkest shade
- **200** = mid shade  
- **300** = lightest shade

All colors use **OKLCH format** for perceptual uniformity. Exceptions:
- Overlays use Tailwind's `black` with opacity (e.g., `bg-black/60`)
- Shadows use `rgba(0, 0, 0, opacity)`

### Base Colors (Surfaces & Text)

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `base-100` | Chips, smallest surfaces | `oklch(0.94 0.005 250)` | `oklch(0.27 0.01 273)` |
| `base-200` | Page background | `oklch(0.97 0.005 250)` | `oklch(0.32 0.01 273)` |
| `base-300` | Cards, inputs, notes | `oklch(1.0 0 0)` | `oklch(0.36 0.01 273)` |
| `base-content` | Primary text | `oklch(0.15 0.03 260)` | `oklch(0.97 0.005 250)` |

Muted text uses `base-content` with opacity (e.g. `text-base-content/70`).

### Primary Colors (Royal Blue, Hue 273)

Used for primary actions, buttons, and interactive elements.

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `primary-100` | Darkest primary | `oklch(0.45 0.20 273)` | `oklch(0.45 0.20 273)` |
| `primary-200` | Main primary | `oklch(0.50 0.22 273)` | `oklch(0.5641 0.2402 273)` |
| `primary-300` | Lightest primary | `oklch(0.60 0.18 273)` | `oklch(0.60 0.18 273)` |
| `primary-content` | Text on primary | `oklch(1.0 0 0)` | `oklch(1.0 0 0)` |

### Accent Colors (Reddish-Blue, Hue 320)

Used for urgent priority items.

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `accent-100` | Darkest accent | `oklch(0.45 0.16 320)` | `oklch(0.45 0.16 320)` |
| `accent-200` | Main accent | `oklch(0.55 0.18 320)` | `oklch(0.65 0.18 320)` |
| `accent-300` | Lightest accent | `oklch(0.70 0.14 320)` | `oklch(0.75 0.12 320)` |
| `accent-content` | Text on accent | `oklch(1.0 0 0)` | `oklch(1.0 0 0)` |

### Neutral Colors (Inverts Between Modes)

Neutral is a "loud" gray that stands out—light in dark mode, dark in light mode. Used for the "Answered" button.

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `neutral-100` | Darkest neutral | `oklch(0.35 0.02 250)` | `oklch(0.85 0.01 250)` |
| `neutral-200` | Mid neutral | `oklch(0.40 0.02 250)` | `oklch(0.80 0.01 250)` |
| `neutral-300` | Lightest neutral | `oklch(0.45 0.02 250)` | `oklch(0.75 0.01 250)` |
| `neutral-content` | Text on neutral | `oklch(0.97 0.005 250)` | `oklch(0.18 0.02 250)` |

### Semantic Colors

| Token | Purpose | Light Mode | Dark Mode |
|-------|---------|------------|-----------|
| `danger` | Destructive actions | `oklch(0.55 0.22 25)` | `oklch(0.60 0.22 25)` |
| `success` | Confirmations | `oklch(0.55 0.18 145)` | `oklch(0.70 0.18 145)` |

### Priority Color Mapping

Priority badges use color tokens directly with opacity modifiers:

| Priority | Border | Background | Text |
|----------|--------|------------|------|
| Urgent | `border-accent-200/50` | `bg-accent-200/12` | `text-accent-300` |
| High | `border-primary-200/50` | `bg-primary-200/12` | `text-primary-300` |
| Medium | `border-primary-200/70` | `bg-primary-200/12` | `text-primary-200/70` |
| Low | `border-base-100` | `bg-base-100/70` | `text-base-content/70` |

## Naming Conventions

### Rules
1. **No semantic tokens** - Names describe color role, not use case
   - ✅ `base-200` (describes the color tier)
   - ❌ `note-bg` (describes the component)
2. **Borders map to base shades** - Use `border-base-300` instead of dedicated border tokens
3. **Use `dark:` classes** when light/dark modes need different color hierarchies
4. **Only `black` from Tailwind** - For overlays and shadows only

### Examples
```html
<!-- Note cards: different hierarchy per mode -->
<div class="bg-base-300">

<!-- Answered button: uses neutral -->
<button class="bg-neutral-100 text-neutral-content hover:bg-neutral-200">

<!-- Overlay: tailwind black with opacity -->
<div class="bg-black/60">
```

## Typography

### Casing
- **Sentence case** for UI text (e.g., "Add note", "No notes")
- **Uppercase** reserved for small category labels only (e.g., "NOTES", "PRIORITY")

### Font
- Primary: Inter, system-ui, -apple-system, sans-serif

## Spacing & Radius

### Corner Radius Scale (Soft)
| Size | Value | Tailwind Class | Usage |
|------|-------|----------------|-------|
| Small | 12px | `rounded-xl` | Chips, small buttons, inputs |
| Medium | 16px | `rounded-2xl` | Cards, modals |
| Large | 24px | `rounded-3xl` | Large containers (if needed) |

## Elevation & Shadows

### Shadow System
| Token | Usage |
|-------|-------|
| `shadow-sm` | Subtle elevation for note cards, buttons |
| `shadow-md` | Medium elevation (16px spread) |
| `shadow-lg` | Primary card elevation, hover states |
| `shadow-xl` | Strong elevation for modals, dropdowns |
| `shadow-primary-glow` | Focus ring using primary color |

Cards and modals use shadows for depth rather than visible borders.

## Icons

### Library
- **Tabler Icons** (`@tabler/icons-vue`)
- Consistent stroke width across all icons

### Usage Guidelines
- **Outline** icons for default/inactive states
- **Filled** icons to indicate selection or active states
- Standard size: 18-20px for UI elements
- Use `currentColor` for color inheritance

### Icon Mapping
| Element | Icon |
|---------|------|
| Edit | `IconPencil` |
| Close | `IconX` |
| Add | `IconPlus` |
| Dropdown | `IconChevronDown` |
| Info | `IconInfoCircle` |
| Settings | `IconSettings` |
| Menu | `IconDotsVertical` |
| Navigate back | `IconChevronLeft` |
| Navigate next | `IconChevronRight` |
| Check/Complete | `IconCheck` |
| Refresh/Cycle | `IconRefresh` |

## Buttons

### Primary Button
- Background: `bg-primary-200`
- Text: `text-primary-content` (white)
- Hover: `hover:bg-primary-100 hover:shadow-md`
- Border radius: `rounded-xl`

### Secondary Button (Cancel, etc.)
- Background: `bg-base-300 dark:bg-base-200`
- Text: `text-base-content/70`
- Hover: `hover:text-base-content hover:shadow-md`
- Border radius: `rounded-xl`

### Neutral/Answered Button
- Background: `bg-neutral-100`
- Text: `text-neutral-content`
- Hover: `hover:bg-neutral-200`

### Danger Button
- Background: `bg-danger`
- Text: White
- Hover: `hover:bg-danger/90`
- Use only for destructive actions (delete)

## Hover Effects

All interactive elements require hover feedback. Use these patterns consistently:

### Timing & Transitions
- **Duration:** 150ms for all hover transitions
- **Easing:** ease-out
- **Class pattern:** `transition-all duration-150` (or `transition-colors` for color-only changes)

### Icon Buttons (close, menu triggers, nav arrows)
Small icon-only buttons use background color change, not shadow elevation.

```html
<!-- Standard icon button -->
<button class="... text-base-content/70 transition-all duration-150 hover:text-base-content hover:bg-base-100">

<!-- Dark mode adjustment for icon buttons on base-300 -->
<button class="... hover:bg-base-100 dark:hover:bg-base-100">
```
- **Text:** `text-base-content/70` → `hover:text-base-content`
- **Background:** `hover:bg-base-100` (darkens in both modes)
- **No shadow change** for icon buttons

### Elevated Buttons (primary actions, form buttons)
Buttons with existing `shadow-sm` elevation use subtle shadow increase.

```html
<!-- Primary action button -->
<button class="bg-primary-200 shadow-sm ... hover:bg-primary-100 hover:shadow-md">

<!-- Secondary/cancel button -->
<button class="bg-base-300 text-base-content/70 shadow-sm ... hover:text-base-content hover:shadow-md">
```
- **Shadow:** `shadow-sm` → `hover:shadow-md` (not `shadow-lg` which is too dramatic)
- **Color:** background darkens or text brightens

### Dropdown Menu Items
Menu items inside dropdowns use background color change only.

```html
<button class="... transition-colors duration-150 hover:bg-base-100">
```
- **Background:** `hover:bg-base-100` (works inside `bg-base-300` or `bg-base-200` containers)
- **No shadow or text color changes**

### Text Links
Inline links and link-styled buttons use opacity reduction.

```html
<button class="text-primary-200 transition-opacity duration-150 hover:opacity-80">
```
- **Opacity:** `hover:opacity-80`

### Disabled States
Disabled buttons should suppress hover effects.

```html
<button class="... disabled:opacity-50 disabled:hover:bg-[original] disabled:hover:shadow-sm">
```

### Summary Table

| Element Type | Text Change | Background Change | Shadow Change |
|-------------|-------------|-------------------|---------------|
| Icon button | `/70` → full | `hover:bg-base-100` | none |
| Primary button | — | `hover:bg-primary-100` | `sm` → `md` |
| Secondary button | `/70` → full | — | `sm` → `md` |
| Neutral button | — | `hover:bg-neutral-200` | none |
| Danger button | — | `hover:bg-danger/90` | `sm` → `md` |
| Menu item | — | `hover:bg-base-100` | none |
| Text link | — | — | none (use `opacity-80`) |

## Animations & Transitions

### Timing
- **Fast**: 150ms ease-out - micro-interactions, hovers
- **Normal**: 200ms ease-out - page transitions, modals

### Card Navigation
- Slide animations when navigating between cards
- Direction indicates movement (left/right)

### Modal
- Fade in with slight scale animation
- Backdrop fades in

### Interactive Elements
- All buttons, inputs have hover/focus transitions
- Focus states use `shadow-primary-glow`

## Component Patterns

### Chips/Badges
- Light tinted background with subtle border
- Uses priority color system with opacity
- Border radius: `rounded-xl`

### Cards
- Elevated with `shadow-sm` or `shadow-lg`
- Background: `bg-base-300`
- Border radius: `rounded-2xl`

### Note Cards
- Background: `bg-base-300`
- Shadow: `shadow-sm`
- Uses different tiers per mode for visual hierarchy

### Modals
- Strong shadow: `shadow-xl`
- Overlay: `bg-black/60`
- Background: `bg-base-300`
- Border radius: `rounded-2xl`

### Progress Indicator
- Maximum 5 large dots visible
- Uses neutral color with inline opacity:
  - Active: `bg-neutral-200/60`
- Inactive: `bg-neutral-200/40`
- Overflow: `bg-neutral-200/40`
- Loop points use primary color tints
