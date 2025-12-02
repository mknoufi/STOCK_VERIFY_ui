import NetInfo from '@react-native-community/netinfo';
import { useNetworkStore } from '../store/networkStore';

// Re-export the store for convenience
export { useNetworkStore };

/**
 * Initialize network status listener
 * Monitors device connectivity and updates the global network store
 * @returns Unsubscribe function to clean up listener
 */
export function initializeNetworkListener(): () => void {
  // Subscribe to network state changes
  const unsubscribe = NetInfo.addEventListener(state => {
    const { setIsOnline, setConnectionType, setIsInternetReachable } = useNetworkStore.getState();

    // Update network status in store
    setIsOnline(state.isConnected ?? false);
    setConnectionType(state.type || 'unknown');
    setIsInternetReachable(state.isInternetReachable ?? null);

    // Log network changes (useful for debugging)
    console.log('Network status:', {
      isConnected: state.isConnected,
      type: state.type,
      isInternetReachable: state.isInternetReachable
    });
  });

  // Return unsubscribe function for cleanup
  return unsubscribe;
}

/**
 * Check current network status
 * @returns Promise with current network state
 */
export async function checkNetworkStatus() {
  const state = await NetInfo.fetch();
  const { setIsOnline, setConnectionType, setIsInternetReachable } = useNetworkStore.getState();

  setIsOnline(state.isConnected ?? false);
  setConnectionType(state.type || 'unknown');
  setIsInternetReachable(state.isInternetReachable ?? null);

  return {
    isConnected: state.isConnected ?? false,
    type: state.type,
    isInternetReachable: state.isInternetReachable
  };
}
