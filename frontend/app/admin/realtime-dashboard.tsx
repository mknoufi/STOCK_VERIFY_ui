import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  LoadingSpinner,
  ScreenContainer,
} from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";
import api from "../../src/services/api/api";

// Types
interface Column {
  field: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  filterable: boolean;
  width?: number;
  format?: string;
}

interface DashboardItem {
  id: string;
  item_code: string;
  item_name: string;
  barcode?: string;
  category?: string;
  warehouse?: string;
  floor?: string;
  rack_id?: string;
  stock_qty: number;
  counted_qty: number;
  variance: number;
  variance_percentage: number;
  mrp: number;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  counted_by: string;
  counted_at: string;
  session_id: string;
  notes?: string;
  status?: string;
}

interface DashboardStats {
  total_items: number;
  verified_items: number;
  pending_items: number;
  today_activity: number;
  total_variance: number;
  positive_variance: number;
  negative_variance: number;
  verification_rate: number;
}

interface Pagination {
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface Summary {
  total_records: number;
  filtered_records: number;
  aggregations: Record<string, number>;
  generated_at: string;
  generation_time_ms: number;
}

const isWeb = Platform.OS === "web";

// Format helpers
const formatValue = (value: any, format?: string): string => {
  if (value === null || value === undefined) return "-";

  switch (format) {
    case "date":
      try {
        const date = new Date(value);
        return date.toLocaleDateString() + " " + date.toLocaleTimeString();
      } catch {
        return String(value);
      }
    case "currency":
      return `₹${Number(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}`;
    case "percentage":
      return `${Number(value).toFixed(2)}%`;
    case "number":
      return Number(value).toLocaleString();
    default:
      if (typeof value === "boolean") return value ? "Yes" : "No";
      return String(value);
  }
};

// Column settings modal
const ColumnSettingsModal: React.FC<{
  visible: boolean;
  columns: Column[];
  onClose: () => void;
  onToggle: (field: string) => void;
  onResetDefaults: () => void;
}> = ({ visible, columns, onClose, onToggle, onResetDefaults }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Column Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={auroraTheme.colors.text.primary}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Toggle columns to show or hide them in the table
          </Text>

          <ScrollView style={styles.columnList}>
            {columns.map((col) => (
              <View key={col.field} style={styles.columnItem}>
                <Text style={styles.columnLabel}>{col.label}</Text>
                <Switch
                  value={col.visible}
                  onValueChange={() => onToggle(col.field)}
                  trackColor={{
                    false: "#767577",
                    true: auroraTheme.colors.primary[300],
                  }}
                  thumbColor={
                    col.visible ? auroraTheme.colors.primary[500] : "#f4f3f4"
                  }
                />
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={onResetDefaults}
            >
              <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Item details modal
const ItemDetailsModal: React.FC<{
  visible: boolean;
  item: DashboardItem | null;
  onClose: () => void;
}> = ({ visible, item, onClose }) => {
  if (!item) return null;

  const detailRows = [
    { label: "Item Code", value: item.item_code },
    { label: "Item Name", value: item.item_name },
    { label: "Barcode", value: item.barcode },
    { label: "Category", value: item.category },
    { label: "Warehouse", value: item.warehouse },
    { label: "Floor", value: item.floor },
    { label: "Rack", value: item.rack_id },
    { label: "ERP Qty", value: item.stock_qty, format: "number" },
    { label: "Counted Qty", value: item.counted_qty, format: "number" },
    { label: "Variance", value: item.variance, format: "number" },
    {
      label: "Variance %",
      value: item.variance_percentage,
      format: "percentage",
    },
    { label: "MRP", value: item.mrp, format: "currency" },
    { label: "Status", value: item.verified ? "Verified" : "Pending" },
    { label: "Verified By", value: item.verified_by },
    { label: "Verified At", value: item.verified_at, format: "date" },
    { label: "Counted By", value: item.counted_by },
    { label: "Counted At", value: item.counted_at, format: "date" },
    { label: "Session ID", value: item.session_id },
    { label: "Notes", value: item.notes },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.detailsModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Item Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={auroraTheme.colors.text.primary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailsList}>
            {detailRows.map(
              (row, index) =>
                row.value !== undefined &&
                row.value !== null && (
                  <View key={index} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>
                      {formatValue(row.value, row.format)}
                    </Text>
                  </View>
                ),
            )}
          </ScrollView>

          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Stats card component
const StatsCard: React.FC<{
  label: string;
  value: number | string;
  icon: string;
  color: string;
  format?: string;
}> = ({ label, value, icon, color, format }) => (
  <View style={[styles.statsCard, { borderLeftColor: color }]}>
    <View
      style={[styles.statsIconContainer, { backgroundColor: color + "20" }]}
    >
      <Ionicons name={icon as any} size={20} color={color} />
    </View>
    <View style={styles.statsTextContainer}>
      <Text style={styles.statsValue}>{formatValue(value, format)}</Text>
      <Text style={styles.statsLabel}>{label}</Text>
    </View>
  </View>
);

// Main Dashboard Component
export default function RealtimeDashboard() {
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [_error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardItem[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: 50,
    total_pages: 1,
    has_next: false,
    has_prev: false,
  });

  // UI State
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DashboardItem | null>(null);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortBy, setSortBy] = useState<string>("counted_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [verifiedFilter, setVerifiedFilter] = useState<boolean | null>(null);

  // Visible columns
  const visibleColumns = useMemo(
    () => columns.filter((col) => col.visible),
    [columns],
  );

  // Fetch data
  const fetchData = useCallback(
    async (page = 1) => {
      try {
        const config = {
          page,
          page_size: pagination.page_size,
          sort_by: sortBy,
          sort_order: sortOrder,
          columns: columns.map((col) => ({
            field: col.field,
            visible: col.visible,
          })),
          filters:
            verifiedFilter !== null ? { verified: verifiedFilter } : undefined,
          auto_refresh: autoRefresh,
          refresh_interval_seconds: 10,
        };

        const response = await api.post("/api/dashboard/data", config);

        if (response.data.success) {
          setData(response.data.data);
          if (response.data.columns && columns.length === 0) {
            setColumns(response.data.columns);
          }
          setSummary(response.data.summary);
          setPagination(response.data.pagination);
          setError(null);
        }
      } catch (err: any) {
        console.error("Dashboard data fetch error:", err);
        setError(err.message || "Failed to fetch data");
      }
    },
    [
      columns,
      sortBy,
      sortOrder,
      verifiedFilter,
      pagination.page_size,
      autoRefresh,
    ],
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get("/api/dashboard/stats");
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }, []);

  // Fetch columns
  const fetchColumns = useCallback(async () => {
    try {
      const response = await api.get(
        "/api/dashboard/columns?report_type=verified_items",
      );
      if (response.data.success) {
        setColumns(response.data.columns);
      }
    } catch (err) {
      console.error("Columns fetch error:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchColumns();
      await Promise.all([fetchData(), fetchStats()]);
      setLoading(false);
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        fetchData(pagination.page);
        fetchStats();
      }, 10000); // 10 seconds
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, pagination.page, fetchData, fetchStats]);

  // Refresh data
  useEffect(() => {
    if (!loading) {
      fetchData(pagination.page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder, verifiedFilter]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchData(pagination.page), fetchStats()]);
    setRefreshing(false);
  };

  const handleColumnToggle = (field: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.field === field ? { ...col, visible: !col.visible } : col,
      ),
    );
  };

  const handleResetColumns = async () => {
    await fetchColumns();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    fetchData(newPage);
  };

  const handleItemPress = (item: DashboardItem) => {
    setSelectedItem(item);
    setShowItemDetails(true);
  };

  const handleExportCSV = async () => {
    try {
      const config = {
        columns: columns.map((col) => ({
          field: col.field,
          visible: col.visible,
        })),
        filters:
          verifiedFilter !== null ? { verified: verifiedFilter } : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const response = await api.post("/api/dashboard/export/csv", config, {
        responseType: "blob",
      });

      // Download file
      if (isWeb) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `dashboard_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      console.error("Export error:", err);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <ScreenContainer
        gradient
        header={{
          title: "Real-Time Dashboard",
          subtitle: `${summary?.filtered_records || 0} items`,
          showBackButton: true,
        }}
      >
        <View style={styles.centered}>
          <LoadingSpinner size={48} color={auroraTheme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      gradient
      header={{
        title: "Real-Time Dashboard",
        subtitle: `${summary?.filtered_records || 0} items`,
        showBackButton: true,
      }}
    >

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Stats Section */}
        {stats && (
          <View style={styles.statsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <StatsCard
                label="Total Items"
                value={stats.total_items}
                icon="cube"
                color="#4CAF50"
                format="number"
              />
              <StatsCard
                label="Verified"
                value={stats.verified_items}
                icon="checkmark-circle"
                color="#2196F3"
                format="number"
              />
              <StatsCard
                label="Pending"
                value={stats.pending_items}
                icon="time"
                color="#FF9800"
                format="number"
              />
              <StatsCard
                label="Verification Rate"
                value={stats.verification_rate}
                icon="trending-up"
                color="#9C27B0"
                format="percentage"
              />
              <StatsCard
                label="Total Variance"
                value={stats.total_variance}
                icon="analytics"
                color={stats.total_variance < 0 ? "#F44336" : "#4CAF50"}
                format="number"
              />
              <StatsCard
                label="Today's Activity"
                value={stats.today_activity}
                icon="today"
                color="#00BCD4"
                format="number"
              />
            </ScrollView>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.controlsLeft}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setVerifiedFilter(null)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  verifiedFilter === null && styles.filterButtonTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setVerifiedFilter(true)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  verifiedFilter === true && styles.filterButtonTextActive,
                ]}
              >
                Verified
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setVerifiedFilter(false)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  verifiedFilter === false && styles.filterButtonTextActive,
                ]}
              >
                Pending
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controlsRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setAutoRefresh(!autoRefresh)}
            >
              <Ionicons
                name={autoRefresh ? "sync" : "sync-outline"}
                size={20}
                color={
                  autoRefresh
                    ? auroraTheme.colors.primary[500]
                    : auroraTheme.colors.text.secondary
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowColumnSettings(true)}
            >
              <Ionicons
                name="options"
                size={20}
                color={auroraTheme.colors.text.primary}
              />
            </TouchableOpacity>
            {isWeb && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleExportCSV}
              >
                <Ionicons
                  name="download"
                  size={20}
                  color={auroraTheme.colors.text.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Generation time */}
        {summary && (
          <View style={styles.generationInfo}>
            <Text style={styles.generationText}>
              Generated in {summary.generation_time_ms.toFixed(0)}ms •{" "}
              {summary.filtered_records} of {summary.total_records} records
            </Text>
            {autoRefresh && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            )}
          </View>
        )}

        {/* Data Table */}
        <View style={styles.tableContainer}>
          {/* Header */}
          <ScrollView horizontal showsHorizontalScrollIndicator={isWeb}>
            <View>
              <View style={styles.tableHeader}>
                {visibleColumns.map((col) => (
                  <TouchableOpacity
                    key={col.field}
                    style={[
                      styles.tableHeaderCell,
                      { width: col.width || 120 },
                    ]}
                    onPress={() => col.sortable && handleSort(col.field)}
                    disabled={!col.sortable}
                  >
                    <Text style={styles.tableHeaderText}>{col.label}</Text>
                    {col.sortable && sortBy === col.field && (
                      <Ionicons
                        name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                        size={14}
                        color={auroraTheme.colors.primary[500]}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Rows */}
              {data.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="document-text-outline"
                    size={48}
                    color={auroraTheme.colors.text.secondary}
                  />
                  <Text style={styles.emptyText}>No data found</Text>
                </View>
              ) : (
                data.map((item, rowIndex) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.tableRow,
                      rowIndex % 2 === 0 && styles.tableRowAlt,
                      item.verified && styles.tableRowVerified,
                    ]}
                    onPress={() => handleItemPress(item)}
                  >
                    {visibleColumns.map((col) => (
                      <View
                        key={col.field}
                        style={[styles.tableCell, { width: col.width || 120 }]}
                      >
                        <Text
                          style={[
                            styles.tableCellText,
                            col.field === "variance" &&
                              (item[col.field] as number) < 0 &&
                              styles.negativeValue,
                            col.field === "variance" &&
                              (item[col.field] as number) > 0 &&
                              styles.positiveValue,
                          ]}
                          numberOfLines={1}
                        >
                          {formatValue(
                            item[col.field as keyof DashboardItem],
                            col.format,
                          )}
                        </Text>
                      </View>
                    ))}
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </View>

        {/* Pagination */}
        <View style={styles.pagination}>
          <TouchableOpacity
            style={[
              styles.pageButton,
              !pagination.has_prev && styles.pageButtonDisabled,
            ]}
            onPress={() => handlePageChange(pagination.page - 1)}
            disabled={!pagination.has_prev}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.pageInfo}>
            Page {pagination.page} of {pagination.total_pages}
          </Text>

          <TouchableOpacity
            style={[
              styles.pageButton,
              !pagination.has_next && styles.pageButtonDisabled,
            ]}
            onPress={() => handlePageChange(pagination.page + 1)}
            disabled={!pagination.has_next}
          >
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Aggregations */}
        {summary?.aggregations &&
          Object.keys(summary.aggregations).length > 0 && (
            <View style={styles.aggregations}>
              <Text style={styles.aggregationsTitle}>Summary</Text>
              <View style={styles.aggregationGrid}>
                {summary.aggregations.total_items !== undefined && (
                  <View style={styles.aggregationItem}>
                    <Text style={styles.aggregationValue}>
                      {summary.aggregations.total_items.toLocaleString()}
                    </Text>
                    <Text style={styles.aggregationLabel}>Total Items</Text>
                  </View>
                )}
                {summary.aggregations.total_variance !== undefined && (
                  <View style={styles.aggregationItem}>
                    <Text
                      style={[
                        styles.aggregationValue,
                        summary.aggregations.total_variance < 0
                          ? styles.negativeValue
                          : styles.positiveValue,
                      ]}
                    >
                      {summary.aggregations.total_variance.toLocaleString()}
                    </Text>
                    <Text style={styles.aggregationLabel}>Total Variance</Text>
                  </View>
                )}
                {summary.aggregations.total_value !== undefined && (
                  <View style={styles.aggregationItem}>
                    <Text style={styles.aggregationValue}>
                      ₹
                      {summary.aggregations.total_value.toLocaleString("en-IN")}
                    </Text>
                    <Text style={styles.aggregationLabel}>Total Value</Text>
                  </View>
                )}
                {summary.aggregations.verified_count !== undefined && (
                  <View style={styles.aggregationItem}>
                    <Text style={styles.aggregationValue}>
                      {summary.aggregations.verified_count.toLocaleString()}
                    </Text>
                    <Text style={styles.aggregationLabel}>Verified Count</Text>
                  </View>
                )}
              </View>
            </View>
          )}
      </ScrollView>

      {/* Modals */}
      <ColumnSettingsModal
        visible={showColumnSettings}
        columns={columns}
        onClose={() => setShowColumnSettings(false)}
        onToggle={handleColumnToggle}
        onResetDefaults={handleResetColumns}
      />

      <ItemDetailsModal
        visible={showItemDetails}
        item={selectedItem}
        onClose={() => setShowItemDetails(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: auroraTheme.colors.text.primary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: auroraTheme.spacing.md,
    paddingBottom: 32,
  },
  statsContainer: {
    marginBottom: auroraTheme.spacing.lg,
  },
  statsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.md,
    padding: auroraTheme.spacing.md,
    marginRight: auroraTheme.spacing.md,
    borderLeftWidth: 3,
    minWidth: 140,
  },
  statsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: auroraTheme.spacing.sm,
  },
  statsTextContainer: {
    flex: 1,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
  },
  statsLabel: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
    marginTop: 2,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.md,
  },
  controlsLeft: {
    flexDirection: "row",
    gap: auroraTheme.spacing.sm,
  },
  controlsRight: {
    flexDirection: "row",
    gap: auroraTheme.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.sm,
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.sm,
  },
  filterButtonText: {
    fontSize: 13,
    color: auroraTheme.colors.text.secondary,
  },
  filterButtonTextActive: {
    color: auroraTheme.colors.primary[500],
    fontWeight: "600",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: auroraTheme.colors.surface.base,
    justifyContent: "center",
    alignItems: "center",
  },
  generationInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.md,
    paddingHorizontal: auroraTheme.spacing.sm,
  },
  generationText: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4CAF50",
  },
  liveText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "600",
  },
  tableContainer: {
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.lg,
    overflow: "hidden",
    marginBottom: auroraTheme.spacing.lg,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: auroraTheme.colors.surface.elevated,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.subtle,
  },
  tableHeaderCell: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.md,
    gap: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.subtle,
  },
  tableRowAlt: {
    backgroundColor: auroraTheme.colors.surface.elevated + "40",
  },
  tableRowVerified: {
    backgroundColor: "#4CAF5010",
  },
  tableCell: {
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.md,
    justifyContent: "center",
  },
  tableCellText: {
    fontSize: 13,
    color: auroraTheme.colors.text.primary,
  },
  negativeValue: {
    color: "#F44336",
  },
  positiveValue: {
    color: "#4CAF50",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: auroraTheme.colors.text.secondary,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: auroraTheme.spacing.lg,
    marginBottom: auroraTheme.spacing.lg,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: auroraTheme.colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
  },
  pageButtonDisabled: {
    backgroundColor: auroraTheme.colors.surface.elevated,
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 14,
    color: auroraTheme.colors.text.primary,
  },
  aggregations: {
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.lg,
    padding: auroraTheme.spacing.lg,
  },
  aggregationsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
    marginBottom: auroraTheme.spacing.md,
  },
  aggregationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: auroraTheme.spacing.md,
  },
  aggregationItem: {
    flex: 1,
    minWidth: 120,
    backgroundColor: auroraTheme.colors.surface.elevated,
    borderRadius: auroraTheme.borderRadius.md,
    padding: auroraTheme.spacing.md,
    alignItems: "center",
  },
  aggregationValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
  },
  aggregationLabel: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
    marginTop: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.xl,
    padding: auroraTheme.spacing.lg,
  },
  detailsModalContent: {
    width: "90%",
    maxWidth: 500,
    maxHeight: "85%",
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.xl,
    padding: auroraTheme.spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: auroraTheme.colors.text.secondary,
    marginBottom: auroraTheme.spacing.lg,
  },
  columnList: {
    flex: 1,
  },
  columnItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: auroraTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.subtle,
  },
  columnLabel: {
    fontSize: 14,
    color: auroraTheme.colors.text.primary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: auroraTheme.spacing.md,
    marginTop: auroraTheme.spacing.lg,
  },
  resetButton: {
    flex: 1,
    paddingVertical: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.subtle,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 14,
    color: auroraTheme.colors.text.secondary,
  },
  doneButton: {
    flex: 1,
    paddingVertical: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.md,
    backgroundColor: auroraTheme.colors.primary[500],
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  detailsList: {
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: auroraTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.subtle,
  },
  detailLabel: {
    fontSize: 14,
    color: auroraTheme.colors.text.secondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: auroraTheme.colors.text.primary,
    flex: 1,
    textAlign: "right",
  },
});
