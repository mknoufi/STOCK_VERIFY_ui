# Unified Design Token System

## Overview

This directory contains the unified design token system for the Stock Verification app. All visual constants—colors, spacing, typography, shadows, and animations—are defined here as TypeScript tokens.

## Quick Start

```typescript
import {
  colors,
  semanticColors,
  spacing,
  radius,
  textStyles,
  shadows,
  animations,
} from "@/theme/unified";
```

## File Structure

```
unified/
├── index.ts          # Main export file
├── colors.ts         # Color palette and semantic color mappings
├── spacing.ts        # Spacing scale and layout constants
├── typography.ts     # Font sizes, weights, and text styles
├── radius.ts         # Border radius scale
├── shadows.ts        # Shadow/elevation definitions
├── animations.ts     # Animation presets and spring configs
└── README.md         # This documentation
```

---

## Color System

### Color Palette

The base color palette uses a 50-900 scale:

```typescript
colors.primary[50]; // Lightest
colors.primary[100];
colors.primary[200];
colors.primary[300];
colors.primary[400];
colors.primary[500]; // Base/Default
colors.primary[600];
colors.primary[700];
colors.primary[800];
colors.primary[900]; // Darkest
```

### Available Color Families

| Family    | Usage                         |
| --------- | ----------------------------- |
| `primary` | Brand color, primary actions  |
| `success` | Success states, confirmations |
| `warning` | Warnings, cautions            |
| `error`   | Errors, destructive actions   |
| `neutral` | Grays, backgrounds, borders   |

### Semantic Colors

Use semantic colors for context-aware styling that adapts to light/dark mode:

```typescript
// Text colors
semanticColors.text.primary; // Main text
semanticColors.text.secondary; // Secondary text
semanticColors.text.tertiary; // Muted/disabled text
semanticColors.text.inverse; // Text on dark backgrounds

// Background colors
semanticColors.background.primary; // Main screen background
semanticColors.background.secondary; // Card/elevated surfaces
semanticColors.background.tertiary; // Input fields, hover states

// Border colors
semanticColors.border.default; // Standard borders
semanticColors.border.focused; // Focus state borders
semanticColors.border.error; // Error state borders

// Status colors
semanticColors.status.success; // Success indicators
semanticColors.status.warning; // Warning indicators
semanticColors.status.error; // Error indicators
semanticColors.status.info; // Info indicators
```

### Special Colors

```typescript
colors.white; // Pure white (#FFFFFF)
colors.black; // Pure black (#000000)
```

---

## Spacing System

Based on a 4px unit grid:

```typescript
spacing.xs; // 4px
spacing.sm; // 8px
spacing.md; // 16px
spacing.lg; // 24px
spacing.xl; // 32px
spacing["2xl"]; // 48px
spacing["3xl"]; // 64px
```

### Layout Constants

```typescript
layout.screenPadding; // Horizontal padding for screens
layout.maxContentWidth; // Max width for content
layout.headerHeight; // Standard header height
layout.tabBarHeight; // Bottom tab bar height
```

### Touch Targets

```typescript
touchTargets.minimum; // 44px (iOS) / 48dp (Android)
touchTargets.comfortable; // 48px
touchTargets.large; // 56px
```

### Hit Slop Presets

```typescript
hitSlop.small; // { top: 8, bottom: 8, left: 8, right: 8 }
hitSlop.medium; // { top: 12, bottom: 12, left: 12, right: 12 }
hitSlop.large; // { top: 16, bottom: 16, left: 16, right: 16 }
```

---

## Typography

### Text Styles

Pre-configured text style objects for consistent typography:

```typescript
textStyles.display; // 32px, bold - Hero text
textStyles.h1; // 28px, bold - Page titles
textStyles.h2; // 24px, semibold - Section headers
textStyles.h3; // 20px, semibold - Subsection headers
textStyles.h4; // 18px, medium - Card titles
textStyles.body; // 16px, regular - Body text
textStyles.bodySmall; // 14px, regular - Secondary body
textStyles.label; // 14px, semibold - Form labels
textStyles.caption; // 12px, regular - Captions, timestamps
textStyles.overline; // 10px, uppercase - Overlines
```

