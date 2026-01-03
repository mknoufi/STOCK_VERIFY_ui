# Design System Documentation

## Stock Verification App - Unified Design System

This document outlines the design system used throughout the Stock Verification application, providing guidelines for consistent UI implementation.

---

## Table of Contents

1. [Overview](#overview)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Patterns & Best Practices](#patterns--best-practices)
7. [Accessibility](#accessibility)
8. [Migration Guide](#migration-guide)

---

## Overview

The Stock Verification app uses a **unified token-based design system** located in `frontend/src/theme/unified/`. This system provides:

- **Consistent visual language** across all screens
- **Theme support** (light, dark, premium, ocean, sunset, high-contrast)
- **Type-safe tokens** with full TypeScript support
- **Responsive design** for mobile, tablet, and web

### Quick Start

```typescript
import {
  colors,
  spacing,
  radius,
  textStyles,
  semanticColors,
} from "@/theme/unified";
```

---

## Color System

### Color Palette

The color system uses a 50-900 scale for each color:

```typescript
colors.primary[500]   // Main brand color
colors.success[500]   // Success states
colors.warning[500]   // Warning states
colors.error[500]     // Error states
colors.neutral[500]   // Neutral grays
```

### Semantic Colors

Use semantic colors for context-aware styling:

```typescript
semanticColors.text.primary      // Main text
semanticColors.text.secondary    // Secondary text
semanticColors.text.tertiary     // Muted text
semanticColors.background.primary    // Main background
semanticColors.background.secondary  // Card backgrounds
semanticColors.background.tertiary   // Input backgrounds
semanticColors.border.default    // Standard borders
semanticColors.border.focused    // Focus states
```

### Color Usage Guidelines

| Context | Token | Example |
|---------|-------|---------|
| Primary actions | `colors.primary[600]` | Submit buttons |
| Destructive actions | `colors.error[600]` | Delete buttons |
| Success feedback | `colors.success[500]` | Success messages |
| Warnings | `colors.warning[500]` | Warning alerts |
| Backgrounds | `semanticColors.background.primary` | Screen backgrounds |
| Text | `semanticColors.text.primary` | Body text |

### ⚠️ Common Mistakes

```typescript
// ❌ Wrong - hardcoded colors
backgroundColor: "#1a1a1a"
color: "red"

// ✅ Correct - use tokens
backgroundColor: semanticColors.background.primary
color: colors.error[500]
```

---

## Typography

### Text Styles

Use predefined text styles for consistency:

```typescript
textStyles.display    // Hero text (32px)
textStyles.h1         // Page titles (28px)
textStyles.h2         // Section headers (24px)
textStyles.h3         // Subsection headers (20px)
textStyles.h4         // Card titles (18px)
textStyles.body       // Body text (16px)
textStyles.bodySmall  // Secondary body (14px)
textStyles.label      // Form labels (14px, semi-bold)
textStyles.caption    // Captions (12px)
textStyles.overline   // Overlines (10px, uppercase)
```

### Usage Example

```typescript
const styles = StyleSheet.create({
  title: {
    ...textStyles.h2,
    color: semanticColors.text.primary,
  },
  subtitle: {
    ...textStyles.bodySmall,
    color: semanticColors.text.secondary,
  },
});
```

### ⚠️ Common Mistakes

```typescript
// ❌ Wrong - non-existent style
...textStyles.heading2

// ✅ Correct - use actual style name
...textStyles.h2
```

---

## Spacing & Layout

### Spacing Scale

```typescript
spacing.xs    // 4px
spacing.sm    // 8px
spacing.md    // 16px
spacing.lg    // 24px
spacing.xl    // 32px
spacing["2xl"] // 48px
spacing["3xl"] // 64px
```

### Border Radius

```typescript
radius.none   // 0
radius.sm     // 4px
radius.md     // 8px
radius.lg     // 12px
radius.xl     // 16px
radius["2xl"] // 24px
radius.full   // 9999px (circular)
```

### Layout Constants

```typescript
layout.screenPadding  // Screen edge padding
layout.maxWidth       // Max content width
layout.headerHeight   // Standard header height
touchTargets.minimum  // Minimum touch target (44px)
```

### Usage Example

```typescript
const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
});
```

---

## Components

### Core UI Components

Located in `frontend/src/components/ui/`:

| Component | Purpose | Import |
|-----------|---------|--------|
| `Button` | Primary action buttons | `@/components/ui/Button` |
| `Card` | Content containers | `@/components/ui/Card` |
| `Modal` | Dialog overlays | `@/components/ui/Modal` |
| `LoadingSpinner` | Loading states | `@/components/ui/LoadingSpinner` |
| `ScreenContainer` | Screen wrapper | `@/components/ui/ScreenContainer` |
| `DataTable` | Data display tables | `@/components/ui/DataTable` |
| `Badge` | Status indicators | `@/components/ui/Badge` |
| `Skeleton` | Loading placeholders | `@/components/ui/Skeleton` |

### LoadingSpinner Props

```typescript
interface LoadingSpinnerProps {
  isVisible: boolean;
  size?: "small" | "medium" | "large";
  type?: "spinner" | "dots" | "pulse";
  color?: string;
  style?: ViewStyle;
}

// Note: LoadingSpinner does NOT have a `message` prop
// Use separate Text component for loading messages
```

### Button Variants

```typescript
<Button variant="primary" onPress={handleSubmit}>Submit</Button>
<Button variant="secondary" onPress={handleCancel}>Cancel</Button>
<Button variant="outline" onPress={handleBack}>Back</Button>
<Button variant="ghost" onPress={handleSkip}>Skip</Button>
<Button variant="danger" onPress={handleDelete}>Delete</Button>
```

### Admin Components

Located in `frontend/src/components/admin/`:

| Component | Purpose |
|-----------|---------|
| `UserFormModal` | Create/edit user forms |
| `RoleSelector` | Role assignment picker |
| `ConfigForm` | Dynamic configuration forms |
| `DashboardCard` | Admin dashboard widgets |

---

## Patterns & Best Practices

### Screen Structure

```typescript
export default function MyScreen() {
  return (
    <ScreenContainer
      gradient
      header={{
        title: "Screen Title",
        subtitle: "Optional subtitle",
        showBackButton: true,
      }}
    >
      <ScrollView style={styles.content}>
        {/* Screen content */}
      </ScrollView>
    </ScreenContainer>
  );
}
```

### Form Pattern

```typescript
const [values, setValues] = useState({ name: "", email: "" });
const [errors, setErrors] = useState<Record<string, string>>({});

const handleChange = (key: string, value: unknown) => {
  setValues(prev => ({ ...prev, [key]: value }));
  setErrors(prev => ({ ...prev, [key]: "" })); // Clear error on change
};

return (
  <ConfigForm
    sections={formSections}
    values={values}
    onChange={handleChange}
    errors={errors}
  />
);
```

### Loading States

```typescript
if (loading) {
  return (
    <ScreenContainer>
      <LoadingSpinner isVisible={true} />
    </ScreenContainer>
  );
}
```

### Error Handling

```typescript
if (error) {
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color={colors.error[500]} />
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Button variant="primary" onPress={handleRetry}>Retry</Button>
    </View>
  );
}
```

---

## Accessibility

### Touch Targets

Ensure all interactive elements meet minimum touch target size:

```typescript
const styles = StyleSheet.create({
  touchable: {
    minHeight: touchTargets.minimum, // 44px
    minWidth: touchTargets.minimum,
    padding: spacing.sm,
  },
});
```

### Color Contrast

Use semantic colors which are designed for proper contrast ratios:

- Primary text on backgrounds: 4.5:1 minimum
- Large text (18px+): 3:1 minimum

### Screen Reader Support

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Submit form"
  accessibilityHint="Double tap to submit the form"
  accessibilityRole="button"
>
  <Text>Submit</Text>
</TouchableOpacity>
```

---

## Migration Guide

### From Legacy Theme

If migrating from the legacy theme system:

```typescript
// ❌ Old (legacy)
const { themeLegacy } = useThemeContext();
const { colors } = themeLegacy;
color: colors.text

// ✅ New (unified)
import { semanticColors } from "@/theme/unified";
color: semanticColors.text.primary
```

### Common Token Mappings

| Legacy | Unified |
|--------|---------|
| `colors.text` | `semanticColors.text.primary` |
| `colors.background` | `semanticColors.background.primary` |
| `colors.surface` | `semanticColors.background.secondary` |
| `colors.border` | `semanticColors.border.default` |
| `colors.primary` | `colors.primary[600]` |
| `colors.error` | `colors.error[500]` |
| `spacing.xxl` | `spacing["2xl"]` |

### HTTP Client Migration

```typescript
// ❌ Old
import { api } from "@/services/api";
const response = await api.get("/users");

// ✅ New
import apiClient from "@/services/httpClient";
const response = await apiClient.get("/api/users");
```

---

## File Structure

```
frontend/src/theme/unified/
├── index.ts          # Main exports
├── colors.ts         # Color palette & semantic colors
├── typography.ts     # Font sizes, weights, text styles
├── spacing.ts        # Spacing scale & layout constants
├── radius.ts         # Border radius values
├── shadows.ts        # Shadow definitions
├── animations.ts     # Animation presets
└── README.md         # This documentation (symlinked)
```

---

## Resources

- **Storybook**: Run `npm run storybook` for interactive component docs
- **Theme Context**: See `frontend/src/context/ThemeContext.tsx`
- **Migration Examples**: See `frontend/src/theme/unified/MIGRATION_EXAMPLES.tsx`
- **Color Picker**: Available in Settings > Appearance

---

*Last updated: January 2025*
