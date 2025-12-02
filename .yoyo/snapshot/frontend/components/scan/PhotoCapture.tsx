/**
 * PhotoCapture Component
 * Handles photo proof capture, preview, and management
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { PhotoProofType, PhotoProofDraft } from '@/types/scan';
import { PHOTO_PROOF_TYPES } from '@/constants/scanConstants';

interface PhotoCaptureProps {
  photos: PhotoProofDraft[];
  selectedPhotoType: PhotoProofType;
  showPhotoCapture: boolean;
  photoCaptureLoading: boolean;
  photoCameraType: 'back' | 'front';
  isWeb: boolean;
  serialPhotosRequired?: boolean;
  serialPhotoShortfall?: number;
  photoCameraRef?: React.RefObject<CameraView>;
  onPhotoTypeChange: (type: PhotoProofType) => void;
  onOpenPhotoCapture: () => void;
  onClosePhotoCapture: () => void;
  onCapturePhoto: () => void;
  onFlipCamera: () => void;
  onRemovePhoto: (photoId: string) => void;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  photos,
  selectedPhotoType,
  showPhotoCapture,
  photoCaptureLoading,
  photoCameraType,
  isWeb,
  serialPhotosRequired = false,
  serialPhotoShortfall = 0,
  photoCameraRef,
  onPhotoTypeChange,
  onOpenPhotoCapture,
  onClosePhotoCapture,
  onCapturePhoto,
  onFlipCamera,
  onRemovePhoto,
}) => {
  return (
    <>
      <View style={styles.photoSection}>
        <View style={styles.photoSectionHeader}>
          <Text style={styles.subSectionTitle}>Photo Proofs</Text>
          {photos.length > 0 && (
            <Text style={styles.photoCountLabel}>{photos.length} captured</Text>
          )}
        </View>
        <Text style={styles.photoHelper}>
          {serialPhotosRequired
            ? 'Attach a serial photo for each recorded serial number.'
            : 'Capture clear photos for supervisor verification.'}
        </Text>
        {isWeb && (
          <Text style={styles.photoWebNotice}>
            Capture and upload photos from the mobile app. Web access is view-only.
          </Text>
        )}
        {serialPhotoShortfall > 0 && (
          <Text style={styles.photoSerialWarning}>
            Add {serialPhotoShortfall} more serial photo proof{serialPhotoShortfall > 1 ? 's' : ''}.
          </Text>
        )}
        <View style={styles.photoTypePills}>
          {PHOTO_PROOF_TYPES.map((option) => {
            const isActive = selectedPhotoType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.photoTypePill, isActive && styles.photoTypePillActive]}
                onPress={() => onPhotoTypeChange(option.value)}
              >
                <Ionicons
                  name={option.icon}
                  size={14}
                  color={isActive ? '#1E293B' : '#3B82F6'}
                  style={styles.photoTypeIcon}
                />
                <Text style={[styles.photoTypeText, isActive && styles.photoTypeTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.photoControls}>
          <TouchableOpacity
            style={[styles.photoCaptureButton, isWeb && styles.photoCaptureButtonDisabled]}
            onPress={onOpenPhotoCapture}
            disabled={isWeb}
          >
            <Ionicons name="camera" size={18} color="#1E293B" />
            <Text style={styles.photoCaptureButtonText}>Capture Photo</Text>
          </TouchableOpacity>
        </View>
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoPreviewList}
          >
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoPreviewItem}>
                <Image
                  source={{ uri: photo.previewUri }}
                  style={styles.photoPreviewImage}
                  contentFit="cover"
                />
                <View style={styles.photoPreviewMeta}>
                  <Text style={styles.photoPreviewLabel}>{photo.type}</Text>
                  <TouchableOpacity
                    style={styles.photoRemoveButton}
                    onPress={() => onRemovePhoto(photo.id)}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.photoEmptyText}>
            {isWeb
              ? 'No photos yet. Use the mobile app to capture and upload proof.'
              : 'No photos yet. Use the button above to capture one.'}
          </Text>
        )}
      </View>

      {/* Photo Capture Modal */}
      {!isWeb && (
        <Modal visible={showPhotoCapture} animationType="slide">
          <View style={styles.photoModalContainer}>
            <CameraView
              ref={photoCameraRef}
              style={styles.photoCamera}
              facing={photoCameraType}
              ratio="16:9"
            />
            <View style={styles.photoModalOverlay}>
              <View style={styles.photoModalTopBar}>
                <TouchableOpacity style={styles.photoModalButton} onPress={onClosePhotoCapture}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoModalButton} onPress={onFlipCamera}>
                  <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.photoShutterBar}>
                <TouchableOpacity
                  style={styles.photoShutterButton}
                  onPress={onCapturePhoto}
                  disabled={photoCaptureLoading}
                >
                  {photoCaptureLoading ? (
                    <ActivityIndicator size="small" color="#1E293B" />
                  ) : (
                    <Ionicons name="radio-button-on" size={64} color="#1E293B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  photoSection: {
    marginBottom: 16,
  },
  photoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  photoCountLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  photoHelper: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  photoWebNotice: {
    fontSize: 12,
    color: '#FFB74D',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  photoSerialWarning: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 8,
    fontWeight: '600',
  },
  photoTypePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  photoTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoTypePillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  photoTypeIcon: {
    marginRight: 2,
  },
  photoTypeText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  photoTypeTextActive: {
    color: '#1E293B',
  },
  photoControls: {
    marginBottom: 16,
  },
  photoCaptureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
  },
  photoCaptureButtonDisabled: {
    opacity: 0.5,
  },
  photoCaptureButtonText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  photoPreviewList: {
    marginTop: 8,
  },
  photoPreviewItem: {
    marginRight: 12,
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoPreviewMeta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoPreviewLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  photoRemoveButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 4,
  },
  photoEmptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  photoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  photoCamera: {
    flex: 1,
  },
  photoModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  photoModalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
  },
  photoModalButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 24,
    padding: 12,
  },
  photoShutterBar: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  photoShutterButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

