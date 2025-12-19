/**
 * DataTable Component Stories
 *
 * Documentation and examples for the DataTable component
 */

import type { Meta, StoryObj } from "@storybook/react";
import { DataTable, TableColumn, TableData } from "./DataTable";
import { View, Text, StyleSheet } from "react-native";

const meta: Meta<typeof DataTable> = {
  title: "Components/DataTable",
  component: DataTable,
  parameters: {
    docs: {
      description: {
        component:
          "High-performance table component with sorting, filtering, and pagination. Uses FlashList for optimal performance with large datasets.",
      },
    },
  },
  argTypes: {
    sortable: {
      control: "boolean",
      description: "Enable column sorting",
    },
    filterable: {
      control: "boolean",
      description: "Enable filtering (future feature)",
    },
    paginated: {
      control: "boolean",
      description: "Enable pagination",
    },
    pageSize: {
      control: { type: "number", min: 5, max: 100, step: 5 },
      description: "Items per page",
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

// Sample data
const sampleData: TableData[] = [
  {
    id: "1",
    item_code: "ITEM001",
    item_name: "Product A",
    stock_qty: 150,
    mrp: 299.99,
    category: "Electronics",
  },
  {
    id: "2",
    item_code: "ITEM002",
    item_name: "Product B",
    stock_qty: 75,
    mrp: 499.99,
    category: "Clothing",
  },
  {
    id: "3",
    item_code: "ITEM003",
    item_name: "Product C",
    stock_qty: 200,
    mrp: 199.99,
    category: "Electronics",
  },
  {
    id: "4",
    item_code: "ITEM004",
    item_name: "Product D",
    stock_qty: 50,
    mrp: 899.99,
    category: "Furniture",
  },
  {
    id: "5",
    item_code: "ITEM005",
    item_name: "Product E",
    stock_qty: 300,
    mrp: 149.99,
    category: "Clothing",
  },
];

const columns: TableColumn[] = [
  { key: "item_code", label: "Item Code", sortable: true },
  { key: "item_name", label: "Item Name", sortable: true },
  { key: "stock_qty", label: "Stock", sortable: true },
  {
    key: "mrp",
    label: "MRP",
    sortable: true,
    render: (value) => `₹${Number(value).toFixed(2)}`,
  },
  { key: "category", label: "Category", sortable: true },
];

// Default story
export const Default: Story = {
  args: {
    columns,
    data: sampleData,
    sortable: true,
    paginated: false,
  },
};

// With Pagination
export const WithPagination: Story = {
  args: {
    columns,
    data: sampleData,
    sortable: true,
    paginated: true,
    pageSize: 3,
  },
};

// Large Dataset
export const LargeDataset: Story = {
  args: {
    columns,
    data: Array.from({ length: 100 }, (_, i) => ({
      id: String(i + 1),
      item_code: `ITEM${String(i + 1).padStart(3, "0")}`,
      item_name: `Product ${i + 1}`,
      stock_qty: Math.floor(Math.random() * 500),
      mrp: Math.floor(Math.random() * 1000) + 100,
      category: ["Electronics", "Clothing", "Furniture", "Food"][i % 4],
    })),
    sortable: true,
    paginated: true,
    pageSize: 20,
  },
};

// Custom Renderers
export const CustomRenderers: Story = {
  args: {
    columns: [
      { key: "item_code", label: "Item Code", sortable: true },
      { key: "item_name", label: "Item Name", sortable: true },
      {
        key: "stock_qty",
        label: "Stock",
        sortable: true,
        render: (value, row) => {
          const qty = Number(value);
          const color =
            qty > 100 ? "#4CAF50" : qty > 50 ? "#FF9800" : "#F44336";
          return (
            <View
              style={[styles.stockBadge, { backgroundColor: color + "20" }]}
            >
              <View style={[styles.stockDot, { backgroundColor: color }]} />
              <Text style={[styles.stockText, { color }]}>{qty}</Text>
            </View>
          );
        },
      },
      {
        key: "mrp",
        label: "MRP",
        sortable: true,
        render: (value) => (
          <Text style={styles.mrpText}>₹{Number(value).toFixed(2)}</Text>
        ),
      },
    ],
    data: sampleData,
    sortable: true,
    paginated: false,
  },
};

// Sortable Columns
export const SortableColumns: Story = {
  args: {
    columns: [
      { key: "item_code", label: "Item Code", sortable: true },
      { key: "item_name", label: "Item Name", sortable: true },
      { key: "stock_qty", label: "Stock", sortable: true },
      { key: "mrp", label: "MRP", sortable: true },
      { key: "category", label: "Category", sortable: false },
    ],
    data: sampleData,
    sortable: true,
    paginated: false,
  },
};

// Empty State
export const EmptyState: Story = {
  args: {
    columns,
    data: [],
    sortable: true,
    paginated: false,
  },
};

const styles = StyleSheet.create({
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 14,
    fontWeight: "500",
  },
  mrpText: {
    fontWeight: "bold",
    color: "#2196F3",
  },
});
