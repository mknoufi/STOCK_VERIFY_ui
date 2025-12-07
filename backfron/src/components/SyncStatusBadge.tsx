/**
 * Sync Status Badge - Always visible sync indicator
 * Features: Online/offline status, pending uploads, sync errors
 */

import React, { useState } from "react";
import { Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import styled from "@emotion/native";

import { RippleButton } from "./enhanced/RippleButton";
import { LoadingSpinner } from "./enhanced/LoadingSpinner";
import { modernColors, modernSpacing, modernTypography, modernBorderRadius } from "../styles/modernDesignSystem";

interface SyncItem {
  id: string;
  type: "count" | "photo" | "note";
  itemName: string;
  timestamp: Date;
  status: "pending" | "syncing" | "success" | "failed";
  error?: string;
}

interface SyncStatusBadgeProps {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime?: Date;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  isOnline,
  pendingCount,
  lastSyncTime,
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [syncItems] = useState<SyncItem[]>([
    {
      id: "1",
      type: "count",
      itemName: "Rice Bag 25kg",
      timestamp: new Date(),
      status: "pending",
    },
    {
      id: "2",
      type: "photo",
      itemName: "Cooking Oil 5L",
      timestamp: new Date(),
      status: "failed",
      error: "Network timeout",
    },
  ]);

  const handleBadgePress = () => {
    setShowPanel(true);
  };

  const handleRetry = (itemId: string) => {
    // Retry sync for specific item
    console.log("Retrying sync for:", itemId);
  };

  const handleRetryAll = () => {
    // Retry all failed syncs
    console.log("Retrying all failed syncs");
  };

  const getStatusColor = (status: SyncItem["status"]): string => {
    switch (status) {
      case "success":
        return modernColors.success.main;
      case "failed":
        return modernColors.error.main;
      case "syncing":
        return modernColors.info.main;
      default:
        return modernColors.warning.main;
    }
  };

  const getStatusIcon = (status: SyncItem["status"]): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case "success":
        return "checkmark-circle";
      case "failed":
        return "close-circle";
      case "syncing":
        return "sync";
      default:
        return "time";
    }
  };

  const getTypeIcon = (type: SyncItem["type"]): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case "photo":
        return "camera";
      case "note":
        return "document-text";
      default:
        return "list";
    }
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <>
      {/* Badge */}
      <BadgeContainer onPress={handleBadgePress}>
        <BadgeContent isOnline={isOnline}>
          <Ionicons
            name={isOnline ? "cloud-done" : "cloud-offline"}
            size={16}
            color={isOnline ? modernColors.success.main : modernColors.error.main}
          />
          {pendingCount > 0 && (
            <PendingBadge>
              <PendingText>{pendingCount}</PendingText>
            </PendingBadge>
          )}
        </BadgeContent>
      </BadgeContainer>

      {/* Sync Panel Modal */}
      <Modal
        visible={showPanel}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPanel(false)}
      >
        <PanelContainer>
          {/* Header */}
          <PanelHeader>
            <HeaderLeft>
              <Ionicons
                name={isOnline ? "cloud-done" : "cloud-offline"}
                size={24}
                color={isOnline ? modernColors.success.main : modernColors.error.main}
              />
              <HeaderTitle>Sync Status</HeaderTitle>
            </HeaderLeft>
            <CloseButton onPress={() => setShowPanel(false)}>
              <Ionicons name="close" size={24} color={modernColors.text.primary} />
            </CloseButton>
          </PanelHeader>

          {/* Status Summary */}
          <StatusSummary>
            <StatusRow>
              <StatusLabel>Connection:</StatusLabel>
              <StatusValue isOnline={isOnline}>
                {isOnline ? "Online" : "Offline"}
              </StatusValue>
            </StatusRow>
            <StatusRow>
              <StatusLabel>Pending Uploads:</StatusLabel>
              <StatusValue>{pendingCount}</StatusValue>
            </StatusRow>
            {lastSyncTime && (
              <StatusRow>
                <StatusLabel>Last Sync:</StatusLabel>
                <StatusValue>{formatTime(lastSyncTime)}</StatusValue>
              </StatusRow>
            )}
          </StatusSummary>

          {/* Sync Items List */}
          <SyncList>
            <SectionTitle>Pending Items</SectionTitle>
            {syncItems.map((item, index) => (
              <Animated.View key={item.id} entering={FadeIn.delay(index * 50)}>
                <SyncItemCard>
                  <ItemHeader>
                    <ItemIconContainer>
                      <Ionicons
                        name={getTypeIcon(item.type)}
                        size={20}
                        color={modernColors.text.secondary}
                      />
                    </ItemIconContainer>
                    <ItemInfo>
                      <ItemName>{item.itemName}</ItemName>
                      <ItemTime>{formatTime(item.timestamp)}</ItemTime>
                    </ItemInfo>
                    <StatusIcon>
                      {item.status === "syncing" ? (
                        <LoadingSpinner size="small" variant="primary" />
                      ) : (
                        <Ionicons
                          name={getStatusIcon(item.status)}
                          size={24}
                          color={getStatusColor(item.status)}
                        />
                      )}
                    </StatusIcon>
                  </ItemHeader>

                  {item.error && (
                    <ErrorContainer>
                      <ErrorText>{item.error}</ErrorText>
                      <RetryButton onPress={() => handleRetry(item.id)}>
                        <RetryText>Retry</RetryText>
                      </RetryButton>
                    </ErrorContainer>
                  )}
                </SyncItemCard>
              </Animated.View>
            ))}
          </SyncList>

          {/* Footer Actions */}
          <PanelFooter>
            {syncItems.some((item) => item.status === "failed") && (
              <RippleButton
                title="Retry All Failed"
                onPress={handleRetryAll}
                icon="refresh"
                variant="primary"
                size="large"
                fullWidth
              />
            )}
          </PanelFooter>
        </PanelContainer>
      </Modal>
    </>
  );
};

