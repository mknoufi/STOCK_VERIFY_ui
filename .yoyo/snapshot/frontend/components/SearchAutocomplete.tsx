/**
 * Search Autocomplete Component
 * Enhanced search with dropdown suggestions after 4 characters
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { EnhancedSearchService, SearchResult } from '../services/enhancedSearchService';
import { useStableDebouncedCallback } from '../hooks/useDebouncedCallback';

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
  placeholder = 'Search by name, code, or barcode (min 4 chars)',
  minChars = 4,
  showIcon = true,
  autoFocus = false,
}) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);

  // Search function
  const performSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < minChars) {
      setResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowDropdown(true);

    try {
      const searchResults = await EnhancedSearchService.searchItems({
        query: searchQuery,
        limit: 20,
        minChars,
      });
      setResults(searchResults);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [minChars]);

  // Debounced search using stable hook
  const debouncedSearch = useStableDebouncedCallback(performSearch, 300);

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  const handleQueryChange = (text: string) => {
    setQuery(text);

    // If it's a numeric barcode (6+ digits), trigger barcode scan
    if (/^\d{6,}$/.test(text.trim()) && onBarcodeScan) {
      onBarcodeScan(text.trim());
      setQuery('');
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
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const renderResultItem = ({ item, index }: { item: SearchResult; index: number }) => {
    const isSelected = index === selectedIndex;
    const matchType = item.matchType;

    // Highlight matched text
    const highlightName = item.item_name.replace(
      new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
      (match) => `|${match}|`
    );

    return (
      <TouchableOpacity
        style={[
          styles.resultItem,
          {
            backgroundColor: isSelected
              ? theme.colors.primary + '20'
              : theme.colors.surface,
          },
        ]}
        onPress={() => handleSelectItem(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultContent}>
          <View style={styles.resultHeader}>
            <Text
              style={[styles.resultName, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {item.item_name}
            </Text>
            {matchType === 'exact' && (
              <View style={[styles.matchBadge, { backgroundColor: theme.colors.success }]}>
                <Text style={styles.matchBadgeText}>Exact</Text>
              </View>
            )}
            {matchType === 'partial' && (
              <View style={[styles.matchBadge, { backgroundColor: theme.colors.info }]}>
                <Text style={styles.matchBadgeText}>Match</Text>
              </View>
            )}
          </View>

          <View style={styles.resultDetails}>
            <Text style={[styles.resultCode, { color: theme.colors.textSecondary }]}>
              Code: {item.item_code}
            </Text>
            {item.barcode && (
              <Text style={[styles.resultBarcode, { color: theme.colors.textSecondary }]}>
                • {item.barcode}
              </Text>
            )}
            {item.category && (
              <Text style={[styles.resultCategory, { color: theme.colors.textSecondary }]}>
                • {item.category}
              </Text>
            )}
            {(item.floor || item.rack) && (
              <Text style={[styles.resultLocation, { color: theme.colors.textSecondary }]}>
                • {[item.floor, item.rack].filter(Boolean).join(' / ')}
              </Text>
            )}
          </View>

          <View style={styles.resultFooter}>
            <Text style={[styles.resultStock, { color: theme.colors.textSecondary }]}>
              Stock: {item.stock_qty}
            </Text>
            {item.mrp > 0 && (
              <Text style={[styles.resultMRP, { color: theme.colors.textSecondary }]}>
                MRP: ₹{item.mrp}
              </Text>
            )}
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.placeholder}
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
            borderColor: showDropdown ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        {showIcon && (
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.placeholder}
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
            <Ionicons name="close-circle" size={20} color={theme.colors.placeholder} />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.text,
            },
          ]}
        >
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Searching...
              </Text>
            </View>
          ) : results.length > 0 ? (
            <>
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsHeaderText, { color: theme.colors.textSecondary }]}>
                  {results.length} result{results.length !== 1 ? 's' : ''} found
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
              />
            </>
          ) : query.trim().length >= minChars ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search" size={32} color={theme.colors.placeholder} />
              <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                No items found
              </Text>
              <Text style={[styles.noResultsHint, { color: theme.colors.placeholder }]}>
                Try a different search term
              </Text>
            </View>
          ) : (
            <View style={styles.minCharsContainer}>
              <Text style={[styles.minCharsText, { color: theme.colors.textSecondary }]}>
                Type at least {minChars} characters to search
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
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  loadingIcon: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 400,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  resultsHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultsHeaderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultsList: {
    maxHeight: 350,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resultName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  matchBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  resultDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  resultCode: {
    fontSize: 13,
  },
  resultBarcode: {
    fontSize: 13,
  },
  resultCategory: {
    fontSize: 13,
  },
  resultLocation: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  resultFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  resultStock: {
    fontSize: 12,
  },
  resultMRP: {
    fontSize: 12,
  },
  noResultsContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
  },
  noResultsHint: {
    fontSize: 14,
  },
  minCharsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  minCharsText: {
    fontSize: 14,
  },
});
