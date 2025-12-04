import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../../src/components/layout/Header";
import { useTheme } from "../../src/hooks/useTheme";
import {
  getSession,
  getCountLines,
  approveCountLine,
  rejectCountLine,
  updateSessionStatus,
  verifyStock,
  unverifyStock,
} from "../../src/services/api/api";
import { StatusBar } from "expo-status-bar";
import { useToast } from "../../src/components/feedback/ToastProvider";

export default function SessionDetail() {
  const { sessionId } = useLocalSearchParams();
  const router = useRouter();
  const { show } = useToast();
  const [session, setSession] = React.useState<any>(null);
  const [toVerifyLines, setToVerifyLines] = React.useState<any[]>([]);
  const [verifiedLines, setVerifiedLines] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"toVerify" | "verified">(
    "toVerify",
  );
  const [verifying, setVerifying] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [sessionData, toVerifyData, verifiedData] = await Promise.all([
        getSession(sessionId as string),
        getCountLines(sessionId as string, 1, 100, false), // Not verified
        getCountLines(sessionId as string, 1, 100, true), // Verified
      ]);
      setSession(sessionData);
      setToVerifyLines(toVerifyData?.items || []);
      setVerifiedLines(verifiedData?.items || []);
    } catch {
      show("Failed to load session data", "error");
    } finally {
      setLoading(false);
    }
  }, [sessionId, show]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApproveLine = async (lineId: string) => {
    try {
      await approveCountLine(lineId);
      await loadData();
      show("Count line approved", "success");
    } catch {
      show("Failed to approve", "error");
    }
  };

  const handleRejectLine = async (lineId: string) => {
    try {
      await rejectCountLine(lineId);
      await loadData();
      show("Count line rejected", "success");
    } catch {
      show("Failed to reject", "error");
    }
  };

  const handleVerifyStock = async (lineId: string) => {
    try {
      setVerifying(lineId);
      await verifyStock(lineId);
      await loadData();
      show("Stock verified", "success");
    } catch {
      show("Failed to verify stock", "error");
    } finally {
      setVerifying(null);
    }
  };

  const handleUnverifyStock = async (lineId: string) => {
    try {
      setVerifying(lineId);
      await unverifyStock(lineId);
      await loadData();
      show("Verification removed", "success");
    } catch {
      show("Failed to remove verification", "error");
    } finally {
      setVerifying(null);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await updateSessionStatus(sessionId as string, newStatus);
      await loadData();
      show(`Session status updated to ${newStatus} `, "success");
    } catch {
      show("Failed to update status", "error");
    }
  };

  if (loading || !session) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Session Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const currentLines = activeTab === "toVerify" ? toVerifyLines : verifiedLines;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.sessionInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Warehouse:</Text>
            <Text style={styles.infoValue}>{session.warehouse}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Staff:</Text>
            <Text style={styles.infoValue}>{session.staff_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[styles.infoValue, styles.statusValue]}>
              {session.status}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Items:</Text>
            <Text style={styles.infoValue}>{session.total_items}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Variance:</Text>
            <Text
              style={[
                styles.infoValue,
                session.total_variance !== 0 && styles.varianceValue,
              ]}
            >
              {session.total_variance.toFixed(2)}
            </Text>
          </View>
        </View>

        {session.status === "OPEN" && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.reconcileButton}
              onPress={() => handleUpdateStatus("RECONCILE")}
            >
              <Text style={styles.buttonText}>Move to Reconcile</Text>
            </TouchableOpacity>
          </View>
        )}

        {session.status === "RECONCILE" && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => handleUpdateStatus("CLOSED")}
            >
              <Text style={styles.buttonText}>Close Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "toVerify" && styles.tabActive]}
            onPress={() => setActiveTab("toVerify")}
          >
            <Ionicons
              name="list-outline"
              size={20}
              color={activeTab === "toVerify" ? "#fff" : "#888"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "toVerify" && styles.tabTextActive,
              ]}
            >
              To Verify ({toVerifyLines.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "verified" && styles.tabActive]}
            onPress={() => setActiveTab("verified")}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={activeTab === "verified" ? "#fff" : "#888"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "verified" && styles.tabTextActive,
              ]}
            >
              Verified ({verifiedLines.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Count Lines List */}
        {currentLines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name={
                activeTab === "toVerify" ? "list-outline" : "checkmark-circle"
              }
              size={64}
              color="#888"
            />
            <Text style={styles.emptyText}>
              {activeTab === "toVerify"
                ? "No items to verify"
                : "No verified items"}
            </Text>
          </View>
        ) : (
          currentLines.map((line: any) => {
            const varianceColor = line.variance === 0 ? "#00E676" : "#FF5252";
            const statusColor =
              line.status === "approved"
                ? "#00E676"
                : line.status === "rejected"
                  ? "#FF5252"
                  : "#FFC107";

            return (
              <View key={line.id} style={styles.lineCard}>
                <View style={styles.lineHeader}>
                  <Text style={styles.lineName}>{line.item_name}</Text>
                  <View style={styles.badgeContainer}>
                    {line.verified && (
                      <View
                        style={[
                          styles.verifiedBadge,
                          { backgroundColor: "#00E676" },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#fff"
                        />
                        <Text style={styles.badgeText}>Verified</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.lineBadge,
                        { backgroundColor: statusColor },
                      ]}
                    >
                      <Text style={styles.badgeText}>{line.status}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.lineCode}>Code: {line.item_code}</Text>

                <View style={styles.qtyRow}>
                  <View style={styles.qtyItem}>
                    <Text style={styles.qtyLabel}>ERP</Text>
                    <Text style={styles.qtyValue}>{line.erp_qty}</Text>
                  </View>
                  <View style={styles.qtyItem}>
                    <Text style={styles.qtyLabel}>Counted</Text>
                    <Text style={styles.qtyValue}>{line.counted_qty}</Text>
                  </View>
                  <View style={styles.qtyItem}>
                    <Text style={styles.qtyLabel}>Variance</Text>
                    <Text style={[styles.qtyValue, { color: varianceColor }]}>
                      {line.variance}
                    </Text>
                  </View>
                </View>

                {line.variance_reason && (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>
                      Reason: {line.variance_reason}
                    </Text>
                    {line.variance_note && (
                      <Text style={styles.reasonNote}>
                        {line.variance_note}
                      </Text>
                    )}
                  </View>
                )}

                {line.remark && (
                  <Text style={styles.remark}>Remark: {line.remark}</Text>
                )}

                {line.verified && line.verified_by && (
                  <View style={styles.verifiedInfo}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#00E676"
                    />
                    <Text style={styles.verifiedInfoText}>
                      Verified by {line.verified_by} on{" "}
                      {new Date(line.verified_at).toLocaleString()}
                    </Text>
                  </View>
                )}

                <View style={styles.lineActions}>
                  {line.status === "pending" && (
                    <>
                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApproveLine(line.id)}
                      >
                        <Ionicons name="checkmark" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleRejectLine(line.id)}
                      >
                        <Ionicons name="close" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {activeTab === "toVerify" && !line.verified && (
                    <TouchableOpacity
                      style={[
                        styles.verifyButton,
                        verifying === line.id && styles.buttonDisabled,
                      ]}
                      onPress={() => handleVerifyStock(line.id)}
                      disabled={verifying === line.id}
                    >
                      {verifying === line.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.actionButtonText}>
                            Verify Stock
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {activeTab === "verified" && line.verified && (
                    <TouchableOpacity
                      style={[
                        styles.unverifyButton,
                        verifying === line.id && styles.buttonDisabled,
                      ]}
                      onPress={() => handleUnverifyStock(line.id)}
                      disabled={verifying === line.id}
                    >
                      {verifying === line.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons
                            name="close-circle-outline"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.actionButtonText}>Unverify</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#1E1E1E",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 12,
  },
  sessionInfo: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#888",
  },
  infoValue: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "bold",
  },
  statusValue: {
    color: "#FF9800",
  },
  varianceValue: {
    color: "#FF5252",
  },
  actionButtons: {
    marginBottom: 16,
  },
  reconcileButton: {
    backgroundColor: "#FF9800",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  closeButton: {
    backgroundColor: "#00E676",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  tabActive: {
    backgroundColor: "#00E676",
  },
  tabText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
  emptyContainer: {
    padding: 64,
    alignItems: "center",
  },
  emptyText: {
    color: "#888",
    fontSize: 16,
    marginTop: 16,
  },
  lineCard: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lineName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  badgeContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  lineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  lineCode: {
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
    fontSize: 14,
    color: "#FF9800",
    fontWeight: "bold",
    marginBottom: 4,
  },
  reasonNote: {
    fontSize: 14,
    color: "#888",
  },
  remark: {
    fontSize: 14,
    color: "#888",
    fontStyle: "italic",
    marginBottom: 8,
  },
  verifiedInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    padding: 8,
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    borderRadius: 8,
    gap: 8,
  },
  verifiedInfoText: {
    fontSize: 12,
    color: "#00E676",
  },
  lineActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    flexWrap: "wrap",
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#00E676",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 100,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FF5252",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 100,
  },
  verifyButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#2196F3",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 120,
  },
  unverifyButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FF9800",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 120,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
