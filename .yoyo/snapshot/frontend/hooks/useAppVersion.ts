import { useEffect, useState } from 'react';
import Constants from 'expo-constants';

export const useAppVersion = () => {
  const [appInfo, setAppInfo] = useState({
    version: 'Unknown',
    buildVersion: 'Unknown',
    platform: 'Unknown',
    appName: 'Stock Count',
  });

  useEffect(() => {
    const getAppInfo = () => {
      const manifest = Constants.expoConfig;
      const nativeAppVersion = Constants.nativeAppVersion;
      const nativeBuildVersion = Constants.nativeBuildVersion;

      setAppInfo({
        version: manifest?.version || nativeAppVersion || '1.0.0',
        buildVersion: nativeBuildVersion || 'dev',
        platform: Constants.platform?.ios ? 'iOS' : Constants.platform?.android ? 'Android' : 'Web',
        appName: manifest?.name || 'Stock Count',
      });
    };

    getAppInfo();
  }, []);

  return appInfo;
};
