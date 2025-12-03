/**
 * Item Filters Component
 * Reusable filter UI for filtering items by category, subcategory, floor, rack, UOM, etc.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

export interface FilterValues {
  category?: string;
  subcategory?: string;
  floor?: string;
  rack?: string;
  warehouse?: string;
  uom_code?: string;
  verified?: boolean;
  search?: string;
}

interface ItemFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
  showVerifiedFilter?: boolean;
  showSearch?: boolean;
}

export const ItemFilters: React.FC<ItemFiltersProps> = ({
  onFilterChange,
  initialFilters = {},
  showVerifiedFilter = true,
  showSearch = true,
}) => {
  const theme = useTheme();
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const updateFilter = (key: keyof FilterValues, value: any) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value || undefined };
      // Remove empty strings
      Object.keys(updated).forEach((k) => {
        if (updated[k as keyof FilterValues] === '') {
          delete updated[k as keyof FilterValues];
        }
      });
      return updated;
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Ionicons
            name="filter"
            size={20}
            color={theme.colors.primary}
            style={styles.filterIcon}
          />
          <Text style={[styles.headerText, { color: theme.colors.text }]}>Filters</Text>
          {hasActiveFilters && (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{Object.keys(filters).length}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView style={styles.filtersContainer} showsVerticalScrollIndicator={false}>
          {showSearch && (
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Search</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Search items..."
                placeholderTextColor={theme.colors.placeholder}
                value={filters.search || ''}
                onChangeText={(text) => updateFilter('search', text)}
              />
            </View>
          )}

          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Category</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Category"
              placeholderTextColor={theme.colors.placeholder}
              value={filters.category || ''}
              onChangeText={(text) => updateFilter('category', text)}
            />
          </View>

          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Subcategory</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Subcategory"
              placeholderTextColor={theme.colors.placeholder}
              value={filters.subcategory || ''}
              onChangeText={(text) => updateFilter('subcategory', text)}
            />
          </View>

          <View style={styles.filterRow}>
            <View style={[styles.filterGroup, styles.filterGroupHalf]}>
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Floor</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Floor"
                placeholderTextColor={theme.colors.placeholder}
                value={filters.floor || ''}
                onChangeText={(text) => updateFilter('floor', text)}
              />
            </View>

            <View style={[styles.filterGroup, styles.filterGroupHalf]}>
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Rack</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Rack"
                placeholderTextColor={theme.colors.placeholder}
                value={filters.rack || ''}
                onChangeText={(text) => updateFilter('rack', text)}
              />
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Warehouse</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Warehouse"
              placeholderTextColor={theme.colors.placeholder}
              value={filters.warehouse || ''}
              onChangeText={(text) => updateFilter('warehouse', text)}
            />
          </View>

          <View style={styles.filterGroup}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>UOM Code</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="UOM Code"
              placeholderTextColor={theme.colors.placeholder}
              value={filters.uom_code || ''}
              onChangeText={(text) => updateFilter('uom_code', text)}
            />
          </View>

          {showVerifiedFilter && (
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
                Verification Status
              </Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    filters.verified === undefined && styles.radioOptionActive,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => updateFilter('verified', undefined)}
                >
                  <Text style={[styles.radioText, { color: theme.colors.text }]}>All</Text>
                  {filters.verified === undefined && (
                    <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    filters.verified === true && styles.radioOptionActive,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => updateFilter('verified', true)}
                >
                  <Text style={[styles.radioText, { color: theme.colors.text }]}>Verified</Text>
                  {filters.verified === true && (
                    <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    filters.verified === false && styles.radioOptionActive,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => updateFilter('verified', false)}
                >
                  <Text style={[styles.radioText, { color: theme.colors.text }]}>Unverified</Text>
                  {filters.verified === false && (
                    <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {hasActiveFilters && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: theme.colors.error }]}
              onPress={clearFilters}
            >
              <Ionicons name="close-circle" size={18} color="#fff" />
              <Text style={styles.clearButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterIcon: {
    marginRight: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 8,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filtersContainer: {
    maxHeight: 400,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterGroupHalf: {
    flex: 1,
    marginRight: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  radioOptionActive: {
    borderWidth: 2,
  },
  radioText: {
    fontSize: 14,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
