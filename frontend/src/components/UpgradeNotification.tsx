/**
 * UpgradeNotification Component
 * Shows update available or force update banners
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VersionCheckResult } from "../services/versionService";
import { useThemeContext } from "../theme/ThemeContext";

interface UpgradeNotificationProps {
  /** Version check result */
  versionInfo: VersionCheckResult;
  /** Whether this is a forced upgrade (blocking) */
  forceUpdate?: boolean;
  /** Callback to dismiss the notification (for optional updates) */
  onDismiss?: () => void;
  /** Callback when user taps update button */
  onUpdate?: () => void;
  /** Custom app store URL */
  storeUrl?: string;
  /** Show as banner (inline) or modal (fullscreen blocking) */
  variant?: "banner" | "modal";
}

export const UpgradeNotification: React.FC<UpgradeNotificationProps> = ({
  versionInfo,
  forceUpdate = false,
  onDismiss,
  onUpdate,
  storeUrl,
  variant = "banner",
}) => {
  const { theme, isDark } = useThemeContext();

  const handleUpdate = async () => {
    if (onUpdate) {
      await onUpdate();
      return;
    }

    // Default behavior: open app store
    if (storeUrl) {
      try {
        const canOpen = await Linking.canOpenURL(storeUrl);
        if (canOpen) {
          await Linking.openURL(storeUrl);
        } else {
          __DEV__ && console.log("Cannot open store URL:", storeUrl);
        }
      } catch (err) {
        __DEV__ && console.log("Failed to open store URL", err);
      }
    } else {
      // Platform-specific store URLs could be configured here
      __DEV__ && console.log("No store URL configured for update");
    }
  };

  const getUpdateMessage = () => {
    if (forceUpdate) {
      return `This version is no longer supported. Please update to version ${versionInfo.current_version ?? "the latest"} to continue using the app.`;
    }

    const updateTypeText: Record<string, string> = {
      major: "A major update",
      minor: "A new update",
      patch: "A bug fix update",
    };

    const updateType = versionInfo.update_type || "minor";
    const updateLabel = updateTypeText[updateType] || "An update";

    return `${updateLabel} is available (v${versionInfo.current_version ?? "latest"}). We recommend updating for the best experience.`;
  };

  const getIcon = () => {
    if (forceUpdate) {
      return "warning";
    }
    return versionInfo.update_type === "major" ? "rocket" : "arrow-up-circle";
  };

  const getIconColor = () => {
    if (forceUpdate) {
      return theme.colors.danger;
    }
    return versionInfo.update_type === "major"
      ? theme.colors.success
      : theme.colors.accent;
  };

  if (variant === "modal") {
    return (
      <View
        style={[styles.modalContainer, { backgroundColor: theme.colors.overlay }]}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalIconContainer}>
            <Ionicons
              name={getIcon() as any}
              size={64}
              color={getIconColor()}
            />
          </View>

          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            {forceUpdate ? "Update Required" : "Update Available"}
          </Text>

          <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>
            {getUpdateMessage()}
          </Text>

          <View style={styles.versionInfo}>
            <Text style={[styles.versionLabel, { color: theme.colors.muted }]}
            >
              Current Version:
            </Text>
            <Text style={[styles.versionValue, { color: theme.colors.text }]}>
              {versionInfo.client_version ?? "unknown"}
            </Text>
          </View>

          <View style={styles.versionInfo}>
            <Text style={[styles.versionLabel, { color: theme.colors.muted }]}
            >
              Latest Version:
            </Text>
            <Text style={[styles.versionValue, { color: theme.colors.text }]}>
              {versionInfo.current_version ?? "unknown"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: getIconColor() }]}
            onPress={handleUpdate}
          >
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.updateButtonText}>Update Now</Text>
          </TouchableOpacity>

          {!forceUpdate && onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text
                style={[
                  styles.dismissButtonText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Remind Me Later
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Banner variant
  const bannerBackground = forceUpdate
    ? isDark
      ? `${theme.colors.danger}20`
      : "#FFEBEE"
    : isDark
      ? `${theme.colors.accent}20`
      : "#E3F2FD";

  return (
    <View
      style={[
        styles.bannerContainer,
        { backgroundColor: bannerBackground },
      ]}
    >
      <View style={styles.bannerContent}>
        <Ionicons
          name={getIcon() as any}
          size={24}
          color={getIconColor()}
          style={styles.bannerIcon}
        />

        <View style={styles.bannerTextContainer}>
          <Text style={[styles.bannerTitle, { color: theme.colors.text }]}>
            {forceUpdate ? "Update Required" : "Update Available"}
          </Text>
          <Text
            style={[styles.bannerMessage, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {getUpdateMessage()}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bannerUpdateButton,
            { backgroundColor: getIconColor() },
          ]}
          onPress={handleUpdate}
        >
          <Text style={styles.bannerUpdateButtonText}>Update</Text>
        </TouchableOpacity>

        {!forceUpdate && onDismiss && (
          <TouchableOpacity
            style={styles.bannerCloseButton}
            onPress={onDismiss}
          >
            <Ionicons
              name="close"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  versionInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  versionLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  versionValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 20,
    width: "100%",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  dismissButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  dismissButtonText: {
    fontSize: 14,
  },

  // Banner styles
  bannerContainer: {
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: "hidden",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  bannerIcon: {
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 12,
  },
  bannerUpdateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  bannerUpdateButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  bannerCloseButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default UpgradeNotification;
