/**
 * Card Component Stories
 *
 * Documentation and examples for the Card component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from './Button';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    docs: {
      description: {
        component: 'Material Design card component with title, subtitle, and customizable elevation. Supports pressable cards.',
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Card title',
    },
    subtitle: {
      control: 'text',
      description: 'Card subtitle',
    },
    elevation: {
      control: { type: 'range', min: 0, max: 8, step: 1 },
      description: 'Card elevation/shadow depth',
    },
    padding: {
      control: { type: 'range', min: 0, max: 32, step: 4 },
      description: 'Card padding',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

// Default story
export const Default: Story = {
  args: {
    children: <Text>Card content goes here</Text>,
  },
};

// With Title
export const WithTitle: Story = {
  args: {
    title: 'Card Title',
    children: <Text>This card has a title</Text>,
  },
};

// With Title and Subtitle
export const WithTitleAndSubtitle: Story = {
  args: {
    title: 'Item Details',
    subtitle: 'Stock verification information',
    children: <Text>Card content with both title and subtitle</Text>,
  },
};

// Pressable Card
export const Pressable: Story = {
  args: {
    title: 'Pressable Card',
    subtitle: 'Tap to interact',
    onPress: () => console.log('Card pressed'),
    children: <Text>This card can be pressed</Text>,
  },
};

// Different Elevations
export const LowElevation: Story = {
  args: {
    title: 'Low Elevation',
    elevation: 1,
    children: <Text>Card with low elevation (1)</Text>,
  },
};

export const MediumElevation: Story = {
  args: {
    title: 'Medium Elevation',
    elevation: 4,
    children: <Text>Card with medium elevation (4)</Text>,
  },
};

export const HighElevation: Story = {
  args: {
    title: 'High Elevation',
    elevation: 8,
    children: <Text>Card with high elevation (8)</Text>,
  },
};

// With Custom Padding
export const CustomPadding: Story = {
  args: {
    title: 'Custom Padding',
    padding: 24,
    children: <Text>Card with custom padding (24px)</Text>,
  },
};

// Complex Content
export const ComplexContent: Story = {
  args: {
    title: 'Item Card',
    subtitle: 'Stock: 150 units',
    children: (
      <View style={styles.complexContent}>
        <Text style={styles.description}>
          This card contains complex content including buttons and multiple text elements.
        </Text>
        <View style={styles.buttonRow}>
          <Button title="Edit" variant="outline" size="small" onPress={() => {}} />
          <Button title="Delete" variant="danger" size="small" onPress={() => {}} />
        </View>
      </View>
    ),
  },
};

// All Elevations Showcase
export const AllElevations: Story = {
  render: () => (
    <View style={styles.container}>
      <Card title="Elevation 0" elevation={0} style={styles.card}>
        <Text>No shadow</Text>
      </Card>
      <Card title="Elevation 2" elevation={2} style={styles.card}>
        <Text>Default shadow</Text>
      </Card>
      <Card title="Elevation 4" elevation={4} style={styles.card}>
        <Text>Medium shadow</Text>
      </Card>
      <Card title="Elevation 8" elevation={8} style={styles.card}>
        <Text>High shadow</Text>
      </Card>
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 20,
  },
  card: {
    marginHorizontal: 0,
  },
  complexContent: {
    gap: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
});
