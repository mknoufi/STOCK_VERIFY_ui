/**
 * Items Components Index
 * Reusable components for item detail and listing screens
 */

// Core item display components
export { ItemDetailCard } from "./ItemDetailCard";
export type { ItemData, ItemDetailCardProps } from "./ItemDetailCard";

// Stats display
export { ItemStatsRow, createVarianceStats, createStockStats, createSessionStats } from "./ItemStatsRow";
export type { StatItem, StatVariant, ItemStatsRowProps } from "./ItemStatsRow";

// Attributes section for data entry
export { ItemAttributesSection } from "./ItemAttributesSection";
export type {
  ConditionType,
  AttributeToggleState,
  AttributeValues,
  ItemAttributesSectionProps,
} from "./ItemAttributesSection";

// Quantity input with stepper
export { QuantityInput } from "./QuantityInput";
export type { QuantityInputProps } from "./QuantityInput";

// Actions footer
export { ItemActionsFooter } from "./ItemActionsFooter";
export type { ActionButton, ActionType, ItemActionsFooterProps } from "./ItemActionsFooter";

// Photo gallery
export { ItemPhotoGallery } from "./ItemPhotoGallery";
export type { PhotoItem, ItemPhotoGalleryProps } from "./ItemPhotoGallery";

// History timeline
export { ItemHistoryTimeline } from "./ItemHistoryTimeline";
export type { HistoryEvent, HistoryEventType, ItemHistoryTimelineProps } from "./ItemHistoryTimeline";

// Share/export sheet
export { ItemShareSheet } from "./ItemShareSheet";
export type { ItemShareData, ItemShareSheetProps } from "./ItemShareSheet";

// Quick actions FAB
export { ItemQuickActions, createItemQuickActions } from "./ItemQuickActions";
export type { QuickAction, ItemQuickActionsProps } from "./ItemQuickActions";

// Notes section
export { ItemNotesSection } from "./ItemNotesSection";
export type { Note, ItemNotesSectionProps } from "./ItemNotesSection";
