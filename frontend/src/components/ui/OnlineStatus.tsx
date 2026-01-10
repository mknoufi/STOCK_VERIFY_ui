import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { useThemeContext } from "../../theme/ThemeContext";

export default function OnlineStatus() {
  const { theme } = useThemeContext();
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (isConnected === null) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isConnected
            ? theme.colors.success
            : theme.colors.danger,
        },
      ]}
    >
      <Ionicons
        name={isConnected ? "cloud-done" : "cloud-offline"}
        size={14}
        color="#fff"
      />
      <Text style={styles.text}>{isConnected ? "Online" : "Offline"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    alignSelf: "flex-start",
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
