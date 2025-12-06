import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../styles/modernDesignSystem";

interface SearchableSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  title: string;
  options: string[];
  value?: string;
}

export const SearchableSelectModal: React.FC<SearchableSelectModalProps> = ({
  visible,
  onClose,
  onSelect,
  title,
  options,
  value,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={modernColors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={modernColors.text.secondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={modernColors.text.disabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  item === value && styles.optionItemSelected,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                  setSearchQuery("");
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    item === value && styles.optionTextSelected,
                  ]}
                >
                  {item}
                </Text>
                {item === value && (
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={modernColors.primary[500]}
                  />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No options found</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: modernColors.background.paper,
    borderTopLeftRadius: modernBorderRadius.xl,
    borderTopRightRadius: modernBorderRadius.xl,
    height: "80%",
    padding: modernSpacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.md,
  },
  title: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
  },
  closeButton: {
    padding: modernSpacing.xs,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: modernColors.background.default,
    borderRadius: modernBorderRadius.md,
    paddingHorizontal: modernSpacing.md,
    marginBottom: modernSpacing.md,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  searchIcon: {
    marginRight: modernSpacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: modernSpacing.md,
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: modernSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  optionItemSelected: {
    backgroundColor: "rgba(59, 130, 246, 0.05)",
  },
  optionText: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  optionTextSelected: {
    color: modernColors.primary[500],
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    marginTop: modernSpacing.xl,
    color: modernColors.text.secondary,
    ...modernTypography.body.medium,
  },
});
