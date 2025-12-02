/**
 * Section Component - Content section with title
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  style?: object;
}

export const Section: React.FC<SectionProps> = ({
  title,
  children,
  style,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      {title && (
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {title}
        </Text>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
});
