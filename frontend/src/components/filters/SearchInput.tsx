/**
 * SearchInput - Debounced search input component
 *
 * Provides a search input with:
 * - Debounced input handling (configurable delay)
 * - Clear button
 * - Loading indicator
 * - Keyboard handling
 *
 * @example
 * ```tsx
 * <SearchInput
 *   placeholder="Search sessions..."
 *   onSearch={(query) => fetchResults(query)}
 *   debounceMs={300}
 * />
 * ```
 */
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInputProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  semanticColors,
  spacing,
  radius,
  shadows,
} from "../../theme/unified";

export interface SearchInputProps extends Omit<
  TextInputProps,
  "onChangeText" | "value"
> {
  /** Search callback - receives debounced query */
  onSearch: (query: string) => void;
  /** Debounce delay in milliseconds */
  debounceMs?: number;
  /** Show loading indicator */
  loading?: boolean;
  /** Initial value */
  initialValue?: string;
  /** Controlled value (optional) */
  value?: string;
  /** Called on every keystroke (not debounced) */
  onChangeText?: (text: string) => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show filter button */
  showFilterButton?: boolean;
  /** Filter button press handler */
  onFilterPress?: () => void;
  /** Active filter count */
  activeFilterCount?: number;
}

const _AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function SearchInput({
  onSearch,
  debounceMs = 300,
  loading = false,
  initialValue = "",
  value: controlledValue,
  onChangeText,
  size = "md",
  showFilterButton = false,
  onFilterPress,
  activeFilterCount = 0,
  placeholder = "Search...",
  ...rest
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Animation for focus state
  const focusProgress = useSharedValue(0);
  const [isFocused, setIsFocused] = useState(false);

  // Use controlled value if provided
  const currentValue =
    controlledValue !== undefined ? controlledValue : localValue;

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearch(currentValue);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [currentValue, debounceMs, onSearch]);

  const handleChangeText = useCallback(
    (text: string) => {
      if (controlledValue === undefined) {
        setLocalValue(text);
      }
      onChangeText?.(text);
    },
    [controlledValue, onChangeText],
  );

  const handleClear = useCallback(() => {
    handleChangeText("");
    inputRef.current?.focus();
  }, [handleChangeText]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    focusProgress.value = withTiming(1, { duration: 200 });
  }, [focusProgress]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    focusProgress.value = withTiming(0, { duration: 200 });
  }, [focusProgress]);

  // Container animation style
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: isFocused
      ? colors.primary[500]
      : semanticColors.border.default,
    shadowOpacity: interpolate(focusProgress.value, [0, 1], [0, 0.1]),
  }));

  // Size-based dimensions
  const sizeStyles = {
    sm: { height: 36, iconSize: 18, fontSize: 14 },
    md: { height: 44, iconSize: 20, fontSize: 16 },
    lg: { height: 52, iconSize: 22, fontSize: 18 },
  };

  const { height, iconSize, fontSize } = sizeStyles[size];

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.container, containerAnimatedStyle, { height }]}
      >
        <View style={styles.searchIconContainer}>
          <Ionicons
            name="search-outline"
            size={iconSize}
            color={
              isFocused ? colors.primary[500] : semanticColors.text.tertiary
            }
          />
        </View>

        <TextInput
          ref={inputRef}
          style={[styles.input, { fontSize }]}
          placeholder={placeholder}
          placeholderTextColor={semanticColors.text.tertiary}
          value={currentValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never" // We use custom clear button
          {...rest}
        />

        {/* Loading or Clear button */}
        <View style={styles.rightContainer}>
          {loading && (
            <ActivityIndicator
              size="small"
              color={colors.primary[500]}
              style={styles.loader}
            />
          )}

          {!loading && currentValue.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.clearIconContainer}>
                <Ionicons name="close" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Optional Filter Button */}
      {showFilterButton && (
        <TouchableOpacity
          style={[styles.filterButton, { height }]}
          onPress={onFilterPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name="options-outline"
            size={iconSize}
            color={
              activeFilterCount > 0
                ? colors.primary[500]
                : semanticColors.text.secondary
            }
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Animated.Text style={styles.filterBadgeText}>
                {activeFilterCount}
              </Animated.Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  container: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: semanticColors.background.secondary,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: semanticColors.border.default,
    paddingHorizontal: spacing.md,
    ...Platform.select({
      ios: shadows.sm,
      android: { elevation: 1 },
      web: shadows.sm,
    }),
  },
  searchIconContainer: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: "100%",
    color: semanticColors.text.primary,
    ...Platform.select({
      web: { outlineStyle: "none" as any },
    }),
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: spacing.sm,
  },
  loader: {
    marginRight: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: semanticColors.text.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: semanticColors.background.secondary,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: semanticColors.border.default,
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: colors.primary[500],
    borderRadius: radius.full,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
});

export default SearchInput;
