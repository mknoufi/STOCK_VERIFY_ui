/**
 * ItemNotesSection Component
 * Add and display notes/comments for an item
 */
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { GlassCard } from "../ui/GlassCard";
import { theme } from "../../styles/modernDesignSystem";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================================================
// Types
// ============================================================================

export interface Note {
  id: string;
  text: string;
  type?: "general" | "variance" | "damage" | "location" | "system";
  author?: string;
  timestamp: Date | string;
  editable?: boolean;
}

export interface ItemNotesSectionProps {
  notes: Note[];
  onAddNote?: (text: string, type?: Note["type"]) => void;
  onDeleteNote?: (noteId: string) => void;
  onEditNote?: (noteId: string, newText: string) => void;
  editable?: boolean;
  placeholder?: string;
  maxNotes?: number;
  animationDelay?: number;
}

// ============================================================================
// Note Type Config
// ============================================================================

const NOTE_TYPE_CONFIG: Record<
  NonNullable<Note["type"]>,
  { icon: string; color: string; label: string }
> = {
  general: { icon: "chatbubble", color: theme.colors.neutral[600], label: "Note" },
  variance: { icon: "swap-horizontal", color: theme.colors.warning.main, label: "Variance" },
  damage: { icon: "warning", color: theme.colors.error.main, label: "Damage" },
  location: { icon: "location", color: theme.colors.info.main, label: "Location" },
  system: { icon: "cog", color: theme.colors.neutral[500], label: "System" },
};

// ============================================================================
// Note Item Component
// ============================================================================

interface NoteItemProps {
  note: Note;
  index: number;
  onDelete?: () => void;
  onEdit?: (newText: string) => void;
  editable: boolean;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  index,
  onDelete,
  onEdit,
  editable,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(note.text);
  const inputRef = useRef<TextInput>(null);

  const config = NOTE_TYPE_CONFIG[note.type || "general"];
  const timestamp = typeof note.timestamp === "string" 
    ? new Date(note.timestamp) 
    : note.timestamp;

  const handleEdit = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSave = () => {
    if (editText.trim() && editText !== note.text) {
      onEdit?.(editText.trim());
    }
    setIsEditing(false);
    Keyboard.dismiss();
  };

  const handleCancel = () => {
    setEditText(note.text);
    setIsEditing(false);
    Keyboard.dismiss();
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onDelete?.();
  };

