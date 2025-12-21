import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ModernCard } from "../../../src/components/ui";
import type { SessionType } from "../../../src/types";
import type { AppTheme } from "../../../src/theme/themes";

type SessionListItem = {
  id?: string;
  session_id?: string;
  warehouse?: string;
  item_count?: number;
  total_items?: number;
  created_at?: string;
  started_at?: string;
  updated_at?: string;
  closed_at?: string;
  status?: string;
  type?: SessionType;
};

type SectionListsProps = {
  theme: AppTheme;
  isDark: boolean;
  activeSections: SessionListItem[];
  finishedSections: SessionListItem[];
  isLoading: boolean;
  showFinishedSearch: boolean;
  finishedSearchQuery: string;
  onToggleSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onStartNewSection: () => void;
  onResumeSection: (sessionId: string, type?: SessionType) => void;
};

const getRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString();
};

export function SectionLists({
  theme,
  isDark,
  activeSections,
  finishedSections,
  isLoading,
  showFinishedSearch,
  finishedSearchQuery,
  onToggleSearch,
  onSearchQueryChange,
  onStartNewSection,
  onResumeSection,
}: SectionListsProps) {
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const topActiveSections = React.useMemo(() => activeSections.slice(0, 3), [activeSections]);
  const overflowActiveSections = React.useMemo(
    () => activeSections.slice(3),
    [activeSections],
  );

  return (
    <>
      {/* Active sections */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeader}>
            <Ionicons name="layers" size={22} color={theme.colors.accent} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Select Section
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.accent }]}
            onPress={onStartNewSection}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Start a new section"
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
          Tap a section to continue scanning
        </Text>

        {isLoading ? (
          <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
        ) : activeSections.length > 0 ? (
          <View style={styles.listContainer}>
            {topActiveSections.map((session, index) => (
              <Animated.View
                key={session.id || session.session_id}
                entering={FadeInUp.delay(100 + index * 80)}
              >
                <ModernCard
                  variant="glass"
                  onPress={() =>
                    onResumeSection(session.session_id || session.id || "", session.type)
                  }
                  style={styles.activeSessionCard}
                  contentStyle={styles.sessionCardContent}
                >
                  <View
                    style={[
                      styles.sessionIcon,
                      { backgroundColor: `${theme.colors.accent}20` },
                    ]}
                  >
                    <Ionicons name="layers" size={24} color={theme.colors.accent} />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text
                      style={[styles.sessionName, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {session.warehouse}
                    </Text>
                    <Text
                      style={[styles.sessionMeta, { color: theme.colors.textSecondary }]}
                    >
                      {session.item_count || session.total_items || 0} items •{" "}
                      {new Date(session.created_at || session.started_at || "").toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={[styles.resumeButton, { backgroundColor: theme.colors.accent }]}>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </View>
                </ModernCard>
              </Animated.View>
            ))}
            {overflowActiveSections.length > 0 && (
              <>
                <Text style={[styles.overflowHint, { color: theme.colors.textSecondary }]}>
                  Drag horizontally to view more sections
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.overflowScrollContent}
                  style={styles.overflowScroll}
                >
                  {overflowActiveSections.map((session, index) => (
                    <Animated.View
                      key={session.id || session.session_id}
                      entering={FadeInUp.delay(300 + index * 60)}
                      style={styles.overflowCardWrapper}
                    >
                      <ModernCard
                        variant="glass"
                        onPress={() =>
                          onResumeSection(session.session_id || session.id || "", session.type)
                        }
                        style={styles.overflowCard}
                        contentStyle={styles.sessionCardContent}
                      >
                        <View
                          style={[
                            styles.sessionIcon,
                            { backgroundColor: `${theme.colors.accent}15` },
                          ]}
                        >
                          <Ionicons name="layers" size={24} color={theme.colors.accent} />
                        </View>
                        <View style={styles.sessionInfo}>
                          <Text
                            style={[styles.sessionName, { color: theme.colors.text }]}
                            numberOfLines={1}
                          >
                            {session.warehouse}
                          </Text>
                          <Text
                            style={[styles.sessionMeta, { color: theme.colors.textSecondary }]}
                          >
                            {session.item_count || session.total_items || 0} items •
                            {" "}
                            {new Date(
                              session.created_at || session.started_at || "",
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                        <View
                          style={[styles.resumeButton, { backgroundColor: theme.colors.accent }]}
                        >
                          <Ionicons name="arrow-forward" size={18} color="#FFF" />
                        </View>
                      </ModernCard>
                    </Animated.View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        ) : (
          <ModernCard variant="glass" intensity={10} style={styles.emptyState}>
            <View style={{ alignItems: "center" }}>
              <Ionicons
                name="checkmark-circle-outline"
                size={40}
                color={theme.colors.success || theme.colors.accent}
              />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                All Caught Up!
              </Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No active sections. Start a new one below.
              </Text>
            </View>
          </ModernCard>
        )}
      </View>

      {/* Finished sections */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="checkmark-done-circle"
              size={22}
              color={theme.colors.success || "#22C55E"}
            />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Finished Sections
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.searchToggleButton,
              {
                backgroundColor: showFinishedSearch
                  ? theme.colors.accent
                  : isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={onToggleSearch}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Toggle finished sections search"
          >
            <Ionicons
              name="search"
              size={18}
              color={showFinishedSearch ? "#FFF" : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {showFinishedSearch && (
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.03)",
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search finished sections..."
              placeholderTextColor={theme.colors.textSecondary}
              value={finishedSearchQuery}
              onChangeText={onSearchQueryChange}
              autoFocus
              accessibilityLabel="Search finished sections"
            />
            {finishedSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearchQueryChange("")} accessibilityRole="button">
                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {finishedSections.length > 0 ? (
          <View style={styles.listContainer}>
            {finishedSections.slice(0, 3).map((session, index) => (
              <Animated.View
                key={session.id || session.session_id}
                entering={FadeInUp.delay(200 + index * 50)}
              >
                <View
                  style={[
                    styles.finishedSessionCard,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.02)",
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.sessionCardContent}>
                    <View
                      style={[
                        styles.sessionIcon,
                        { backgroundColor: `${theme.colors.success || "#22C55E"}15` },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={theme.colors.success || "#22C55E"}
                      />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text
                        style={[styles.sessionName, { color: theme.colors.text }]}
                        numberOfLines={1}
                      >
                        {session.warehouse}
                      </Text>
                      <Text
                        style={[styles.sessionMeta, { color: theme.colors.textSecondary }]}
                      >
                        {session.item_count || session.total_items || 0} items • Last used{" "}
                        {getRelativeTime(
                          session.closed_at || session.updated_at || session.created_at || "",
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))}
            {finishedSections.length > 3 && (
              <Text style={[styles.moreText, { color: theme.colors.textSecondary }]}>
                +{finishedSections.length - 3} more sections
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyStateSmall}>
            <Text style={[styles.emptyTextSmall, { color: theme.colors.textSecondary }]}>
              {finishedSearchQuery ? "No matching sections found" : "No finished sections yet"}
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const createStyles = (theme: AppTheme, isDark: boolean) =>
  StyleSheet.create({
    section: {
      marginBottom: theme.spacing.xxl,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      fontSize: theme.typography.baseSize * theme.typography.scale,
      fontWeight: "600",
      marginBottom: theme.spacing.xs,
    },
    sectionSubtitle: {
      fontSize: theme.typography.baseSize,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    searchToggleButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    listContainer: {
      gap: theme.spacing.md,
    },
    activeSessionCard: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    finishedSessionCard: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    sessionCardContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    sessionIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.md,
      justifyContent: "center",
      alignItems: "center",
    },
    sessionInfo: {
      flex: 1,
    },
    sessionName: {
      fontSize: theme.typography.baseSize + 2,
      fontWeight: "600",
      marginBottom: 2,
    },
    sessionMeta: {
      fontSize: theme.typography.baseSize - 2,
    },
    resumeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyState: {
      alignItems: "center",
      padding: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      fontSize: theme.typography.baseSize + 1,
      fontWeight: "700",
      marginTop: theme.spacing.sm,
    },
    emptyText: {
      fontSize: theme.typography.baseSize,
      textAlign: "center",
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.baseSize + 2,
      paddingVertical: 4,
    },
    emptyStateSmall: {
      paddingVertical: theme.spacing.lg,
      alignItems: "center",
    },
    emptyTextSmall: {
      fontSize: theme.typography.baseSize,
      fontStyle: "italic",
    },
    moreText: {
      fontSize: theme.typography.baseSize,
      textAlign: "center",
      marginTop: theme.spacing.sm,
      fontStyle: "italic",
    },
    overflowHint: {
      fontSize: theme.typography.baseSize - 1,
    },
    overflowScroll: {
      marginTop: theme.spacing.sm,
    },
    overflowScrollContent: {
      paddingRight: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    overflowCardWrapper: {
      flexDirection: "row",
    },
    overflowCard: {
      minWidth: 240,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      padding: theme.spacing.md,
      marginBottom: 0,
    },
  });

export default SectionLists;
