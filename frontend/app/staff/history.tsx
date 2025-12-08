import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { PinEntryModal } from "../../src/components/modals/PinEntryModal";
import { useAuthStore } from "../../src/store/authStore";
import { deleteCountLine, getCountLines } from "../../src/services/api/api";
import { StatusBar } from "expo-status-bar";
import { haptics } from "../../src/services/utils/haptics";
import { flags } from "../../src/constants/flags";
import { PullToRefresh } from "../../src/components/PullToRefresh";
import { BottomSheet } from "../../src/components/ui/BottomSheet";
import { SkeletonList } from "../../src/components/LoadingSkeleton";
import { SwipeableRow } from "../../src/components/SwipeableRow";
import { StaffLayout } from "../../src/components/layout/StaffLayout";
import Animated, { FadeInUp } from "react-native-reanimated";

export default function HistoryScreen() {
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string | undefined;
  const initialApproved =
    flags.enableDeepLinks &&
    (params.approved === "1" || params.approved === "true");
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  interface CountLine {
    id: string;
    item_code: string;
    item_name: string;
    erp_qty: number;
    counted_qty: number;
    variance: number;
    variance_reason?: string;
    remark?: string;
    status: string;
    counted_at: string;
  }
  const [countLines, setCountLines] = React.useState<CountLine[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [showApprovedOnly, setShowApprovedOnly] =
    React.useState<boolean>(!!initialApproved);

  // Pin Entry Modal State
  const [pinModalVisible, setPinModalVisible] = React.useState(false);
  const [selectedLineForDelete, setSelectedLineForDelete] =
    React.useState<CountLine | null>(null);

  const loadCountLines = React.useCallback(async () => {
    try {
      const data = await getCountLines(sessionId as string);
      setCountLines(
        showApprovedOnly
          ? data.filter((d: any) => d.status === "approved")
          : data,
      );
      if (data?.length && flags.enableHaptics) {
        haptics.success();
      }
    } catch (error) {
      console.error("Load count lines error:", error);
      if (flags.enableHaptics) haptics.error();
    } finally {
      setLoading(false);
    }
  }, [sessionId, showApprovedOnly]);

  React.useEffect(() => {
    loadCountLines();
  }, [loadCountLines]);

  // Keep state in sync if URL param changes (e.g., deep link navigation)
  React.useEffect(() => {
    if (!flags.enableDeepLinks) return;
    const approvedParam = params.approved === "1" || params.approved === "true";
    if (approvedParam !== showApprovedOnly) {
      setShowApprovedOnly(approvedParam);
      // Reload to reflect the new filter
      loadCountLines();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.approved]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCountLines();
    } finally {
      setRefreshing(false);
    }
  }, [loadCountLines]);

  // Keyboard shortcuts (web): r = refresh, f = filters
  React.useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        onRefresh();
      }
      if (e.key === "f" || e.key === "F") {
        setFiltersOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRefresh]);

  const handleDeleteRequest = (item: CountLine) => {
    setSelectedLineForDelete(item);
    setPinModalVisible(true);
  };

  const handlePinSuccess = async () => {
    if (!selectedLineForDelete) return;

    try {
      await deleteCountLine(selectedLineForDelete.id);
      if (flags.enableHaptics) haptics.success();
      Alert.alert("Success", "Count line deleted successfully");
      loadCountLines(); // Refresh list
    } catch (error: any) {
      console.error("Delete error:", error);
      Alert.alert(
        "Error",
        error.response?.data?.detail || "Failed to delete count line",
      );
      if (flags.enableHaptics) haptics.error();
    } finally {
      setSelectedLineForDelete(null);
    }
  };

  const renderCountLine = ({
    item,
    index,
  }: {
    item: CountLine;
    index: number;
  }) => {
    const varianceColor = item.variance === 0 ? "#4CAF50" : "#FF5252";
    const statusColor =
      item.status === "approved"
        ? "#4CAF50"
        : item.status === "rejected"
          ? "#FF5252"
          : "#FF9800";

    const CardContent = (
      <View style={styles.countCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemName}>
            {item.item_name || "Unknown Item"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {(item.status || "pending").toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.itemCode}>Code: {item.item_code || "N/A"}</Text>

        <View style={styles.qtyRow}>
          <View style={styles.qtyItem}>
            <Text style={styles.qtyLabel}>ERP</Text>
            <Text style={styles.qtyValue}>{item.erp_qty ?? 0}</Text>
          </View>
          <View style={styles.qtyItem}>
            <Text style={styles.qtyLabel}>Counted</Text>
            <Text style={styles.qtyValue}>{item.counted_qty ?? 0}</Text>
          </View>
          <View style={styles.qtyItem}>
            <Text style={styles.qtyLabel}>Variance</Text>
            <Text style={[styles.qtyValue, { color: varianceColor }]}>
              {item.variance ?? 0}
            </Text>
          </View>
        </View>

        {item.variance_reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{item.variance_reason}</Text>
          </View>
        )}

        {item.remark && (
          <Text style={styles.remark}>Remark: {item.remark}</Text>
        )}

        <Text style={styles.timestamp}>
          {new Date(item.counted_at).toLocaleString()}
        </Text>
      </View>
    );

    const AnimatedCard = flags.enableAnimations ? (
      <Animated.View
        entering={FadeInUp.delay(index * 50)
          .springify()
          .damping(12)}
      >
        {CardContent}
      </Animated.View>
    ) : (
      CardContent
    );

    if (flags.enableSwipeActions && Platform.OS !== "web") {
      return (
        <SwipeableRow
          leftLabel="Details"
          rightLabel="Delete"
          onLeftAction={() => {
            if (flags.enableHaptics) haptics.light?.();
            router.push({
              pathname: "/supervisor/session-detail",
              params: { id: item.id },
            }); // Assuming details routes here, or adjust as needed
          }}
          onRightAction={() => {
            if (flags.enableHaptics) haptics.selection?.();
            handleDeleteRequest(item);
          }}
        >
          {AnimatedCard}
        </SwipeableRow>
      );
    }

    return AnimatedCard;
  };

  return (
    <StaffLayout
      title="Count History"
      headerActions={[
        {
          icon: "options-outline",
          label: "Filters",
          onPress: () => setFiltersOpen(true),
        },
      ]}
      screenVariant="default"
    >
      <StatusBar style="light" />
      {loading && !refreshing ? (
        <View style={{ padding: 16 }}>
          <SkeletonList itemHeight={120} count={6} />
        </View>
      ) : (
        <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
          <FlashList
            data={countLines}
            renderItem={renderCountLine}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={64} color="#888" />
                <Text style={styles.emptyText}>
                  {loading ? "Loading..." : "No counts yet"}
                </Text>
              </View>
            }
          />
        </PullToRefresh>
      )}

      <BottomSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        height={260}
      >
        <Text style={styles.filterTitle}>Filters</Text>
        <TouchableOpacity
          style={[
            styles.filterChip,
            showApprovedOnly && styles.filterChipActive,
          ]}
          onPress={() => {
            const next = !showApprovedOnly;
            setShowApprovedOnly(next);
            setFiltersOpen(false);
            if (flags.enableDeepLinks) {
              router.replace({
                pathname: "/staff/history",
                params: { sessionId, approved: next ? "1" : undefined },
              });
            }
            loadCountLines();
          }}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={18}
            color={showApprovedOnly ? "#111" : "#ccc"}
          />
          <Text
            style={[
              styles.filterChipText,
              showApprovedOnly && styles.filterChipTextActive,
            ]}
          >
            Approved Only
          </Text>
        </TouchableOpacity>
      </BottomSheet>

      <PinEntryModal
        visible={pinModalVisible}
        onClose={() => {
          setPinModalVisible(false);
          setSelectedLineForDelete(null);
        }}
        onSuccess={handlePinSuccess}
        action="delete_count_line"
        staffUsername={user?.username || "unknown"}
        entityId={selectedLineForDelete?.id}
      />
    </StaffLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#2a2a2a",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  list: {
    padding: 16,
  },
  filterTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
    backgroundColor: "#222",
    alignSelf: "flex-start",
  },
  filterChipActive: {
    backgroundColor: "#8BC34A",
    borderColor: "#8BC34A",
  },
  filterChipText: {
    color: "#ddd",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#111",
  },
  countCard: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  itemCode: {
    fontSize: 14,
    color: "#888",
    marginBottom: 12,
  },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  qtyItem: {
    flex: 1,
    alignItems: "center",
  },
  qtyLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  reasonBox: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: "#FF9800",
    fontWeight: "bold",
  },
  remark: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
    marginTop: 16,
  },
});