  return (
    <Animated.View
      entering={FadeIn.delay(index * 50).duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.noteItem}
    >
      {/* Type indicator */}
      <View style={[styles.noteIcon, { backgroundColor: config.color + "20" }]}>
        <Ionicons name={config.icon as any} size={14} color={config.color} />
      </View>

      {/* Content */}
      <View style={styles.noteContent}>
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              ref={inputRef}
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleCancel} style={styles.editAction}>
                <Ionicons name="close" size={18} color={theme.colors.error.main} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.editAction}>
                <Ionicons name="checkmark" size={18} color={theme.colors.success.main} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.noteText}>{note.text}</Text>
            <View style={styles.noteMeta}>
              {note.author && (
                <Text style={styles.noteAuthor}>{note.author}</Text>
              )}
              <Text style={styles.noteTime}>
                {timestamp.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      {editable && note.editable !== false && !isEditing && (
        <View style={styles.noteActions}>
          <TouchableOpacity onPress={handleEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil" size={16} color={theme.colors.neutral[500]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash" size={16} color={theme.colors.error.main} />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

// ============================================================================
// Add Note Input
// ============================================================================

interface AddNoteInputProps {
  onAdd: (text: string, type: Note["type"]) => void;
  placeholder: string;
}

const AddNoteInput: React.FC<AddNoteInputProps> = ({ onAdd, placeholder }) => {
  const [text, setText] = useState("");
  const [selectedType, setSelectedType] = useState<Note["type"]>("general");
  const [showTypes, setShowTypes] = useState(false);

  const handleAdd = () => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd(text.trim(), selectedType);
    setText("");
    Keyboard.dismiss();
  };

  const handleTypeSelect = (type: Note["type"]) => {
    Haptics.selectionAsync();
    setSelectedType(type);
    setShowTypes(false);
  };

  const config = NOTE_TYPE_CONFIG[selectedType || "general"];

  return (
    <View style={styles.addContainer}>
      {/* Type selector */}
      <TouchableOpacity
        style={[styles.typeButton, { borderColor: config.color }]}
        onPress={() => setShowTypes(!showTypes)}
      >
        <Ionicons name={config.icon as any} size={16} color={config.color} />
      </TouchableOpacity>

      {/* Type dropdown */}
      {showTypes && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.typeDropdown}>
          {(Object.keys(NOTE_TYPE_CONFIG) as Note["type"][]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeOption,
                selectedType === type && styles.typeOptionSelected,
              ]}
              onPress={() => handleTypeSelect(type)}
            >
              <Ionicons
                name={NOTE_TYPE_CONFIG[type!].icon as any}
                size={14}
                color={NOTE_TYPE_CONFIG[type!].color}
              />
              <Text style={styles.typeOptionText}>
                {NOTE_TYPE_CONFIG[type!].label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}

      {/* Input */}
      <TextInput
        style={styles.addInput}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.neutral[500]}
        multiline
        maxLength={500}
      />

      {/* Send button */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          !text.trim() && styles.sendButtonDisabled,
        ]}
        onPress={handleAdd}
        disabled={!text.trim()}
      >
        <Ionicons
          name="send"
          size={18}
          color={text.trim() ? theme.colors.primary[500] : theme.colors.neutral[500]}
        />
      </TouchableOpacity>
    </View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ItemNotesSection: React.FC<ItemNotesSectionProps> = ({
  notes,
  onAddNote,
  onDeleteNote,
  onEditNote,
  editable = false,
  placeholder = "Add a note...",
  maxNotes = 10,
  animationDelay = 0,
}) => {
  const sortedNotes = [...notes].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const canAddMore = notes.length < maxNotes;

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
              name="chatbubbles"
              size={18}
              color={theme.colors.primary[500]}
            />
            <Text style={styles.headerTitle}>Notes</Text>
            {notes.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{notes.length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes list */}
        {sortedNotes.length > 0 ? (
          <View style={styles.notesList}>
            {sortedNotes.map((note, index) => (
              <NoteItem
                key={note.id}
                note={note}
                index={index}
                editable={editable}
                onDelete={() => onDeleteNote?.(note.id)}
                onEdit={(newText) => onEditNote?.(note.id, newText)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={32}
              color={theme.colors.neutral[500]}
            />
            <Text style={styles.emptyText}>No notes yet</Text>
          </View>
        )}

        {/* Add note input */}
        {editable && canAddMore && onAddNote && (
          <AddNoteInput onAdd={onAddNote} placeholder={placeholder} />
        )}

        {/* Max notes warning */}
        {editable && !canAddMore && (
          <Text style={styles.maxWarning}>Maximum {maxNotes} notes reached</Text>
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
    marginBottom: theme.spacing.sm,
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
  notesList: {
    gap: theme.spacing.sm,
  },
  noteItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.paper,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  noteIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  noteContent: {
    flex: 1,
  },
  noteText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  noteMeta: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: 4,
  },
  noteAuthor: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: "500",
  },
  noteTime: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  noteActions: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  editContainer: {
    flex: 1,
  },
  editInput: {
    fontSize: 14,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.default,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
    minHeight: 60,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  editAction: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  addContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  typeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  typeDropdown: {
    position: "absolute",
    bottom: 44,
    left: 0,
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  typeOptionSelected: {
    backgroundColor: theme.colors.primary[500] + "20",
  },
  typeOptionText: {
    fontSize: 13,
    color: theme.colors.text.primary,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    minHeight: 36,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary[500] + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.background.paper,
  },
  maxWarning: {
    fontSize: 12,
    color: theme.colors.warning.main,
    textAlign: "center",
    marginTop: theme.spacing.sm,
  },
});

export default ItemNotesSection;
