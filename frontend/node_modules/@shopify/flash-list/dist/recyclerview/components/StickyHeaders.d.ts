/**
 * StickyHeaders component manages the sticky header behavior in a FlashList.
 * It handles the animation and positioning of headers that should remain fixed
 * at the top of the list while scrolling.
 */
import React from "react";
import { Animated, NativeScrollEvent } from "react-native";
import { FlashListProps } from "../..";
import { RecyclerViewManager } from "../RecyclerViewManager";
/**
 * Props for the StickyHeaders component
 * @template TItem - The type of items in the list
 */
export interface StickyHeaderProps<TItem> {
    /** Array of indices that should have sticky headers */
    stickyHeaderIndices: number[];
    /** The data array being rendered */
    data: ReadonlyArray<TItem>;
    /** Animated value tracking scroll position */
    scrollY: Animated.Value;
    /** Function to render each item */
    renderItem: FlashListProps<TItem>["renderItem"];
    /** Ref to access sticky header methods */
    stickyHeaderRef: React.RefObject<StickyHeaderRef>;
    /** Manager for recycler view operations */
    recyclerViewManager: RecyclerViewManager<TItem>;
    /** Additional data to trigger re-renders */
    extraData: FlashListProps<TItem>["extraData"];
}
/**
 * Ref interface for StickyHeaders component
 */
export interface StickyHeaderRef {
    /** Reports scroll events to update sticky header positions */
    reportScrollEvent: (event: NativeScrollEvent) => void;
}
export declare const StickyHeaders: <TItem>({ stickyHeaderIndices, renderItem, stickyHeaderRef, recyclerViewManager, scrollY, data, extraData, }: StickyHeaderProps<TItem>) => React.JSX.Element;
//# sourceMappingURL=StickyHeaders.d.ts.map