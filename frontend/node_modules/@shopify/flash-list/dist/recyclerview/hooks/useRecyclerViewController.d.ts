import { RefObject } from "react";
import { FlashListRef } from "../../FlashListRef";
import { CompatScroller } from "../components/CompatScroller";
import { RecyclerViewManager } from "../RecyclerViewManager";
import { ScrollAnchorRef } from "../components/ScrollAnchor";
/**
 * Comprehensive hook that manages RecyclerView scrolling behavior and provides
 * imperative methods for controlling the RecyclerView.
 *
 * This hook combines content offset management and scroll handling functionality:
 * 1. Provides imperative methods for scrolling and measurement
 * 2. Handles initial scroll position when the list first loads
 * 3. Maintains visible content position during updates
 * 4. Manages scroll anchors for chat-like applications
 *
 * @param recyclerViewManager - The RecyclerViewManager instance that handles core functionality
 * @param ref - The ref to expose the imperative methods
 * @param scrollViewRef - Reference to the scrollable container component
 * @param scrollAnchorRef - Reference to the scroll anchor component
 * @param props - The RecyclerViewProps containing configuration
 */
export declare function useRecyclerViewController<T>(recyclerViewManager: RecyclerViewManager<T>, ref: React.Ref<FlashListRef<T>>, scrollViewRef: RefObject<CompatScroller>, scrollAnchorRef: React.RefObject<ScrollAnchorRef>): {
    applyOffsetCorrection: () => void;
    computeFirstVisibleIndexForOffsetCorrection: () => void;
    applyInitialScrollIndex: () => void;
    handlerMethods: FlashListRef<T>;
};
//# sourceMappingURL=useRecyclerViewController.d.ts.map