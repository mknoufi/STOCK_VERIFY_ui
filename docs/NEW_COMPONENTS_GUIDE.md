# New Components Usage Guide

## Phase 2: Design System Components

### Badge Component

Display status indicators, counts, and labels.

```tsx
import { Badge } from '@/components/ui';

// Basic usage
<Badge label="New" />

// With variants
<Badge label="5" variant="primary" />
<Badge label="Error" variant="error" />
<Badge label="Success" variant="success" />

// Different sizes
<Badge label="SM" size="sm" />
<Badge label="MD" size="md" />
<Badge label="LG" size="lg" />

// Dot variant (status indicator)
<Badge label="" variant="success" dot />
```

### Chip Component

Interactive tags with optional remove functionality.

```tsx
import { Chip } from '@/components/ui';

// Basic chip
<Chip label="React Native" />

// With icon
<Chip label="Featured" icon="star" />

// Removable chip
<Chip 
  label="Filter" 
  onRemove={() => console.log('Removed')}
/>

// Interactive chip
<Chip 
  label="Select me" 
  onPress={() => console.log('Pressed')}
  selected={isSelected}
/>

// Outlined variant
<Chip label="Outlined" variant="outlined" />
```

### Avatar Component

Display user profile images or initials.

```tsx
import { Avatar } from '@/components/ui';

// With image
<Avatar source={{ uri: 'https://...' }} />

// With initials
<Avatar name="John Doe" />

// Different sizes
<Avatar name="JD" size="xs" />
<Avatar name="JD" size="sm" />
<Avatar name="JD" size="md" />
<Avatar name="JD" size="lg" />
<Avatar name="JD" size="xl" />

// With status badge
<Avatar 
  name="John Doe" 
  badge 
  badgeColor="#4CAF50" 
/>

// Fallback icon
<Avatar fallbackIcon="person-circle" />
```

### Toast Component

Display temporary notification messages.

```tsx
import { Toast } from '@/components/ui';

// Success toast
<Toast 
  message="Item saved successfully!" 
  type="success" 
  duration={3000}
  onDismiss={() => console.log('Dismissed')}
/>

// Error toast
<Toast 
  message="Failed to save item" 
  type="error" 
/>

// With action button
<Toast 
  message="Item deleted" 
  type="info"
  action={{
    label: "UNDO",
    onPress: () => console.log('Undo')
  }}
/>

// Persistent (no auto-dismiss)
<Toast 
  message="Important message" 
  duration={0}
/>
```

### ProgressBar Component

Display loading progress with animations.

```tsx
import { ProgressBar } from '@/components/ui';

// Basic progress
<ProgressBar progress={75} />

// With label
<ProgressBar 
  progress={50} 
  showLabel 
/>

// Custom label
<ProgressBar 
  progress={33} 
  showLabel 
  label="Uploading... 33%"
/>

// Different variants
<ProgressBar progress={100} variant="success" />
<ProgressBar progress={75} variant="warning" />
<ProgressBar progress={50} variant="error" />

// Different sizes
<ProgressBar progress={60} size="sm" />
<ProgressBar progress={60} size="md" />
<ProgressBar progress={60} size="lg" />

// Without animation
<ProgressBar progress={80} animated={false} />
```

### Switch Component

Toggle control with smooth animations.

```tsx
import { Switch } from '@/components/ui';
import { useState } from 'react';

function MyComponent() {
  const [enabled, setEnabled] = useState(false);

  return (
    <Switch 
      value={enabled} 
      onValueChange={setEnabled} 
    />
  );
}

// Different sizes
<Switch value={enabled} onValueChange={setEnabled} size="sm" />
<Switch value={enabled} onValueChange={setEnabled} size="md" />
<Switch value={enabled} onValueChange={setEnabled} size="lg" />

// Custom colors
<Switch 
  value={enabled} 
  onValueChange={setEnabled}
  activeColor="#4CAF50"
  inactiveColor="#9E9E9E"
/>

// Disabled
<Switch 
  value={enabled} 
  onValueChange={setEnabled}
  disabled
/>
```

## New Hooks

### useAIBarcode Hook

AI-powered barcode recognition with OCR fallback.

```tsx
import { useAIBarcode } from '@/hooks';

function ScanScreen() {
  const { 
    isInitialized, 
    isLoading, 
    error,
    recognizeBarcode,
    enhanceImage,
    isAvailable 
  } = useAIBarcode();

  const handleScan = async (imageUri: string) => {
    if (!isAvailable) {
      console.log('AI barcode not available');
      return;
    }

    const result = await recognizeBarcode(imageUri, {
      enhanceImage: true,
      useOCR: true,
      confidenceThreshold: 0.7,
      maxRetries: 2
    });

    if (result) {
      console.log('Barcode:', result.barcode);
      console.log('Confidence:', result.confidence);
      console.log('Method:', result.method); // 'camera', 'ocr', or 'ai'
    }
  };

  return (
    <View>
      {isLoading && <Text>Processing...</Text>}
      {error && <Text>Error: {error}</Text>}
      {/* Your scan UI */}
    </View>
  );
}
```

### useVoiceControl Hook

Voice command integration for hands-free operation.

```tsx
import { useVoiceControl } from '@/hooks';

function ScanScreen() {
  const { 
    isListening, 
    lastCommand,
    speak,
    startListening,
    stopListening,
    isAvailable,
    availableCommands 
  } = useVoiceControl((command) => {
    // Handle voice commands
    switch (command) {
      case 'scan':
        // Start scanning
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
    }
  };

  const provideFeedback = async () => {
    await speak('Item scanned successfully');
  };

  return (
    <View>
      <Button 
        title={isListening ? "Stop Listening" : "Start Voice Control"}
        onPress={handleVoiceButton}
        disabled={!isAvailable}
      />
      {lastCommand && <Text>Last command: {lastCommand}</Text>}
    </View>
  );
}
```

## Design Tokens Usage

```tsx
import { colorPalette, spacing, typography, borderRadius, shadows } from '@/theme/designTokens';

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorPalette.neutral[0],
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    ...shadows[2],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colorPalette.primary[500],
  },
  badge: {
    backgroundColor: colorPalette.success[50],
    color: colorPalette.success[700],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
});
```

## Best Practices

1. **Use Design Tokens**: Always use design tokens instead of hardcoded values
2. **Accessibility**: Ensure proper touch targets (minimum 44pt)
3. **Type Safety**: Leverage TypeScript for prop validation
4. **Performance**: Use React.memo for expensive components
5. **Consistency**: Follow the established component patterns

## Migration from Old Components

### Before (Old Button):
```tsx
<TouchableOpacity style={{ backgroundColor: '#007AFF' }}>
  <Text style={{ color: '#FFF' }}>Submit</Text>
</TouchableOpacity>
```

### After (New Design System):
```tsx
import { ModernButton } from '@/components';
import { colorPalette } from '@/theme/designTokens';

<ModernButton 
  title="Submit" 
  variant="primary"
  onPress={handleSubmit}
/>
```