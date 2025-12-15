# Scan Screen Integration Example

## Complete Integration of Phase 0 Features

This example shows how to integrate all Phase 0 features into the scan screen.

```tsx
// frontend/app/staff/scan.tsx
import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { CameraView } from 'expo-camera';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

// Phase 0 Hooks
import { useAIBarcode } from '@/hooks/useAIBarcode';
import { useVoiceControl } from '@/hooks/useVoiceControl';
import { useCameraEnhancement } from '@/hooks/useCameraEnhancement';

// Phase 0 Components
import { CameraControls, ScanGuideOverlay } from '@/components/camera';
import { Toast } from '@/components/ui';

// Existing components
import { StaffLayout } from '@/components/layout';
import { ItemSearch } from '@/components/scan/ItemSearch';

export default function EnhancedScanScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  
  // State
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  // Phase 0: AI Barcode Recognition
  const { 
    recognizeBarcode, 
    isLoading: aiLoading, 
    isAvailable: aiAvailable 
  } = useAIBarcode();

  // Phase 0: Voice Control
  const { 
    isListening, 
    startListening, 
    stopListening,
    speak 
  } = useVoiceControl(handleVoiceCommand);

  // Phase 0: Camera Enhancement
  const {
    settings,
    scanRegion,
    torchEnabled,
    zoom,
    toggleTorch,
    zoomIn,
    zoomOut,
    resetZoom,
    boostBrightness,
    restoreBrightness,
  } = useCameraEnhancement();

  // Voice command handler
  function handleVoiceCommand(command: string) {
    switch (command) {
      case 'scan':
        handleManualScan();
        speak('Starting scan');
        break;
      case 'submit':
        handleSubmit();
        speak('Submitting');
        break;
      case 'cancel':
        handleCancel();
        speak('Cancelled');
        break;
      case 'help':
        speak('Say scan to start scanning, submit to save, or cancel to go back');
        break;
    }
  }

  // Enhanced barcode scan handler
  const handleBarcodeScanned = useCallback(async ({ data }: { data: string }) => {
    if (isScanning || data === lastScan) return;
    
    setIsScanning(true);
    setLastScan(data);
    
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Voice feedback
    speak('Barcode detected');
    
    try {
      // Try AI recognition if available
      if (aiAvailable && cameraRef.current) {
        const picture = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: true,
        });
        
        if (picture) {
          const aiResult = await recognizeBarcode(picture.uri, {
            enhanceImage: true,
            useOCR: true,
            confidenceThreshold: 0.7,
          });
          
          if (aiResult && aiResult.confidence > 0.8) {
            data = aiResult.barcode;
            showSuccessToast(`AI detected: ${data} (${(aiResult.confidence * 100).toFixed(0)}% confidence)`);
          }
        }
      }
      
      // Process barcode
      await processBarcode(data);
      
    } catch (error) {
      console.error('Scan error:', error);
      showErrorToast('Failed to process barcode');
      speak('Scan failed, please try again');
    } finally {
      setTimeout(() => {
        setIsScanning(false);
        setLastScan(null);
      }, 2000);
    }
  }, [isScanning, lastScan, aiAvailable, recognizeBarcode, speak]);

  // Process barcode
  const processBarcode = async (barcode: string) => {
    // Your existing barcode processing logic
    console.log('Processing barcode:', barcode);
    showSuccessToast(`Scanned: ${barcode}`);
  };

  // Manual scan trigger
  const handleManualScan = async () => {
    if (!cameraRef.current) return;
    
    try {
      await boostBrightness();
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      
      if (picture) {
        await handleBarcodeScanned({ data: 'manual-scan' });
      }
    } finally {
      await restoreBrightness();
    }
  };

  const handleSubmit = () => {
    // Submit logic
  };

  const handleCancel = () => {
    router.back();
  };

  // Toast helpers
  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastType('success');
    setShowToast(true);
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastType('error');
    setShowToast(true);
  };

  return (
    <StaffLayout title="Scan Items">
      <View style={styles.container}>
        {/* Camera View */}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          flash={settings.flashMode}
          zoom={settings.zoom}
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
          }}
        >
          {/* Scan Guide Overlay */}
          <ScanGuideOverlay
            scanRegion={scanRegion}
            isScanning={isScanning}
            message={
              isScanning 
                ? 'Processing...' 
                : isListening 
                ? 'Listening for voice command...'
                : 'Align barcode within the frame'
            }
          />

          {/* Camera Controls */}
          <CameraControls
            torchEnabled={torchEnabled}
            zoom={zoom}
            onToggleTorch={toggleTorch}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetZoom={resetZoom}
            style={styles.controls}
          />

          {/* Voice Control Button */}
          <View style={styles.voiceButton}>
            <TouchableOpacity
              onPress={isListening ? stopListening : startListening}
              style={[
                styles.voiceButtonInner,
                isListening && styles.voiceButtonActive,
              ]}
            >
              <Ionicons
                name={isListening ? 'mic' : 'mic-outline'}
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>
          </View>
        </CameraView>

        {/* Toast Notifications */}
        {showToast && (
          <Toast
            message={toastMessage}
            type={toastType}
            duration={3000}
            onDismiss={() => setShowToast(false)}
          />
        )}

        {/* Manual Entry Section */}
        <View style={styles.manualEntry}>
          <ItemSearch onItemSelect={(item) => console.log(item)} />
        </View>
      </View>
    </StaffLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
  },
  voiceButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  voiceButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.8)',
  },
  manualEntry: {
    padding: 16,
    backgroundColor: '#FFF',
  },
});
```

## Usage Tips

### 1. Gradual Integration

Start with one feature at a time:

```tsx
// Step 1: Add camera enhancements only
const { settings, scanRegion } = useCameraEnhancement();

// Step 2: Add AI recognition
const { recognizeBarcode } = useAIBarcode();

// Step 3: Add voice control
const { speak } = useVoiceControl();
```

### 2. Feature Flags

Use feature flags for gradual rollout:

```tsx
const FEATURES = {
  AI_BARCODE: true,
  VOICE_CONTROL: false, // Enable after testing
  CAMERA_ZOOM: true,
};

// Conditional rendering
{FEATURES.VOICE_CONTROL && (
  <VoiceControlButton />
)}
```

### 3. Error Handling

Always handle errors gracefully:

```tsx
try {
  const result = await recognizeBarcode(imageUri);
  if (!result) {
    // Fallback to regular scan
    return regularScan(imageUri);
  }
} catch (error) {
  console.error('AI scan failed:', error);
  showErrorToast('Using standard scan');
  return regularScan(imageUri);
}
```

### 4. Performance Optimization

```tsx
// Debounce camera controls
const debouncedZoom = useDebouncedCallback((level) => {
  setZoom(level);
}, 100);

// Memoize expensive operations
const processedImage = useMemo(() => {
  return enhanceImage(rawImage);
}, [rawImage]);
```

## Testing Checklist

- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test in low light conditions
- [ ] Test with damaged barcodes
- [ ] Test voice commands
- [ ] Test zoom functionality
- [ ] Test torch/flash
- [ ] Test offline mode
- [ ] Test performance with AI features
- [ ] Test accessibility features