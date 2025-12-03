import NetInfo from '@react-native-community/netinfo';

export const initializeNetworkListener = () => {
  NetInfo.addEventListener(state => {
    console.log('Network state changed:', state);
  });
};
