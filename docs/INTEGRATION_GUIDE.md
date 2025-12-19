# Integration Guide - Phase 0 Features

## Quick Start

### 1. Install Dependencies

```bash
cd frontend

# Required for analytics
npm install react-native-chart-kit react-native-svg

# Required for voice control
npm install expo-speech

# Optional for AI features (web only)
npm install --save-dev @tensorflow/tfjs @tensorflow-models/mobilenet tesseract.js
```

### 2. Integrate AI Barcode Recognition

Update your scan screen to use AI barcode recognition:

```tsx
// frontend/app/staff/scan.tsx
import { useAIBarcode } from '@/hooks';

function ScanScreen() {
  const { recognizeBarcode, isLoading, isAvailable } = useAIBarcode();

  const handleBarcodeCapture = async (imageUri: string) => {
    if (!isAvailable) {
      // Fallback to regular camera scanning
      return;
    }

    const result = await recognizeBarcode(imageUri, {
      enhanceImage: true,
      useOCR: true,
      confidenceThreshold: 0.7,
    });

    if (result) {
      console.log('Barcode detected:', result.barcode);
      console.log('Confidence:', result.confidence);
      console.log('Method:', result.method);
      // Process the barcode...
    }
  };

  return (
    // Your camera UI
  );
}
```

### 3. Add Voice Control

```tsx
// frontend/app/staff/scan.tsx
import { useVoiceControl } from '@/hooks';

function ScanScreen() {
  const {
    isListening,
    startListening,
    stopListening,
    speak
  } = useVoiceControl((command) => {
    switch (command) {
      case 'scan':
        // Trigger scan
        break;
      case 'submit':
        // Submit form
        break;
      case 'cancel':
        // Cancel operation
        break;
    }
  });

  const handleVoiceButton = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
      speak('Listening for command');
    }
  };

  return (
    <View>
      <Button
        title={isListening ? "Listening..." : "Voice Control"}
        onPress={handleVoiceButton}
      />
      {/* Your scan UI */}
    </View>
  );
}
```

### 4. Integrate Enhanced Camera Features

```tsx
// frontend/app/staff/scan.tsx
import { useCameraEnhancement } from '@/hooks';
import { CameraControls, ScanGuideOverlay } from '@/components/camera';

function ScanScreen() {
  const {
    settings,
    scanRegion,
    torchEnabled,
    zoom,
    toggleTorch,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useCameraEnhancement();

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        flash={settings.flashMode}
        zoom={settings.zoom}
      >
        {/* Scan guide overlay */}
        <ScanGuideOverlay
          scanRegion={scanRegion}
          isScanning={isScanning}
          message="Align barcode within the frame"
        />

        {/* Camera controls */}
        <CameraControls
          torchEnabled={torchEnabled}
          zoom={zoom}
          onToggleTorch={toggleTorch}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          style={{ position: 'absolute', bottom: 20, left: 0, right: 0 }}
        />
      </CameraView>
    </View>
  );
}
```

### 5. Add Analytics Dashboard

```tsx
// frontend/app/admin/analytics.tsx
import { AnalyticsDashboard } from '@/components/analytics';

export default function AnalyticsScreen() {
  return (
    <AnalyticsDashboard
      timeRange="7d"
      onRefresh={() => console.log('Refreshed')}
    />
  );
}
```

## Component Usage Examples

### Using New UI Components

```tsx
import { Badge, Chip, Avatar, Toast, ProgressBar, Switch } from '@/components/ui';

function MyComponent() {
  const [enabled, setEnabled] = useState(false);

  return (
    <View>
      {/* Badge */}
      <Badge label="New" variant="primary" />

      {/* Chip */}
      <Chip
        label="Filter"
        icon="filter"
        onRemove={() => console.log('Removed')}
      />

      {/* Avatar */}
      <Avatar
        name="John Doe"
        size="lg"
        badge
      />

      {/* Progress Bar */}
      <ProgressBar
        progress={75}
        variant="success"
        showLabel
      />

      {/* Switch */}
      <Switch
        value={enabled}
        onValueChange={setEnabled}
      />
    </View>
  );
}
```

