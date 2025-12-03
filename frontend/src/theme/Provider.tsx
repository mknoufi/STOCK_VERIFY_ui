import React from 'react';


// Unistyles v2 doesn't need a provider component, but we keep this wrapper for consistency
// and to allow for future theme provider implementation if needed.
export const UnistylesThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
