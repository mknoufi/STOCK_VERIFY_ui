/**
 * Modern Header Component for Lavanya Mart Stock Verify
 * Clean header with branding and navigation
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ViewStyle,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, typography, shadows } from "../../theme/modernDesign";

interface ModernHeaderProps {
  title?: string;
  showLogo?: boolean;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  subtitle?: string;
  style?: ViewStyle;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  title,
  showLogo = false,
  showBackButton = false,
  onBackPress,
  rightComponent,
  rightAction,
  subtitle,
  style,
}) => {
  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} translucent={false} />

      <View style={styles.header}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {showBackButton && (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.gray[700]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center Section */}
        <View style={styles.centerSection}>
          {showLogo ? (
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/lavanya-mart-logo.svg")}
                style={styles.logo}
                resizeMode="contain"
              />
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          ) : title ? (
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          ) : null}
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {rightComponent}
          {rightAction && (
            <TouchableOpacity
              onPress={rightAction.onPress}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={rightAction.icon} size={24} color={colors.gray[700]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  leftSection: {
    flex: 1,
    alignItems: "flex-start",
  },
  centerSection: {
    flex: 2,
    alignItems: "center",
  },
  rightSection: {
    flex: 1,
    alignItems: "flex-end",
  },
  backButton: {
    padding: spacing.xs,
  },
  logoContainer: {
    alignItems: "center",
  },
  logo: {
    height: 32,
    width: 120,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[900],
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.normal,
    color: colors.gray[500],
    marginTop: 2,
    textAlign: "center",
  },
});

export default ModernHeader;
