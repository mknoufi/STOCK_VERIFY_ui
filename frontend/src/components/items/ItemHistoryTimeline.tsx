/**
 * ItemHistoryTimeline Component
 * Display verification history and activity timeline for an item
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { GlassCard } from "../ui/GlassCard";
import { theme } from "../../styles/modernDesignSystem";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// Types
// ============================================================================

export type HistoryEventType =
  | "verified"
  | "counted"
  | "adjusted"
  | "created"
  | "approved"
  | "rejected"
  | "recounted"
  | "synced"
  | "note"
  | "photo"
  | "damage";

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  title: string;
  description?: string;
  user?: string;
  timestamp: Date | string;
  metadata?: Record<string, any>;
}

export interface ItemHistoryTimelineProps {
  events: HistoryEvent[];
  maxVisible?: number;
  showAllByDefault?: boolean;
  animationDelay?: number;
}

// ============================================================================
// Event Type Config
// ============================================================================

const EVENT_CONFIG: Record<
  HistoryEventType,
  { icon: string; color: string; bgColor: string }
> = {
  verified: {
    icon: "checkmark-circle",
    color: theme.colors.success.main,
    bgColor: theme.colors.success.main + "20",
  },
  counted: {
    icon: "calculator",
    color: theme.colors.primary[500],
    bgColor: theme.colors.primary[500] + "20",
  },
  adjusted: {
    icon: "swap-horizontal",
    color: theme.colors.warning.main,
    bgColor: theme.colors.warning.main + "20",
  },
  created: {
    icon: "add-circle",
    color: theme.colors.info.main,
    bgColor: theme.colors.info.main + "20",
  },
  approved: {
    icon: "thumbs-up",
    color: theme.colors.success.main,
    bgColor: theme.colors.success.main + "20",
  },
  rejected: {
    icon: "thumbs-down",
    color: theme.colors.error.main,
    bgColor: theme.colors.error.main + "20",
  },
  recounted: {
    icon: "refresh",
    color: theme.colors.warning.main,
    bgColor: theme.colors.warning.main + "20",
  },
  synced: {
    icon: "cloud-done",
    color: theme.colors.primary[500],
    bgColor: theme.colors.primary[500] + "20",
  },
  note: {
    icon: "chatbubble",
    color: theme.colors.neutral[500],
    bgColor: theme.colors.neutral[500] + "20",
  },
  photo: {
    icon: "camera",
    color: theme.colors.info.main,
    bgColor: theme.colors.info.main + "20",
  },
  damage: {
    icon: "warning",
    color: theme.colors.error.main,
    bgColor: theme.colors.error.main + "20",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// ============================================================================
// Timeline Event Component
// ============================================================================

interface TimelineEventProps {
  event: HistoryEvent;
  isLast: boolean;
  index: number;
}

const TimelineEvent: React.FC<TimelineEventProps> = ({ event, isLast, index }) => {
  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.note;

  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).duration(300)}
      style={styles.eventContainer}
    >
      {/* Timeline line */}
      {!isLast && <View style={styles.timelineLine} />}

      {/* Event icon */}
      <View style={[styles.eventIcon, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon as any} size={16} color={config.color} />
      </View>

      {/* Event content */}
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventTime}>{formatTimestamp(event.timestamp)}</Text>
        </View>

        {event.description && (
          <Text style={styles.eventDescription}>{event.description}</Text>
        )}

        {event.user && (
          <View style={styles.eventUser}>
            <Ionicons
              name="person"
              size={12}
              color={theme.colors.neutral[500]}
            />
            <Text style={styles.eventUserText}>{event.user}</Text>
          </View>
        )}

        {/* Metadata display */}
        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <View style={styles.metadataContainer}>
            {Object.entries(event.metadata).map(([key, value]) => (
              <View key={key} style={styles.metadataItem}>
                <Text style={styles.metadataKey}>{key}:</Text>
                <Text style={styles.metadataValue}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ItemHistoryTimeline: React.FC<ItemHistoryTimelineProps> = ({
  events,
  maxVisible = 3,
  showAllByDefault = false,
  animationDelay = 0,
}) => {
  const [expanded, setExpanded] = useState(showAllByDefault);

  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const visibleEvents = expanded ? sortedEvents : sortedEvents.slice(0, maxVisible);
  const hasMore = sortedEvents.length > maxVisible;

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  if (events.length === 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
      <GlassCard
        intensity={15}
        padding={theme.spacing.md}
        borderRadius={theme.borderRadius.lg}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="time"
              size={18}
              color={theme.colors.primary[500]}
            />
            <Text style={styles.headerTitle}>History</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{events.length}</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {visibleEvents.map((event, index) => (
            <TimelineEvent
              key={event.id}
              event={event}
              isLast={index === visibleEvents.length - 1}
              index={index}
            />
          ))}
        </View>

        {/* Show more/less button */}
        {hasMore && (
          <TouchableOpacity style={styles.showMoreButton} onPress={toggleExpanded}>
            <Text style={styles.showMoreText}>
              {expanded
                ? "Show less"
                : `Show ${sortedEvents.length - maxVisible} more`}
            </Text>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.colors.primary[500]}
            />
          </TouchableOpacity>
        )}
      </GlassCard>
    </Animated.View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  countBadge: {
    backgroundColor: theme.colors.primary[500] + "30",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary[500],
  },
  timeline: {
    paddingLeft: 4,
  },
  eventContainer: {
    flexDirection: "row",
    position: "relative",
    paddingBottom: theme.spacing.md,
  },
  timelineLine: {
    position: "absolute",
    left: 15,
    top: 32,
    bottom: 0,
    width: 2,
    backgroundColor: theme.colors.border.light,
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: theme.spacing.sm,
    zIndex: 1,
  },
  eventContent: {
    flex: 1,
    paddingTop: 4,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.primary,
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  eventDescription: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  eventUser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  eventUserText: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  metadataContainer: {
    marginTop: 8,
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
  },
  metadataItem: {
    flexDirection: "row",
    gap: 4,
  },
  metadataKey: {
    fontSize: 11,
    color: theme.colors.neutral[500],
    textTransform: "capitalize",
  },
  metadataValue: {
    fontSize: 11,
    color: theme.colors.text.primary,
    fontWeight: "500",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  showMoreText: {
    fontSize: 14,
    color: theme.colors.primary[500],
    fontWeight: "500",
  },
});

export default ItemHistoryTimeline;
