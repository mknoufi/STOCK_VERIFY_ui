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
  const inputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
    if (!showFinishedSearch) return;

    // Small delay to ensure layout is ready
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [showFinishedSearch]);

  const styles = React.useMemo(
    () => createStyles(theme, isDark),
    [theme, isDark],
  );
  const [showAllFinished, setShowAllFinished] = React.useState(false);
  const topActiveSections = React.useMemo(
    () => activeSections.slice(0, 3),
    [activeSections],
  );
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
            <Text
              style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
            >
              Select Section
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.accent },
            ]}
            onPress={onStartNewSection}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Start a new section"
          >
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionSubtitle}>
          Tap a section to continue scanning
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#0EA5E9" style={{ marginTop: 20 }} />
        ) : activeSections.length > 0 ? (
          <View style={styles.listContainer}>
            {topActiveSections.map((session, index) => (
              <Animated.View
                key={session.id || session.session_id}
                entering={FadeInUp.delay(100 + index * 80)}
              >
                <ModernCard
                  variant="elevated"
                  onPress={() =>
                    onResumeSection(
                      session.session_id || session.id || "",
                      session.type,
                    )
                  }
                  style={styles.activeSessionCard}
                  contentStyle={styles.sessionCardContent}
                >
                  <View
                    style={[
                      styles.sessionIcon,
                      { backgroundColor: "#0EA5E915" },
                    ]}
                  >
                    <Ionicons name="layers" size={24} color="#0EA5E9" />
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionName} numberOfLines={1}>
                      {session.warehouse}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {session.item_count || session.total_items || 0} items •{" "}
                      {new Date(
                        session.created_at || session.started_at || "",
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.resumeButton}>
                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                  </View>
                </ModernCard>
              </Animated.View>
            ))}
            {overflowActiveSections.length > 0 && (
              <>
                <Text style={styles.overflowHint}>
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
                        variant="elevated"
                        onPress={() =>
                          onResumeSection(
                            session.session_id || session.id || "",
                            session.type,
                          )
                        }
                        style={styles.overflowCard}
                        contentStyle={styles.sessionCardContent}
                      >
                        <View
                          style={[
                            styles.sessionIcon,
                            { backgroundColor: "#0EA5E915" },
                          ]}
                        >
                          <Ionicons name="layers" size={24} color="#0EA5E9" />
                        </View>
                        <View style={styles.sessionInfo}>
                          <Text style={styles.sessionName} numberOfLines={1}>
                            {session.warehouse}
                          </Text>
                          <Text style={styles.sessionMeta}>
                            {session.item_count || session.total_items || 0}{" "}
                            items •{" "}
                            {new Date(
                              session.created_at || session.started_at || "",
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.resumeButton}>
                          <Ionicons
                            name="arrow-forward"
                            size={18}
                            color="#FFF"
                          />
                        </View>
                      </ModernCard>
                    </Animated.View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        ) : (
          <ModernCard variant="elevated" intensity={10} style={styles.emptyState}>
            <View style={{ alignItems: "center" }}>
              <Ionicons
                name="checkmark-circle-outline"
                size={40}
                color="#10B981"
              />
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyText}>
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
            <Ionicons name="checkmark-done-circle" size={22} color="#10B981" />
            <Text style={styles.sectionTitle}>
              Previous Sessions
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.searchToggleButton,
              {
                backgroundColor: showFinishedSearch
                  ? theme.colors.accent
                  : theme.colors.background.elevated,
              },
            ]}
            onPress={onToggleSearch}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Toggle previous sessions search"
          >
            <Ionicons
              name="search"
              size={18}
              color={showFinishedSearch ? "#FFF" : theme.colors.text.primary}
            />
          </TouchableOpacity>
        </View>

        {showFinishedSearch && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search previous sessions..."
              placeholderTextColor="#64748B"
              value={finishedSearchQuery}
              onChangeText={onSearchQueryChange}
              accessibilityLabel="Search previous sessions"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {finishedSearchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => onSearchQueryChange("")}
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {finishedSections.length > 0 ? (
          <View style={styles.listContainer}>
            {(showAllFinished
              ? finishedSections
              : finishedSections.slice(0, 3)
            ).map((session, index) => (
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
                    },
                  ]}
                >
                  <View style={styles.sessionCardContent}>
                    <View
                      style={[
                        styles.sessionIcon,
                        { backgroundColor: "#10B98115" },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#10B981"
                      />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionName} numberOfLines={1}>
                        {session.warehouse}
                      </Text>
                      <Text style={styles.sessionMeta}>
                        {session.item_count || session.total_items || 0} items •
                        Last used{" "}
                        {getRelativeTime(
                          session.closed_at ||
                          session.updated_at ||
                          session.created_at ||
                          "",
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))}
            {finishedSections.length > 3 && (
              <TouchableOpacity
                onPress={() => setShowAllFinished(!showAllFinished)}
                style={{ paddingVertical: 8, alignItems: "center" }}
              >
                <Text style={styles.moreText}>
                  {showAllFinished
                    ? "Show Less"
                    : `+${finishedSections.length - 3} more sessions`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyStateSmall}>
            <Text style={styles.emptyTextSmall}>
              {finishedSearchQuery
                ? "No matching sessions found"
                : "No previous sessions yet"}
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
      marginBottom: 32,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16, // Increased from 12
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: -0.5,
      color: theme.colors.text.primary,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      marginBottom: 16,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.accent,
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    searchToggleButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    listContainer: {
      gap: 12,
    },
    activeSessionCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
      marginBottom: 12, // Increased from 4
      backgroundColor: isDark ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.7)",
    },
    finishedSessionCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
      padding: 16,
      marginBottom: 12, // Increased from 4
      backgroundColor: isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(255, 255, 255, 0.6)",
    },
    sessionCardContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    sessionIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    sessionInfo: {
      flex: 1,
    },
    sessionName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    sessionMeta: {
      fontSize: 13,
      color: theme.colors.text.secondary,
    },
    resumeButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.accent,
    },
    emptyState: {
      alignItems: "center",
      padding: 32,
      gap: 12,
      borderRadius: 24,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "700",
      marginTop: 8,
      color: theme.colors.text.primary,
    },
    emptyText: {
      fontSize: 14,
      textAlign: "center",
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.8)",
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text.primary,
      paddingVertical: 4,
    },
    emptyStateSmall: {
      paddingVertical: 24,
      alignItems: "center",
    },
    emptyTextSmall: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      fontStyle: "italic",
    },
    moreText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
      textAlign: "center",
      marginTop: 8,
    },
    overflowHint: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      marginBottom: 8,
      marginLeft: 4,
    },
    overflowScroll: {
      marginTop: 4,
    },
    overflowScrollContent: {
      paddingRight: 20,
      gap: 12,
    },
    overflowCardWrapper: {
      flexDirection: "row",
    },
    overflowCard: {
      minWidth: 260,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
      padding: 16,
      backgroundColor: isDark ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.7)",
    },
  });

export default SectionLists;
