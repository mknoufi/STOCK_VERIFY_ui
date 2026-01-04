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
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "../../store/authStore";

import { colors, spacing, typography, shadows, gradients } from "../../theme/modernDesign";

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

const LogoWithBorder = ({ size = 40 }: { size?: number }) => (
  <LinearGradient
    colors={gradients.primary}
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      padding: 2,
      justifyContent: "center",
      alignItems: "center",
    }}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <View
      style={{
        flex: 1,
        width: "100%",
        backgroundColor: colors.white,
        borderRadius: size / 2,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Image
        source={require("../../../assets/images/logo.png")}
        style={{ width: size * 0.6, height: size * 0.6 }}
        resizeMode="contain"
      />
    </View>
  </LinearGradient>
);

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
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.white}
        translucent={false}
      />

      <View style={styles.header}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {showBackButton ? (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.gray[700]} />
            </TouchableOpacity>
          ) : !showLogo ? (
            <View style={styles.logoContainer}>
              <LogoWithBorder size={36} />
            </View>
          ) : null}
        </View>

        {/* Center Section */}
        <View style={styles.centerSection}>
          {showLogo ? (
            <View style={styles.logoContainer}>
              <LogoWithBorder size={48} />
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          ) : title ? (
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
          ) : (
            <View style={styles.titleContainer}>
              <Text style={styles.brandName}>Lavanya Mart</Text>
              {user?.full_name && (
                <Text style={styles.userName} numberOfLines={1}>
                  {user.full_name}
                </Text>
              )}
            </View>
          )}
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
              <Ionicons
                name={rightAction.icon}
                size={24}
                color={colors.gray[700]}
              />
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
    height: 60,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  leftSection: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  centerSection: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rightSection: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  backButton: {
    padding: spacing.xs,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    height: 32,
    width: 32,
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
  brandName: {
    fontSize: typography.fontSize.base,
    fontWeight: "800",
    color: colors.primary[600],
    textAlign: "center",
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
    textAlign: "center",
    fontWeight: "500",
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.normal,
    color: colors.gray[500],
    marginTop: 2,
    textAlign: "center",
  },
});

export default ModernHeader;
