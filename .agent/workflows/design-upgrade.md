---
description: How to apply the new premium design system to screens
---

# Premium Dark Theme Upgrade Workflow

This workflow describes how to upgrade a screen to the new premium dark theme.

## 1. Check for `globalStyles` usage
- Ensure the file imports `colors`, `spacing`, `borderRadius`, `typography` from `../../styles/globalStyles`.
- If the component uses `useTheme`, ensure it's pulling from the updated `themeService`.

## 2. Update Hardcoded Colors
Replace hardcoded colors with the following premium theme values:

| Element | Old Color | New Premium Color |
| :--- | :--- | :--- |
| **Background** | `#1a1a1a`, `#000` | `#121212` (Deep Black) |
| **Surface/Card** | `#2a2a2a`, `#333` | `#1E1E1E` (Dark Grey) |
| **Primary/Action** | `#4CAF50` (Green) | `#00E676` (Vibrant Green) |
| **Secondary** | `#2196F3` (Blue) | `#2196F3` (Keep or brighten) |
| **Error/Danger** | `#F44336`, `#FF5252` | `#FF5252` (Vibrant Red) |
| **Warning** | `#FF9800` | `#FFC107` (Amber) |
| **Border** | `#333`, `#444` | `#333333` |

## 3. Enhance Shadows and Borders
- Increase `borderRadius` for cards and buttons (e.g., `12` -> `16` or `20`).
- Add softer, deeper shadows to cards and headers:
  ```javascript
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 4,
  ```

## 4. Update Gradients
- If using `LinearGradient`, update colors to: `['#121212', '#0A0A0A', '#000000']`.

## 5. Verify Consistency
- Ensure text colors are readable (`#FFFFFF` for primary text, `#B0B0B0` for secondary).
- Check that all interactive elements have proper feedback states.
