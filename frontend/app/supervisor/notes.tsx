/**
 * Notes Screen
 * Manage supervisor notes
 * Refactored to use Aurora Design System
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { FlashList } from "@shopify/flash-list";

import {
  listNotes,
  createNote,
  deleteNote,
  Note,
} from "../../src/services/api/notesApi";
import { flags } from "../../src/constants/flags";
import {
  AuroraBackground,
  GlassCard,
  AnimatedPressable,
} from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";
import { useToast } from "../../src/components/feedback/ToastProvider";

export default function NotesScreen() {
  const router = useRouter();
  const { show } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      const data = await listNotes(query ? { q: query } : undefined);
      setNotes(data.items || data || []);
    } catch (error) {
      console.error("Failed to load notes", error);
      show("Failed to load notes", "error");
    } finally {
      setLoading(false);
    }
  }, [query, show]);

  useEffect(() => {
    if (!flags.enableNotes) {
      router.replace("/supervisor/dashboard");
      return;
    }
    loadNotes();
  }, [loadNotes, router]);

  const onRefresh = async () => {
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);
    try {
      await createNote({ body: newNote.trim() });
      setNewNote("");
      await loadNotes();
      show("Note added successfully", "success");
    } catch {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      show("Failed to add note", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeNote = (id?: string) => {
    if (!id) return;
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNote(id);
            await loadNotes();
            show("Note deleted", "success");
          } catch {
            show("Failed to delete note", "error");
          }
        },
      },
    ]);
  };

  const renderNoteItem = ({ item, index }: { item: Note; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <AnimatedPressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.selectionAsync();
        }}
        style={{ marginBottom: auroraTheme.spacing.md }}
      >
        <GlassCard
          variant="light"
          padding={auroraTheme.spacing.md}
          borderRadius={auroraTheme.borderRadius.lg}
        >
          <Text style={styles.cardBody}>{item.body}</Text>
          <View style={styles.cardRow}>
            <View style={styles.metaContainer}>
              <Ionicons
                name="time-outline"
                size={12}
                color={auroraTheme.colors.text.tertiary}
              />
              <Text style={styles.cardMeta}>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : ""}
              </Text>
            </View>
            <AnimatedPressable
              onPress={() => removeNote(item.id)}
              style={styles.deleteButton}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={auroraTheme.colors.error[500]}
              />
            </AnimatedPressable>
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );

  return (
    <AuroraBackground variant="secondary" intensity="medium" animated>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <AnimatedPressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={auroraTheme.colors.text.primary}
              />
            </AnimatedPressable>
            <View>
              <Text style={styles.pageTitle}>Notes</Text>
              <Text style={styles.pageSubtitle}>
                Personal notes & reminders
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Search & Add */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <GlassCard
            variant="medium"
            padding={auroraTheme.spacing.sm}
            style={styles.controlsCard}
          >
            <View style={styles.searchRow}>
              <Ionicons
                name="search"
                size={20}
                color={auroraTheme.colors.text.secondary}
              />
              <TextInput
                placeholder="Search notes..."
                placeholderTextColor={auroraTheme.colors.text.tertiary}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => loadNotes()}
                style={styles.searchInput}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.addRow}>
              <TextInput
                placeholder="Write a new note..."
                placeholderTextColor={auroraTheme.colors.text.tertiary}
                value={newNote}
                onChangeText={setNewNote}
                style={styles.addInput}
                multiline
              />
              <AnimatedPressable
                onPress={addNote}
                style={[
                  styles.addButton,
                  (!newNote.trim() || isSubmitting) && styles.addButtonDisabled,
                ]}
                disabled={!newNote.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="arrow-up" size={24} color="#fff" />
                )}
              </AnimatedPressable>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Notes List */}
        <View style={styles.listContainer}>
          {loading && !refreshing ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator
                size="large"
                color={auroraTheme.colors.primary[500]}
              />
            </View>
          ) : (
            <FlashList
              data={notes}
              renderItem={renderNoteItem}
              // @ts-ignore
              estimatedItemSize={100}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={auroraTheme.colors.primary[500]}
                />
              }
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons
                    name="document-text-outline"
                    size={64}
                    color={auroraTheme.colors.text.disabled}
                  />
                  <Text style={styles.emptyText}>No notes yet</Text>
                  <Text style={styles.emptySubtext}>
                    Add a note to get started
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
  },
  backButton: {
    padding: auroraTheme.spacing.xs,
    backgroundColor: auroraTheme.colors.background.glass,
    borderRadius: auroraTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
  pageTitle: {
    fontFamily: auroraTheme.typography.fontFamily.heading,
    fontSize: auroraTheme.typography.fontSize["2xl"],
    color: auroraTheme.colors.text.primary,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.secondary,
  },
  controlsCard: {
    marginHorizontal: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.lg,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
    padding: auroraTheme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: auroraTheme.colors.text.primary,
    fontSize: auroraTheme.typography.fontSize.md,
  },
  divider: {
    height: 1,
    backgroundColor: auroraTheme.colors.border.light,
    marginVertical: 4,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
    padding: auroraTheme.spacing.sm,
  },
  addInput: {
    flex: 1,
    color: auroraTheme.colors.text.primary,
    fontSize: auroraTheme.typography.fontSize.md,
    maxHeight: 100,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: auroraTheme.borderRadius.full,
    backgroundColor: auroraTheme.colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonDisabled: {
    backgroundColor: auroraTheme.colors.text.disabled,
    opacity: 0.5,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: auroraTheme.spacing.md,
  },
  listContent: {
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: auroraTheme.spacing.md,
  },
  emptyText: {
    fontSize: auroraTheme.typography.fontSize.xl,
    fontWeight: "bold",
    color: auroraTheme.colors.text.secondary,
  },
  emptySubtext: {
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.tertiary,
  },
  cardBody: {
    fontSize: auroraTheme.typography.fontSize.md,
    color: auroraTheme.colors.text.primary,
    marginBottom: auroraTheme.spacing.md,
    lineHeight: 22,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardMeta: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.tertiary,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: auroraTheme.colors.error[500] + "15",
    borderRadius: auroraTheme.borderRadius.full,
  },
});
