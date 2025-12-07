/**
 * AnimatedList - Premium animated list with staggered animations
 * Features: Staggered entrance, pull-to-refresh, empty state
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  RefreshControl,
  ActivityIndicator,
  ViewStyle,
  FlatListProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  modernColors,
  modernTypography,
  modernSpacing,
} from '../../styles/modernDesignSystem';

interface AnimatedListProps<T> extends Omit<FlatListProps<T>, 'renderItem'> {
  data: T[];
  renderItem: (item: T, index: number, animatedValue: Animated.Value) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  staggerDelay?: number;
  animationDuration?: number;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export function AnimatedList<T>({
  data,
  renderItem,
  keyExtractor,
  onRefresh,
  isLoading = false,
  emptyTitle = 'No items',
  emptySubtitle = 'Nothing to display here',
  emptyIcon = 'folder-open-outline',
  staggerDelay = 50,
  animationDuration = 400,
  style,
  contentContainerStyle,
  ...flatListProps
}: AnimatedListProps<T>) {
  const [refreshing, setRefreshing] = React.useState(false);
  const animatedValues = useRef<Map<string, Animated.Value>>(new Map()).current;

  const getAnimatedValue = useCallback((key: string) => {
    if (!animatedValues.has(key)) {
      animatedValues.set(key, new Animated.Value(0));
    }
    return animatedValues.get(key)!;
  }, [animatedValues]);

  useEffect(() => {
    // Animate items on data change
    const animations = data.map((item, index) => {
      const key = keyExtractor(item, index);
      const animatedValue = getAnimatedValue(key);
      
      return Animated.timing(animatedValue, {
        toValue: 1,
        duration: animationDuration,
        delay: index * staggerDelay,
        useNativeDriver: true,
      });
    });

    Animated.stagger(staggerDelay, animations).start();

    // Cleanup old animated values
    const currentKeys = new Set(data.map((item, index) => keyExtractor(item, index)));
    animatedValues.forEach((_, key) => {
      if (!currentKeys.has(key)) {
        animatedValues.delete(key);
      }
    });
  }, [data, keyExtractor, getAnimatedValue, staggerDelay, animationDuration, animatedValues]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const renderAnimatedItem = useCallback(({ item, index }: { item: T; index: number }) => {
    const key = keyExtractor(item, index);
    const animatedValue = getAnimatedValue(key);

    const animatedStyle = {
      opacity: animatedValue,
      transform: [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        },
        {
          scale: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.95, 1],
          }),
        },
      ],
    };

    return (
      <Animated.View style={animatedStyle}>
        {renderItem(item, index, animatedValue)}
      </Animated.View>
    );
  }, [keyExtractor, getAnimatedValue, renderItem]);

  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name={emptyIcon}
          size={64}
          color={modernColors.text.tertiary}
        />
      </View>
      <Text style={styles.emptyTitle}>{emptyTitle}</Text>
      <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
    </View>
  );

  const LoadingComponent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={modernColors.primary[500]} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );

  if (isLoading && data.length === 0) {
    return <LoadingComponent />;
  }

  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderAnimatedItem}
      style={[styles.list, style]}
      contentContainerStyle={[
        styles.contentContainer,
        data.length === 0 && styles.emptyContentContainer,
        contentContainerStyle,
      ]}
      ListEmptyComponent={EmptyComponent}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={modernColors.primary[500]}
            colors={[modernColors.primary[500]]}
            progressBackgroundColor={modernColors.background.paper}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      {...flatListProps}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: modernSpacing.md,
    paddingVertical: modernSpacing.sm,
    gap: modernSpacing.sm,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: modernSpacing['2xl'],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: modernColors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: modernSpacing.lg,
  },
  emptyTitle: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
  },
  emptySubtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: modernSpacing['2xl'],
  },
  loadingText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    marginTop: modernSpacing.md,
  },
});

export default AnimatedList;
