/**
 * Container Component - Responsive max-width container
 * Centers content on large screens, full width on mobile
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import { breakpoints, layout } from '../../styles/globalStyles';

interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'mobile' | 'tablet' | 'desktop' | number;
  centered?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'desktop',
  centered = true,
  style,
  testID,
}) => {
  const { width } = Dimensions.get('window');

  // Determine max width
  let maxWidthValue: number;
  if (typeof maxWidth === 'number') {
    maxWidthValue = maxWidth;
  } else {
    const maxWidthConfig = layout.containerMaxWidth[maxWidth];
    maxWidthValue = typeof maxWidthConfig === 'number' ? maxWidthConfig : 1200;
  }

  // On mobile, use full width
  const shouldConstrain = width > breakpoints.tablet && maxWidth !== 'mobile';

  const containerStyle: ViewStyle = {
    width: shouldConstrain ? maxWidthValue : '100%',
    maxWidth: shouldConstrain ? maxWidthValue : '100%',
    alignSelf: centered && shouldConstrain ? 'center' : 'stretch',
  };

  return (
    <View style={[styles.container, containerStyle, style]} testID={testID}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles applied inline based on props
  },
});

