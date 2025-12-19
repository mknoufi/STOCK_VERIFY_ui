# UI/UX Component Migration Plan

## 🎯 Objective
Modernize the Stock Verify application's user interface by adopting industry-standard libraries for better performance, consistency, and visual appeal. This plan outlines the migration from custom/legacy implementations to robust community-maintained libraries.

## 📦 Core Library Recommendations

| Category       | Current Implementation                   | Recommended Library                                           | Benefit                                                   |
| -------------- | ---------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| **Charts**     | Custom / Unused `react-native-chart-kit` | **`react-native-svg-charts`**                                 | Better customization, SVG support, lighter weight.        |
| **Images**     | Mixed `Image` / `expo-image`             | **`expo-image`** (Standardize)                                | Best-in-class caching, performance, and blurhash support. |
| **Loading**    | `ActivityIndicator`                      | **`react-native-spinkit`** or **Lottie**                      | Professional, engaging loading states.                    |
| **Modals**     | Custom `Modal` views                     | **`react-native-modal`**                                      | Consistent animations, backdrop handling, and gestures.   |
| **Animations** | Basic `Animated` API                     | **`react-native-reanimated`** + **`react-native-animatable`** | 60fps native driver animations, declarative API.          |
| **UI Kit**     | Custom Styles                            | **`@rneui/themed`** (React Native Elements)                   | Consistent design system, pre-built components.           |

## 📅 Migration Phases

### Phase 1: Foundation & Dependencies (Week 1)
1.  **Install Core Libraries**:
    ```bash
    npm install react-native-svg react-native-svg-charts
    npm install react-native-animatable
    npm install react-native-modal
    npm install react-native-spinkit
    npm install @rneui/themed @rneui/base
    ```
2.  **Configure Theme**:
    *   Set up `ThemeProvider` from RNE or Unistyles to wrap the application.
    *   Define a consistent color palette and typography in the theme config.

### Phase 2: Component Replacement (Week 2-3)

#### 1. Standardize Images
**Target**: `frontend/src/components/ui/Avatar.tsx`, `PhotoCaptureModal.tsx`
*   **Action**: Replace `import { Image } from 'react-native'` with `import { Image } from 'expo-image'`.
*   **Code Example**:
    ```tsx
    import { Image } from 'expo-image';

    <Image
      source={uri}
      style={styles.avatar}
      contentFit="cover"
      transition={200} // Smooth fade in
      placeholder={blurhash} // Optional
    />
    ```

#### 2. Upgrade Loading States
**Target**: All `ActivityIndicator` usages (approx. 20 files).
*   **Action**: Replace with `SpinKit` or Lottie.
*   **Code Example**:
    ```tsx
    import Spinner from 'react-native-spinkit';

    <Spinner
      isVisible={isLoading}
      size={50}
      type="ThreeBounce"
      color={theme.colors.primary}
    />
    ```

#### 3. Modernize Modals
**Target**: `PinEntryModal.tsx`, `PhotoCaptureModal.tsx`.
*   **Action**: Wrap content in `react-native-modal` for better entrance/exit animations.
*   **Code Example**:
    ```tsx
    import Modal from 'react-native-modal';

    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={styles.content}>
        {/* Modal Content */}
      </View>
    </Modal>
    ```

### Phase 3: Advanced Visualization (Week 4)

#### 1. Implement Charts
**Target**: `VarianceChart.tsx`, Admin Dashboard.
*   **Action**: Implement `BarChart` or `LineChart` from `react-native-svg-charts`.
*   **Code Example**:
    ```tsx
    import { BarChart, Grid } from 'react-native-svg-charts';

    <BarChart
      style={{ height: 200 }}
      data={data}
      svg={{ fill: theme.colors.primary }}
      contentInset={{ top: 30, bottom: 30 }}
    >
      <Grid />
    </BarChart>
    ```

## ⚠️ Migration Checklist

- [ ] **Audit**: Verify all `ActivityIndicator` locations.
- [ ] **Theme**: Ensure new components inherit from `src/theme/designSystem.ts`.
- [ ] **Testing**: Test modals on both iOS and Android (modal behavior often differs).
- [ ] **Performance**: Check list scrolling performance after adding new image components.
- [ ] **Accessibility**: Ensure new components have `accessibilityLabel` and `accessibilityRole`.

## 🚀 Next Steps
1.  Approve this plan.
2.  Run the installation commands.
3.  Start with **Phase 1** (Images & Loading Indicators) as they offer the highest visual impact with lowest risk.
