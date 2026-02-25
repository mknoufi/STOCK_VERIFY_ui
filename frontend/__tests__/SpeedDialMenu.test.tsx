import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SpeedDialMenu } from '../src/components/ui/SpeedDialMenu';

// Mocks
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('expo-blur', () => ({
  BlurView: ({ children }) => children,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) => children,
}));

// Mock Reanimated properly
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

describe('SpeedDialMenu Accessibility', () => {
  const mockAction = jest.fn();
  const actions = [
    {
      icon: 'add' as const,
      label: 'Add Item',
      onPress: mockAction,
      accessibilityLabel: 'Add New Item',
      accessibilityHint: 'Create a new inventory item',
    },
  ];

  it('renders main button with accessibility props', () => {
    const { getByLabelText, getByRole } = render(
      <SpeedDialMenu
        actions={actions}
        accessibilityLabel="Open Menu"
        accessibilityHint="Double tap for options"
      />
    );

    const mainButton = getByLabelText('Open Menu');
    expect(mainButton).toBeTruthy();
    expect(mainButton.props.accessibilityRole).toBe('button');
    expect(mainButton.props.accessibilityHint).toBe('Double tap for options');
    expect(mainButton.props.accessibilityState).toEqual({ expanded: false });
  });

  it('toggles expanded state on press', async () => {
    const { getByLabelText } = render(
      <SpeedDialMenu actions={actions} accessibilityLabel="Open Menu" />
    );

    const mainButton = getByLabelText('Open Menu');
    fireEvent.press(mainButton);

    // After press, state should update (in a real app, strict equality might fail due to async nature, but let's try)
    await waitFor(() => {
        expect(mainButton.props.accessibilityState).toEqual({ expanded: true });
    });
  });

  it('renders action items with accessibility props when expanded', async () => {
    const { getByLabelText, getByText } = render(
      <SpeedDialMenu actions={actions} accessibilityLabel="Open Menu" />
    );

    const mainButton = getByLabelText('Open Menu');
    fireEvent.press(mainButton);

    const actionButton = getByLabelText('Add New Item');
    expect(actionButton).toBeTruthy();
    expect(actionButton.props.accessibilityRole).toBe('button');
    expect(actionButton.props.accessibilityHint).toBe('Create a new inventory item');

    // Check fallback to label if no accessibilityLabel provided
    const actionLabel = getByText('Add Item');
    expect(actionLabel).toBeTruthy();
  });

  it('renders accessible backdrop when expanded', async () => {
    const { getByLabelText } = render(
      <SpeedDialMenu actions={actions} accessibilityLabel="Open Menu" />
    );

    const mainButton = getByLabelText('Open Menu');
    fireEvent.press(mainButton);

    const backdrop = getByLabelText('Close menu');
    expect(backdrop).toBeTruthy();
    expect(backdrop.props.accessibilityRole).toBe('button');
    expect(backdrop.props.accessibilityHint).toBe('Double tap to close the menu');
  });
});
