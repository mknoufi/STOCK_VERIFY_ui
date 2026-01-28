import React from 'react';
import { render } from '@testing-library/react-native';
import ScreenHeader from '../src/components/ui/ScreenHeader';
import { useAuthStore } from '../src/store/authStore';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('../src/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../src/theme/ThemeContext', () => ({
  useThemeContext: () => ({
    theme: {
      colors: {
        text: '#000',
        textSecondary: '#666',
        accent: '#007AFF',
        danger: '#FF3B30',
      },
    },
    isDark: false,
  }),
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: ({ children }: any) => children,
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {},
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSpring: jest.fn(),
    FadeIn: { delay: jest.fn(() => ({ springify: jest.fn() })) },
    FadeInLeft: { delay: jest.fn(() => ({ springify: jest.fn() })) },
    FadeInRight: { delay: jest.fn(() => ({ springify: jest.fn() })) },
  };
});

describe('ScreenHeader Accessibility', () => {
  beforeEach(() => {
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: { username: 'testuser' },
      logout: jest.fn(),
    });
  });

  it('renders back button with correct accessibility label', () => {
    const { getByLabelText } = render(
      <ScreenHeader title="Test Title" showBackButton={true} />
    );

    const backButton = getByLabelText('Go back');
    expect(backButton).toBeTruthy();
  });

  it('renders logout button with correct accessibility label', () => {
    const { getByLabelText } = render(
      <ScreenHeader title="Test Title" showLogoutButton={true} />
    );

    const logoutButton = getByLabelText('Logout');
    expect(logoutButton).toBeTruthy();
  });

  it('renders right action button with correct accessibility label', () => {
    const rightAction = {
      icon: 'add' as any,
      onPress: jest.fn(),
      label: 'Add Item',
    };

    const { getByLabelText } = render(
      <ScreenHeader
        title="Test Title"
        rightAction={rightAction}
      />
    );

    const actionButton = getByLabelText('Add Item');
    expect(actionButton).toBeTruthy();
  });

  it('renders right action button with fallback accessibility label', () => {
    const rightAction = {
      icon: 'add' as any,
      onPress: jest.fn(),
      // No label provided
    };

    const { getByLabelText } = render(
      <ScreenHeader
        title="Test Title"
        rightAction={rightAction}
      />
    );

    const actionButton = getByLabelText('Action');
    expect(actionButton).toBeTruthy();
  });
});
