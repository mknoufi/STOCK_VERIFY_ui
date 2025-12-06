/**
 * Search Autocomplete Component
 * Enhanced search with dropdown suggestions after 4 characters
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../hooks/useTheme";
import {
  searchItems,
  SearchResult,
} from "../../services/enhancedSearchService";

interface SearchAutocompleteProps {
  onSelectItem: (item: SearchResult) => void;
  onBarcodeScan?: (barcode: string) => void;
  placeholder?: string;
  minChars?: number;
  showIcon?: boolean;
  autoFocus?: boolean;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  onSelectItem,
  onBarcodeScan,
  placeholder = "Search by name, code, or barcode (min 4 chars)",
  minChars = 4,
  showIcon = true,
  autoFocus = false,
}) => {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  // Search function
  const performSearch = React.useCallback(
    async (searchQuery: string) => {
      if (!searchQuery || searchQuery.trim().length < minChars) {
        setResults([]);
        setShowDropdown(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setShowDropdown(true);

      try {
        const response = await searchItems({ query: searchQuery });
        setResults(response.items);
        setSelectedIndex(-1);
      } catch (error) {
        __DEV__ && console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [minChars],
  );

  // Debounced search using standard useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleQueryChange = (text: string) => {
    setQuery(text);

    // If it's a numeric barcode (6+ digits), trigger barcode scan
    if (/^\d{6,}$/.test(text.trim()) && onBarcodeScan) {
      onBarcodeScan(text.trim());
      setQuery("");
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Show dropdown if query length >= minChars
    if (text.trim().length >= minChars) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
      setResults([]);
    }
  };

  const handleSelectItem = (item: SearchResult) => {
    onSelectItem(item);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const renderResultItem = ({
    item,
    index,
  }: {
    item: SearchResult;
    index: number;
  }) => {
    const isSelected = index === selectedIndex;
    const matchType = item.matchType;

    return (
      <TouchableOpacity
        style={[
          styles.resultItem,
          {
            backgroundColor: isSelected
              ? theme.colors.primary + "15" // Subtle highlight
              : theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : "transparent",
          },
        ]}
        onPress={() => handleSelectItem(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultContent}>
          {/* Header: Name and Badge */}
          <View style={styles.resultHeader}>
            <Text
              style={[styles.resultName, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {item.item_name}
            </Text>
            {matchType === "exact" && (
              <View
                style={[
                  styles.matchBadge,
                  {
                    backgroundColor: theme.colors.success + "20",
                    borderColor: theme.colors.success,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.matchBadgeText,
                    { color: theme.colors.success },
                  ]}
                >
                  Exact
                </Text>
              </View>
            )}
            {matchType === "partial" && (
              <View
                style={[
                  styles.matchBadge,
                  {
                    backgroundColor: theme.colors.info + "20",
                    borderColor: theme.colors.info,
                  },
                ]}
              >
                <Text
                  style={[styles.matchBadgeText, { color: theme.colors.info }]}
                >
                  Match
                </Text>
              </View>
            )}
          </View>

          {/* Primary Details: Location and Stock */}
          <View style={styles.primaryDetailsRow}>
            {item.floor || item.rack ? (
              <View style={styles.detailChip}>
                <Ionicons
                  name="location-sharp"
                  size={14}
                  color={theme.colors.primary}
                />
                <Text style={[styles.detailText, { color: theme.colors.text }]}>
                  {[item.floor, item.rack].filter(Boolean).join(" / ")}
                </Text>
              </View>
            ) : (
              <View style={[styles.detailChip, { opacity: 0.5 }]}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.detailText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  No Loc
                </Text>
              </View>
            )}

            <View style={styles.detailChip}>
              <Ionicons
                name="cube-outline"
                size={14}
                color={theme.colors.secondary}
              />
              <Text style={[styles.detailText, { color: theme.colors.text }]}>
                Qty: {item.stock_qty}
              </Text>
            </View>

            {(item.mrp ?? 0) > 0 && (
              <View style={styles.detailChip}>
                <Ionicons
                  name="pricetag-outline"
                  size={14}
                  color={theme.colors.success}
                />
                <Text style={[styles.detailText, { color: theme.colors.text }]}>
                  ₹{item.mrp}
                </Text>
              </View>
            )}
          </View>

          {/* Secondary Details: Code, Barcode, Category */}
          <View style={styles.secondaryDetailsRow}>
            <Text
              style={[styles.metaText, { color: theme.colors.textSecondary }]}
            >
              Code: {item.item_code}
            </Text>
            {item.barcode && (
              <>
                <Text
                  style={[styles.metaDivider, { color: theme.colors.border }]}
                >
                  |
                </Text>
                <View style={styles.metaWithIcon}>
                  <Ionicons
                    name="barcode-outline"
                    size={12}
                    color={theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.metaText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {item.barcode}
                  </Text>
                </View>
              </>
            )}
            {item.manual_barcode && (
              <>
                <Text
                  style={[styles.metaDivider, { color: theme.colors.border }]}
                >
                  |
                </Text>
                <Text
                  style={[
                    styles.metaText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  M: {item.manual_barcode}
                </Text>
              </>
            )}
            {item.auto_barcode &&
             item.auto_barcode.length === 6 &&
             (item.auto_barcode.startsWith('51') || item.auto_barcode.startsWith('52') || item.auto_barcode.startsWith('53')) && (
              <>
                <Text
                  style={[styles.metaDivider, { color: theme.colors.border }]}
                >
                  |
                </Text>
                <Text
                  style={[
                    styles.metaText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  A: {item.auto_barcode}
                </Text>
              </>
            )}
            {item.plu_code && (
              <>
                <Text
                  style={[styles.metaDivider, { color: theme.colors.border }]}
                >
                  |
                </Text>
                <Text
                  style={[
                    styles.metaText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  PLU: {item.plu_code}
                </Text>
              </>
            )}
            {item.category && (
              <>
                <Text
                  style={[styles.metaDivider, { color: theme.colors.border }]}
                >
                  |
                </Text>
                <Text
                  style={[
                    styles.metaText,
                    { color: theme.colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {item.category}
                </Text>
              </>
            )}
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.placeholder}
          style={{ opacity: 0.5 }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: showDropdown
              ? theme.colors.primary
              : theme.colors.border,
            shadowColor: theme.colors.primary,
            shadowOpacity: showDropdown ? 0.2 : 0,
          },
        ]}
      >
        {showIcon && (
          <Ionicons
            name="search"
            size={20}
            color={
              showDropdown ? theme.colors.primary : theme.colors.placeholder
            }
            style={styles.searchIcon}
          />
        )}

        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.placeholder}
          value={query}
          onChangeText={handleQueryChange}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {isSearching && (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.loadingIcon}
          />
        )}

        {query.length > 0 && !isSearching && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={theme.colors.placeholder}
            />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.colors.surface, // Match surface for seamless look
              borderColor: theme.colors.border,
              shadowColor: "#000",
            },
          ]}
        >
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text
                style={[
                  styles.loadingText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Searching...
              </Text>
            </View>
          ) : results.length > 0 ? (
            <>
              <View style={styles.resultsHeader}>
                <Text
                  style={[
                    styles.resultsHeaderText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  FOUND {results.length}{" "}
                  {results.length === 1 ? "ITEM" : "ITEMS"}
                </Text>
              </View>
              <FlatList
                ref={listRef}
                data={results}
                renderItem={renderResultItem}
                keyExtractor={(item, index) => `${item.item_code}-${index}`}
                style={styles.resultsList}
                keyboardShouldPersistTaps="handled"
                maxToRenderPerBatch={10}
                windowSize={5}
                showsVerticalScrollIndicator={true}
              />
            </>
          ) : query.trim().length >= minChars ? (
            <View style={styles.noResultsContainer}>
              <View
                style={[
                  styles.noResultsIconCircle,
                  { backgroundColor: theme.colors.background },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={32}
                  color={theme.colors.placeholder}
                />
              </View>
              <Text
                style={[styles.noResultsText, { color: theme.colors.text }]}
              >
                No items found
              </Text>
              <Text
                style={[
                  styles.noResultsHint,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Try searching by a different code or name
              </Text>
            </View>
          ) : (
            <View style={styles.minCharsContainer}>
              <Text
                style={[
                  styles.minCharsText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Type {minChars}+ characters...
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 1000,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12, // More rounded
    paddingHorizontal: 14,
    height: 50, // Taller input
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    fontWeight: "500",
  },
  loadingIcon: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  dropdown: {
    position: "absolute", // Ensure it floats over content
    top: 56, // Just below input
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 450,
    elevation: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    overflow: "hidden", // Clip content to border radius
  },
  loadingContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  resultsHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  resultsList: {
    maxHeight: 400,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    borderLeftWidth: 3, // Accent border on selection
  },
  resultContent: {
    flex: 1,
    gap: 6,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 8,
  },
  resultName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 8,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  primaryDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    fontWeight: "600",
  },
  secondaryDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  metaWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  metaDivider: {
    fontSize: 10,
    marginHorizontal: 2,
    opacity: 0.5,
  },
  noResultsContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  noResultsIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: "600",
  },
  noResultsHint: {
    fontSize: 14,
    textAlign: "center",
  },
  minCharsContainer: {
    padding: 24,
    alignItems: "center",
  },
  minCharsText: {
    fontSize: 14,
    fontStyle: "italic",
  },
});
