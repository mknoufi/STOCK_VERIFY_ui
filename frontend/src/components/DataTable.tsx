/**
 * Data Table Component
 * Advanced table with sorting, filtering, and pagination
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: number;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface TableData {
  [key: string]: any;
}

interface DataTableProps {
  columns: TableColumn[];
  data: TableData[];
  sortable?: boolean;
  filterable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  onRowPress?: (row: TableData) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  sortable = true,
  filterable = false,
  paginated = false,
  pageSize = 20,
  onRowPress,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortable || !sortColumn) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) {
        return 0;
      }

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection, sortable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!paginated) {
      return sortedData;
    }

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, pageSize, paginated]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handle sort
  const handleSort = (column: string) => {
    if (!sortable) {
      return;
    }

    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      {columns.map((column) => (
        <TouchableOpacity
          key={column.key}
          style={
            [styles.headerCell, column.width && { width: column.width }] as any
          }
          onPress={() => column.sortable && handleSort(column.key)}
          disabled={!column.sortable}
        >
          <Text style={styles.headerText}>{column.label}</Text>
          {sortable && column.sortable && sortColumn === column.key && (
            <Ionicons
              name={sortDirection === "asc" ? "chevron-up" : "chevron-down"}
              size={16}
              color="#2196F3"
              style={styles.sortIcon}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render row
  const renderRow = (item: TableData, index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.row, index % 2 === 0 && styles.rowEven]}
      onPress={() => onRowPress?.(item)}
      disabled={!onRowPress}
    >
      {columns.map((column) => (
        <View
          key={column.key}
          style={[styles.cell, column.width && { width: column.width }] as any}
        >
          {column.render ? (
            column.render(item[column.key], item)
          ) : (
            <Text style={styles.cellText}>
              {String(item[column.key] || "")}
            </Text>
          )}
        </View>
      ))}
    </TouchableOpacity>
  );

  // Render pagination
  const renderPagination = () => {
    if (!paginated || totalPages <= 1) {
      return null;
    }

    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[
            styles.paginationButton,
            currentPage === 1 && styles.paginationButtonDisabled,
          ]}
          onPress={() => setCurrentPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={currentPage === 1 ? "#ccc" : "#2196F3"}
          />
        </TouchableOpacity>

        <Text style={styles.paginationText}>
          Page {currentPage} of {totalPages}
        </Text>

        <TouchableOpacity
          style={[
            styles.paginationButton,
            currentPage === totalPages && styles.paginationButtonDisabled,
          ]}
          onPress={() => setCurrentPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={currentPage === totalPages ? "#ccc" : "#2196F3"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // FlashList no longer requires estimatedItemSize in newer versions

  // For horizontal scrolling tables, we need a different approach
  // FlashList doesn't work well nested in ScrollView, so we'll use a hybrid approach
  // Use FlashList for vertical scrolling, but keep horizontal scroll wrapper
  return (
    <View style={styles.container}>
      {renderHeader()}
      <View style={styles.tableWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.horizontalScroll}
        >
          <View style={styles.tableContent}>
            <FlashList
              data={paginatedData}
              renderItem={({ item, index }) => renderRow(item, index)}
              keyExtractor={(item, index) => {
                // Create a stable key from item data
                const keyParts = columns
                  .map((col) => String(item[col.key] || ""))
                  .join("-");
                return `row-${index}-${keyParts.substring(0, 30)}`;
              }}
              extraData={sortColumn}
              scrollEnabled={false} // Disable FlashList scrolling since we're in a ScrollView
            />
          </View>
        </ScrollView>
      </View>
      {renderPagination()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  tableWrapper: {
    maxHeight: 400, // Limit table height
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  tableContent: {
    minWidth: "100%",
  },
  header: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerCell: {
    flex: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 100,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  sortIcon: {
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  rowEven: {
    backgroundColor: "#fafafa",
  },
  cell: {
    flex: 1,
    padding: 12,
    minWidth: 100,
    justifyContent: "center",
  },
  cellText: {
    fontSize: 14,
    color: "#333",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    gap: 16,
  },
  paginationButton: {
    padding: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  paginationText: {
    fontSize: 14,
    color: "#666",
  },
});
