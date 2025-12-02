import React from 'react';
import { Text } from 'react-native';

// Unistyles v2 doesn't need a provider component, but we keep this wrapper for consistency
// and to allow for future theme provider implementation if needed.
export const UnistylesThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
