import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  modernColors,
  modernSpacing,
  modernBorderRadius,
} from "@/styles/modernDesignSystem";
import {
  SuggestionItem,
  smartSuggestionsService,
} from "@/domains/inventory/services/smartSuggestionsService";
import * as Haptics from "expo-haptics";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SmartSuggestionsPanelProps {
  suggestions: SuggestionItem[];
  onSuggestionPress: (suggestion: SuggestionItem) => void;
  onDismiss?: () => void;
  visible?: boolean;
  position?: "top" | "bottom" | "center";
  maxHeight?: number;
}

export const SmartSuggestionsPanel: React.FC<SmartSuggestionsPanelProps> = ({
  suggestions,
  onSuggestionPress,
  onDismiss,
  visible = true,
  position = "top",
  maxHeight = 200,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [displayedSuggestions, setDisplayedSuggestions] = useState<
    SuggestionItem[]
  >([]);

  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  // Show/hide animations
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnimation, slideAnimation]);

  // Rotation animation for expand/collapse
  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;
    Animated.timing(rotateAnimation, {
      toValue,
      duration: 200,
      useNativeDriver: true,
    }).start();

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderQuickActions = (suggestion: SuggestionItem) => {
    if (suggestion.type !== "quantity") return null;

    return (
      <View style={styles.quickActions}>
        {[1, 5, 10].map((qty) => (
          <TouchableOpacity
            key={qty}
            style={styles.quickActionButton}
            onPress={() => {
              const suggestionWithQty = {
                ...suggestion,
                data: { ...suggestion.data, quantity: qty },
              };
              onSuggestionPress(suggestionWithQty);
            }}
          >
            <Text style={styles.quickActionText}>{qty}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Display suggestions with animation
  useEffect(() => {
    if (expanded) {
      const initialSuggestions = suggestions.slice(0, 3);
      setDisplayedSuggestions(initialSuggestions);

      // Stagger animation for suggestions
      initialSuggestions.forEach((_, index) => {
        setTimeout(() => {
          setDisplayedSuggestions((prev) => {
            const newSuggestion = suggestions[index];
            if (newSuggestion && !prev.find((s) => s.id === newSuggestion.id)) {
              return [...prev, newSuggestion];
            }
            return prev;
          });
        }, index * 100);
      });
    } else {
      setDisplayedSuggestions([]);
    }
  }, [suggestions, expanded]); // Get icon color based on suggestion type
  const getIconColor = (type: string) => {
    switch (type) {
      case "quantity":
        return modernColors.primary[500];
      case "location":
        return modernColors.success.main;
      case "reason":
        return modernColors.warning.main;
      case "action":
        return modernColors.info.main;
      case "photo":
        return modernColors.secondary[500];
      case "workflow":
        return modernColors.accent[500];
      default:
        return modernColors.text.secondary;
    }
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return modernColors.success.main;
    if (confidence >= 0.6) return modernColors.warning.main;
    return modernColors.text.tertiary;
  };

  // Calculate position for slide animation
  const slidePosition = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [position === "top" ? -100 : 100, 0],
  });

  // Rotation for expand/collapse icon
  const rotateStyle = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnimation,
          transform: [{ translateY: slidePosition }],
          [position === "top" ? "top" : "bottom"]: 0,
        },
      ]}
    >
      <View
        style={[
          styles.panel,
          {
            [position === "top" ? "borderBottomColor" : "borderTopColor"]:
              modernColors.border.light,
          },
        ]}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.header}
          onPress={toggleExpanded}
          activeOpacity={0.7}
        >
          <View style={styles.headerLeft}>
            <Ionicons
              name="bulb-outline"
              size={20}
              color={modernColors.primary[500]}
            />
            <Text style={styles.headerTitle}>Smart Suggestions</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{suggestions.length}</Text>
            </View>
          </View>

          <Animated.View style={{ transform: [{ rotate: rotateStyle }] }}>
            <Ionicons
              name="chevron-down"
              size={20}
              color={modernColors.text.secondary}
            />
          </Animated.View>
        </TouchableOpacity>

        {/* Suggestions List */}
        {expanded && (
          <ScrollView
            style={[styles.suggestionsList, { maxHeight }]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {displayedSuggestions.map(
              (suggestion: SuggestionItem, index: number) => (
                <Animated.View
                  key={suggestion.id}
                  style={[
                    styles.suggestionItem,
                    {
                      opacity:
                        displayedSuggestions.length > index ? fadeAnimation : 0,
                      transform: [
                        {
                          translateY:
                            displayedSuggestions.length > index
                              ? fadeAnimation.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [20, 0],
                                })
                              : 0,
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.suggestionButton}
                    onPress={() => {
                      // Add haptic feedback
                      try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } catch {
                        // Haptics not available
                      }

                      // Track interaction
                      smartSuggestionsService.trackSuggestionInteraction(
                        suggestion.id,
                        "clicked",
                      );

                      onSuggestionPress(suggestion);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.suggestionContent}>
                      <View style={styles.suggestionIcon}>
                        <Ionicons
                          name={suggestion.icon as any}
                          size={18}
                          color={getIconColor(suggestion.type)}
                        />
                        <View
                          style={[
                            styles.confidenceDot,
                            {
                              backgroundColor: getConfidenceColor(
                                suggestion.confidence,
                              ),
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.suggestionText}>
                        <Text style={styles.suggestionTitle}>
                          {suggestion.title}
                        </Text>
                        {suggestion.subtitle && (
                          <Text style={styles.suggestionSubtitle}>
                            {suggestion.subtitle}
                          </Text>
                        )}
                      </View>

                      <View style={styles.suggestionAction}>
                        <View
                          style={[
                            styles.confidenceBar,
                            {
                              width: `${suggestion.confidence * 100}%`,
                              backgroundColor: getConfidenceColor(
                                suggestion.confidence,
                              ),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Quick Actions */}
                  {renderQuickActions(suggestion) as any}

                  {suggestion.type === "location" && suggestion.data.rack && (
                    <View style={styles.locationChip}>
                      <Ionicons
                        name="location"
                        size={12}
                        color={modernColors.success.main}
                      />
                      <Text style={styles.locationText}>
                        {String(suggestion.data.floor || "")} -{" "}
                        {String(suggestion.data.rack || "")}
                      </Text>
                    </View>
                  )}
                </Animated.View>
              ),
            )}

            {/* Show More Button */}
            {suggestions.length > 3 && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAll(!showAll)}
              >
                <Ionicons
                  name={showAll ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={modernColors.primary[500]}
                />
                <Text style={styles.showMoreText}>
                  {showAll
                    ? "Show Less"
                    : `Show ${suggestions.length - 3} More`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Dismiss Button */}
            {onDismiss && (
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => {
                  smartSuggestionsService.trackSuggestionInteraction(
                    "panel_dismissed",
                    "dismissed",
                  );
                  onDismiss();
                }}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={16}
                  color={modernColors.text.tertiary}
                />
                <Text style={styles.dismissText}>Dismiss Suggestions</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  panel: {
    backgroundColor: modernColors.background.paper,
    marginHorizontal: modernSpacing.md,
    marginVertical: modernSpacing.sm,
    borderRadius: modernBorderRadius.lg,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: modernSpacing.md,
    backgroundColor: modernColors.background.elevated,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: modernColors.text.primary,
    marginLeft: modernSpacing.sm,
    flex: 1,
  },
  badge: {
    backgroundColor: modernColors.primary[100],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: modernColors.primary[600],
  },
  suggestionsList: {
    paddingHorizontal: modernSpacing.md,
    paddingVertical: modernSpacing.sm,
  },
  suggestionItem: {
    marginBottom: modernSpacing.sm,
  },
  suggestionButton: {
    backgroundColor: modernColors.background.default,
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  suggestionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  suggestionIcon: {
    position: "relative",
    marginRight: modernSpacing.md,
  },
  confidenceDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: modernColors.text.primary,
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: modernColors.text.secondary,
  },
  suggestionAction: {
    marginLeft: modernSpacing.sm,
  },
  confidenceBar: {
    height: 3,
    borderRadius: 2,
    minWidth: 30,
  },
  quickActions: {
    flexDirection: "row",
    marginTop: modernSpacing.sm,
    paddingLeft: modernSpacing.md + 26, // Icon width + margin
  },
  quickActionButton: {
    backgroundColor: modernColors.primary[50],
    borderRadius: modernBorderRadius.sm,
    paddingHorizontal: modernSpacing.sm,
    paddingVertical: 4,
    marginRight: modernSpacing.xs,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: modernColors.primary[600],
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: modernColors.success.light + "20",
    borderRadius: modernBorderRadius.sm,
    paddingHorizontal: modernSpacing.sm,
    paddingVertical: 4,
    marginTop: modernSpacing.sm,
    marginLeft: modernSpacing.md + 26,
  },
  locationText: {
    fontSize: 12,
    color: modernColors.success.main,
    fontWeight: "500",
    marginLeft: 4,
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: modernSpacing.sm,
    marginTop: modernSpacing.sm,
  },
  showMoreText: {
    fontSize: 14,
    color: modernColors.primary[500],
    fontWeight: "500",
    marginLeft: 4,
  },
  dismissButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: modernSpacing.sm,
    marginTop: modernSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: modernColors.border.light,
  },
  dismissText: {
    fontSize: 13,
    color: modernColors.text.tertiary,
    marginLeft: 4,
  },
});
