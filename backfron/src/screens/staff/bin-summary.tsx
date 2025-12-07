/**
 * Bin Summary Screen - Progress and variance overview
 * Features: Progress circle, summary table, variance highlights
 */

import React from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import styled from "@emotion/native";

import { RippleButton } from "../../components/enhanced/RippleButton";
import { modernColors, modernSpacing, modernTypography, modernBorderRadius } from "../../styles/modernDesignSystem";

interface BinItem {
  item_code: string;
  item_name: string;
  system_qty: number;
  counted_qty: number;
  variance: number;
  hasHighVariance: boolean;
  isMissing: boolean;
}

const MOCK_BIN_ITEMS: BinItem[] = [
  {
    item_code: "ITEM001",
    item_name: "Rice Bag 25kg",
    system_qty: 150,
    counted_qty: 145,
    variance: -5,
    hasHighVariance: false,
    isMissing: false,
  },
  {
    item_code: "ITEM002",
    item_name: "Cooking Oil 5L",
    system_qty: 80,
    counted_qty: 60,
    variance: -20,
    hasHighVariance: true,
    isMissing: false,
  },
  {
    item_code: "ITEM003",
    item_name: "Sugar 1kg",
    system_qty: 200,
    counted_qty: 0,
    variance: -200,
    hasHighVariance: true,
    isMissing: true,
  },
];

