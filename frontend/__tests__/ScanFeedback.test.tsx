import React from 'react';
import { render } from '@testing-library/react-native';
import { ScanFeedback } from '../src/components/ui/ScanFeedback';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
    Warning: 'warning',
  },
  ImpactFeedbackStyle: {
    Medium: 'medium',
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // The mock for call is needed for some animations
  Reanimated.default.call = () => {};
  return Reanimated;
});


describe('ScanFeedback Accessibility', () => {
  it('should have accessibility props when visible', () => {
    const { getByLabelText, getByRole } = render(
      <ScanFeedback
        visible={true}
        type="success"
        title="Scan Complete"
        message="Item added to cart"
      />
    );

    // This should fail initially because ScanFeedback lacks accessibility props
    const feedbackElement = getByLabelText('Scan Complete, Item added to cart');
    expect(feedbackElement).toBeTruthy();
    expect(feedbackElement.props.accessibilityRole).toBe('alert');
    expect(feedbackElement.props.accessibilityLiveRegion).toBe('polite');
    expect(feedbackElement.props.accessible).toBe(true);
  });

  it('should have assertive live region for errors', () => {
    const { getByLabelText } = render(
      <ScanFeedback
        visible={true}
        type="error"
        title="Scan Failed"
        message="Item not found"
      />
    );

    const feedbackElement = getByLabelText('Scan Failed, Item not found');
    expect(feedbackElement.props.accessibilityLiveRegion).toBe('assertive');
  });
});
