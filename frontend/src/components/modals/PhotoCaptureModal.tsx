/**
 * PhotoCaptureModal Component
 * Modal for capturing photos using the device camera
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
} from '../../styles/modernDesignSystem';

interface PhotoCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (photoUri: string) => void;
  title?: string;
  testID?: string;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  visible,
  onClose,
  onCapture,
  title = 'Capture Photo',
  testID,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Handle photo capture
  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        setCapturedPhoto(photo.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      console.error('Photo capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle photo confirmation
  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      handleClose();
    }
  };

  // Handle retake
  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  // Handle close
  const handleClose = () => {
    setCapturedPhoto(null);
    onClose();
  };

  // Render permission request
  if (!permission?.granted) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
        testID={testID}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
            >
              <Ionicons
                name="close"
                size={24}
                color={modernColors.text.primary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.permissionContainer}>
            <Ionicons
              name="camera-outline"
              size={64}
              color={modernColors.text.tertiary}
            />
            <Text style={styles.permissionText}>
              Camera permission is required to capture photos
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
      testID={testID}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons
              name="close"
              size={24}
              color={modernColors.text.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Camera or Preview */}
        <View style={styles.cameraContainer}>
          {capturedPhoto ? (
            <Image
              source={{ uri: capturedPhoto }}
              style={styles.preview}
              resizeMode="cover"
            />
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
            >
              {isCapturing && (
                <View style={styles.capturingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
            </CameraView>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {capturedPhoto ? (
            <>
              <TouchableOpacity
                style={[styles.controlButton, styles.retakeButton]}
                onPress={handleRetake}
              >
                <Ionicons name="refresh" size={24} color="#fff" />
                <Text style={styles.controlButtonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Ionicons name="checkmark" size={24} color="#fff" />
                <Text style={styles.controlButtonText}>Use Photo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
              disabled={isCapturing}
              testID={`${testID}-capture`}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernColors.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: modernSpacing.md,
    paddingVertical: modernSpacing.sm,
  },
  title: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
  },
  closeButton: {
    padding: modernSpacing.xs,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: modernSpacing.xl,
  },
  permissionText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    textAlign: 'center',
    marginTop: modernSpacing.md,
    marginBottom: modernSpacing.xl,
  },
  permissionButton: {
    backgroundColor: modernColors.primary[500],
    paddingHorizontal: modernSpacing.xl,
    paddingVertical: modernSpacing.md,
    borderRadius: modernBorderRadius.md,
  },
  permissionButtonText: {
    ...modernTypography.button.medium,
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: modernBorderRadius.lg,
    marginHorizontal: modernSpacing.md,
  },
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  capturingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: modernSpacing.xl,
    gap: modernSpacing.md,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: modernColors.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: modernColors.primary[500],
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: modernColors.primary[500],
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: modernSpacing.lg,
    paddingVertical: modernSpacing.md,
    borderRadius: modernBorderRadius.md,
    gap: modernSpacing.xs,
  },
  retakeButton: {
    backgroundColor: modernColors.neutral[600],
  },
  confirmButton: {
    backgroundColor: modernColors.success.main,
  },
  controlButtonText: {
    ...modernTypography.button.medium,
    color: '#fff',
  },
});

export type { PhotoCaptureModalProps };
