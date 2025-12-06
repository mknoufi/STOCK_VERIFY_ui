/**
 * Item Entry Modal - Count input with optimized UX
 * Features: Large numeric input, increment/decrement, photo evidence, validation
 */

import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import styled from "@emotion/native";

import { RippleButton } from "../../components/enhanced/RippleButton";
import { FloatingLabelInput } from "../../components/enhanced/FloatingLabelInput";
import { SuccessAnimation } from "../../components/enhanced/SuccessAnimation";
import { modernColors, modernSpacing, modernTypography, modernBorderRadius } from "../../styles/modernDesignSystem";

export default function ItemEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const countInputRef = useRef<TextInput>(null);

  // Mock item data
  const [item] = useState({
    item_code: params.itemCode || "ITEM001",
    item_name: "Rice Bag 25kg",
    stock_qty: 150,
    mrp: 1200,
  });

  const [count, setCount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState<{ count?: string }>({});

  // Auto-focus on count input
  useEffect(() => {
    const timer = setTimeout(() => {
      countInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleIncrement = () => {
    Haptics.selectionAsync();
    const currentValue = parseInt(count) || 0;
    setCount((currentValue + 1).toString());
  };

  const handleDecrement = () => {
    Haptics.selectionAsync();
    const currentValue = parseInt(count) || 0;
    if (currentValue > 0) {
      setCount((currentValue - 1).toString());
    }
  };

  const handleLongPressIncrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentValue = parseInt(count) || 0;
    setCount((currentValue + 10).toString());
  };

  const handleLongPressDecrement = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentValue = parseInt(count) || 0;
    if (currentValue >= 10) {
      setCount((currentValue - 10).toString());
    }
  };

  const validateCount = (): boolean => {
    const countValue = parseInt(count);
    
    if (!count || isNaN(countValue)) {
      setErrors({ count: "Count is required" });
      return false;
    }

    if (countValue < 0) {
      setErrors({ count: "Count cannot be negative" });
      return false;
    }

    // Validation for impossible values (e.g., >1000% of system stock)
    if (countValue > item.stock_qty * 10) {
      setErrors({ count: "Count seems unusually high. Please verify." });
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSaveAndNext = async () => {
    if (!validateCount()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Show success animation
    setShowSuccess(true);

    // Save count (API call would go here)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Navigate to next uncounted item or back to list
    router.back();
  };

  const handleTakePhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Open camera for photo evidence
    // For now, just add a placeholder
    setPhotos([...photos, "photo_" + Date.now()]);
  };

  const handleClose = () => {
    router.back();
  };

  const variance = parseInt(count) - item.stock_qty;
  const hasVariance = !isNaN(variance) && variance !== 0;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <Container>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <Header>
            <CloseButton onPress={handleClose}>
              <Ionicons name="close" size={28} color={modernColors.text.primary} />
            </CloseButton>
            <HeaderTitle numberOfLines={2}>{item.item_name}</HeaderTitle>
            <HeaderSubtitle>{item.item_code}</HeaderSubtitle>
          </Header>

          <ScrollContent>
            {/* System Stock Info */}
            <InfoCard>
              <InfoRow>
                <InfoLabel>System Stock:</InfoLabel>
                <InfoValue>{item.stock_qty}</InfoValue>
              </InfoRow>
              {item.mrp && (
                <InfoRow>
                  <InfoLabel>MRP:</InfoLabel>
                  <InfoValue>₹{item.mrp}</InfoValue>
                </InfoRow>
              )}
            </InfoCard>

            {/* Count Input Section */}
            <CountSection>
              <CountLabel>Enter Count</CountLabel>
              
              <CountInputContainer>
                <CountButton
                  onPress={handleDecrement}
                  onLongPress={handleLongPressDecrement}
                  delayLongPress={500}
                >
                  <Ionicons name="remove" size={32} color={modernColors.primary[500]} />
                </CountButton>

                <CountInputWrapper>
                  <CountInput
                    ref={countInputRef}
                    value={count}
                    onChangeText={(text) => {
                      setCount(text.replace(/[^0-9]/g, ""));
                      setErrors({});
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={modernColors.text.disabled}
                    maxLength={6}
                  />
                </CountInputWrapper>

                <CountButton
                  onPress={handleIncrement}
                  onLongPress={handleLongPressIncrement}
                  delayLongPress={500}
                >
                  <Ionicons name="add" size={32} color={modernColors.primary[500]} />
                </CountButton>
              </CountInputContainer>

              {errors.count && (
                <ErrorText>
                  <Ionicons name="alert-circle" size={14} color={modernColors.error.main} />
                  {" "}{errors.count}
                </ErrorText>
              )}

              <QuickActions>
                <QuickActionButton onPress={() => setCount("0")}>
                  <QuickActionText>Zero</QuickActionText>
                </QuickActionButton>
                <QuickActionButton onPress={() => setCount(item.stock_qty.toString())}>
                  <QuickActionText>Same as System</QuickActionText>
                </QuickActionButton>
              </QuickActions>
            </CountSection>

            {/* Variance Alert */}
            {hasVariance && (
              <Animated.View entering={FadeIn}>
                <VarianceAlert isNegative={variance < 0}>
                  <Ionicons
                    name={variance < 0 ? "trending-down" : "trending-up"}
                    size={20}
                    color={variance < 0 ? modernColors.error.main : modernColors.warning.main}
                  />
                  <VarianceText isNegative={variance < 0}>
                    Variance: {variance > 0 ? "+" : ""}{variance}
                  </VarianceText>
                </VarianceAlert>
              </Animated.View>
            )}

            {/* Remarks */}
            <RemarksSection>
              <FloatingLabelInput
                label="Remarks (Optional)"
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
                placeholder="Add any notes about this count..."
                style={{ minHeight: 80, textAlignVertical: "top", paddingTop: 12 }}
              />
            </RemarksSection>

            {/* Photo Evidence */}
            <PhotoSection>
              <SectionTitle>Photo Evidence</SectionTitle>
              <PhotoGrid>
                {photos.map((photo, index) => (
                  <PhotoThumbnail key={index}>
                    <Ionicons name="image" size={32} color={modernColors.text.tertiary} />
                  </PhotoThumbnail>
                ))}
                <AddPhotoButton onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={28} color={modernColors.primary[500]} />
                  <AddPhotoText>Add Photo</AddPhotoText>
                </AddPhotoButton>
              </PhotoGrid>
            </PhotoSection>
          </ScrollContent>

          {/* Save Button */}
          <FooterActions>
            <RippleButton
              title="SAVE & NEXT"
              onPress={handleSaveAndNext}
              icon="checkmark-circle"
              size="large"
              variant="primary"
              fullWidth
            />
          </FooterActions>
        </KeyboardAvoidingView>

        {/* Success Animation Overlay */}
        {showSuccess && (
          <SuccessOverlay>
            <SuccessAnimation size={100} onComplete={() => setShowSuccess(false)} />
          </SuccessOverlay>
        )}
      </Container>
    </Modal>
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

const CloseButton = styled.TouchableOpacity`
  align-self: flex-start;
  padding: ${modernSpacing.xs}px;
  margin-bottom: ${modernSpacing.sm}px;
`;

const HeaderTitle = styled.Text`
  font-size: ${modernTypography.h3.fontSize}px;
  font-weight: ${modernTypography.h3.fontWeight};
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

const InfoCard = styled.View`
  background-color: ${modernColors.background.paper};
  border-radius: ${modernBorderRadius.card}px;
  padding: ${modernSpacing.md}px;
  margin-bottom: ${modernSpacing.lg}px;
  border-width: 1px;
  border-color: ${modernColors.border.light};
`;

const InfoRow = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding-vertical: ${modernSpacing.xs}px;
`;

const InfoLabel = styled.Text`
  font-size: ${modernTypography.body.medium.fontSize}px;
  color: ${modernColors.text.secondary};
`;

const InfoValue = styled.Text`
  font-size: ${modernTypography.h4.fontSize}px;
  font-weight: ${modernTypography.h4.fontWeight};
  color: ${modernColors.text.primary};
`;

const CountSection = styled.View`
  margin-bottom: ${modernSpacing.lg}px;
`;

const CountLabel = styled.Text`
  font-size: ${modernTypography.h5.fontSize}px;
  font-weight: ${modernTypography.h5.fontWeight};
  color: ${modernColors.text.primary};
  margin-bottom: ${modernSpacing.md}px;
`;

const CountInputContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: ${modernSpacing.md}px;
  margin-bottom: ${modernSpacing.sm}px;
`;

const CountButton = styled.TouchableOpacity`
  width: 56px;
  height: 56px;
  border-radius: ${modernBorderRadius.md}px;
  background-color: ${modernColors.background.paper};
  border-width: 2px;
  border-color: ${modernColors.primary[500]};
  align-items: center;
  justify-content: center;
`;

const CountInputWrapper = styled.View`
  flex: 1;
  max-width: 200px;
`;

const CountInput = styled.TextInput`
  font-size: 48px;
  font-weight: bold;
  color: ${modernColors.text.primary};
  text-align: center;
  background-color: ${modernColors.background.paper};
  border-radius: ${modernBorderRadius.md}px;
  border-width: 2px;
  border-color: ${modernColors.border.focus};
  padding: ${modernSpacing.md}px;
  min-height: 80px;
`;

const ErrorText = styled.Text`
  font-size: ${modernTypography.label.small.fontSize}px;
  color: ${modernColors.error.main};
  margin-top: ${modernSpacing.xs}px;
  text-align: center;
`;

const QuickActions = styled.View`
  flex-direction: row;
  gap: ${modernSpacing.sm}px;
  margin-top: ${modernSpacing.md}px;
`;

const QuickActionButton = styled.TouchableOpacity`
  flex: 1;
  padding: ${modernSpacing.sm}px;
  background-color: ${modernColors.background.paper};
  border-radius: ${modernBorderRadius.sm}px;
  border-width: 1px;
  border-color: ${modernColors.border.light};
  align-items: center;
`;

const QuickActionText = styled.Text`
  font-size: ${modernTypography.label.medium.fontSize}px;
  color: ${modernColors.text.secondary};
  font-weight: 500;
`;

const VarianceAlert = styled.View<{ isNegative: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: ${modernSpacing.sm}px;
  padding: ${modernSpacing.md}px;
  background-color: ${(props) =>
    props.isNegative ? `${modernColors.error.main}15` : `${modernColors.warning.main}15`};
  border-radius: ${modernBorderRadius.md}px;
  border-width: 1px;
  border-color: ${(props) =>
    props.isNegative ? modernColors.error.main : modernColors.warning.main};
  margin-bottom: ${modernSpacing.lg}px;
`;

const VarianceText = styled.Text<{ isNegative: boolean }>`
  font-size: ${modernTypography.body.medium.fontSize}px;
  font-weight: 600;
  color: ${(props) => (props.isNegative ? modernColors.error.main : modernColors.warning.main)};
`;

const RemarksSection = styled.View`
  margin-bottom: ${modernSpacing.lg}px;
`;

const PhotoSection = styled.View`
  margin-bottom: ${modernSpacing.lg}px;
`;

const SectionTitle = styled.Text`
  font-size: ${modernTypography.h5.fontSize}px;
  font-weight: ${modernTypography.h5.fontWeight};
  color: ${modernColors.text.primary};
  margin-bottom: ${modernSpacing.md}px;
`;

const PhotoGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${modernSpacing.sm}px;
`;

const PhotoThumbnail = styled.View`
  width: 80px;
  height: 80px;
  border-radius: ${modernBorderRadius.sm}px;
  background-color: ${modernColors.background.paper};
  border-width: 1px;
  border-color: ${modernColors.border.light};
  align-items: center;
  justify-content: center;
`;

const AddPhotoButton = styled.TouchableOpacity`
  width: 80px;
  height: 80px;
  border-radius: ${modernBorderRadius.sm}px;
  background-color: ${modernColors.background.paper};
  border-width: 2px;
  border-color: ${modernColors.primary[500]};
  border-style: dashed;
  align-items: center;
  justify-content: center;
  gap: ${modernSpacing.xs}px;
`;

const AddPhotoText = styled.Text`
  font-size: ${modernTypography.label.small.fontSize}px;
  color: ${modernColors.primary[500]};
  font-weight: 600;
`;

const FooterActions = styled.View`
  padding: ${modernSpacing.screenPadding}px;
  border-top-width: 1px;
  border-top-color: ${modernColors.border.light};
  background-color: ${modernColors.background.default};
`;

const SuccessOverlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;