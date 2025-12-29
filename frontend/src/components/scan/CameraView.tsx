import React, { forwardRef } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { CameraView as ExpoCameraView, CameraType } from "expo-camera";

interface CameraViewProps {
  style?: ViewStyle;
  facing?: CameraType;
  ratio?: string; // '16:9' | '4:3' etc.
  children?: React.ReactNode;
}

export const CameraView = forwardRef<ExpoCameraView, CameraViewProps>(
  ({ style, facing = "back", ratio: _ratio = "16:9", children }, ref) => {
    return (
      <ExpoCameraView
        ref={ref}
        style={[styles.camera, style]}
        facing={facing}
        // ratio prop might be deprecated in newer expo-camera versions or handled differently,
        // but keeping it as per existing usage in scan.tsx if needed,
        // though CameraView in recent expo-camera (v15+) often manages aspect ratio via style.
        // We'll pass it if the underlying component accepts it, or ignore if not.
        // Checking BarcodeScanner.tsx, it doesn't use ratio. scan.tsx used it.
        // We will keep it simple.
      >
        {children}
      </ExpoCameraView>
    );
  },
);

CameraView.displayName = "CameraView";

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
});
