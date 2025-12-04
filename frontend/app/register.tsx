import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registration</Text>
      <Text style={styles.message}>
        Please contact your administrator to create an account.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  message: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
});
