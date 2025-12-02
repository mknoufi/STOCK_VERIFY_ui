/**
 * ItemSearch Component
 * Search autocomplete for finding items by name or barcode
 */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchResult } from '@/services/enhancedSearchService';

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
  onSelectItem: (item: SearchResult) => void;
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
  onSelectItem,
  onActivityReset,
}) => {
  const handleBarcodeChange = (text: string) => {
    onActivityReset?.();
    onBarcodeChange(text);
  };

  const handleItemNameChange = (text: string) => {
    onActivityReset?.();
    onItemNameChange(text);
    if (text.trim().length >= 3) {
      onSearch(text);
    }
  };

  return (
    <View style={styles.manualEntryContainer}>
      <Text style={styles.manualEntryTitle}>Manual Entry</Text>

      {/* Barcode Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelContainer}>
          <Ionicons name="barcode-outline" size={20} color="#3B82F6" />
          <Text style={styles.inputLabel}>Enter Barcode</Text>
        </View>
        <TextInput
          style={styles.manualInput}
          placeholder="Enter 6-digit barcode (e.g., 123456)"
          placeholderTextColor="#94A3B8"
          value={manualBarcode}
          onChangeText={handleBarcodeChange}
          keyboardType="numeric"
          maxLength={20}
          onSubmitEditing={onBarcodeSubmit}
        />
        <TouchableOpacity
          style={[styles.searchButton, !manualBarcode.trim() && styles.searchButtonDisabled]}
          onPress={() => {
            onActivityReset?.();
            if (manualBarcode.trim()) {
              onBarcodeSubmit();
            }
          }}
          disabled={!manualBarcode.trim()}
        >
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputDivider}>
        <View style={styles.dividerLine} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Item Name Input */}
      <View style={styles.inputGroup}>
        <View style={styles.inputLabelContainer}>
          <Ionicons name="text-outline" size={20} color="#3B82F6" />
          <Text style={styles.inputLabel}>Enter Item Name</Text>
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
        <TextInput
          style={styles.manualInput}
          placeholder="Enter item name (min 3 characters)"
          placeholderTextColor="#94A3B8"
          value={manualItemName}
          onChangeText={handleItemNameChange}
          autoCapitalize="words"
          onSubmitEditing={() => {
            if (manualItemName.trim().length >= 3) {
              onItemNameSubmit();
            }
          }}
        />
        {manualItemName.trim().length >= 3 && (
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => {
              onActivityReset?.();
              if (manualItemName.trim().length >= 3) {
                onSearch(manualItemName.trim());
              }
            }}
          >
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        )}
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
                key={`search-result-${index}-${item.item_code || 'no-code'}-${item.barcode || 'no-barcode'}`}
                style={styles.searchResultItem}
                onPress={() => onSelectItem(item)}
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
    padding: 12,
    alignItems: 'center',
  },
  manualInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
  },
  searchButtonDisabled: {
    opacity: 0.5,
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

