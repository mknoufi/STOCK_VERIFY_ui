/**
 * Button Component Stories
 * 
 * Documentation and examples for the Button component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { View, StyleSheet } from 'react-native';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'Enhanced button component with multiple variants, sizes, and states. Supports icons, loading states, and full-width layouts.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'text', 'danger'],
      description: 'Button style variant',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      description: 'Button size',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable button interaction',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading spinner',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Make button full width',
    },
    iconPosition: {
      control: 'select',
      options: ['left', 'right'],
      description: 'Icon position relative to text',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

// Default story
export const Default: Story = {
  args: {
    title: 'Button',
    onPress: () => console.log('Pressed'),
  },
};

// Variants
export const Primary: Story = {
  args: {
    title: 'Primary Button',
    variant: 'primary',
    onPress: () => console.log('Primary pressed'),
  },
};

export const Secondary: Story = {
  args: {
    title: 'Secondary Button',
    variant: 'secondary',
    onPress: () => console.log('Secondary pressed'),
  },
};

export const Outline: Story = {
  args: {
    title: 'Outline Button',
    variant: 'outline',
    onPress: () => console.log('Outline pressed'),
  },
};

export const Text: Story = {
  args: {
    title: 'Text Button',
    variant: 'text',
    onPress: () => console.log('Text pressed'),
  },
};

export const Danger: Story = {
  args: {
    title: 'Delete Item',
    variant: 'danger',
    onPress: () => console.log('Danger pressed'),
  },
};

// Sizes
export const Small: Story = {
  args: {
    title: 'Small Button',
    size: 'small',
    onPress: () => console.log('Small pressed'),
  },
};

export const Medium: Story = {
  args: {
    title: 'Medium Button',
    size: 'medium',
    onPress: () => console.log('Medium pressed'),
  },
};

export const Large: Story = {
  args: {
    title: 'Large Button',
    size: 'large',
    onPress: () => console.log('Large pressed'),
  },
};

// States
export const Disabled: Story = {
  args: {
    title: 'Disabled Button',
    disabled: true,
    onPress: () => console.log('Should not fire'),
  },
};

export const Loading: Story = {
  args: {
    title: 'Loading Button',
    loading: true,
    onPress: () => console.log('Loading pressed'),
  },
};

// With Icons
export const WithLeftIcon: Story = {
  args: {
    title: 'Save',
    icon: 'save-outline',
    iconPosition: 'left',
    onPress: () => console.log('Save pressed'),
  },
};

export const WithRightIcon: Story = {
  args: {
    title: 'Next',
    icon: 'arrow-forward',
    iconPosition: 'right',
    onPress: () => console.log('Next pressed'),
  },
};

// Full Width
export const FullWidth: Story = {
  args: {
    title: 'Full Width Button',
    fullWidth: true,
    onPress: () => console.log('Full width pressed'),
  },
};

// All Variants Showcase
export const AllVariants: Story = {
  render: () => (
    <View style={styles.container}>
      <Button title="Primary" variant="primary" onPress={() => {}} style={styles.button} />
      <Button title="Secondary" variant="secondary" onPress={() => {}} style={styles.button} />
      <Button title="Outline" variant="outline" onPress={() => {}} style={styles.button} />
      <Button title="Text" variant="text" onPress={() => {}} style={styles.button} />
      <Button title="Danger" variant="danger" onPress={() => {}} style={styles.button} />
    </View>
  ),
};

// All Sizes Showcase
export const AllSizes: Story = {
  render: () => (
    <View style={styles.container}>
      <Button title="Small" size="small" onPress={() => {}} style={styles.button} />
      <Button title="Medium" size="medium" onPress={() => {}} style={styles.button} />
      <Button title="Large" size="large" onPress={() => {}} style={styles.button} />
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 20,
  },
  button: {
    marginBottom: 8,
  },
});

