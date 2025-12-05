import React, { useState } from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { AdminLayout } from "../../src/components/layout/AdminLayout";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import { PremiumInput } from "../../src/components/premium/PremiumInput";
import { PremiumButton } from "../../src/components/premium/PremiumButton";
import {
  modernColors,
  modernSpacing,
  modernTypography,
} from "../../src/styles/modernDesignSystem";

export default function AdminSqlConfig() {
  const [server, setServer] = useState("localhost");
  const [database, setDatabase] = useState("StockVerifyDB");
  const [username, setUsername] = useState("sa");
  const [password, setPassword] = useState("");

  return (
    <AdminLayout title="SQL Configuration" screenVariant="scrollable">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Configure database connection settings
          </Text>
        </View>

        <PremiumCard variant="elevated" style={styles.formCard}>
          <Text style={styles.sectionTitle}>Connection Details</Text>

          <View style={styles.inputGroup}>
            <PremiumInput
              label="Server Address"
              value={server}
              onChangeText={setServer}
              placeholder="e.g., localhost, 192.168.1.100"
              icon="server-outline"
            />
          </View>

          <View style={styles.inputGroup}>
            <PremiumInput
              label="Database Name"
              value={database}
              onChangeText={setDatabase}
              placeholder="Enter database name"
              icon="cube-outline"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <PremiumInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                icon="person-outline"
              />
            </View>
            <View style={styles.halfInput}>
              <PremiumInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry
                icon="lock-closed-outline"
              />
            </View>
          </View>

          <View style={styles.actions}>
            <PremiumButton
              title="Test Connection"
              onPress={() => {}}
              variant="secondary"
              icon="pulse-outline"
            />
            <PremiumButton
              title="Save Configuration"
              onPress={() => {}}
              variant="primary"
              icon="save-outline"
            />
          </View>
        </PremiumCard>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: modernSpacing.screenPadding,
    paddingBottom: 100,
  } as ViewStyle,
  header: {
    marginBottom: modernSpacing.lg,
  } as ViewStyle,
  subtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  } as TextStyle,
  formCard: {
    padding: modernSpacing.xl,
  } as ViewStyle,
  sectionTitle: {
    ...modernTypography.h6,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.lg,
  } as TextStyle,
  inputGroup: {
    marginBottom: modernSpacing.lg,
  } as ViewStyle,
  row: {
    flexDirection: "row",
    gap: modernSpacing.md,
    marginBottom: modernSpacing.lg,
  } as ViewStyle,
  halfInput: {
    flex: 1,
  } as ViewStyle,
  actions: {
    flexDirection: "row",
    gap: modernSpacing.md,
    marginTop: modernSpacing.md,
  } as ViewStyle,
});
