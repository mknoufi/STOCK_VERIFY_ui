/**
 * PremiumCard Component
 * Re-exports ModernCard with consistent naming for premium UI components
 */

import React from "react";
import { ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ModernCard, CardVariant, CardElevation } from "../ModernCard";

interface PremiumCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  variant?: CardVariant;
  elevation?: CardElevation;
  padding?: number;
  style?: ViewStyle;
  gradientColors?: string[];
  icon?: keyof typeof Ionicons.glyphMap;
  footer?: React.ReactNode;
  testID?: string;
}

export const PremiumCard: React.FC<PremiumCardProps> = (props) => {
  return <ModernCard {...props} />;
};

export type { PremiumCardProps, CardVariant, CardElevation };
