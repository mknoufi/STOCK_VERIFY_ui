import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Keyboard, View, Text } from 'react-native';
import { ThemedScreen } from '../src/components/ui/ThemedScreen';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { ThemeProvider } from '../src/context/ThemeContext';



// Mock SafeAreaContext
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children, style }: any) => <View style={style}>{children}</View>,
  };
});

// Mock Expo Router
jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

describe('Keyboard Dismissal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Keyboard, 'dismiss');
  });

  describe('ThemedScreen', () => {
    it('dismisses keyboard when tapping background', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ThemedScreen>
            <View testID="content">
              <Text>Content</Text>
            </View>
          </ThemedScreen>
        </ThemeProvider>
      );

      // Find the TouchableWithoutFeedback wrapper
      // Since TouchableWithoutFeedback doesn't render a native view, we look for the parent of the content
      // However, in ThemedScreen, the structure is TouchableWithoutFeedback -> View -> View (content)
      // We can fire the press event on the root element if possible, or verify the structure.
      // A better way is to check if the wrapper exists.

      // Let's try to fire press on the root view.
      // Note: In RNTL, we might need to find the element that has the onPress handler.
      // ThemedScreen renders: <TouchableWithoutFeedback><View>...</View></TouchableWithoutFeedback>
      // The onPress is on the TouchableWithoutFeedback.

      // We can try to find the element by type or just fire event on the root if it captures it.
      // But TouchableWithoutFeedback passes props to its child.
      // So the View inside should have the responder props.

      const content = getByTestId('content');
      // The parent of content is the inner View. The parent of that is the container View.
      // The container View is the child of TouchableWithoutFeedback.
      // So firing press on the container View should trigger it.

      // Let's inspect the tree to be sure or just try firing on the parent of content.
      const parent = content.parent;
      if (parent) {
         fireEvent.press(parent);
         expect(Keyboard.dismiss).toHaveBeenCalled();
      }
    });
  });

  describe('ScreenContainer', () => {
    it('dismisses keyboard when tapping background in static mode', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ScreenContainer contentMode="static">
            <View testID="static-content">
              <Text>Static Content</Text>
            </View>
          </ScreenContainer>
        </ThemeProvider>
      );

      const content = getByTestId('static-content');
      const parent = content.parent;

      if (parent) {
        fireEvent.press(parent);
        expect(Keyboard.dismiss).toHaveBeenCalled();
      }
    });

    it('sets keyboardShouldPersistTaps="handled" in scroll mode', () => {
      const { getByTestId } = render(
        <ThemeProvider>
          <ScreenContainer contentMode="scroll">
            <View testID="scroll-content">
              <Text>Scroll Content</Text>
            </View>
          </ScreenContainer>
        </ThemeProvider>
      );

      // In scroll mode, it renders a ScrollView.
      // We need to find the ScrollView and check its props.
      // The ScrollView wraps the content.

      const content = getByTestId('scroll-content');

      let current = content.parent;
      while (current) {
        if (current.props.keyboardShouldPersistTaps) {
          expect(current.props.keyboardShouldPersistTaps).toBe('handled');
          return;
        }
        current = current.parent;
      }

      throw new Error('Could not find ScrollView with keyboardShouldPersistTaps');
    });
  });
});
