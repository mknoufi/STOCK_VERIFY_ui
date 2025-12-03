/**
 * ItemSearch Component
 * Search autocomplete for finding items by name or barcode
 */
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchResult } from '../../services/enhancedSearchService';

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
  // Removed unused handlers

  return (
    <View style={styles.manualEntryContainer}>
      <Text style={styles.manualEntryTitle}>Scan or Search Item</Text>

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
            style={[styles.searchButton, !manualBarcode && styles.searchButtonDisabled]}
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
            <TouchableOpacity style={styles.voiceButton} onPress={onVoiceSearch}>
              <Ionicons
                name={isListening ? 'mic' : 'mic-outline'}
                size={20}
                color={isListening ? '#FF5722' : '#3B82F6'}
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
            style={[styles.searchButton, !manualItemName && styles.searchButtonDisabled]}
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

      {/* Search Results */}
      {showSearchResults && searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultsTitle}>Search Results ({searchResults.length})</Text>
          <ScrollView
            style={styles.searchResultsScrollView}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {searchResults.map((item, index) => (
              <TouchableOpacity
                key={`search-result-${index}-${item.item_code || 'no-code'}-${
                  item.barcode || 'no-barcode'
                }`}
                style={styles.searchResultItem}
                onPress={() => onSearchResultSelect(item)}
              >
                <View style={styles.searchResultContent}>
                  <Text style={styles.searchResultName}>{item.item_name}</Text>
                  <Text style={styles.searchResultCode}>Code: {item.item_code}</Text>
                  {item.barcode && (
                    <Text style={styles.searchResultBarcode}>Barcode: {item.barcode}</Text>
                  )}
                  <Text style={styles.searchResultStock}>Stock: {item.stock_qty || 0}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isSearching && (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.searchingText}>Searching...</Text>
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
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    flex: 1,
  },
  voiceButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
  },
  combinedInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  manualInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
    paddingRight: 8,
  },
  scanButton: {
    padding: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    marginLeft: 4,
  },
  searchButton: {
    padding: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    marginLeft: 8,
  },
  searchButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#334155',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  orText: {
    marginHorizontal: 16,
    color: '#94A3B8',
    fontSize: 14,
  },
  searchResultsContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    maxHeight: 300,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  searchResultsScrollView: {
    maxHeight: 250,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  searchResultCode: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
  },
  searchResultBarcode: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  searchResultStock: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 4,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  searchingText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
