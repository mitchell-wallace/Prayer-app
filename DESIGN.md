# Prayer Rhythm Design System

This document outlines the visual design guidelines for the Prayer Rhythm app.

## Color Palette

### Primary Color
- **Royal Blue**: `oklch(0.5641 0.2402 273.08)`
- Used for primary buttons, focus states, and key interactive elements
- Primary buttons use solid fill with white text

### Priority Colors
Unified blue-based system that maintains visual hierarchy while keeping the palette cohesive:

| Priority | Description | Usage |
|----------|-------------|-------|
| Urgent | Reddish-blue (hue ~320) | High-alert items requiring immediate attention |
| High | Strong blue (full saturation) | Important items |
| Medium | Half-saturation blue | Standard priority |
| Low | Neutral gray | Background/deferred items |

### Semantic Colors
- **Answered**: "Loud neutral" - dark gray with white text (light mode), light gray with dark text (dark mode)
- **Danger**: Red `#ef4444` - destructive actions only
- **Success**: Green `#4ade80` - confirmations (used sparingly)

### Surface Colors
- Elevated cards use shadows for depth, not visible borders
- Key elements are emphasized, secondary elements recede

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
- **Small** (`shadow-sm`): Subtle elevation for dropdowns, tooltips
- **Card** (`shadow-card`): Primary card elevation
- **Modal** (`shadow-modal`): Strong elevation for overlays
- **Primary Glow** (`shadow-primary-glow`): Focus ring using primary color

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
| Prayer hands | `IconHandStop` or custom |

## Buttons

### Primary Button
- Background: Solid primary color (royal blue)
- Text: White
- Hover: Slightly darker primary
- Border radius: 12px (`rounded-xl`)

### Secondary Button
- Background: Neutral/muted card color
- Text: Primary text color
- Border: Subtle border color
- Hover: Slightly darker background

### Danger Button
- Background: Red (danger color)
- Text: White
- Use only for destructive actions (delete)

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
- Focus states use primary glow

## Component Patterns

### Chips/Badges
- Light tinted background with subtle outline
- Uses priority color system
- Border radius: 12px (small)

### Cards
- Elevated with shadow
- No visible borders
- Background: card color
- Border radius: 16px (medium)

### Modals
- Strong shadow for elevation
- Semi-transparent overlay backdrop
- Border radius: 16px (medium)

### Progress Indicator
- Maximum 5 large dots visible
- Small subtle dot on edges when more exist
- Active dot: stronger gray
- Inactive dot: lighter gray
- Connected to navigation controls
