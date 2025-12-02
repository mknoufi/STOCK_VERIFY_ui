import React from 'react';
import { flags } from '../constants/flags';
import { themes } from './themes';

// Lazy-load Unistyles only when flag enabled to avoid module-not-found errors before dependency installation.
const providerRef: { current: React.ComponentType<any> | null } = { current: null };
const runtimeRef: { current: any } = { current: null };

export const UnistylesThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  React.useEffect(() => {
    let cancelled = false;
    if (flags.enableUnistyles && !providerRef.current) {
      // eslint-disable-next-line import/no-unresolved
      // import('react-native-unistyles')
      //   .then((mod) => {
      //     if (cancelled) return;
      //     providerRef.current = mod.UnistylesProvider;
      //     runtimeRef.current = mod.UnistylesRuntime;
      //   })
      //   .catch((e) => {
      //     console.warn('Unistyles dynamic import failed:', e);
      //   });
      console.warn('Unistyles is enabled but the package is not installed. Please install react-native-unistyles.');
    }
    return () => {
      cancelled = true;
    };
  }, []);

  if (!flags.enableUnistyles || !providerRef.current) {
    return <>{children}</>;
  }
  const Provider = providerRef.current;
  return <Provider themes={themes} initialTheme="light">{children}</Provider>;
};

export const toggleHighContrast = () => {
  const runtime = runtimeRef.current;
  if (!runtime || !flags.enableUnistyles) return;
  try {
    const current = runtime.getThemeName();
    runtime.setTheme(current === 'highContrast' ? 'light' : 'highContrast');
  } catch (e) {
    console.warn('Unistyles theme toggle failed:', e);
  }
};

export const getCurrentThemeName = (): string => {
  const runtime = runtimeRef.current;
  if (!runtime || !flags.enableUnistyles) return 'disabled';
  try {
    return runtime.getThemeName();
  } catch {
    return 'unknown';
  }
};
