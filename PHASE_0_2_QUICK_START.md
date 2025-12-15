# 🚀 Phase 0 & 2 Quick Start Guide

## Installation (5 minutes)

### 1. Install Dependencies

```bash
# Run the installation script
./scripts/install_phase_0_dependencies.sh

# Or install manually:
cd frontend
npm install expo-speech react-native-chart-kit react-native-svg
```

### 2. Test New Components

```bash
# Start the development server
cd frontend
npm start
```

### 3. Quick Component Test

Create a test screen to verify installation:

```tsx
// app/test-components.tsx
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { 
  Badge, Chip, Avatar, Toast, ProgressBar, 
  Switch, Tabs, Accordion, Radio, Checkbox 
} from '@/components/ui';

export default function TestComponents() {
  const [switchValue, setSwitchValue] = useState(false);
  const [progress, setProgress] = useState(75);

  return (
    <ScrollView style={{ padding: 16 }}>
      <Badge label="New" variant="primary" />
      <Chip label="Test" icon="star" />
      <Avatar name="John Doe" size="lg" />
      <ProgressBar progress={progress} showLabel />
      <Switch value={switchValue} onValueChange={setSwitchValue} />
    </ScrollView>
  );
}
```

## Feature Testing

### Test AI Barcode (Web Only)

```tsx
import { useAIBarcode } from '@/hooks';

const { recognizeBarcode, isAvailable } = useAIBarcode();

if (isAvailable) {
  const result = await recognizeBarcode(imageUri);
  console.log('Barcode:', result?.barcode);
}
```

### Test Voice Control (Device)

```tsx
import { useVoiceControl } from '@/hooks';

const { speak, startListening } = useVoiceControl((command) => {
  console.log('Command:', command);
});

speak('Hello!');
startListening();
```

### Test Camera Enhancements

```tsx
import { useCameraEnhancement } from '@/hooks';
import { CameraControls } from '@/components/camera';

const { torchEnabled, zoom, toggleTorch } = useCameraEnhancement();

<CameraControls
  torchEnabled={torchEnabled}
  zoom={zoom}
  onToggleTorch={toggleTorch}
/>
```

### Test Analytics Dashboard

```tsx
import { AnalyticsDashboard } from '@/components/analytics';

<AnalyticsDashboard timeRange="7d" />
```

## Verification Checklist

- [ ] All dependencies installed successfully
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] App builds and runs
- [ ] New UI components render correctly
- [ ] Voice control works on device
- [ ] Camera controls respond
- [ ] Analytics dashboard displays

## Troubleshooting

### Issue: expo-speech not working
**Solution**: Test on physical device (may not work in simulator)

### Issue: Charts not rendering
**Solution**: Ensure react-native-svg is installed: `npm install react-native-svg`

### Issue: TypeScript errors
**Solution**: Run `npm run typecheck` and fix any type issues

### Issue: Camera controls not visible
**Solution**: Check z-index and positioning in styles

## Next Steps

1. ✅ Install dependencies
2. ✅ Test components
3. 📝 Integrate into scan screen (see `SCAN_SCREEN_INTEGRATION_EXAMPLE.md`)
4. 🧪 Write tests
5. 🚀 Deploy to staging

## Resources

- **Full Documentation**: `IMPLEMENTATION_COMPLETE.md`
- **Integration Guide**: `docs/INTEGRATION_GUIDE.md`
- **Component Examples**: `docs/NEW_COMPONENTS_GUIDE.md`
- **Upgrade Guide**: `docs/PHASE_1_UPGRADE_GUIDE.md`

---

**Estimated Setup Time**: 5-10 minutes
**Estimated Integration Time**: 2-4 hours per feature