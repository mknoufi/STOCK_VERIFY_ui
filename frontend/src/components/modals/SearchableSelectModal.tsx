/**
 * SearchableSelectModal Component
 * Modal with searchable dropdown for selecting options
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
} from "../../styles/modernDesignSystem";

interface SearchableSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  options: string[];
  title?: string;
  placeholder?: string;
  testID?: string;
}

export const SearchableSelectModal: React.FC<SearchableSelectModalProps> = ({
  visible,
  onClose,
  onSelect,
  options,
  title = "Select Option",
  placeholder = "Search...",
  testID,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return options;
    }
    const query = searchQuery.toLowerCase();
    return options.filter((option) => option.toLowerCase().includes(query));
  }, [options, searchQuery]);

  // Handle option selection
  const handleSelect = (option: string) => {
    onSelect(option);
    setSearchQuery("");
    onClose();
  };

  // Handle close
  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  const renderOption = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.optionItem}
      onPress={() => handleSelect(item)}
      testID={`${testID}-option-${item}`}
    >
      <Text style={styles.optionText}>{item}</Text>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={modernColors.text.tertiary}
      />
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      testID={testID}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              testID={`${testID}-close`}
            >
              <Ionicons
                name="close"
                size={24}
                color={modernColors.text.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={modernColors.text.tertiary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={placeholder}
              placeholderTextColor={modernColors.text.disabled}
              autoCapitalize="none"
              autoCorrect={false}
              testID={`${testID}-search`}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={modernColors.text.tertiary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Options List */}
          <FlatList
            data={filteredOptions}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={renderOption}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="search-outline"
                  size={48}
                  color={modernColors.text.disabled}
                />
                <Text style={styles.emptyText}>No options found</Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernColors.background.default,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: modernSpacing.md,
    paddingVertical: modernSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
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
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.md,
    marginHorizontal: modernSpacing.md,
    marginVertical: modernSpacing.sm,
    paddingHorizontal: modernSpacing.sm,
  },
  searchIcon: {
    marginRight: modernSpacing.xs,
  },
  searchInput: {
    flex: 1,
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    paddingVertical: modernSpacing.sm,
  },
  clearButton: {
    padding: modernSpacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: modernSpacing.md,
    paddingBottom: modernSpacing.xl,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: modernSpacing.md,
    paddingHorizontal: modernSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  optionText: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: modernSpacing["2xl"],
  },
  emptyText: {
    ...modernTypography.body.medium,
    color: modernColors.text.disabled,
    marginTop: modernSpacing.sm,
  },
});

export type { SearchableSelectModalProps };
