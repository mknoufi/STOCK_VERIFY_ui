import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppVersion } from "../hooks/useAppVersion";

interface AppVersionProps {
  style?: any;
  showDetails?: boolean;
}

export const AppVersion: React.FC<AppVersionProps> = ({
  style,
  showDetails = false,
}) => {
  const { version, buildVersion, platform, appName } = useAppVersion();

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.appName}>{appName}</Text>
      <Text style={styles.version}>Version {version}</Text>
      {showDetails && (
        <>
          <Text style={styles.build}>Build {buildVersion}</Text>
          <Text style={styles.platform}>{platform}</Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 16,
  },
  appName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: "#888",
  },
  build: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  platform: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
});
