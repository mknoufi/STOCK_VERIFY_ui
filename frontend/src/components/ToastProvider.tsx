import React from "react";
import { View } from "react-native";

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={{ flex: 1 }}>
      {children}
      {/* Toast implementation */}
    </View>
  );
};
