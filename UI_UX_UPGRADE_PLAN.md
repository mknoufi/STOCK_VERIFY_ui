# STOCK_VERIFY UI/UX Alignment & Standardization Plan

## Objective

To create a premium, consistent, and standardized UI/UX across the Stock Verification Application by consolidating the multiple existing design systems into a single "Aurora Premium" system.

## 1. Design System Consolidation

Currently, the codebase has three competing styles: `globalStyles.ts`, `modernDesignSystem.ts`, and `auroraTheme.ts`.

**Action Items:**

- [ ] **Unified Master Theme**: Promote `auroraTheme.ts` to the master design system.
- [ ] **Token Mapping**: Ensure all semantic tokens (Primary, Secondary, Success, Warning, Error) are consistent.
- [ ] **Backward Compatibility**: Refactor `globalStyles.ts` to reference `auroraTheme` tokens where possible to prevent breaking legacy screens while they await upgrade.

## 2. Component Standardization

Ensure all functional screens use the same set of "Premium" components.

**Action Items:**

- [ ] **Refactor Premium Components**:
  - `PremiumButton`: Support Aurora gradients and glassmorphism.
  - `PremiumInput`: Standardized focus states, error states, and icon support.
  - `PremiumCard`: Built-in glassmorphism and shadow support via `auroraTheme`.
- [ ] **New Utility Components**:
  - `PremiumHeader`: Unified navigation header with backdrop blur.
  - `PremiumLoading`: Themed skeleton screens and activity indicators.
  - `StatusPill`: Standardized indicators for sync status, item status, etc.

## 3. Screen Migration Roadmap

Priority list for upgrading screens to the Full Aurora Premium experience:

| Priority | Screen | Current State | Target |
| :--- | :--- | :--- | :--- |
| **P0** | **Login (index.tsx)** | Mixed Styles | Full Aurora + Glassmorphism |
| **P0** | **Home (staff/home.tsx)** | Modern System | Full Aurora Dashboard |
| **P0** | **Scan (staff/scan.tsx)** | **Partial Aurora** | Polish & Finalize |
| **P1** | **Item Detail (staff/item-detail.tsx)** | Modern System | Full Aurora Integration |
| **P1** | **Inventory List** | Legacy Styles | Premium List with Skeletons |
| **P2** | **Settings / Profile** | Legacy Styles | Semi-Glassmorphism |

## 4. UX Standardizations

- **Haptic Feedback**: Standardize `ImpactFeedbackStyle.Light` for buttons and `NotificationFeedbackType.Success` for successful scans/saves.
- **Micro-animations**: Use `react-native-reanimated` for all layout transitions.
- **Loading States**: Replace full-screen spinners with inline skeleton loaders where possible.
- **Error Handling**: Standardized "Premium Alert" or Toast notifications instead of native alerts for better immersion.

## 5. Implementation Steps (Immediate)

1. **Sync `auroraTheme.ts` and `modernDesignSystem.ts`** to ensure we don't lose any functionality during transition.
2. **Upgrade `PremiumButton` and `PremiumInput`** to be theme-aware.
3. **Apply Upgrade to `staff/home.tsx`** as a flagship example of the new system.
