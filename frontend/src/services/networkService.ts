import NetInfo from '@react-native-community/netinfo';
export { useNetworkStore } from '../store/networkStore';

export const initializeNetworkListener = (): (() => void) => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    console.log('Network state changed:', state);
  });
  return unsubscribe;
};
