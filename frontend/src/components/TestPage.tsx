import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function TestPage() {
  console.log("Test page rendering...");

  return (
    <View style={styles.container}>
      <Text style={styles.text}>🎉 React is Working!</Text>
      <Text style={styles.subtext}>
        If you see this, the app is rendering correctly.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  text: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 16,
  },
  subtext: {
    fontSize: 16,
    color: "#888",
  },
});