### Usage

```typescript
const styles = StyleSheet.create({
  title: {
    ...textStyles.h2,
    color: semanticColors.text.primary,
  },
});
```

### Font Weights

```typescript
fontWeight.thin; // 100
fontWeight.light; // 300
fontWeight.regular; // 400
fontWeight.medium; // 500
fontWeight.semibold; // 600
fontWeight.bold; // 700
fontWeight.extrabold; // 800
fontWeight.black; // 900
```

---

## Border Radius

```typescript
radius.none; // 0
radius.xs; // 2px
radius.sm; // 4px
radius.md; // 8px
radius.lg; // 12px
radius.xl; // 16px
radius["2xl"]; // 24px
radius.full; // 9999px (circular)
```

---

## Shadows

Platform-aware shadow definitions:

```typescript
shadows.none; // No shadow
shadows.xs; // Subtle shadow
shadows.sm; // Small shadow
shadows.md; // Medium shadow
shadows.lg; // Large shadow
shadows.xl; // Extra large shadow
```

### Usage

```typescript
const styles = StyleSheet.create({
  card: {
    ...shadows.md,
    backgroundColor: semanticColors.background.secondary,
  },
});
```

---

## Animations

### Duration Presets

```typescript
animations.duration.instant; // 0ms
animations.duration.fast; // 150ms
animations.duration.normal; // 300ms
animations.duration.slow; // 500ms
animations.duration.slowest; // 1000ms
```

### Easing Functions

```typescript
animations.easing.linear;
animations.easing.ease;
animations.easing.easeIn;
animations.easing.easeOut;
animations.easing.easeInOut;
animations.easing.spring;
```

### Spring Configurations

```typescript
animations.spring.gentle; // Gentle spring
animations.spring.bouncy; // Bouncy spring
animations.spring.stiff; // Stiff spring
animations.spring.damped; // Critically damped
```

### Usage with Reanimated

```typescript
import { withSpring } from "react-native-reanimated";
import { animations } from "@/theme/unified";

scale.value = withSpring(1, animations.spring.bouncy);
```

---

## Theme Modes

The system supports multiple theme modes:

- `light` - Default light theme
- `dark` - Dark mode
- `system` - Follows device preference
- `highContrast` - Accessibility mode
- `premium` - Premium gradient theme
- `ocean` - Ocean blue theme
- `sunset` - Warm sunset theme

### Accessing Current Theme

```typescript
import { useThemeMode, useSemanticColors } from "@/theme/unified";

function MyComponent() {
  const mode = useThemeMode();
  const colors = useSemanticColors();

  return (
    <View style={{ backgroundColor: colors.background.primary }}>
      {/* ... */}
    </View>
  );
}
```

---

## Best Practices

### ✅ Do

```typescript
// Use semantic colors for adaptive theming
backgroundColor: semanticColors.background.primary

// Use spacing tokens for consistency
padding: spacing.md

// Use text styles for typography
...textStyles.h2

// Use radius tokens for borders
borderRadius: radius.lg
```

### ❌ Don't

```typescript
// Avoid hardcoded colors
backgroundColor: "#1a1a1a"

// Avoid magic numbers
padding: 16

// Avoid inline font styles
fontSize: 24, fontWeight: "600"

// Avoid hardcoded radius
borderRadius: 12
```

---

## Migration Guide

If migrating from legacy theme:

| Legacy                    | Unified                             |
| ------------------------- | ----------------------------------- |
| `theme.colors.primary`    | `colors.primary[600]`               |
| `theme.colors.text`       | `semanticColors.text.primary`       |
| `theme.colors.background` | `semanticColors.background.primary` |
| `theme.spacing.md`        | `spacing.md`                        |

See `MIGRATION_EXAMPLES.tsx` for complete examples.

---

## Contributing

When adding new tokens:

1. Add to the appropriate file (colors.ts, spacing.ts, etc.)
2. Export from index.ts
3. Update this README
4. Add migration notes if replacing existing tokens

---

_Last updated: January 2025_
