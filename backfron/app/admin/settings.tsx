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

export default function AdminSettings() {
  const [appName, setAppName] = useState("Stock Verify");
  const [supportEmail, setSupportEmail] = useState("support@example.com");
  const [maxUploadSize, setMaxUploadSize] = useState("10");

  return (
    <AdminLayout title="General Settings" screenVariant="scrollable">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Configure general application settings
          </Text>
        </View>

        <PremiumCard variant="elevated" style={styles.formCard}>
          <Text style={styles.sectionTitle}>Application Details</Text>

          <View style={styles.inputGroup}>
            <PremiumInput
              label="Application Name"
              value={appName}
              onChangeText={setAppName}
              placeholder="Enter application name"
            />
          </View>

          <View style={styles.inputGroup}>
            <PremiumInput
              label="Support Email"
              value={supportEmail}
              onChangeText={setSupportEmail}
              placeholder="Enter support email"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <PremiumInput
              label="Max Upload Size (MB)"
              value={maxUploadSize}
              onChangeText={setMaxUploadSize}
              placeholder="Enter max size"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.actions}>
            <PremiumButton
              title="Save Changes"
              onPress={() => {}}
              variant="primary"
              icon="save-outline"
            />
            <PremiumButton
              title="Reset"
              onPress={() => {}}
              variant="secondary"
              icon="refresh-outline"
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
  actions: {
    flexDirection: "row",
    gap: modernSpacing.md,
    marginTop: modernSpacing.md,
  } as ViewStyle,
});
