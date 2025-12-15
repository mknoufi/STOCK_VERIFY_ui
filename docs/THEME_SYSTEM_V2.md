# UI/UX Upgrade - Theme System v2.0

## Overview

This document describes the enhanced theme system for the Stock Verification App, featuring:
- **6 Premium Themes**: Light, Dark, Premium, Ocean, Sunset, High Contrast
- **8 Pattern Backgrounds**: Dots, Grid, Waves, Aurora, Mesh, Circuit, Hexagon, None
- **6 Layout Arrangements**: Default, Compact, Spacious, Cards, List, Grid
- **3 Theme Modes**: Light, Dark, System (auto-detect)

---

## Architecture

### ThemeContext (`/frontend/src/theme/ThemeContext.tsx`)

The central provider for all theme-related state:

```typescript
import { ThemeProvider, useThemeContext } from '../theme/ThemeContext';

// Available types
type ThemeKey = 'light' | 'dark' | 'premium' | 'ocean' | 'sunset' | 'highContrast';
type ThemeMode = 'light' | 'dark' | 'system';
type PatternType = 'none' | 'dots' | 'grid' | 'waves' | 'aurora' | 'mesh' | 'circuit' | 'hexagon';
type LayoutArrangement = 'default' | 'compact' | 'spacious' | 'cards' | 'list' | 'grid';

// Hook usage
const { 
  theme,           // Current AppTheme object
  themeKey,        // Current theme key
  setThemeKey,     // Change theme
  themeMode,       // Current mode
  setThemeMode,    // Change mode
  pattern,         // Current pattern
  setPattern,      // Change pattern
  layout,          // Current layout
  setLayout        // Change layout
} = useThemeContext();
```

### Components

#### PatternBackground
Renders SVG-based decorative backgrounds.

```tsx
import { PatternBackground } from '../components/ui';

<PatternBackground
  pattern="waves"
  colors={{ primary: '#3B82F6', secondary: '#6366F1' }}
  opacity={0.04}
/>
```

#### ThemePicker
Visual theme selection component.

```tsx
import { ThemePicker } from '../components/ui';

<ThemePicker showModeToggle={true} compact={false} />
```

#### PatternPicker
Pattern selection component with icons.

```tsx
import { PatternPicker } from '../components/ui';

<PatternPicker compact={false} />
```

#### LayoutPicker
Layout arrangement selection.

```tsx
import { LayoutPicker } from '../components/ui';

<LayoutPicker compact={false} />
```

#### AppearanceSettings
Complete appearance settings section combining all pickers.

```tsx
import { AppearanceSettings } from '../components/ui';

<AppearanceSettings 
  showTitle={true}
  scrollable={true}
  compact={false}
/>
```

#### ThemedScreen
Wrapper component that applies theme, pattern, and layout.

```tsx
import { ThemedScreen, ThemedCard, ThemedText } from '../components/ui';

<ThemedScreen showPattern={true} useSafeArea={true} variant="default">
  <ThemedCard variant="glass" padding="medium">
    <ThemedText variant="heading" size="xl" weight="bold">
      Title
    </ThemedText>
  </ThemedCard>
</ThemedScreen>
```

---

## Themes Reference

### Light Theme
- Background: `#F8FAFC`
- Surface: `#FFFFFF`
- Accent: `#3B82F6` (Blue)
- Best for: Daytime use, well-lit environments

### Dark Theme
- Background: `#0F172A`
- Surface: `#1E293B`
- Accent: `#3B82F6` (Blue)
- Best for: Night use, reduces eye strain

### Premium Theme
- Background: `#0A0A0F`
- Surface: `#1A1A25`
- Accent: `#8B5CF6` (Purple)
- Best for: Premium feel, professional appearance

### Ocean Theme
- Background: `#0C1929`
- Surface: `#132337`
- Accent: `#06B6D4` (Cyan)
- Best for: Calm, focused work sessions

### Sunset Theme
- Background: `#1A0F0F`
- Surface: `#2A1515`
- Accent: `#F97316` (Orange)
- Best for: Warm aesthetic, evening use

### High Contrast Theme
- Background: `#000000`
- Surface: `#1A1A1A`
- Accent: `#FFFFFF` (White)
- Best for: Accessibility, visual impairment support

