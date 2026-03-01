import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, METRICS, SHADOWS } from "../constants/theme";
import { ScreenContainer } from "../components/ui/ScreenContainer";
import { Toast } from "../components/ui/Toast";

type TabParamList = {
  Dashboard: undefined;
  Scan: undefined;
  Settings: undefined;
};

type Props = BottomTabScreenProps<TabParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const kpis = useMemo(
    () => [
      {
        label: "Verified",
        value: 142,
        color: COLORS.SUCCESS,
        icon: "checkmark-circle" as const,
      },
      {
        label: "Pending",
        value: 12,
        color: COLORS.WARNING,
        icon: "time" as const,
      },
      {
        label: "Variance",
        value: 3,
        color: COLORS.ERROR,
        icon: "alert-circle" as const,
      },
    ],
    []
  );

  const onSync = () => {
    if (syncing) return;
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setToast({ message: "All data synchronized to server.", type: "success" });
    }, 900);
  };

  return (
    <ScreenContainer
      header={{ title: "Dashboard" }}
      backgroundType="aurora"
      overlay={
        toast ? (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        ) : null
      }
    >
      {/* KPI Cards */}
      <View
        style={styles.statsRow}
        accessibilityRole="summary"
        accessibilityLabel="Key Performance Indicators"
      >
        {kpis.map((kpi) => (
          <View
            key={kpi.label}
            style={styles.card}
            accessibilityRole="text"
            accessibilityLabel={`${kpi.value} ${kpi.label}`}
          >
            <View
              style={[styles.kpiIcon, { backgroundColor: `${kpi.color}15` }]}
              accessible={false}
            >
              <Ionicons name={kpi.icon} size={18} color={kpi.color} />
            </View>
            <Text style={[styles.val, { color: kpi.color }]}>{kpi.value}</Text>
            <Text style={styles.lbl}>{kpi.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionHeader} accessibilityRole="header">
        Quick Actions
      </Text>

      {/* Start Scan Button */}
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate("Scan")}
        accessibilityRole="button"
        accessibilityLabel="Start Scanning"
        accessibilityHint="Navigate to scan screen to start scanning items"
      >
        <View style={[styles.iconBox, { backgroundColor: COLORS.INFO }]}>
          <Ionicons name="scan" size={24} color="#FFF" />
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>Start Scanning</Text>
          <Text style={styles.actionSub}>Rack A1 • Session Active</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_MUTED} />
      </Pressable>

      {/* Sync Button */}
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        onPress={onSync}
        accessibilityRole="button"
        accessibilityLabel={syncing ? "Syncing data" : "Sync Data"}
        accessibilityHint="Synchronize local data with the server"
        accessibilityState={{ busy: syncing, disabled: syncing }}
        disabled={syncing}
      >
        <View style={[styles.iconBox, { backgroundColor: COLORS.BG_MODAL }]}>
          <Ionicons
            name="cloud-upload-outline"
            size={24}
            color={syncing ? COLORS.WARNING : COLORS.TEXT_SECONDARY}
          />
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>
            {syncing ? "Syncing..." : "Sync Data"}
          </Text>
          <Text style={styles.actionSub}>Last sync: 10 mins ago</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_MUTED} />
      </Pressable>

      {/* View History Button */}
      <Pressable
        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        onPress={() => Alert.alert("History", "View scan history")}
        accessibilityRole="button"
        accessibilityLabel="View History"
        accessibilityHint="View your scan history and past sessions"
      >
        <View style={[styles.iconBox, { backgroundColor: COLORS.BG_MODAL }]}>
          <Ionicons name="time-outline" size={24} color={COLORS.TEXT_SECONDARY} />
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>View History</Text>
          <Text style={styles.actionSub}>154 items scanned today</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_MUTED} />
      </Pressable>
    </ScreenContainer>
  );
}

// Default export for compatibility
export default DashboardScreen;

const styles = StyleSheet.create({
  // Removed container style as ScreenContainer handles it
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    gap: METRICS.SPACING_3,
    marginTop: 10,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.BG_CARD,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    ...SHADOWS.light,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: METRICS.SPACING_3,
  },
  val: {
    fontSize: 24,
    fontWeight: "bold",
  },
  lbl: {
    fontSize: 10,
    color: COLORS.TEXT_SECONDARY,
    textTransform: "uppercase",
    marginTop: 4,
    fontWeight: "600",
  },
  sectionHeader: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_CARD,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "bold",
  },
  actionSub: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },
});
