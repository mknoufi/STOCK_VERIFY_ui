/**
 * Enhanced Card Component - Modern card with variants and animations
 */

import React from "react";
import { TouchableOpacity, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import styled from "@emotion/native";
import {
  modernColors,
  modernBorderRadius,
  modernSpacing,
  modernShadows,
  modernTypography,
  glassmorphism,
} from "../../styles/modernDesignSystem";
import { springPresets, timingPresets } from "../../utils/animationHelpers";

type CardVariant = "default" | "elevated" | "glass" | "outline" | "gradient";
type CardSize = "small" | "medium" | "large";

interface EnhancedCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  interactive?: boolean;
  loading?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const EnhancedCard: React.FC<EnhancedCardProps> = ({
  children,
  variant = "default",
  size = "medium",
  title,
  subtitle,
  icon,
  onPress,
  style,
  contentStyle,
  interactive = true,
  loading = false,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (!onPress || !interactive) return;
    scale.value = withSpring(0.98, springPresets.default);
    opacity.value = withTiming(0.9, timingPresets.fast);
  };

  const handlePressOut = () => {
    if (!onPress || !interactive) return;
    scale.value = withSpring(1, springPresets.default);
    opacity.value = withTiming(1, timingPresets.fast);
  };

  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: modernBorderRadius.card,
      padding: getPadding(),
      overflow: "hidden",
    };

    switch (variant) {
      case "elevated":
        return {
          ...baseStyle,
          backgroundColor: modernColors.background.paper,
          ...modernShadows.md,
        };
      case "glass":
        return {
          ...baseStyle,
          ...glassmorphism.medium,
        };
      case "outline":
        return {
          ...baseStyle,
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: modernColors.border.light,
        };
      case "gradient":
        return {
          ...baseStyle,
          backgroundColor: modernColors.background.paper,
          ...modernShadows.sm,
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: modernColors.background.paper,
          borderWidth: 1,
          borderColor: modernColors.border.light,
        };
    }
  };

  const getPadding = (): number => {
    switch (size) {
      case "small":
        return modernSpacing.md;
      case "large":
        return modernSpacing.xl;
      default:
        return modernSpacing.cardPadding;
    }
  };

  const renderHeader = () => {
    if (!title && !icon) return null;

    return (
      <HeaderContainer>
        {icon && (
          <IconContainer>
            <Ionicons name={icon} size={24} color={modernColors.primary[500]} />
          </IconContainer>
        )}
        <HeaderTextContainer>
          {title && <Title>{title}</Title>}
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </HeaderTextContainer>
      </HeaderContainer>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <LoadingContainer>
          <LoadingSkeleton />
        </LoadingContainer>
      );
    }

    return <ContentContainer style={contentStyle}>{children}</ContentContainer>;
  };

  const CardWrapper = onPress ? AnimatedTouchableOpacity : Animated.View;

  if (variant === "glass") {
    return (
      <CardWrapper
        style={[getCardStyle(), animatedStyle, style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <BlurView intensity={20} tint="dark" style={{ flex: 1 }}>
          {renderHeader()}
          {renderContent()}
        </BlurView>
      </CardWrapper>
    );
  }

  return (
    <CardWrapper
      style={[getCardStyle(), animatedStyle, style]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {renderHeader()}
      {renderContent()}
    </CardWrapper>
  );
};

// Loading skeleton component
const LoadingSkeleton: React.FC = () => {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withTiming(0.7, { duration: 1000 }, () => {
      opacity.value = withTiming(0.3, { duration: 1000 });
    });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <SkeletonLine style={{ width: "80%", marginBottom: 8 }} />
      <SkeletonLine style={{ width: "60%", marginBottom: 8 }} />
      <SkeletonLine style={{ width: "90%", marginBottom: 8 }} />
    </Animated.View>
  );
};

// Styled Components
const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: ${modernSpacing.md}px;
`;

const IconContainer = styled.View`
  margin-right: ${modernSpacing.sm}px;
`;

const HeaderTextContainer = styled.View`
  flex: 1;
`;

const Title = styled.Text`
  font-size: ${modernTypography.h4.fontSize}px;
  font-weight: ${modernTypography.h4.fontWeight};
  color: ${modernColors.text.primary};
  margin-bottom: ${modernSpacing.xs}px;
`;

const Subtitle = styled.Text`
  font-size: ${modernTypography.body.small.fontSize}px;
  color: ${modernColors.text.secondary};
`;

const ContentContainer = styled.View`
  flex: 1;
`;

const LoadingContainer = styled.View`
  padding: ${modernSpacing.md}px 0;
`;

const SkeletonLine = styled.View`
  height: 12px;
  background-color: ${modernColors.neutral[700]};
  border-radius: ${modernBorderRadius.xs}px;
`;
