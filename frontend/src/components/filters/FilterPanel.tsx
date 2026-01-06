/**
 * FilterPanel - Advanced filtering component for supervisor dashboards
 *
 * Provides unified filtering controls with:
 * - Date range selection
 * - Status/type filters
 * - Collapsible filter sections
 * - Animated reveal/hide
 *
 * @example
 * ```tsx
 * <FilterPanel
 *   visible={showFilters}
 *   onClose={() => setShowFilters(false)}
 *   onApply={(filters) => handleFilters(filters)}
 * />
 * ```
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  semanticColors,
  spacing,
  radius,
  shadows,
  textStyles,
} from "../../theme/unified";

/** Filter value types */
export interface FilterValues {
  dateRange?: { start: Date | null; end: Date | null };
  status?: string[];
  type?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  customFilters?: Record<string, unknown>;
}

/** Filter option definition */
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/** Filter section configuration */
export interface FilterSection {
  id: string;
  title: string;
  type: "checkbox" | "radio" | "date" | "range";
  options?: FilterOption[];
  defaultExpanded?: boolean;
}

export interface FilterPanelProps {
  /** Control visibility */
  visible: boolean;
  /** Close handler */
  onClose: () => void;
  /** Apply filters handler */
  onApply: (filters: FilterValues) => void;
  /** Reset filters handler */
  onReset?: () => void;
  /** Filter sections configuration */
  sections?: FilterSection[];
  /** Current filter values */
  initialValues?: FilterValues;
  /** Title for the panel */
  title?: string;
  /** Position of the panel */
  position?: "left" | "right";
}

const DEFAULT_SECTIONS: FilterSection[] = [
  {
    id: "status",
    title: "Status",
    type: "checkbox",
    options: [
      { value: "active", label: "Active" },
      { value: "completed", label: "Completed" },
      { value: "pending", label: "Pending" },
      { value: "cancelled", label: "Cancelled" },
    ],
    defaultExpanded: true,
  },
  {
    id: "type",
    title: "Type",
    type: "checkbox",
    options: [
      { value: "full", label: "Full Count" },
      { value: "partial", label: "Partial Count" },
      { value: "cycle", label: "Cycle Count" },
    ],
    defaultExpanded: true,
  },
];

export function FilterPanel({
  visible,
  onClose,
  onApply,
  onReset,
  sections = DEFAULT_SECTIONS,
  initialValues = {},
  title = "Filters",
  position = "right",
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(sections.filter((s) => s.defaultExpanded).map((s) => s.id)),
  );
  const [selectedValues, setSelectedValues] =
    useState<FilterValues>(initialValues);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const toggleCheckboxValue = useCallback(
    (sectionId: string, value: string) => {
      setSelectedValues((prev) => {
        const current =
          (prev[sectionId as keyof FilterValues] as string[]) || [];
        const newValues = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [sectionId]: newValues };
      });
    },
    [],
  );

  const handleApply = useCallback(() => {
    onApply(selectedValues);
    onClose();
  }, [selectedValues, onApply, onClose]);

  const handleReset = useCallback(() => {
    setSelectedValues({});
    onReset?.();
  }, [onReset]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (selectedValues.status?.length) count += selectedValues.status.length;
    if (selectedValues.type?.length) count += selectedValues.type.length;
    if (selectedValues.dateRange?.start || selectedValues.dateRange?.end)
      count += 1;
    return count;
  }, [selectedValues]);

  if (!visible) return null;

  const isExpanded = (sectionId: string) => expandedSections.has(sectionId);
  const isChecked = (sectionId: string, value: string) =>
    (
      (selectedValues[sectionId as keyof FilterValues] as string[]) || []
    ).includes(value);

  const slideAnim = position === "right" ? SlideInRight : SlideInRight;
  const slideOutAnim = position === "right" ? SlideOutRight : SlideOutRight;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          entering={slideAnim.duration(300)}
          exiting={slideOutAnim.duration(200)}
          style={[
            styles.panel,
            position === "right" ? styles.panelRight : styles.panelLeft,
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons
                name="filter-outline"
                size={22}
                color={semanticColors.text.primary}
              />
              <Text style={styles.title}>{title}</Text>
              {getActiveFilterCount() > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{getActiveFilterCount()}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="close"
                size={24}
                color={semanticColors.text.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* Filter Sections */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((section) => (
              <View key={section.id} style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => toggleSection(section.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Ionicons
                    name={
                      isExpanded(section.id) ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color={semanticColors.text.secondary}
                  />
                </TouchableOpacity>

                {isExpanded(section.id) && section.options && (
                  <View style={styles.optionsList}>
                    {section.options.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={styles.optionRow}
                        onPress={() =>
                          toggleCheckboxValue(section.id, option.value)
                        }
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            isChecked(section.id, option.value) &&
                              styles.checkboxChecked,
                          ]}
                        >
                          {isChecked(section.id, option.value) && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </View>
                        <Text style={styles.optionLabel}>{option.label}</Text>
                        {option.count !== undefined && (
                          <Text style={styles.optionCount}>
                            ({option.count})
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={semanticColors.text.secondary}
              />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Text style={styles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flexDirection: "row",
  },
  overlayTouchable: {
    flex: 1,
  },
  panel: {
    width: "85%",
    maxWidth: 360,
    backgroundColor: semanticColors.background.primary,
    ...shadows.lg,
  },
  panelRight: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
  },
  panelLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: semanticColors.border.default,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    ...textStyles.h3,
    color: semanticColors.text.primary,
  },
  badge: {
    backgroundColor: colors.primary[500],
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    minWidth: 22,
    alignItems: "center",
  },
  badgeText: {
    ...textStyles.caption,
    color: "#fff",
    fontWeight: "600",
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: semanticColors.background.secondary,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  sectionTitle: {
    ...textStyles.label,
    fontWeight: "600",
    color: semanticColors.text.primary,
  },
  optionsList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: semanticColors.border.default,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  optionLabel: {
    ...textStyles.body,
    color: semanticColors.text.primary,
    flex: 1,
  },
  optionCount: {
    ...textStyles.caption,
    color: semanticColors.text.tertiary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: semanticColors.border.default,
    gap: spacing.md,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  resetText: {
    ...textStyles.body,
    color: semanticColors.text.secondary,
  },
  applyButton: {
    flex: 1,
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    ...shadows.sm,
  },
  applyText: {
    ...textStyles.label,
    fontWeight: "600",
    color: "#fff",
  },
});

export default FilterPanel;
