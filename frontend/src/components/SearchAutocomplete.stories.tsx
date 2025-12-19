/**
 * SearchAutocomplete Component Stories
 *
 * Documentation and examples for the SearchAutocomplete component
 */

import type { Meta, StoryObj } from "@storybook/react";
import { SearchAutocomplete } from "./forms/SearchAutocomplete";
import { View, StyleSheet } from "react-native";
import { useState } from "react";

const meta: Meta<typeof SearchAutocomplete> = {
  title: "Components/SearchAutocomplete",
  component: SearchAutocomplete,
  parameters: {
    docs: {
      description: {
        component:
          "Enhanced search component with dropdown suggestions, debounced search, and barcode scanning support. Shows results after minimum character threshold.",
      },
    },
  },
  argTypes: {
    placeholder: {
      control: "text",
      description: "Placeholder text",
    },
    minChars: {
      control: { type: "number", min: 1, max: 10, step: 1 },
      description: "Minimum characters before search",
    },
    showIcon: {
      control: "boolean",
      description: "Show search icon",
    },
    autoFocus: {
      control: "boolean",
      description: "Auto-focus input on mount",
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SearchAutocomplete>;

// Mock search results for stories

// Wrapper component for interactive stories
const SearchWrapper = (args: any) => {
  const [selectedItem, setSelectedItem] = useState<any>(null);

  return (
    <View style={styles.container}>
      <SearchAutocomplete
        {...args}
        onSelectItem={(item) => {
          setSelectedItem(item);
          console.log("Selected:", item);
        }}
        onBarcodeScan={(barcode) => {
          console.log("Barcode scanned:", barcode);
        }}
      />
      {selectedItem && (
        <View style={styles.result}>
          <span>
            Selected: {selectedItem.item_name} ({selectedItem.item_code})
          </span>
        </View>
      )}
    </View>
  );
};

// Default story
export const Default: Story = {
  render: (args) => <SearchWrapper {...args} />,
  args: {
    placeholder: "Search by name, code, or barcode (min 4 chars)",
    minChars: 4,
    showIcon: true,
    autoFocus: false,
  },
};

// Custom Placeholder
export const CustomPlaceholder: Story = {
  render: (args) => <SearchWrapper {...args} />,
  args: {
    placeholder: "Type to search items...",
    minChars: 3,
    showIcon: true,
  },
};

// Without Icon
export const WithoutIcon: Story = {
  render: (args) => <SearchWrapper {...args} />,
  args: {
    placeholder: "Search items...",
    showIcon: false,
    minChars: 4,
  },
};

// Auto Focus
export const AutoFocus: Story = {
  render: (args) => <SearchWrapper {...args} />,
  args: {
    placeholder: "Search...",
    autoFocus: true,
    minChars: 4,
  },
};

// Minimum Characters
export const MinimumCharacters: Story = {
  render: (args) => <SearchWrapper {...args} />,
  args: {
    placeholder: "Type at least 3 characters...",
    minChars: 3,
    showIcon: true,
  },
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    width: "100%",
  },
  result: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
});