export default function BinSummaryScreen() {
  const router = useRouter();
  const [items] = useState<BinItem[]>(MOCK_BIN_ITEMS);

  const totalItems = items.length;
  const countedItems = items.filter((i) => i.counted_qty > 0).length;
  const progress = (countedItems / totalItems) * 100;
  const highVarianceCount = items.filter((i) => i.hasHighVariance).length;
  const missingItemsCount = items.filter((i) => i.isMissing).length;

  const handleCloseBin = () => {
    Alert.alert(
      "Close Bin",
      "After closing, this bin will be locked. Are you sure you want to continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Close Bin",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  };

  const handleReopenItems = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  const handleItemPress = (item: BinItem) => {
    if (item.hasHighVariance) {
      // Show variance detail panel
      Haptics.selectionAsync();
    }
  };

  // Progress circle calculation
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Container>
      {/* Header */}
      <Header>
        <BackButton onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={modernColors.text.primary} />
        </BackButton>
        <HeaderTitle>Bin Summary</HeaderTitle>
        <HeaderSubtitle>BIN-A-001</HeaderSubtitle>
      </Header>

      <ScrollContent>
        {/* Progress Circle */}
        <ProgressSection>
          <ProgressCircleContainer>
            <Svg width={size} height={size}>
              {/* Background circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={modernColors.neutral[800]}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress circle */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={modernColors.primary[500]}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
              />
            </Svg>
            <ProgressTextContainer>
              <ProgressPercentage>{Math.round(progress)}%</ProgressPercentage>
              <ProgressLabel>Complete</ProgressLabel>
            </ProgressTextContainer>
          </ProgressCircleContainer>

          <StatsGrid>
            <StatCard>
              <StatValue>{countedItems}</StatValue>
              <StatLabel>Counted</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{totalItems}</StatValue>
              <StatLabel>Total Items</StatLabel>
            </StatCard>
          </StatsGrid>
        </ProgressSection>

        {/* Alerts */}
        {(highVarianceCount > 0 || missingItemsCount > 0) && (
          <AlertsSection>
            {highVarianceCount > 0 && (
              <AlertCard variant="warning">
                <Ionicons name="warning" size={24} color={modernColors.warning.main} />
                <AlertText>{highVarianceCount} items with high variance</AlertText>
              </AlertCard>
            )}
            {missingItemsCount > 0 && (
              <AlertCard variant="error">
                <Ionicons name="alert-circle" size={24} color={modernColors.error.main} />
                <AlertText>{missingItemsCount} missing items</AlertText>
              </AlertCard>
            )}
          </AlertsSection>
        )}

        {/* Summary Table */}
        <SummarySection>
          <SectionTitle>Item Summary</SectionTitle>

          <TableHeader>
            <TableHeaderCell flex={2}>Item</TableHeaderCell>
            <TableHeaderCell>System</TableHeaderCell>
            <TableHeaderCell>Counted</TableHeaderCell>
            <TableHeaderCell>Variance</TableHeaderCell>
          </TableHeader>

          {items.map((item, index) => (
            <Animated.View key={item.item_code} entering={FadeInDown.delay(index * 50)}>
              <TableRow onPress={() => handleItemPress(item)} hasAlert={item.hasHighVariance}>
                <TableCell flex={2}>
                  <ItemNameContainer>
                    <ItemName numberOfLines={1}>{item.item_name}</ItemName>
                    <ItemCode>{item.item_code}</ItemCode>
                  </ItemNameContainer>
                </TableCell>
                <TableCell>
                  <CellText>{item.system_qty}</CellText>
                </TableCell>
                <TableCell>
                  <CellText>{item.counted_qty}</CellText>
                </TableCell>
                <TableCell>
                  <VarianceCell isNegative={item.variance < 0}>
                    {item.hasHighVariance && (
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color={modernColors.error.main}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <CellText>{item.variance > 0 ? "+" : ""}{item.variance}</CellText>
                  </VarianceCell>
                </TableCell>
              </TableRow>
            </Animated.View>
          ))}
        </SummarySection>
      </ScrollContent>

      {/* Footer Actions */}
      <FooterActions>
        <RippleButton
          title="Re-open Items"
          onPress={handleReopenItems}
          icon="refresh"
          variant="outline"
          size="large"
          style={{ flex: 1, marginRight: modernSpacing.sm }}
        />
        <RippleButton
          title="Close Bin"
          onPress={handleCloseBin}
          icon="lock-closed"
          variant="primary"
          size="large"
          style={{ flex: 1 }}
        />
      </FooterActions>
    </Container>
  );
}

// Styled Components
const Container = styled.View`
  flex: 1;
  background-color: ${modernColors.background.default};
`;

const Header = styled.View`
  padding: ${modernSpacing.screenPadding}px;
  padding-top: ${modernSpacing.xl}px;
  border-bottom-width: 1px;
  border-bottom-color: ${modernColors.border.light};
`;

const BackButton = styled.TouchableOpacity`
  align-self: flex-start;
  padding: ${modernSpacing.xs}px;
  margin-bottom: ${modernSpacing.sm}px;
`;

const HeaderTitle = styled.Text`
  font-size: ${modernTypography.h2.fontSize}px;
  font-weight: ${modernTypography.h2.fontWeight};
  color: ${modernColors.text.primary};
  margin-bottom: ${modernSpacing.xs}px;
`;

const HeaderSubtitle = styled.Text`
  font-size: ${modernTypography.body.medium.fontSize}px;
  color: ${modernColors.text.secondary};
`;

const ScrollContent = styled.ScrollView`
  flex: 1;
`;

const ProgressSection = styled.View`
  align-items: center;
  margin-bottom: ${modernSpacing.xl}px;
`;

const ProgressCircleContainer = styled.View`
  position: relative;
  margin-bottom: ${modernSpacing.lg}px;
`;

const ProgressTextContainer = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  align-items: center;
  justify-content: center;
`;

const ProgressPercentage = styled.Text`
  font-size: 36px;
  font-weight: bold;
  color: ${modernColors.text.primary};
`;

const ProgressLabel = styled.Text`
  font-size: ${modernTypography.label.medium.fontSize}px;
  color: ${modernColors.text.secondary};
  margin-top: ${modernSpacing.xs}px;
`;

const StatsGrid = styled.View`
  flex-direction: row;
  gap: ${modernSpacing.md}px;
  width: 100%;
`;

const StatCard = styled.View`
  flex: 1;
  background-color: ${modernColors.background.paper};
  border-radius: ${modernBorderRadius.md}px;
  padding: ${modernSpacing.md}px;
  align-items: center;
  border-width: 1px;
  border-color: ${modernColors.border.light};
`;

const StatValue = styled.Text`
  font-size: ${modernTypography.h3.fontSize}px;
  font-weight: ${modernTypography.h3.fontWeight};
  color: ${modernColors.primary[500]};
  margin-bottom: ${modernSpacing.xs}px;
`;

const StatLabel = styled.Text`
  font-size: ${modernTypography.label.small.fontSize}px;
  color: ${modernColors.text.secondary};
  text-align: center;
`;

const AlertsSection = styled.View`
  gap: ${modernSpacing.sm}px;
  margin-bottom: ${modernSpacing.lg}px;
`;

const AlertCard = styled.View<{ variant: "warning" | "error" }>`
  flex-direction: row;
  align-items: center;
  gap: ${modernSpacing.sm}px;
  padding: ${modernSpacing.md}px;
  background-color: ${(props) =>
    props.variant === "error"
      ? `${modernColors.error.main}15`
      : `${modernColors.warning.main}15`};
  border-radius: ${modernBorderRadius.md}px;
  border-width: 1px;
  border-color: ${(props) =>
    props.variant === "error" ? modernColors.error.main : modernColors.warning.main};
`;

const AlertText = styled.Text`
  font-size: ${modernTypography.body.medium.fontSize}px;
  color: ${modernColors.text.primary};
  font-weight: 500;
`;

const SummarySection = styled.View`
  margin-bottom: ${modernSpacing.xl}px;
`;

const SectionTitle = styled.Text`
  font-size: ${modernTypography.h4.fontSize}px;
  font-weight: ${modernTypography.h4.fontWeight};
  color: ${modernColors.text.primary};
  margin-bottom: ${modernSpacing.md}px;
`;

const TableHeader = styled.View`
  flex-direction: row;
  padding: ${modernSpacing.sm}px;
  background-color: ${modernColors.background.paper};
  border-radius: ${modernBorderRadius.sm}px;
  margin-bottom: ${modernSpacing.xs}px;
`;

const TableHeaderCell = styled.View<{ flex?: number }>`
  flex: ${(props) => props.flex || 1};
  align-items: center;
`;

const TableRow = styled.TouchableOpacity<{ hasAlert?: boolean }>`
  flex-direction: row;
  padding: ${modernSpacing.md}px;
  background-color: ${modernColors.background.paper};
  border-radius: ${modernBorderRadius.sm}px;
  margin-bottom: ${modernSpacing.xs}px;
  border-width: 1px;
  border-color: ${(props) =>
    props.hasAlert ? modernColors.error.main : modernColors.border.light};
`;

const TableCell = styled.View<{ flex?: number }>`
  flex: ${(props) => props.flex || 1};
  align-items: center;
  justify-content: center;
`;

const ItemNameContainer = styled.View`
  flex: 1;
`;

const ItemName = styled.Text`
  font-size: ${modernTypography.body.small.fontSize}px;
  font-weight: 600;
  color: ${modernColors.text.primary};
  margin-bottom: 2px;
`;

const ItemCode = styled.Text`
  font-size: ${modernTypography.label.small.fontSize}px;
  color: ${modernColors.text.tertiary};
`;

const CellText = styled.Text`
  font-size: ${modernTypography.body.small.fontSize}px;
  color: ${modernColors.text.primary};
  font-weight: 500;
`;

const VarianceCell = styled.View<{ isNegative: boolean }>`
  flex-direction: row;
  align-items: center;
  padding: ${modernSpacing.xs}px ${modernSpacing.sm}px;
  background-color: ${(props) =>
    props.isNegative ? `${modernColors.error.main}20` : `${modernColors.success.main}20`};
  border-radius: ${modernBorderRadius.xs}px;
`;

const FooterActions = styled.View`
  flex-direction: row;
  padding: ${modernSpacing.screenPadding}px;
  border-top-width: 1px;
  border-top-color: ${modernColors.border.light};
  background-color: ${modernColors.background.default};
`;
