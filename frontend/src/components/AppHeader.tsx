import React, { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, METRICS, SHADOWS } from "../constants/theme";

type AppHeaderProps = {
  title?: string;
  userName?: string;
  userRole?: string;
  isOnline?: boolean;
  onLogout?: () => void;
  onNotifications?: () => void;
  onSettings?: () => void;
};

export function AppHeader({
  title,
  userName = "Warehouse User",
  userRole = "Shift A",
  isOnline = true,
  onLogout,
  onNotifications,
  onSettings,
}: AppHeaderProps) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const canGoBack = navigation?.canGoBack?.() ?? false;

  const isDashboard = useMemo(() => {
    const name = String(route?.name ?? "");
    return name.toLowerCase() === "dashboard" || name.toLowerCase() === "home";
  }, [route?.name]);

  const headerTitle = useMemo(() => {
    if (title && title.trim().length > 0) return title.trim();
    const name = String(route?.name ?? "");
    if (!name) return "";
    return name;
  }, [route?.name, title]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }
    Alert.alert(
      "Logout",
      "End session?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => Alert.alert("Logged out", "(Mock) You are now logged out."),
        },
      ],
      { cancelable: true }
    );
  };

  const handleNotifications = () => {
    if (onNotifications) {
      onNotifications();
      return;
    }
    Alert.alert("Alerts", "No new notifications.");
  };

  const handleSettings = () => {
    if (onSettings) {
      onSettings();
      return;
    }
    if (navigation?.navigate) navigation.navigate("Settings");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {isDashboard ? (
        <View style={styles.row}>
          {/* LEFT: User Profile */}
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.profileName}>Hi, {userName}</Text>
              <Text style={styles.profileSub}>
                {userRole} •{" "}
                <Text style={{ color: isOnline ? COLORS.SUCCESS : COLORS.ERROR }}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </Text>
            </View>
          </View>

          {/* RIGHT: Actions */}
          <View style={styles.actions}>
            <Pressable onPress={handleNotifications} style={styles.iconButton} hitSlop={10}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.TEXT_SECONDARY} />
              <View style={styles.badgeDot} />
            </Pressable>
            <Pressable onPress={handleSettings} style={styles.iconButton} hitSlop={10}>
              <Ionicons name="settings-outline" size={20} color={COLORS.TEXT_SECONDARY} />
            </Pressable>
            <Pressable
              onPress={handleLogout}
              style={[styles.iconButton, { borderColor: COLORS.ERROR }]}
              hitSlop={10}
            >
              <Ionicons name="power-outline" size={20} color={COLORS.ERROR} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.subLeft}>
            {canGoBack ? (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
                <Text style={styles.backText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <Text numberOfLines={1} style={styles.subTitle}>
                {headerTitle}
              </Text>
            )}
          </View>
          {/* Notifications on sub-screens */}
          <View style={styles.actions}>
            <Pressable onPress={handleNotifications} style={styles.iconButton} hitSlop={10}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.TEXT_SECONDARY} />
              <View style={styles.badgeDot} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    ...SHADOWS.light,
  },
  row: {
    height: 64,
    paddingHorizontal: METRICS.SPACING_4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: METRICS.SPACING_3,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.INFO,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.BG_MAIN,
  },
  avatarText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  profileName: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: "700",
    fontSize: 16,
  },
  profileSub: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: METRICS.SPACING_2,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.BG_MAIN,
    borderWidth: 1,
    borderColor: "#334155",
  },
  badgeDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.WARNING,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 4,
    fontWeight: "600",
    fontSize: 16,
  },
  subLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  subTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: "800",
    fontSize: 16,
    flex: 1,
  },
});
