import React from 'react';
import { render } from '@testing-library/react-native';
import { ScanFeedback } from '../src/components/ui/ScanFeedback';

// Mock expo-haptics
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

// Mock react-native-reanimated
// Using a basic mock to bypass animation logic during tests
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSpring: jest.fn(),
    withTiming: jest.fn(),
    withSequence: jest.fn(),
    withDelay: jest.fn(),
    withRepeat: jest.fn(),
    Easing: {
      out: jest.fn(),
      ease: jest.fn(),
    },
  };
});

describe('ScanFeedback Accessibility', () => {
  it('renders with accessibilityRole="alert" and correct live region for error', () => {
    const { getByRole } = render(
      <ScanFeedback
        type="error"
        title="Error Occurred"
        message="Please try again."
        visible={true}
      />
    );

    const alert = getByRole('alert');
    expect(alert).toBeTruthy();
    expect(alert.props.accessibilityLiveRegion).toBe('assertive');
    // We expect the label to be combined
    expect(alert.props.accessibilityLabel).toBe('Error Occurred, Please try again.');
  });

  it('renders with accessibilityRole="alert" and correct live region for success', () => {
    const { getByRole } = render(
      <ScanFeedback
        type="success"
        title="Scan Successful"
        visible={true}
      />
    );

    const alert = getByRole('alert');
    expect(alert).toBeTruthy();
    expect(alert.props.accessibilityLiveRegion).toBe('polite');
    expect(alert.props.accessibilityLabel).toBe('Scan Successful');
  });

  it('does not render when not visible', () => {
    const { queryByRole } = render(
      <ScanFeedback
        type="success"
        title="Hidden"
        visible={false}
      />
    );

    expect(queryByRole('alert')).toBeNull();
  });
});
