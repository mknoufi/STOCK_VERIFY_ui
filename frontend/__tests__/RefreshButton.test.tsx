import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RefreshButton } from '../src/components/RefreshButton';
import { theme } from '../src/styles/modernDesignSystem';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('RefreshButton', () => {
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByRole } = render(
      <RefreshButton onRefresh={mockOnRefresh} />
    );

    const button = getByRole('button');
    expect(button).toBeTruthy();
    expect(button.props.accessibilityLabel).toBe('Refresh content');
  });

  it('renders correctly with custom props', () => {
    const { getByLabelText } = render(
      <RefreshButton
        onRefresh={mockOnRefresh}
        accessibilityLabel="Custom Refresh"
        loading={true}
      />
    );

    const button = getByLabelText('Custom Refresh');
    expect(button).toBeTruthy();
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ busy: true }));
    expect(button.props.accessibilityRole).toBe('button');
  });

  it('calls onRefresh when pressed', () => {
    const { getByRole } = render(
      <RefreshButton onRefresh={mockOnRefresh} />
    );

    fireEvent.press(getByRole('button'));
    expect(mockOnRefresh).toHaveBeenCalled();
  });
});
