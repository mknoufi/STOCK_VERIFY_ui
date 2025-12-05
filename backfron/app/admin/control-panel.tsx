import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AdminLayout } from "../../src/components/layout/AdminLayout";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../src/styles/modernDesignSystem";

interface AdminModule {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const ADMIN_MODULES: AdminModule[] = [
  {
    id: "metrics",
    title: "System Metrics",
    description: "View real-time system performance and analytics",
    icon: "stats-chart",
    route: "/admin/metrics",
    color: modernColors.primary[500],
  },
  {
    id: "permissions",
    title: "Permissions",
    description: "Manage user roles and access controls",
    icon: "shield-checkmark",
    route: "/admin/permissions",
    color: modernColors.success.main,
  },
  {
    id: "security",
    title: "Security",
    description: "Security settings and audit logs",
    icon: "lock-closed",
    route: "/admin/security",
    color: modernColors.error.main,
  },
  {
    id: "reports",
    title: "Reports",
    description: "Generate and export system reports",
    icon: "document-text",
    route: "/admin/reports",
    color: modernColors.warning.main,
  },
  {
    id: "logs",
    title: "System Logs",
    description: "View application and error logs",
    icon: "journal",
    route: "/admin/logs",
    color: modernColors.info.main,
  },
  {
    id: "sql-config",
    title: "SQL Config",
    description: "Configure database connections and mappings",
    icon: "server",
    route: "/admin/sql-config",
    color: modernColors.accent[500],
  },
];

export default function AdminControlPanel() {
  const router = useRouter();

  return (
    <AdminLayout title="Control Panel" screenVariant="scrollable">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome, Administrator</Text>
          <Text style={styles.subtitle}>
            Manage your application settings and monitor performance
          </Text>
        </View>

        <View style={styles.grid}>
          {ADMIN_MODULES.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.cardWrapper}
              onPress={() => router.push(module.route as any)}
              activeOpacity={0.7}
            >
              <PremiumCard variant="elevated" style={styles.card}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${module.color}20` },
                  ]}
                >
                  <Ionicons name={module.icon} size={32} color={module.color} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{module.title}</Text>
                  <Text style={styles.cardDescription}>
                    {module.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={modernColors.text.tertiary}
                />
              </PremiumCard>
            </TouchableOpacity>
          ))}
        </View>
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
    marginBottom: modernSpacing.xl,
  } as ViewStyle,
  welcomeText: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
  } as TextStyle,
  subtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  } as TextStyle,
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
  } as ViewStyle,
  cardWrapper: {
    width: Platform.OS === "web" ? "48%" : "100%",
    minWidth: 300,
    flexGrow: 1,
  } as ViewStyle,
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: modernSpacing.lg,
    height: "100%",
  } as ViewStyle,
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: modernBorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: modernSpacing.md,
  } as ViewStyle,
  cardContent: {
    flex: 1,
  } as ViewStyle,
  cardTitle: {
    ...modernTypography.h6,
    color: modernColors.text.primary,
    marginBottom: 4,
  } as TextStyle,
  cardDescription: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  } as TextStyle,
});
