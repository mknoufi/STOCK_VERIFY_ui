/**
 * ItemShareSheet Component
 * Quick actions sheet for sharing/exporting item data
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { GlassCard } from "../ui/GlassCard";
import { theme } from "../../styles/modernDesignSystem";

// ============================================================================
// Types
// ============================================================================

export interface ItemShareData {
  item_code?: string;
  item_name?: string;
  barcode?: string;
  category?: string;
  location?: string;
  stock_qty?: number;
  counted_qty?: number;
  variance?: number;
  verified?: boolean;
  verified_at?: string;
  verified_by?: string;
  condition?: string;
  notes?: string;
  [key: string]: any;
}

export interface ItemShareSheetProps {
  visible: boolean;
  onClose: () => void;
  item: ItemShareData;
  sessionId?: string;
  sessionName?: string;
}

type ShareAction = {
  id: string;
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatItemAsText(item: ItemShareData, sessionName?: string): string {
  const lines = [
    "📦 ITEM DETAILS",
    "═══════════════════════════",
    "",
    `Item: ${item.item_name || item.item_code || "Unknown"}`,
    item.item_code ? `Code: ${item.item_code}` : null,
    item.barcode ? `Barcode: ${item.barcode}` : null,
    item.category ? `Category: ${item.category}` : null,
    item.location ? `Location: ${item.location}` : null,
    "",
    "📊 STOCK INFO",
    "───────────────────────────",
    item.stock_qty !== undefined ? `System Stock: ${item.stock_qty}` : null,
    item.counted_qty !== undefined ? `Counted Qty: ${item.counted_qty}` : null,
    item.variance !== undefined ? `Variance: ${item.variance > 0 ? "+" : ""}${item.variance}` : null,
    "",
    "✓ VERIFICATION",
    "───────────────────────────",
    `Status: ${item.verified ? "Verified ✓" : "Pending"}`,
    item.verified_at ? `Date: ${new Date(item.verified_at).toLocaleString()}` : null,
    item.verified_by ? `By: ${item.verified_by}` : null,
    item.condition ? `Condition: ${item.condition}` : null,
    item.notes ? `Notes: ${item.notes}` : null,
    "",
    sessionName ? `Session: ${sessionName}` : null,
    "",
    "═══════════════════════════",
    `Generated: ${new Date().toLocaleString()}`,
  ];

  return lines.filter(Boolean).join("\n");
}

function formatItemAsCSV(item: ItemShareData): string {
  const headers = [
    "Item Code",
    "Item Name",
    "Barcode",
    "Category",
    "Location",
    "System Stock",
    "Counted Qty",
    "Variance",
    "Verified",
    "Verified At",
    "Verified By",
    "Condition",
    "Notes",
  ];

  const values = [
    item.item_code || "",
    item.item_name || "",
    item.barcode || "",
    item.category || "",
    item.location || "",
    item.stock_qty?.toString() || "",
    item.counted_qty?.toString() || "",
    item.variance?.toString() || "",
    item.verified ? "Yes" : "No",
    item.verified_at || "",
    item.verified_by || "",
    item.condition || "",
    item.notes || "",
  ];

  return [headers.join(","), values.map((v) => `"${v}"`).join(",")].join("\n");
}

// ============================================================================
// Share Action Item
// ============================================================================

interface ShareActionItemProps {
  action: ShareAction;
  index: number;
}

const ShareActionItem: React.FC<ShareActionItemProps> = ({ action, index }) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action.onPress();
  };

  return (
    <Animated.View entering={FadeIn.delay(index * 50).duration(200)}>
      <TouchableOpacity
        style={styles.actionItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={[styles.actionIcon, { backgroundColor: action.color + "20" }]}>
          <Ionicons name={action.icon as any} size={24} color={action.color} />
        </View>
        <Text style={styles.actionLabel}>{action.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ItemShareSheet: React.FC<ItemShareSheetProps> = ({
  visible,
  onClose,
  item,
  sessionId: _sessionId,
  sessionName,
}) => {
  const handleShare = async () => {
    try {
      const text = formatItemAsText(item, sessionName);
      await Share.share({
        message: text,
        title: `Item: ${item.item_name || item.item_code}`,
      });
      onClose();
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const text = formatItemAsText(item, sessionName);
      await Clipboard.setStringAsync(text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied", "Item details copied to clipboard");
      onClose();
    } catch (error) {
      console.error("Copy error:", error);
      Alert.alert("Error", "Failed to copy to clipboard");
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = formatItemAsCSV(item);
      
      if (await Sharing.isAvailableAsync()) {
        // Create a simple text share with CSV content
        await Share.share({
          message: csv,
          title: `item_${item.item_code || "export"}.csv`,
        });
      } else {
        // Fallback to clipboard
        await Clipboard.setStringAsync(csv);
        Alert.alert("Success", "CSV data copied to clipboard");
      }
      onClose();
    } catch (error) {
      console.error("CSV export error:", error);
      Alert.alert("Error", "Failed to export CSV");
    }
  };

  const actions: ShareAction[] = [
    {
      id: "share",
      icon: "share-outline",
      label: "Share",
      color: theme.colors.primary[500],
      onPress: handleShare,
    },
    {
      id: "copy",
      icon: "copy-outline",
      label: "Copy Text",
      color: theme.colors.info.main,
      onPress: handleCopyToClipboard,
    },
    {
      id: "csv",
      icon: "document-text-outline",
      label: "Export CSV",
      color: theme.colors.success.main,
      onPress: handleExportCSV,
    },
  ];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          entering={SlideInDown.springify().damping(15)}
          exiting={SlideOutDown}
          style={styles.sheetContainer}
        >
          <TouchableOpacity activeOpacity={1}>
            <GlassCard
              intensity={20}
              padding={theme.spacing.lg}
              borderRadius={theme.borderRadius.xl}
            >
              {/* Handle */}
              <View style={styles.handle} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Share Item</Text>
                <Text style={styles.subtitle}>
                  {item.item_name || item.item_code}
                </Text>
              </View>

              {/* Actions Grid */}
              <View style={styles.actionsGrid}>
                {actions.map((action, index) => (
                  <ShareActionItem key={action.id} action={action} index={index} />
                ))}
              </View>

              {/* Cancel Button */}
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </GlassCard>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    marginHorizontal: theme.spacing.md,
    marginBottom: Platform.OS === "ios" ? 34 : theme.spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border.light,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: theme.spacing.md,
  },
  header: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  actionItem: {
    alignItems: "center",
    width: 72,
    gap: theme.spacing.xs,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 12,
    color: theme.colors.text.primary,
    fontWeight: "500",
  },
  cancelButton: {
    backgroundColor: theme.colors.background.paper,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.secondary,
  },
});

export default ItemShareSheet;
