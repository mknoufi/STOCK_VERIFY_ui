import React from "react";
import { View, Text, Platform } from "react-native";

export default function DebugPage() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0F172A",
      }}
    >
      <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
        Debug Page Works!
      </Text>
      <Text style={{ color: "#94A3B8", fontSize: 16, marginTop: 10 }}>
        Platform: {Platform.OS}
      </Text>
      <Text style={{ color: "#94A3B8", fontSize: 14, marginTop: 5 }}>
        If you see this, React is rendering correctly.
      </Text>
    </View>
  );
}
