import React from "react";
import { View, useWindowDimensions, StyleSheet, ViewStyle } from "react-native";
import { modernSpacing } from "../../styles/modernDesignSystem";

interface AdminResponsiveGridProps {
  children: React.ReactNode[] | React.ReactNode;
  gap?: number;
  style?: ViewStyle;
}

const AdminResponsiveGrid: React.FC<AdminResponsiveGridProps> = ({
  children,
  gap = modernSpacing.md,
  style,
}) => {
  const { width } = useWindowDimensions();

  // Simple breakpoint system
  let columns = 1;
  if (width >= 1200) columns = 4;
  else if (width >= 992) columns = 3;
  else if (width >= 600) columns = 2;
  else columns = 1;

  const childrenArray = React.Children.toArray(children);

  return (
    <View style={[styles.row, style] as any}>
      {childrenArray.map((child, index) => (
        <View
          key={index}
          style={{
            width: `${100 / columns}%`,
            paddingHorizontal: gap / 2,
            marginBottom: gap,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -(modernSpacing.md / 2),
  },
});

export default AdminResponsiveGrid;
