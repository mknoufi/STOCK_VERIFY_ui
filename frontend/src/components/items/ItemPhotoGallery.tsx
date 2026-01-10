/**
 * ItemPhotoGallery Component
 * Display and manage item photos/evidence in detail views
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { GlassCard } from "../ui/GlassCard";
import { theme } from "../../styles/modernDesignSystem";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// Types
// ============================================================================

export interface PhotoItem {
  id: string;
  uri: string;
  type: "ITEM" | "SERIAL" | "DAMAGE" | "LOCATION" | "OTHER";
  label?: string;
  timestamp?: Date | string;
}

export interface ItemPhotoGalleryProps {
  photos: PhotoItem[];
  onAddPhoto?: () => void;
  onRemovePhoto?: (photoId: string) => void;
  onPhotoPress?: (photo: PhotoItem, index: number) => void;
  maxPhotos?: number;
  editable?: boolean;
  showLabels?: boolean;
  compact?: boolean;
  animationDelay?: number;
}

// ============================================================================
// Photo Type Badge
// ============================================================================

const PHOTO_TYPE_CONFIG: Record<
  PhotoItem["type"],
  { label: string; color: string; icon: string }
> = {
  ITEM: { label: "Item", color: theme.colors.primary[500], icon: "cube" },
  SERIAL: { label: "Serial", color: theme.colors.info.main, icon: "barcode" },
  DAMAGE: { label: "Damage", color: theme.colors.error.main, icon: "warning" },
  LOCATION: { label: "Location", color: theme.colors.warning.main, icon: "location" },
  OTHER: { label: "Other", color: theme.colors.neutral[500], icon: "image" },
};

const PhotoTypeBadge: React.FC<{ type: PhotoItem["type"] }> = ({ type }) => {
  const config = PHOTO_TYPE_CONFIG[type];
  return (
    <View style={[styles.typeBadge, { backgroundColor: config.color + "CC" }]}>
      <Ionicons name={config.icon as any} size={10} color="#fff" />
      <Text style={styles.typeBadgeText}>{config.label}</Text>
    </View>
  );
};

// ============================================================================
// Photo Thumbnail
// ============================================================================

interface PhotoThumbnailProps {
  photo: PhotoItem;
  index: number;
  onPress?: () => void;
  onRemove?: () => void;
  editable: boolean;
  showLabel: boolean;
}

const PhotoThumbnail: React.FC<PhotoThumbnailProps> = ({
  photo,
  index,
  onPress,
  onRemove,
  editable,
  showLabel,
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemove?.();
  };

  return (
    <Animated.View entering={ZoomIn.delay(index * 50).springify()}>
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: photo.uri }}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
        {showLabel && <PhotoTypeBadge type={photo.type} />}
        {editable && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={22} color={theme.colors.error.main} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// Photo Viewer Modal
// ============================================================================

interface PhotoViewerProps {
  visible: boolean;
  photos: PhotoItem[];
  initialIndex: number;
  onClose: () => void;
}

const PhotoViewer: React.FC<PhotoViewerProps> = ({
  visible,
  photos,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.viewerContainer}>
        <TouchableOpacity style={styles.viewerClose} onPress={onClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          contentOffset={{ x: initialIndex * SCREEN_WIDTH, y: 0 }}
        >
          {photos.map((photo) => (
            <View key={photo.id} style={styles.viewerSlide}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.viewerImage}
                contentFit="contain"
              />
            </View>
          ))}
        </ScrollView>

        <View style={styles.viewerFooter}>
          <Text style={styles.viewerCounter}>
            {currentIndex + 1} / {photos.length}
          </Text>
          {photos[currentIndex] && (
            <View style={styles.viewerInfo}>
              <PhotoTypeBadge type={photos[currentIndex].type} />
              {photos[currentIndex].label && (
                <Text style={styles.viewerLabel}>
                  {photos[currentIndex].label}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ItemPhotoGallery: React.FC<ItemPhotoGalleryProps> = ({
  photos,
  onAddPhoto,
  onRemovePhoto,
  onPhotoPress,
  maxPhotos = 5,
  editable = false,
  showLabels = true,
  compact = false,
  animationDelay = 0,
}) => {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const canAddMore = photos.length < maxPhotos;

  const handlePhotoPress = (photo: PhotoItem, index: number) => {
    if (onPhotoPress) {
      onPhotoPress(photo, index);
    } else {
      setViewerIndex(index);
      setViewerVisible(true);
    }
  };

  const handleAddPhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddPhoto?.();
  };

  if (compact && photos.length === 0 && !editable) {
    return null;
  }

  return (
    <>
      <Animated.View entering={FadeInDown.delay(animationDelay).duration(400)}>
        <GlassCard
          intensity={15}
          padding={theme.spacing.md}
          borderRadius={theme.borderRadius.lg}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons
                name="images"
                size={18}
                color={theme.colors.primary[500]}
              />
              <Text style={styles.headerTitle}>Photos</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{photos.length}</Text>
              </View>
            </View>
            {editable && canAddMore && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddPhoto}
              >
                <Ionicons name="add-circle" size={24} color={theme.colors.primary[500]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Photo Grid */}
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoGrid}
            >
              {photos.map((photo, index) => (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  index={index}
                  onPress={() => handlePhotoPress(photo, index)}
                  onRemove={() => onRemovePhoto?.(photo.id)}
                  editable={editable}
                  showLabel={showLabels}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="camera-outline"
                size={32}
                color={theme.colors.neutral[500]}
              />
              <Text style={styles.emptyText}>
                {editable ? "Tap + to add photos" : "No photos available"}
              </Text>
            </View>
          )}

          {/* Max photos hint */}
          {editable && !canAddMore && (
            <Text style={styles.maxHint}>
              Maximum {maxPhotos} photos reached
            </Text>
          )}
        </GlassCard>
      </Animated.View>

      {/* Full-screen viewer */}
      <PhotoViewer
        visible={viewerVisible}
        photos={photos}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  countBadge: {
    backgroundColor: theme.colors.primary[500] + "30",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary[500],
  },
  addButton: {
    padding: 4,
  },
  photoGrid: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  thumbnailContainer: {
    position: "relative",
    borderRadius: theme.borderRadius.md,
    overflow: "hidden",
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
  },
  typeBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#fff",
  },
  removeButton: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: theme.colors.background.paper,
    borderRadius: 11,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  maxHint: {
    fontSize: 12,
    color: theme.colors.warning.main,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
  // Viewer styles
  viewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  viewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  viewerSlide: {
    width: SCREEN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  viewerFooter: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  viewerCounter: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  viewerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  viewerLabel: {
    fontSize: 14,
    color: "#fff",
  },
});

export default ItemPhotoGallery;
