import { useEffect } from 'react';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';

export const useKeepAwake = (enabled: boolean = true) => {
  useEffect(() => {
    if (enabled) {
      try {
        activateKeepAwake();
        console.log('Keep awake activated');
      } catch (error) {
        console.warn('Failed to activate keep awake:', error);
        // Don't crash the app for this non-critical feature
      }

      return () => {
        try {
          deactivateKeepAwake();
          console.log('Keep awake deactivated');
        } catch (error) {
          console.warn('Failed to deactivate keep awake:', error);
        }
      };
    }
    return undefined;
  }, [enabled]);
};
