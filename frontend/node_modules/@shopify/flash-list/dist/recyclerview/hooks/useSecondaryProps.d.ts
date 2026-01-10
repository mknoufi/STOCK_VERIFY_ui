import { Animated } from "react-native";
import React from "react";
import { RecyclerViewProps } from "../RecyclerViewProps";
/**
 * Hook that manages secondary props and components for the RecyclerView.
 * This hook handles the creation and management of:
 * 1. Pull-to-refresh functionality
 * 2. Header and footer components
 * 3. Empty state component
 * 4. Custom scroll component with animation support
 *
 * @param props - The RecyclerViewProps containing all configuration options
 * @returns An object containing:
 *   - refreshControl: The pull-to-refresh control component
 *   - renderHeader: The header component renderer
 *   - renderFooter: The footer component renderer
 *   - renderEmpty: The empty state component renderer
 *   - CompatScrollView: The animated scroll component
 */
export declare function useSecondaryProps<T>(props: RecyclerViewProps<T>): {
    refreshControl: React.JSX.Element | undefined;
    renderHeader: React.JSX.Element | null;
    renderFooter: React.JSX.Element | null;
    renderEmpty: React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;
    CompatScrollView: Animated.AnimatedComponent<Animated.AnimatedComponent<typeof import("react-native").ScrollView>>;
};
//# sourceMappingURL=useSecondaryProps.d.ts.map