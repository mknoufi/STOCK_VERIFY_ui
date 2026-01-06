/**
 * ItemSearch Component
 * Search autocomplete for finding items by name or barcode
 * Enhanced with pagination and infinite scroll
 */
import React, { useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SearchResult } from "../../services/enhancedSearchService";
import { Skeleton } from "../ui/Skeleton";

interface ItemSearchProps {
  manualBarcode: string;
  manualItemName: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  isListening?: boolean;
  showSearchResults: boolean;
  onBarcodeChange: (barcode: string) => void;
  onItemNameChange: (name: string) => void;
  onBarcodeSubmit: () => void;
  onItemNameSubmit: () => void;
  onSearch: (query: string) => void;
  onVoiceSearch?: () => void;
  onScan?: () => void;
  onClearSearch?: () => void;
  onSearchResultSelect: (item: SearchResult) => void;
  onActivityReset?: () => void;
  onBulkEntry?: () => void;
  // Pagination props
  totalResults?: number;
  currentPage?: number;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export const ItemSearch: React.FC<ItemSearchProps> = ({
  manualBarcode,
  manualItemName,
  searchResults,
  isSearching,
  isListening = false,
  showSearchResults,
  onBarcodeChange,
  onItemNameChange,
  onBarcodeSubmit,
  onItemNameSubmit,
  onSearch,
  onVoiceSearch,
  onScan,
  onSearchResultSelect,
  onActivityReset,
  onBulkEntry,
  // Pagination props with defaults
  totalResults = 0,
  currentPage: _currentPage = 1,
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
}) => {
  // Render individual search result item
  const renderSearchResultItem = useCallback(
    ({ item, index }: { item: SearchResult; index: number }) => (
      <TouchableOpacity
        key={`search-result-${index}-${item.item_code || "no-code"}-${item.barcode || "no-barcode"}`}
        style={styles.searchResultItem}
        onPress={() => onSearchResultSelect(item)}
      >
        <View style={styles.searchResultContent}>
          <View style={styles.resultHeader}>
            <Text style={styles.searchResultName}>{item.item_name}</Text>
            {item.relevance_score !== undefined &&
              item.relevance_score >= 500 && (
                <View style={styles.exactMatchBadge}>
                  <Text style={styles.exactMatchText}>Exact</Text>
                </View>
              )}
          </View>
          <Text style={styles.searchResultCode}>Code: {item.item_code}</Text>
          {item.barcode && (
            <Text style={styles.searchResultBarcode}>
              Barcode: {item.barcode}
            </Text>
          )}
          <Text style={styles.searchResultStock}>
            Stock: {item.stock_qty || 0}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
      </TouchableOpacity>
    ),
    [onSearchResultSelect],
  );

  // Footer component for infinite scroll
  const renderFooter = useCallback(() => {
    if (!hasNextPage) return null;

    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity style={styles.loadMoreButton} onPress={onLoadMore}>
        <Text style={styles.loadMoreText}>Load More Results</Text>
        <Ionicons name="chevron-down" size={16} color="#3B82F6" />
      </TouchableOpacity>
    );
  }, [hasNextPage, isLoadingMore, onLoadMore]);

