/**
 * ItemSearch Component
 * Search autocomplete for finding items by name or barcode
 */
import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
  modernShadows,
} from "../../styles/modernDesignSystem";

interface ItemSearchProps {
  manualBarcode: string;
  manualItemName: string;
  searchResults: any[];
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
  onSearchResultSelect: (item: any) => void;
  onActivityReset?: () => void;
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
}) => {
  return (
    <View style={styles.manualEntryContainer}>
      <Text style={styles.manualEntryTitle}>Scan or Search Item</Text>

      {/* Barcode Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelContainer}>
          <Ionicons
            name="barcode-outline"
            size={20}
            color={modernColors.primary[500]}
          />
          <Text style={styles.inputLabel}>Scan Barcode</Text>
        </View>
        <View style={styles.combinedInputContainer}>
          <TextInput
            style={styles.manualInput}
            placeholder="Enter barcode"
            placeholderTextColor={modernColors.text.disabled}
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
              <Ionicons
                name="scan-outline"
                size={20}
                color={modernColors.text.primary}
              />
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
            <Ionicons
              name="arrow-forward"
              size={20}
              color={modernColors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Item Name Search Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={modernColors.primary[500]}
          />
          <Text style={styles.inputLabel}>Search Item Name</Text>
          {onVoiceSearch && (
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={onVoiceSearch}
            >
              <Ionicons
                name={isListening ? "mic" : "mic-outline"}
                size={20}
                color={
                  isListening
                    ? modernColors.warning.main
                    : modernColors.primary[500]
                }
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.combinedInputContainer}>
          <TextInput
            style={styles.manualInput}
            placeholder="Enter item name"
            placeholderTextColor={modernColors.text.disabled}
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
            <Ionicons
              name="search"
              size={20}
              color={modernColors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Results */}
      {showSearchResults && searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultsTitle}>
            Search Results ({searchResults.length})
          </Text>
          <ScrollView
            style={styles.searchResultsScrollView}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {searchResults.map((item, index) => (
              <TouchableOpacity
                key={`search-result-${index}-${item.item_code || "no-code"}-${item.barcode || "no-barcode"}`}
                style={styles.searchResultItem}
                onPress={() => onSearchResultSelect(item)}
              >
                <View style={styles.searchResultContent}>
                  <Text style={styles.searchResultName}>
                    {item.item_name || item.name}
                  </Text>
                  <Text style={styles.searchResultCode}>
                    Code: {item.item_code}
                  </Text>
                  {item.barcode && (
                    <Text style={styles.searchResultBarcode}>
                      Barcode: {item.barcode}
                    </Text>
                  )}
                  <Text style={styles.searchResultStock}>
                    Stock: {item.stock_qty || item.current_stock || 0}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={modernColors.text.secondary}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isSearching && (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="small" color={modernColors.primary[500]} />
          <Text style={styles.searchingText}>Searching...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  manualEntryContainer: {
    marginTop: modernSpacing.lg,
    width: "100%",
  },
  manualEntryTitle: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xl,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: modernSpacing.lg,
  },
  inputLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.sm,
    marginBottom: modernSpacing.sm,
    paddingLeft: modernSpacing.xs,
  },
  inputLabel: {
    ...modernTypography.label.large,
    color: modernColors.text.secondary,
    flex: 1,
    fontWeight: "600",
  },
  voiceButton: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.full,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  combinedInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: modernColors.background.elevated, // Darker, cleaner background
    borderRadius: modernBorderRadius.lg,
    // subtly remove border or make it very distinct
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: modernSpacing.sm,
    paddingVertical: modernSpacing.xs,
    height: 60, // Taller touch target
    ...modernShadows.sm,
  },
  manualInput: {
    flex: 1,
    color: modernColors.text.primary,
    fontSize: modernTypography.body.large.fontSize,
    paddingVertical: modernSpacing.sm,
    paddingHorizontal: modernSpacing.sm,
    height: "100%",
  },
  scanButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderRadius: modernBorderRadius.md,
    marginLeft: 4,
  },
  searchButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: modernColors.primary[500],
    borderRadius: modernBorderRadius.md,
    marginLeft: modernSpacing.sm,
    shadowColor: modernColors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonDisabled: {
    opacity: 0.5,
    backgroundColor: modernColors.background.elevated,
    shadowOpacity: 0,
    elevation: 0,
  },
  searchResultsContainer: {
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.lg,
    padding: modernSpacing.md,
    marginTop: modernSpacing.xl,
    maxHeight: 400,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    ...modernShadows.md,
  },
  searchResultsTitle: {
    ...modernTypography.h6,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.md,
    paddingHorizontal: modernSpacing.xs,
  },
  searchResultsScrollView: {
    maxHeight: 350,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
    padding: modernSpacing.md,
    marginBottom: modernSpacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    ...modernTypography.body.large,
    fontWeight: "600",
    color: modernColors.text.primary,
    marginBottom: 4,
  },
  searchResultCode: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: 2,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  searchResultBarcode: {
    ...modernTypography.body.small,
    color: modernColors.text.tertiary,
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  searchResultStock: {
    ...modernTypography.label.medium,
    color: modernColors.primary[400],
    marginTop: 2,
    fontWeight: "700",
  },
  searchingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: modernSpacing.md,
    padding: modernSpacing.xl,
  },
  searchingText: {
    ...modernTypography.body.large,
    color: modernColors.text.secondary,
  },
});
