/**
 * Scan Home Screen - Primary action screen for stock counting
 * Features: Barcode scan, Smart item list with search
 */

import React, { useState, useCallback } from "react";
import { FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import styled from "@emotion/native";

import { RippleButton } from "../../components/enhanced/RippleButton";
import { SkeletonList } from "../../components/enhanced/SkeletonLoader";
import { modernColors, modernSpacing, modernTypography } from "../../styles/modernDesignSystem";
import { Item } from "../../types/item";

// Mock data for demonstration
const MOCK_ITEMS: Item[] = [
  {
    item_code: "ITEM001",
    item_name: "Rice Bag 25kg",
    barcode: "1234567890123",
    stock_qty: 150,
    mrp: 1200,
    category: "Food",
  },
  {
    item_code: "ITEM002",
    item_name: "Cooking Oil 5L",
    barcode: "1234567890124",
    stock_qty: 80,
    mrp: 650,
    category: "Food",
  },
  {
    item_code: "ITEM003",
    item_name: "Sugar 1kg",
    barcode: "1234567890125",
    stock_qty: 200,
    mrp: 50,
    category: "Food",
  },
];

type ItemStatus = "not_counted" | "edited" | "done";

interface ItemWithStatus extends Item {
  status: ItemStatus;
  previousCount?: number;
  countedQty?: number;
}

export default function ScanHomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [items] = useState<ItemWithStatus[]>(
    MOCK_ITEMS.map((item) => ({ ...item, status: "not_counted" as ItemStatus }))
  );
  const [loading] = useState(false);

  const handleScanPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to camera scan screen
    router.push("/staff/camera-scan" as any);
  }, [router]);

  const handleItemPress = useCallback(
    (item: ItemWithStatus) => {
      Haptics.selectionAsync();
      // Navigate to item entry modal
      router.push({
        pathname: "/staff/item-entry" as any,
        params: { itemCode: item.item_code },
      });
    },
    [router]
  );

  const filteredItems = items.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode?.includes(searchQuery)
  );

  const getStatusColor = (status: ItemStatus): string => {
    switch (status) {
      case "done":
        return modernColors.success.main;
      case "edited":
        return modernColors.warning.main;
      default:
        return modernColors.neutral[600];
    }
  };

  const getStatusIcon = (status: ItemStatus): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case "done":
        return "checkmark-circle";
      case "edited":
        return "create-outline";
      default:
        return "ellipse-outline";
    }
  };

  const renderItem = ({ item, index }: { item: ItemWithStatus; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <ItemCard onPress={() => handleItemPress(item)}>
        <ItemHeader>
          <ItemInfo>
            <ItemName numberOfLines={2}>{item.item_name}</ItemName>
            <ItemCode>{item.item_code}</ItemCode>
          </ItemInfo>
          <StatusBadge>
            <Ionicons name={getStatusIcon(item.status)} size={24} color={getStatusColor(item.status)} />
          </StatusBadge>
        </ItemHeader>

        <ItemDetails>
          <DetailRow>
            <DetailLabel>System Stock:</DetailLabel>
            <DetailValue>{item.stock_qty || 0}</DetailValue>
          </DetailRow>

          {item.previousCount !== undefined && (
            <DetailRow>
              <DetailLabel>Previous Count:</DetailLabel>
              <DetailValue highlight>{item.previousCount}</DetailValue>
            </DetailRow>
          )}

          {item.countedQty !== undefined && (
            <DetailRow>
              <DetailLabel>Current Count:</DetailLabel>
              <DetailValue highlight>{item.countedQty}</DetailValue>
            </DetailRow>
          )}
        </ItemDetails>

        {item.mrp && (
          <PriceTag>
            <Ionicons name="pricetag" size={14} color={modernColors.text.tertiary} />
            <PriceText>₹{item.mrp}</PriceText>
          </PriceTag>
        )}
      </ItemCard>
    </Animated.View>
  );

  return (
    <Container>
      <StatusBar style="light" />

      {/* Header */}
      <Header>
        <HeaderTitle>Stock Count</HeaderTitle>
        <HeaderSubtitle>Scan or select items to count</HeaderSubtitle>
      </Header>

      {/* Primary Scan Button */}
      <ScanButtonContainer>
        <RippleButton
          title="SCAN BARCODE"
          onPress={handleScanPress}
          icon="barcode-outline"
          size="large"
          variant="primary"
          fullWidth
          style={{ minHeight: 64 }}
        />
      </ScanButtonContainer>

      {/* Search Bar */}
      <SearchContainer>
        <SearchIcon>
          <Ionicons name="search" size={20} color={modernColors.text.tertiary} />
        </SearchIcon>
        <SearchInput
          placeholder="Search items..."
          placeholderTextColor={modernColors.text.disabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <ClearButton onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={modernColors.text.tertiary} />
          </ClearButton>
        )}
      </SearchContainer>

      {/* Item List */}
      <ListContainer>
        {loading ? (
          <SkeletonList count={5} itemHeight={120} />
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.item_code}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState>
                <Ionicons name="search-outline" size={64} color={modernColors.text.disabled} />
                <EmptyText>No items found</EmptyText>
              </EmptyState>
            }
          />
        )}
      </ListContainer>

      {/* Quick Stats Footer */}
      <QuickStats>
        <StatItem>
          <StatValue>{items.filter((i) => i.status === "done").length}</StatValue>
          <StatLabel>Counted</StatLabel>
        </StatItem>
        <StatDivider />
        <StatItem>
          <StatValue>{items.filter((i) => i.status === "edited").length}</StatValue>
          <StatLabel>Edited</StatLabel>
        </StatItem>
        <StatDivider />
        <StatItem>
          <StatValue>{items.length}</StatValue>
          <StatLabel>Total</StatLabel>
        </StatItem>
      </QuickStats>
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

