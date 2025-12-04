/**
 * UpgradeNotification Component
 * Shows update available or force update banners
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VersionCheckResult } from '../services/versionService';

interface UpgradeNotificationProps {
  /** Version check result */
  versionInfo: VersionCheckResult;
  /** Whether this is a forced upgrade (blocking) */
  forceUpdate?: boolean;
  /** Callback to dismiss the notification (for optional updates) */
  onDismiss?: () => void;
  /** Callback when user taps update button */
  onUpdate?: () => void;
  /** Custom app store URL */
  storeUrl?: string;
  /** Show as banner (inline) or modal (fullscreen blocking) */
  variant?: 'banner' | 'modal';
}

export const UpgradeNotification: React.FC<UpgradeNotificationProps> = ({
  versionInfo,
  forceUpdate = false,
  onDismiss,
  onUpdate,
  storeUrl,
  variant = 'banner',
}) => {
  const handleUpdate = async () => {
    if (onUpdate) {
      onUpdate();
      return;
    }

    // Default behavior: open app store
    if (storeUrl) {
      await Linking.openURL(storeUrl);
    } else {
      // Platform-specific store URLs could be configured here
      __DEV__ && console.log('No store URL configured for update');
    }
  };

  const getUpdateMessage = () => {
    if (forceUpdate) {
      return `This version is no longer supported. Please update to version ${versionInfo.current_version} to continue using the app.`;
    }

    const updateTypeText = {
      major: 'A major update',
      minor: 'A new update',
      patch: 'A bug fix update',
    };

    const updateType = versionInfo.update_type || 'minor';
    return `${updateTypeText[updateType]} is available (v${versionInfo.current_version}). We recommend updating for the best experience.`;
  };

  const getIcon = () => {
    if (forceUpdate) {
      return 'warning';
    }
    return versionInfo.update_type === 'major' ? 'rocket' : 'arrow-up-circle';
  };

  const getIconColor = () => {
    if (forceUpdate) {
      return '#FF5252';
    }
    return versionInfo.update_type === 'major' ? '#4CAF50' : '#2196F3';
  };

  if (variant === 'modal') {
    return (
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalIconContainer}>
            <Ionicons
              name={getIcon() as any}
              size={64}
              color={getIconColor()}
            />
          </View>

          <Text style={styles.modalTitle}>
            {forceUpdate ? 'Update Required' : 'Update Available'}
          </Text>

          <Text style={styles.modalMessage}>{getUpdateMessage()}</Text>

          <View style={styles.versionInfo}>
            <Text style={styles.versionLabel}>Current Version:</Text>
            <Text style={styles.versionValue}>{versionInfo.client_version}</Text>
          </View>

          <View style={styles.versionInfo}>
            <Text style={styles.versionLabel}>Latest Version:</Text>
            <Text style={styles.versionValue}>{versionInfo.current_version}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.updateButton,
              { backgroundColor: getIconColor() },
            ]}
            onPress={handleUpdate}
          >
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.updateButtonText}>Update Now</Text>
          </TouchableOpacity>

          {!forceUpdate && onDismiss && (
            <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
              <Text style={styles.dismissButtonText}>Remind Me Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Banner variant
  return (
    <View
      style={[
        styles.bannerContainer,
        { backgroundColor: forceUpdate ? '#FFEBEE' : '#E3F2FD' },
      ]}
    >
      <View style={styles.bannerContent}>
        <Ionicons
          name={getIcon() as any}
          size={24}
          color={getIconColor()}
          style={styles.bannerIcon}
        />

        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>
            {forceUpdate ? 'Update Required' : 'Update Available'}
          </Text>
          <Text style={styles.bannerMessage} numberOfLines={2}>
            {getUpdateMessage()}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bannerUpdateButton,
            { backgroundColor: getIconColor() },
          ]}
          onPress={handleUpdate}
        >
          <Text style={styles.bannerUpdateButtonText}>Update</Text>
        </TouchableOpacity>

        {!forceUpdate && onDismiss && (
          <TouchableOpacity style={styles.bannerCloseButton} onPress={onDismiss}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  versionLabel: {
    fontSize: 14,
    color: '#888',
    marginRight: 8,
  },
  versionValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  dismissButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  dismissButtonText: {
    color: '#666',
    fontSize: 14,
  },

  // Banner styles
  bannerContainer: {
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  bannerIcon: {
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 12,
    color: '#666',
  },
  bannerUpdateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  bannerUpdateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bannerCloseButton: {
    padding: 8,
    marginLeft: 8,
  },
});

export default UpgradeNotification;
