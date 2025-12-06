# Unused Code and Files Report

## 1. Redundant Files
The following files appear to be redundant or obsolete versions of other files:

- **`admin-panel/server.py`**: This appears to be an older/simpler version of `admin-panel/enhanced-server.py`. The enhanced version includes additional features like analytics, SQL testing, and better security.
  - Recommendation: Verify if `enhanced-server.py` is the active server. If so, `server.py` can be removed or archived.

## 2. Frontend Unused Code (Linting Warnings)
The following unused variables and imports were detected in the `backfron/` directory:

### Unused Imports
| File | Unused Imports |
|------|----------------|
| `app/staff/scan.tsx` | `View`, `Text`, `TouchableOpacity`, `StyleSheet`, `Alert`, `ActivityIndicator`, `Platform`, `StatusBar`, `SafeAreaView` (Duplicate imports or unused) |
| `src/components/SyncStatusBadge.tsx` | `View`, `TouchableOpacity`, `SlideInDown` |
| `src/components/enhanced/EnhancedCard.tsx` | `View`, `Text`, `TextStyle` |
| `src/components/enhanced/FloatingLabelInput.tsx` | `useRef`, `View`, `Text`, `modernShadows` |
| `src/components/enhanced/LoadingSpinner.tsx` | `View`, `modernSpacing` |
| `src/components/enhanced/RippleButton.tsx` | `useRef`, `Text`, `View`, `withSpring`, `runOnJS`, `modernAnimations`, `springPresets`, `timingPresets` |
| `src/components/enhanced/SuccessAnimation.tsx` | `View`, `withSequence`, `modernShadows` |
| `src/components/modals/PhotoCaptureModal.tsx` | `modernBorderRadius` |
| `src/components/quality-control/QualityInspectionWizard.tsx` | `useEffect`, `Platform`, `LoadingSpinner` |
| `src/screens/staff/bin-summary.tsx` | `View`, `ScrollView`, `EnhancedCard` |
| `src/screens/staff/item-entry.tsx` | `View`, `TouchableOpacity`, `SlideInDown` |
| `src/screens/staff/scan-home.tsx` | `View`, `ScrollView`, `TextInput`, `TouchableOpacity`, `EnhancedCard` |
| `src/services/batchOperationsService.ts` | `useAuthStore` |

### Unused Variables
| File | Variable |
|------|----------|
| `app/staff/scan.tsx` | `isCorrectionEnabled` |
| `app/supervisor/sync-conflicts.tsx` | `layout`, `spacing`, `typography`, `borderRadius`, `error` |
| `src/components/enhanced/EnhancedCard.tsx` | `opacity` (missing dependency) |
| `src/components/quality-control/QualityInspectionWizard.tsx` | `setPhotos`, `response` |
| `src/screens/staff/scan-home.tsx` | `theme`, `setItems`, `setLoading` |

## 3. Backend Unused Code
- **Status**: Clean. No unused imports or variables detected by `ruff`.

## 4. Recommendations
1.  **Frontend**: Run `npm run lint -- --fix` in `backfron/` to automatically remove some unused imports. Manually remove the rest.
2.  **Admin Panel**: Confirm `enhanced-server.py` is the intended server and delete `server.py`.