const ScanButtonContainer = styled.View`
  padding-horizontal: ${modernSpacing.screenPadding}px;
  margin-bottom: ${modernSpacing.lg}px;
`;

const SearchContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: ${modernColors.background.paper};
  border-radius: 12px;
  margin-horizontal: ${modernSpacing.screenPadding}px;
  margin-bottom: ${modernSpacing.lg}px;
  padding-horizontal: ${modernSpacing.md}px;
  min-height: 48px;
  border-width: 1px;
  border-color: ${modernColors.border.light};
`;

const SearchIcon = styled.View`
  margin-right: ${modernSpacing.sm}px;
`;

const SearchInput = styled.TextInput`
  flex: 1;
  font-size: ${modernTypography.body.medium.fontSize}px;
  color: ${modernColors.text.primary};
  padding: 0;
`;

const ClearButton = styled.TouchableOpacity`
  padding: ${modernSpacing.xs}px;
`;

const ListContainer = styled.View`
  flex: 1;
  padding-horizontal: ${modernSpacing.screenPadding}px;
`;

const ItemCard = styled.TouchableOpacity`
  background-color: ${modernColors.background.paper};
  border-radius: 16px;
  padding: ${modernSpacing.md}px;
  margin-bottom: ${modernSpacing.md}px;
  border-width: 1px;
  border-color: ${modernColors.border.light};
`;

const ItemHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${modernSpacing.sm}px;
`;

const ItemInfo = styled.View`
  flex: 1;
  margin-right: ${modernSpacing.sm}px;
`;

const ItemName = styled.Text`
  font-size: ${modernTypography.h5.fontSize}px;
  font-weight: ${modernTypography.h5.fontWeight};
  color: ${modernColors.text.primary};
  margin-bottom: ${modernSpacing.xs}px;
`;

const ItemCode = styled.Text`
  font-size: ${modernTypography.label.medium.fontSize}px;
  color: ${modernColors.text.tertiary};
`;

const StatusBadge = styled.View`
  padding: ${modernSpacing.xs}px;
`;

const ItemDetails = styled.View`
  gap: ${modernSpacing.xs}px;
  margin-bottom: ${modernSpacing.sm}px;
`;

const DetailRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const DetailLabel = styled.Text`
  font-size: ${modernTypography.body.small.fontSize}px;
  color: ${modernColors.text.secondary};
`;

const DetailValue = styled.Text<{ highlight?: boolean }>`
  font-size: ${modernTypography.body.small.fontSize}px;
  font-weight: 600;
  color: ${(props) => (props.highlight ? modernColors.primary[400] : modernColors.text.primary)};
`;

const PriceTag = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${modernSpacing.xs}px;
  padding-top: ${modernSpacing.xs}px;
  border-top-width: 1px;
  border-top-color: ${modernColors.border.light};
`;

const PriceText = styled.Text`
  font-size: ${modernTypography.label.medium.fontSize}px;
  font-weight: 600;
  color: ${modernColors.text.tertiary};
`;

const QuickStats = styled.View`
  flex-direction: row;
  background-color: ${modernColors.background.paper};
  padding: ${modernSpacing.md}px;
  border-top-width: 1px;
  border-top-color: ${modernColors.border.light};
`;

const StatItem = styled.View`
  flex: 1;
  align-items: center;
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
  text-transform: uppercase;
`;

const StatDivider = styled.View`
  width: 1px;
  height: 100%;
  background-color: ${modernColors.border.light};
`;

const EmptyState = styled.View`
  align-items: center;
  justify-content: center;
  padding: ${modernSpacing["3xl"]}px;
`;

const EmptyText = styled.Text`
  font-size: ${modernTypography.body.medium.fontSize}px;
  color: ${modernColors.text.disabled};
  margin-top: ${modernSpacing.md}px;
`;
