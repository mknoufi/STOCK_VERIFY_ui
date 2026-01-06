/**
 * UI Components Index
 * Export all UI components from a single location
 */

export { Modal } from "./Modal";
export { SafeView } from "./SafeView";
export * from "./Skeleton";
export * from "./GlassCard";
export { EmptyState } from "./EmptyState";
export { LoadingSpinner } from "./LoadingSpinner";
export { ModernCard } from "./ModernCard";
export { ModernButton } from "./ModernButton";
export { ModernInput } from "./ModernInput";
export { ModernHeader } from "./ModernHeader";

// Premium UI Components
export { PremiumHeader } from "./PremiumHeader";
export { ScreenHeader } from "./ScreenHeader";
export type { ScreenHeaderProps } from "./ScreenHeader";
export { StatusBadge } from "./StatusBadge";
export { SessionCard } from "./SessionCard";
export { QuickStatCard } from "./QuickStatCard";
export { FloatingActionButton } from "./FloatingActionButton";
export { default as OnlineStatus } from "./OnlineStatus";

// Animation Components
export { AnimatedPressable, AnimatedCard } from "./AnimatedPressable";
export { FadeIn, StaggeredFadeIn } from "./FadeIn";
export { AnimatedInput } from "./AnimatedInput";
export { SuccessFeedback, ToastFeedback } from "./SuccessFeedback";
export { SkeletonList, SkeletonGrid, SkeletonScreen } from "./SkeletonList";

// Aurora Design System Components (v2.0)
export { AuroraBackground } from "./AuroraBackground";
export { FloatingScanButton } from "./FloatingScanButton";

// Enhanced UI/UX Components (v2.1)
export { AnimatedCounter } from "./AnimatedCounter";
export { Shimmer, ShimmerPlaceholder } from "./Shimmer";
export { ParticleField } from "./ParticleField";
export { RippleButton } from "./RippleButton";
export { SwipeCard } from "./SwipeCard";
export { ScanFeedback } from "./ScanFeedback";
export * from "./SyncStatusPill";
export type { ScanFeedbackType } from "./ScanFeedback";
export { EnhancedBottomSheet } from "./EnhancedBottomSheet";

// Phase 4: Supervisor Dashboard Components
export { StatsCard } from "./StatsCard";
export { SpeedDialMenu } from "./SpeedDialMenu";
export type { SpeedDialAction } from "./SpeedDialMenu";
export { LiveIndicator } from "./LiveIndicator";

// ==========================================
// Unified Design System Components (v3.0)
// ==========================================
export {
  TouchableFeedback,
  TouchableScale,
  TouchableHighlight,
  type TouchableFeedbackProps,
} from "./TouchableFeedback";

export {
  AnimatedCard as UnifiedAnimatedCard,
  StatsCardPreset,
  type AnimatedCardProps,
  type CardVariant,
} from "./AnimatedCard";
export { ActivityFeedItem } from "./ActivityFeedItem";
export type { ActivityType } from "./ActivityFeedItem";
export { ProgressRing } from "./ProgressRing";

// Phase 2: New Design System Components
export { Badge } from "./Badge";
export { Chip } from "./Chip";
export { Avatar } from "./Avatar";
export { Toast } from "./Toast";
export { ProgressBar } from "./ProgressBar";
export { Switch } from "./Switch";
export { Tabs } from "./Tabs";
export { Accordion } from "./Accordion";
export { Radio } from "./Radio";
export { Checkbox } from "./Checkbox";

// Theme & Appearance Components
export { PatternBackground } from "./PatternBackground";
export { ThemePicker } from "./ThemePicker";
export { PatternPicker } from "./PatternPicker";
export { LayoutPicker } from "./LayoutPicker";
export { AppearanceSettings } from "./AppearanceSettings";
export { ThemedScreen, ThemedCard, ThemedText } from "./ThemedScreen";

// Unified Screen Layout
export { ScreenContainer } from "./ScreenContainer";
export type { ScreenContainerProps } from "./ScreenContainer";

// Responsive Typography
export { ResponsiveText } from "./ResponsiveText";
export type { ResponsiveTextProps, TextVariant } from "./ResponsiveText";

// Enhanced UI/UX Components (v3.0 - Best Practices Design Kit)
export { MyPressable, PressablePresets } from "./MyPressable";
export type { MyPressableProps } from "./MyPressable";
export { EnhancedButton } from "./EnhancedButton";
export type {
  EnhancedButtonProps,
  ButtonType,
  ButtonSize,
  IconPosition,
} from "./EnhancedButton";
export { Separator, SeparatorPresets } from "./Separator";
export type { SeparatorProps, SeparatorOrientation } from "./Separator";
export { AnimatedListItem, ListAnimationPresets } from "./AnimatedListItem";
export type { AnimatedListItemProps } from "./AnimatedListItem";
export { EnhancedInput } from "./EnhancedInput";
export type {
  EnhancedInputProps,
  InputSize,
  LabelPosition,
} from "./EnhancedInput";

// Unified Design System Components (v3.0 - Token-based)
export { UnifiedText } from "./UnifiedText";
export type {
  UnifiedTextProps,
  TextVariant as UnifiedTextVariant,
  TextColor as UnifiedTextColor,
} from "./UnifiedText";
export { UnifiedView } from "./UnifiedView";
export type {
  UnifiedViewProps,
  BackgroundColor as UnifiedBackgroundColor,
} from "./UnifiedView";