  // Handle end reached for infinite scroll
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasNextPage, isLoadingMore, onLoadMore]);

  return (
    <View style={styles.manualEntryContainer}>
      <View style={styles.headerRow}>
        <Text style={styles.manualEntryTitle}>Scan or Search Item</Text>
        {onBulkEntry && (
          <TouchableOpacity onPress={onBulkEntry} style={styles.bulkButton}>
            <Ionicons name="list-outline" size={20} color="#3B82F6" />
            <Text style={styles.bulkButtonText}>Bulk Entry</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Barcode Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelContainer}>
          <Ionicons name="barcode-outline" size={20} color="#3B82F6" />
          <Text style={styles.inputLabel}>Scan Barcode</Text>
        </View>
        <View style={styles.combinedInputContainer}>
          <TextInput
            style={styles.manualInput}
            placeholder="Enter barcode"
            placeholderTextColor="#94A3B8"
            value={manualBarcode}
            onChangeText={(text) => {
              onActivityReset?.();
              onBarcodeChange(text);
              if (text.length === 6) {
                onBarcodeSubmit();
              }
            }}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={onBarcodeSubmit}
          />
          {onScan && (
            <TouchableOpacity style={styles.scanButton} onPress={onScan}>
              <Ionicons name="scan-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.searchButton,
              !manualBarcode && styles.searchButtonDisabled,
            ]}
            onPress={() => {
              onActivityReset?.();
              onBarcodeSubmit();
            }}
            disabled={!manualBarcode}
          >
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Item Name Search Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelContainer}>
          <Ionicons name="search-outline" size={20} color="#3B82F6" />
          <Text style={styles.inputLabel}>Search Item Name</Text>
          {onVoiceSearch && (
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={onVoiceSearch}
            >
              <Ionicons
                name={isListening ? "mic" : "mic-outline"}
                size={20}
                color={isListening ? "#FF5722" : "#3B82F6"}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.combinedInputContainer}>
          <TextInput
            style={styles.manualInput}
            placeholder="Enter item name"
            placeholderTextColor="#94A3B8"
            value={manualItemName}
            onChangeText={(text) => {
              onActivityReset?.();
              onItemNameChange(text);
              if (text.trim().length >= 3) {
                onSearch(text);
              }
            }}
            returnKeyType="search"
            onSubmitEditing={onItemNameSubmit}
          />
          <TouchableOpacity
            style={[
              styles.searchButton,
              !manualItemName && styles.searchButtonDisabled,
            ]}
            onPress={() => {
              onActivityReset?.();
              onItemNameSubmit();
            }}
            disabled={!manualItemName}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Results with Infinite Scroll */}
      {showSearchResults && searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <View style={styles.searchResultsHeader}>
            <Text style={styles.searchResultsTitle}>Search Results</Text>
            <Text style={styles.searchResultsCount}>
              {searchResults.length}
              {totalResults > searchResults.length ? ` of ${totalResults}` : ""}
            </Text>
          </View>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResultItem}
            keyExtractor={(item, index) =>
              `search-${index}-${item.item_code || "no-code"}-${item.barcode || "no-barcode"}`
            }
            style={styles.searchResultsFlatList}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        </View>
      )}

      {isSearching && (
        <View style={styles.searchingContainer}>
          <Skeleton width="100%" height={60} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={60} style={{ marginBottom: 8 }} />
          <Skeleton width="100%" height={60} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  manualEntryContainer: {
    marginTop: 16,
  },
  manualEntryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bulkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  bulkButtonText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
    flex: 1,
  },
  voiceButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
  },
  combinedInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  manualInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    paddingVertical: 12,
    paddingRight: 8,
  },
  scanButton: {
    padding: 8,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 8,
    marginLeft: 4,
  },
  searchButton: {
    padding: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    marginLeft: 8,
  },
  searchButtonDisabled: {
    opacity: 0.5,
    backgroundColor: "#334155",
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  inputDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#334155",
  },
  orText: {
    marginHorizontal: 16,
    color: "#94A3B8",
    fontSize: 14,
  },
  searchResultsContainer: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    maxHeight: 350,
  },
  searchResultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  searchResultsCount: {
    fontSize: 14,
    color: "#94A3B8",
  },
  searchResultsFlatList: {
    maxHeight: 280,
  },
  searchResultsScrollView: {
    maxHeight: 250,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  exactMatchBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
  exactMatchText: {
    color: "#22C55E",
    fontSize: 10,
    fontWeight: "600",
  },
  loadingMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  loadingMoreText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 8,
    marginTop: 8,
  },
  loadMoreText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#252525",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  searchResultCode: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 2,
  },
  searchResultBarcode: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 2,
    fontFamily: "monospace",
  },
  searchResultStock: {
    fontSize: 12,
    color: "#3B82F6",
    marginTop: 4,
  },
  searchingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  searchingText: {
    color: "#94A3B8",
    fontSize: 14,
  },
});
