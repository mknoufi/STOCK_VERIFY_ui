import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  refreshing: boolean;
  children: React.ReactNode;
  style?: any;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  refreshing,
  children,
  style,
}) => {
  return (
    <ScrollView
      style={style}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#4CAF50']} // Android
          tintColor="#4CAF50" // iOS
        />
      }
    >
      {children}
    </ScrollView>
  );
};
