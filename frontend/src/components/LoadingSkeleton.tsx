import React from 'react';
import { View } from 'react-native';

interface SkeletonListProps {
  itemHeight: number;
  count: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({ itemHeight, count }) => {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            height: itemHeight,
            backgroundColor: '#e0e0e0',
            marginBottom: 8,
            borderRadius: 8,
          }}
        />
      ))}
    </View>
  );
};
