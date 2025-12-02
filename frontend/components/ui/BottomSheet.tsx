
import React from 'react';
import { Modal, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate, runOnJS } from 'react-native-reanimated';
import { flags } from '../../constants/flags';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  height?: number;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ visible, onClose, height = 400, children }) => {
  const progress = useSharedValue(visible ? 1 : 0);
  const [render, setRender] = React.useState(visible);

  React.useEffect(() => {
    if (!flags.enableAnimations) {
      // No animations: show/hide instantly
      setRender(visible);
      progress.value = visible ? 1 : 0;
      return;
    }
    if (visible) {
      setRender(true);
      progress.value = withTiming(1, { duration: 200 });
    } else {
      progress.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished) {
          runOnJS(setRender)(false);
        }
      });
    }
  }, [visible, progress]); // Changed dependency from [visible] to [visible, progress]

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.5]),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [height, 0]),
      },
    ],
  }));

  if (!render) return null;

  return (
    <Modal
      transparent
      visible={render}
      animationType={!flags.enableAnimations ? (Platform.OS === 'ios' ? 'slide' : 'fade') : undefined}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { height }, sheetStyle]}>
        {children}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333'
  }
});

export default BottomSheet;
