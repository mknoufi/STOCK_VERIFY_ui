import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNetworkStore } from "../services/networkService";

export const OnlineStatus: React.FC = () => {
  const { isOnline, isInternetReachable } = useNetworkStore();

  const status =
    isOnline && isInternetReachable !== false ? "online" : "offline";
  const statusColor = status === "online" ? "#4CAF50" : "#FF9800";
  const statusText = status === "online" ? "Online" : "Offline";

  return (
    <View style={[styles.container, { backgroundColor: `${statusColor}15` }]}>
      <View style={[styles.indicator, { backgroundColor: statusColor }]} />
      <Text style={[styles.text, { color: statusColor }]}>{statusText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
