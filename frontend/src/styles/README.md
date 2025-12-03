# Styles Directory

This directory contains global styles and design tokens for the Stock Verification app.

## Files

### `globalStyles.ts`

Global design system including:

- **Color palette**: Consistent colors across the app
- **Typography**: Font sizes and weights
- **Spacing**: Standardized margins and padding
- **Border radius**: Consistent corner rounding
- **Shadows**: Elevation styles for iOS and Android
- **Common styles**: Reusable component styles

## Usage

Import the styles in your components:

```typescript
import { colors, spacing, typography, commonStyles } from '../styles/globalStyles';

// Use colors
backgroundColor: colors.primary

// Use spacing
padding: spacing.md

// Use typography
...typography.h1

// Use common styles
style={commonStyles.button}
```

## Design Tokens

### Colors

- Primary: #4CAF50 (Green)
- Background Dark: #1a1a1a
- Background Light: #2a2a2a
- Text Primary: #ffffff
- Text Secondary: #cccccc

### Spacing Scale

- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

### Typography Scale

- h1: 32px bold
- h2: 28px bold
- h3: 24px semibold
- h4: 20px semibold
- body: 16px normal
- caption: 12px normal

## Best Practices

1. **Use design tokens** instead of hardcoded values
2. **Reuse common styles** to maintain consistency
3. **Follow the spacing scale** for margins and padding
4. **Use semantic color names** (e.g., `colors.error` instead of `#FF5252`)
5. **Maintain the dark theme** aesthetic throughout the app
