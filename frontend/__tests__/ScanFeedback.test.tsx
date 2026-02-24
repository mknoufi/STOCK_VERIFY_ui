import React from 'react';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
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
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock AccessibilityInfo
const mockAnnounceForAccessibility = jest.fn();
jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(mockAnnounceForAccessibility);

describe('ScanFeedback Accessibility', () => {
  beforeEach(() => {
    mockAnnounceForAccessibility.mockClear();
  });

  it('should announce content when visible', () => {
    render(
      <ScanFeedback
        visible={true}
        type="success"
        title="Scan Complete"
        message="Item added to cart"
      />
    );

    expect(mockAnnounceForAccessibility).toHaveBeenCalledWith('Scan Complete, Item added to cart');
  });

  it('should not announce when not visible', () => {
    render(
      <ScanFeedback
        visible={false}
        type="error"
        title="Scan Failed"
      />
    );

    expect(mockAnnounceForAccessibility).not.toHaveBeenCalled();
  });
});