### Using Analytics Components

```tsx
import { MetricCard, VarianceChart } from '@/components/analytics';

function DashboardScreen() {
  const metric = {
    label: 'Total Scans',
    value: 1250,
    change: 12.5,
    trend: 'up',
    format: 'number',
  };

  const trends = [
    { date: '2024-01-01', variance: 2.5, itemsScanned: 1200 },
    { date: '2024-01-02', variance: 1.8, itemsScanned: 1350 },
    // ...more data
  ];

  return (
    <ScrollView>
      <MetricCard metric={metric} />
      <VarianceChart data={trends} title="Weekly Variance" />
    </ScrollView>
  );
}
```

## Backend Integration

### Analytics API Endpoints

Create these endpoints in your backend:

```python
# backend/api/v2/analytics.py

@router.get("/analytics/dashboard")
async def get_dashboard_analytics(
    time_range: str = "7d",
    current_user: User = Depends(get_current_user)
):
    """Get dashboard analytics data"""
    # Implementation
    pass

@router.get("/analytics/variance-trends")
async def get_variance_trends(
    days: int = 7,
    current_user: User = Depends(get_current_user)
):
    """Get variance trends over time"""
    # Implementation
    pass

@router.get("/analytics/top-performers")
async def get_top_performers(
    limit: int = 5,
    current_user: User = Depends(get_current_user)
):
    """Get top performing users"""
    # Implementation
    pass
```

### AI Barcode Processing Endpoint

```python
# backend/api/v2/ai_barcode.py

@router.post("/barcode/recognize")
async def recognize_barcode(
    image: UploadFile,
    enhance: bool = True,
    use_ocr: bool = True,
    current_user: User = Depends(get_current_user)
):
    """Process barcode image with AI"""
    # Implementation using server-side OCR/AI
    pass
```

## Testing

### Unit Tests

```tsx
// __tests__/useAIBarcode.test.ts
import { renderHook } from '@testing-library/react-hooks';
import { useAIBarcode } from '@/hooks/useAIBarcode';

describe('useAIBarcode', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useAIBarcode());
    expect(result.current.isAvailable).toBeDefined();
  });
});
```

### Integration Tests

```tsx
// __tests__/AnalyticsDashboard.test.tsx
import { render } from '@testing-library/react-native';
import { AnalyticsDashboard } from '@/components/analytics';

describe('AnalyticsDashboard', () => {
  it('should render metrics', () => {
    const { getByText } = render(<AnalyticsDashboard />);
    expect(getByText('Overview')).toBeTruthy();
  });
});
```

## Performance Optimization

### 1. Lazy Loading

```tsx
// Lazy load analytics dashboard
const AnalyticsDashboard = lazy(() =>
  import('@/components/analytics/AnalyticsDashboard')
);
```

### 2. Memoization

```tsx
import { memo } from 'react';

export const MetricCard = memo(({ metric }) => {
  // Component implementation
});
```

### 3. Debouncing

```tsx
import { useDebouncedCallback } from '@/hooks';

const handleZoom = useDebouncedCallback((level) => {
  setZoom(level);
}, 100);
```

## Troubleshooting

### AI Barcode Not Working

1. Check if dependencies are installed
2. Verify platform (TensorFlow.js only works on web)
3. Check console for initialization errors

### Voice Control Not Responding

1. Ensure `expo-speech` is installed
2. Check device permissions
3. Test on physical device (may not work in simulator)

### Camera Controls Not Visible

1. Verify camera permissions
2. Check z-index of overlay components
3. Ensure proper positioning

## Next Steps

1. **Backend Integration**: Implement analytics API endpoints
2. **Testing**: Add comprehensive test coverage
3. **Performance**: Profile and optimize rendering
4. **Documentation**: Add inline code documentation
5. **Deployment**: Test on production environment