// Styled Components
const BadgeContainer = styled.TouchableOpacity`
  position: absolute;
  top: ${modernSpacing.md}px;
  right: ${modernSpacing.md}px;
  z-index: 1000;
`;

const BadgeContent = styled.View<{ isOnline: boolean }>`
  flex-direction: row;
  align-items: center;
  background-color: ${modernColors.background.paper};
  border-radius: ${modernBorderRadius.full}px;
  padding: ${modernSpacing.sm}px ${modernSpacing.md}px;
  border-width: 2px;
  border-color: ${(props) =>
    props.isOnline ? modernColors.success.main : modernColors.error.main};
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.25;
  shadow-radius: 4px;
  elevation: 4;
`;

const PendingBadge = styled.View`
  background-color: ${modernColors.warning.main};
  border-radius: ${modernBorderRadius.full}px;
  min-width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  margin-left: ${modernSpacing.xs}px;
  padding-horizontal: ${modernSpacing.xs}px;
`;

const PendingText = styled.Text`
  font-size: 10px;
  font-weight: bold;
  color: ${modernColors.text.inverse};
`;

const PanelContainer = styled.View`
  flex: 1;
  background-color: ${modernColors.background.default};
`;

const PanelHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${modernSpacing.screenPadding}px;
  padding-top: ${modernSpacing.xl}px;
  border-bottom-width: 1px;
  border-bottom-color: ${modernColors.border.light};
`;

const HeaderLeft = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${modernSpacing.sm}px;
`;

const HeaderTitle = styled.Text`
  font-size: ${modernTypography.h3.fontSize}px;
  font-weight: ${modernTypography.h3.fontWeight};
  color: ${modernColors.text.primary};
`;

const CloseButton = styled.TouchableOpacity`
  padding: ${modernSpacing.xs}px;
`;

const StatusSummary = styled.View`
  background-color: ${modernColors.background.paper};
  padding: ${modernSpacing.md}px;
  margin: ${modernSpacing.screenPadding}px;
  border-radius: ${modernBorderRadius.md}px;
  border-width: 1px;
  border-color: ${modernColors.border.light};
  gap: ${modernSpacing.sm}px;
`;

const StatusRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const StatusLabel = styled.Text`
  font-size: ${modernTypography.body.medium.fontSize}px;
  color: ${modernColors.text.secondary};
`;

const StatusValue = styled.Text<{ isOnline?: boolean }>`
  font-size: ${modernTypography.body.medium.fontSize}px;
  font-weight: 600;
  color: ${(props) =>
    props.isOnline !== undefined
      ? props.isOnline
        ? modernColors.success.main
        : modernColors.error.main
      : modernColors.text.primary};
`;

const SyncList = styled.ScrollView`
  flex: 1;
`;

const SectionTitle = styled.Text`
  font-size: ${modernTypography.h5.fontSize}px;
  font-weight: ${modernTypography.h5.fontWeight};
  color: ${modernColors.text.primary};
  margin-bottom: ${modernSpacing.md}px;
`;

const SyncItemCard = styled.View`
  background-color: ${modernColors.background.paper};
  border-radius: ${modernBorderRadius.md}px;
  padding: ${modernSpacing.md}px;
  margin-bottom: ${modernSpacing.sm}px;
  border-width: 1px;
  border-color: ${modernColors.border.light};
`;

const ItemHeader = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${modernSpacing.sm}px;
`;

const ItemIconContainer = styled.View`
  width: 40px;
  height: 40px;
  border-radius: ${modernBorderRadius.sm}px;
  background-color: ${modernColors.background.elevated};
  align-items: center;
  justify-content: center;
`;

const ItemInfo = styled.View`
  flex: 1;
`;

const ItemName = styled.Text`
  font-size: ${modernTypography.body.medium.fontSize}px;
  font-weight: 600;
  color: ${modernColors.text.primary};
  margin-bottom: 2px;
`;

const ItemTime = styled.Text`
  font-size: ${modernTypography.label.small.fontSize}px;
  color: ${modernColors.text.tertiary};
`;

const StatusIcon = styled.View`
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
`;

const ErrorContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: ${modernSpacing.sm}px;
  padding-top: ${modernSpacing.sm}px;
  border-top-width: 1px;
  border-top-color: ${modernColors.border.light};
`;

const ErrorText = styled.Text`
  flex: 1;
  font-size: ${modernTypography.label.small.fontSize}px;
  color: ${modernColors.error.main};
  margin-right: ${modernSpacing.sm}px;
`;

const RetryButton = styled.TouchableOpacity`
  padding: ${modernSpacing.xs}px ${modernSpacing.sm}px;
  background-color: ${modernColors.primary[500]};
  border-radius: ${modernBorderRadius.xs}px;
`;

const RetryText = styled.Text`
  font-size: ${modernTypography.label.small.fontSize}px;
  font-weight: 600;
  color: ${modernColors.text.primary};
`;

const PanelFooter = styled.View`
  padding: ${modernSpacing.screenPadding}px;
  border-top-width: 1px;
  border-top-color: ${modernColors.border.light};
`;
