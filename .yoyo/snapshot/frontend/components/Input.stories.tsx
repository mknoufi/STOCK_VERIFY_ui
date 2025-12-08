/**
 * Input Component Stories
 *
 * Documentation and examples for the Input component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { View, StyleSheet } from 'react-native';
import { useState } from 'react';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    docs: {
      description: {
        component: 'Enhanced text input component with label, error states, and icon support. Fully compatible with React Native and Web platforms.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Input label text',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    leftIcon: {
      control: 'text',
      description: 'Left icon name (Ionicons)',
    },
    rightIcon: {
      control: 'text',
      description: 'Right icon name (Ionicons)',
    },
    multiline: {
      control: 'boolean',
      description: 'Enable multiline input',
    },
    secureTextEntry: {
      control: 'boolean',
      description: 'Hide input text (for passwords)',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

// Default story
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

// With Label
export const WithLabel: Story = {
  args: {
    label: 'Item Name',
    placeholder: 'Enter item name',
  },
};

// With Error
export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter email',
    error: 'Please enter a valid email address',
    defaultValue: 'invalid-email',
  },
};

// With Left Icon
export const WithLeftIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search items...',
    leftIcon: 'search-outline',
  },
};

// With Right Icon
export const WithRightIcon: Story = {
  render: () => {
    const [value, setValue] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    return (
      <Input
        label="Password"
        placeholder="Enter password"
        secureTextEntry={!showPassword}
        value={value}
        onChangeText={setValue}
        rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
        onRightIconPress={() => setShowPassword(!showPassword)}
      />
    );
  },
};

// Multiline
export const Multiline: Story = {
  args: {
    label: 'Description',
    placeholder: 'Enter description...',
    multiline: true,
    numberOfLines: 4,
  },
};

// Numeric Input
export const Numeric: Story = {
  args: {
    label: 'Quantity',
    placeholder: '0',
    keyboardType: 'numeric',
    leftIcon: 'calculator-outline',
  },
};

// Email Input
export const Email: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'user@example.com',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    leftIcon: 'mail-outline',
  },
};

// Phone Input
export const Phone: Story = {
  args: {
    label: 'Phone Number',
    placeholder: '+1 (555) 123-4567',
    keyboardType: 'phone-pad',
    leftIcon: 'call-outline',
  },
};

// All States Showcase
export const AllStates: Story = {
  render: () => (
    <View style={styles.container}>
      <Input label="Default Input" placeholder="Default state" />
      <Input label="With Value" placeholder="Enter text" defaultValue="Sample text" />
      <Input label="With Error" placeholder="Enter text" error="This field is required" />
      <Input label="Disabled" placeholder="Disabled input" editable={false} />
      <Input label="With Icons" placeholder="Search..." leftIcon="search-outline" rightIcon="close-circle-outline" />
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 20,
  },
});
