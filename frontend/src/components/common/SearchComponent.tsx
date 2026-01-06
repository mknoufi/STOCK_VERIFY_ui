import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDebounce } from 'use-debounce';
import { useThemeContext } from '../../theme/ThemeContext';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface SearchComponentProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  loading?: boolean;
  autoFocus?: boolean;
  showResultsCount?: number;
}

export const SearchComponent: React.FC<SearchComponentProps> = ({
  onSearch,
  placeholder = 'Search items...',
  initialValue = '',
  loading = false,
  autoFocus = false,
  showResultsCount,
}) => {
  const { theme } = useThemeContext();
  const { colors } = theme;
  const { triggerHaptic } = useHapticFeedback();
  const [query, setQuery] = useState(initialValue);
  const [debouncedQuery] = useDebounce(query, 500);
  const [_isFocused, setIsFocused] = useState(false);

  // Animation values
  const focusAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleFocus = () => {
    setIsFocused(true);
    triggerHaptic('impactLight');
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    triggerHaptic('impactLight');
  };

  const handlePress = () => {
    triggerHaptic('impactLight');
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.accent],
  });

  const borderWidth = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.surface,
            borderColor,
            borderWidth,
            shadowColor: colors.accent,
            shadowOpacity: focusAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.3],
            }),
            shadowRadius: focusAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 8],
            }),
          }
        ]}
      >
        <Ionicons name="search" size={22} color={colors.textSecondary} style={styles.icon} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          returnKeyType="search"
          onSubmitEditing={() => triggerHaptic('impactLight')}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.accent} style={styles.icon} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.icon} onPressIn={handlePress}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
            </Animated.View>
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      {showResultsCount !== undefined && (
        <View style={styles.resultsContainer}>
          <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
            {showResultsCount === 0 ? 'No results found' : `${showResultsCount} results`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    marginHorizontal: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    letterSpacing: 0.3,
  },
  resultsContainer: {
    marginTop: 6,
    paddingHorizontal: 16,
  },
  resultsText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
