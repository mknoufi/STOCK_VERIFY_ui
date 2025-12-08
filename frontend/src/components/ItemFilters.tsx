/**
 * Item Filters Component
 * Reusable filter UI for filtering items by category, subcategory, floor, rack, UOM, etc.
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import { ItemVerificationAPI } from "../services/api/itemVerificationApi";
import { getRackProgress } from "../services/api/api";
import { RackProgressCard } from "./scan/RackProgressCard";

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
  sessionId?: string;
}

export const ItemFilters: React.FC<ItemFiltersProps> = ({
  onFilterChange,
  initialFilters = {},
  showVerifiedFilter = true,
  showSearch = true,
  sessionId,
}) => {
  const theme = useTheme();
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [floors, setFloors] = useState<string[]>([]);
  const [racks, setRacks] = useState<string[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingRacks, setLoadingRacks] = useState(false);
  const [rackProgress, setRackProgress] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"floor" | "rack" | null>(null);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLocations = async () => {
    if (loadingLocations) return;
    setLoadingLocations(true);
    try {
      const data = await ItemVerificationAPI.getLocations();
      setFloors(data.floors || []);
      setRacks(data.racks || []);
    } catch (error) {
      console.error("Failed to load locations", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadRackProgress = async () => {
    if (!sessionId || loadingRacks) return;
    setLoadingRacks(true);
    try {
      const data = await getRackProgress(sessionId);
      if (Array.isArray(data)) {
        setRackProgress(data);
      }
    } catch (error) {
      console.error("Failed to load rack progress", error);
    } finally {
      setLoadingRacks(false);
    }
  };

  const updateFilter = (key: keyof FilterValues, value: any) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value || undefined };
      // Remove empty strings
      Object.keys(updated).forEach((k) => {
        if (updated[k as keyof FilterValues] === "") {
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

  const openModal = (type: "floor" | "rack") => {
    setModalType(type);
    setModalVisible(true);
    if (type === "rack" && sessionId) {
      loadRackProgress();
    }
  };

  const handleSelection = (value: string) => {
    if (modalType) {
      updateFilter(modalType, value);
      setModalVisible(false);
      setModalType(null);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderSelectionModal = () => {
    const isRack = modalType === "rack";
    const data = isRack ? (rackProgress.length > 0 ? rackProgress : racks) : floors;
    const title = isRack ? "Select Rack" : "Select Floor";
    const isLoading = isRack ? loadingRacks : loadingLocations;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ margin: 20 }} />
            ) : (
              <FlatList
                data={data}
                keyExtractor={(item) => (typeof item === "string" ? item : item.rack)}
                renderItem={({ item }) => {
                  if (isRack && typeof item !== "string") {
                    // Render Rack Progress Card
                    return (
                      <RackProgressCard
                        rack={item.rack}
                        total={item.total}
                        counted={item.counted}
                        percentage={item.percentage}
                        isSelected={filters.rack === item.rack}
                        onPress={() => handleSelection(item.rack)}
                      />
                    );
                  }

                  // Default String Item (Floor or fallback Rack)
                  const value = typeof item === "string" ? item : item.rack;
                  return (
                    <TouchableOpacity
                      style={[styles.modalItem, { borderBottomColor: theme.colors.border }]}
                      onPress={() => handleSelection(value)}
                    >
                      <Text style={[styles.modalItemText, { color: theme.colors.text }]}>
                        {value}
                      </Text>
                      {filters[modalType!] === value && (
                        <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text
                    style={{ padding: 20, textAlign: "center", color: theme.colors.textSecondary }}
                  >
                    No {modalType}s available
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };

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
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.colors.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView style={styles.filtersContainer}>
          {showSearch && (
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Search</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                placeholder="Search by name, SKU, etc."
                placeholderTextColor={theme.colors.textSecondary}
                value={filters.search || ""}
                onChangeText={(text) => updateFilter("search", text)}
              />
            </View>
          )}

          <View style={styles.filterRow}>
            <View style={styles.filterGroupHalf}>
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Floor</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  },
                ]}
                onPress={() => openModal("floor")}
              >
                <Text
                  style={{
                    color: filters.floor ? theme.colors.text : theme.colors.textSecondary,
                  }}
                >
                  {filters.floor || "Select Floor"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroupHalf}>
              <Text style={[styles.filterLabel, { color: theme.colors.text }]}>Rack</Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  },
                ]}
                onPress={() => openModal("rack")}
              >
                <Text
                  style={{
                    color: filters.rack ? theme.colors.text : theme.colors.textSecondary,
                  }}
                >
                  {filters.rack || "Select Rack"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
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
                  onPress={() => updateFilter("verified", undefined)}
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
                  onPress={() => updateFilter("verified", true)}
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
                  onPress={() => updateFilter("verified", false)}
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
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  filterIcon: {
    marginRight: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
  },
  badge: {
    marginLeft: 8,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
    flexDirection: "row",
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  radioGroup: {
    flexDirection: "row",
    gap: 8,
  },
  radioOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
});
