# Theme System Audit Report

**Generated**: 2025-01-22
**Task**: T001 - Audit existing theme files and document current state

---

## 1. Current Theme Files Inventory

### 1.1 Legacy Theme Files (DEPRECATED)

| File                | Lines | Status        | Purpose                                        |
| ------------------- | ----- | ------------- | ---------------------------------------------- |
| `auroraTheme.ts`    | 488   | ⛔ DEPRECATED | Aurora gradients, glassmorphism, color palette |
| `designSystem.ts`   | 173   | ⛔ DEPRECATED | Premium theme colors, typography, spacing      |
| `themes.ts`         | 766   | ⛔ DEPRECATED | Multiple theme variants, AppTheme type         |
| `designTokens.ts`   | ~100  | ⛔ DEPRECATED | Basic design tokens                            |
| `enhancedColors.ts` | ~50   | ⛔ DEPRECATED | Additional color palette                       |
| `typography.ts`     | ~80   | ⛔ DEPRECATED | Typography definitions                         |
| `uiConstants.ts`    | ~50   | ⛔ DEPRECATED | UI constants and sizing                        |

**Total Legacy Lines**: ~1,707 lines across 7 files

### 1.2 Unified Theme System (ACTIVE)

| File                             | Lines | Status    | Purpose                                     |
| -------------------------------- | ----- | --------- | ------------------------------------------- |
| `unified/colors.ts`              | 207   | ✅ ACTIVE | Complete color palette with semantic tokens |
| `unified/spacing.ts`             | 87    | ✅ ACTIVE | 4px base unit, touch targets, hitSlop       |
| `unified/typography.ts`          | 204   | ✅ ACTIVE | Platform-aware fonts, text styles           |
| `unified/radius.ts`              | 48    | ✅ ACTIVE | Border radius scale                         |
| `unified/shadows.ts`             | 89    | ✅ ACTIVE | Shadow/elevation system                     |
| `unified/animations.ts`          | 176   | ✅ ACTIVE | Duration, easing, spring configs            |
| `unified/index.ts`               | 108   | ✅ ACTIVE | Unified exports                             |
| `unified/MIGRATION_EXAMPLES.tsx` | ~150  | ✅ ACTIVE | Migration guide                             |

**Total Unified Lines**: ~1,069 lines across 8 files

---

## 2. Design Token Coverage Analysis

### 2.1 Colors

| Token Category           | Legacy  | Unified | Status     |
| ------------------------ | ------- | ------- | ---------- |
| Primary palette (50-900) | ✅      | ✅      | ✓ Migrated |
| Secondary palette        | ✅      | ✅      | ✓ Migrated |
| Success/Warning/Error    | ✅      | ✅      | ✓ Migrated |
| Semantic colors          | ❌      | ✅      | ✓ New      |
| Dark mode colors         | Partial | ✅      | ✓ Enhanced |
| Gradients                | ✅      | ✅      | ✓ Migrated |

### 2.2 Spacing

| Token Category        | Legacy  | Unified | Status     |
| --------------------- | ------- | ------- | ---------- |
| Base unit (4px)       | ❌      | ✅      | ✓ New      |
| Spacing scale         | Partial | ✅      | ✓ Enhanced |
| Touch targets (44/48) | ❌      | ✅      | ✓ New      |
| hitSlop presets       | ❌      | ✅      | ✓ New      |
| Layout constants      | Partial | ✅      | ✓ Enhanced |

### 2.3 Typography

| Token Category  | Legacy | Unified | Status     |
| --------------- | ------ | ------- | ---------- |
| Font family     | ✅     | ✅      | ✓ Migrated |
| Font sizes      | ✅     | ✅      | ✓ Migrated |
| Font weights    | ✅     | ✅      | ✓ Migrated |
| Line heights    | ❌     | ✅      | ✓ New      |
| Letter spacing  | ❌     | ✅      | ✓ New      |
| Platform.select | ❌     | ✅      | ✓ New      |

### 2.4 Other Tokens

| Token Category     | Legacy  | Unified | Status     |
| ------------------ | ------- | ------- | ---------- |
| Border radius      | Partial | ✅      | ✓ Enhanced |
| Shadows            | ✅      | ✅      | ✓ Migrated |
| Animation duration | ❌      | ✅      | ✓ New      |
| Easing curves      | ❌      | ✅      | ✓ New      |
| Spring configs     | ❌      | ✅      | ✓ New      |
| Z-index scale      | ❌      | ✅      | ✓ New      |
| Opacity scale      | ❌      | ✅      | ✓ New      |

---

## 3. Usage Analysis

### 3.1 Files Still Using Legacy Themes

**Priority to Migrate:**

- `app/welcome.tsx` - Uses both legacy `globalStyles` AND unified tokens
- `app/login.tsx` - Uses legacy component styles
- `app/staff/index.tsx` - Uses legacy theme
- `app/staff/scan.tsx` - Uses legacy theme
- `app/supervisor/*.tsx` - Uses legacy theme
- `app/admin/*.tsx` - Uses legacy theme

### 3.2 Files Already Using Unified Theme

- `src/theme/unified/*` - All unified token files
- `src/components/ui/TouchableFeedback.tsx` - Uses unified tokens
- `src/components/ui/AnimatedCard.tsx` - Uses unified tokens
- `src/hooks/useAnimations.ts` - Uses unified tokens

---

## 4. Migration Status

| Phase                 | Description                            | Status         |
| --------------------- | -------------------------------------- | -------------- |
| 1. Token Definition   | Define all unified tokens              | ✅ COMPLETE    |
| 2. Core Components    | Create TouchableFeedback, AnimatedCard | ✅ COMPLETE    |
| 3. Screen Migration   | Migrate all screens to unified tokens  | 🔄 IN PROGRESS |
| 4. Legacy Deprecation | Remove legacy theme files              | ⏳ PENDING     |

---

## 5. Recommendations

### 5.1 Immediate Actions

1. ✅ Unified token system is complete
2. ⏳ Create ThemeProvider context for runtime theme switching
3. ⏳ Add ThemedText and ThemedView components
4. ⏳ Migrate all screen files to unified tokens

### 5.2 Migration Order (Priority)

1. `login.tsx` - Entry point, high visibility
2. `staff/scan.tsx` - Core staff workflow
3. `staff/index.tsx` - Staff home
4. `supervisor/index.tsx` - Supervisor dashboard
5. `admin/index.tsx` - Admin panel
6. All remaining screens

### 5.3 Deprecation Timeline

- Phase 1 (Now): Stop using legacy files in new code
- Phase 2 (After migration): Add deprecation comments to legacy files
- Phase 3 (Post-release): Remove legacy files completely

---

## 6. Hardcoded Color Audit

**Files with hardcoded colors to fix:**

- Multiple files with `#1E88E5`, `#00796B`, `#FF5252`, etc.
- See task T090 for comprehensive color migration

---

**Audit Complete**: Ready to proceed with Phase 2 (Foundational) tasks.