---

## Patterns Reference

| Pattern | Description |
|---------|-------------|
| None | No pattern, solid background |
| Dots | Grid of small circles |
| Grid | Horizontal and vertical lines |
| Waves | Sine wave curves |
| Aurora | Gradient aurora effect |
| Mesh | Diagonal crossing lines |
| Circuit | Electronic circuit-like pattern |
| Hexagon | Honeycomb hexagonal grid |

---

## Layout Arrangements

| Layout | Spacing | Best For |
|--------|---------|----------|
| Default | 16px | General use |
| Compact | 12px | Small screens, dense info |
| Spacious | 24px | Tablets, relaxed viewing |
| Cards | 16px | Card-based layouts |
| List | 16px | List views |
| Grid | 12px | Grid layouts |

---

## Integration Guide

### 1. App Entry Point

The `ThemeProvider` is already wrapped in `_layout.tsx`:

```tsx
<ThemeProvider>
  <UnistylesThemeProvider>
    <ToastProvider>
      {/* App content */}
    </ToastProvider>
  </UnistylesThemeProvider>
</ThemeProvider>
```

### 2. Using Theme in Components

```tsx
import { useThemeContext } from '../theme/ThemeContext';

function MyComponent() {
  const { theme, themeKey, pattern, layout } = useThemeContext();
  
  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text }}>
        Current theme: {themeKey}
      </Text>
    </View>
  );
}
```

### 3. Creating Themed Screens

```tsx
import { ThemedScreen, ThemedCard, ThemedText } from '../components/ui';

export default function MyScreen() {
  return (
    <ThemedScreen showPattern={true}>
      <ThemedCard variant="elevated">
        <ThemedText variant="heading" size="2xl" weight="bold">
          Welcome
        </ThemedText>
        <ThemedText color="secondary">
          This is a themed screen with pattern background
        </ThemedText>
      </ThemedCard>
    </ThemedScreen>
  );
}
```

### 4. Navigation to Appearance Settings

Staff and Supervisor roles can access appearance settings:

```tsx
// For Staff
router.push("/staff/appearance");

// For Supervisor
router.push("/supervisor/appearance");
```

---

## Storage & Persistence

Settings are persisted using MMKV storage:

- `@stockverify/theme-key`: Selected theme
- `@stockverify/theme-mode`: Theme mode (light/dark/system)
- `@stockverify/pattern`: Selected pattern
- `@stockverify/layout`: Layout arrangement

---

## Best Practices

1. **Always use `useThemeContext`** for theme colors instead of hardcoded values
2. **Prefer `ThemedScreen`** as a wrapper for new screens
3. **Use `ThemedCard`** for consistent card styling
4. **Apply patterns sparingly** - use low opacity (0.02-0.05)
5. **Test all themes** when adding new UI elements
6. **Consider accessibility** - High Contrast theme support

---

## File Structure

```
frontend/src/
├── theme/
│   ├── index.ts              # Exports all theme modules
│   ├── ThemeContext.tsx      # Theme provider & context
│   ├── themes.ts             # Theme definitions
│   ├── auroraTheme.ts        # Aurora design tokens
│   └── ...
├── components/ui/
│   ├── PatternBackground.tsx # Pattern rendering
│   ├── ThemePicker.tsx       # Theme selection UI
│   ├── PatternPicker.tsx     # Pattern selection UI
│   ├── LayoutPicker.tsx      # Layout selection UI
│   ├── AppearanceSettings.tsx# Combined settings
│   ├── ThemedScreen.tsx      # Screen wrapper
│   └── index.ts              # Component exports
└── app/
    ├── staff/
    │   └── appearance.tsx    # Staff appearance screen
    └── supervisor/
        └── appearance.tsx    # Supervisor appearance screen
```

---

## Dependencies

- `react-native-svg`: SVG pattern rendering
- `react-native-reanimated`: Smooth animations
- `react-native-mmkv`: Fast persistent storage
- `expo-haptics`: Haptic feedback on selection
- `expo-linear-gradient`: Gradient effects

---

## Version History

- **v2.0** (Current): Full theme system with patterns and layouts
- **v1.0**: Basic light/dark mode support
