import { RecyclerViewManager } from "../RecyclerViewManager";
import { CompatScroller } from "../components/CompatScroller";
/**
 * Hook to detect when the scroll position reaches near the start or end of the list
 * and trigger the appropriate callbacks. This hook is responsible for:
 * 1. Detecting when the user scrolls near the end of the list (onEndReached)
 * 2. Detecting when the user scrolls near the start of the list (onStartReached)
 * 3. Managing auto-scrolling to bottom when new content is added
 *
 * @param recyclerViewManager - The RecyclerViewManager instance that handles the list's core functionality
 * @param props - The RecyclerViewProps containing configuration and callbacks
 * @param scrollViewRef - Reference to the scrollable container component
 */
export declare function useBoundDetection<T>(recyclerViewManager: RecyclerViewManager<T>, scrollViewRef: React.RefObject<CompatScroller>): {
    checkBounds: () => void;
};
//# sourceMappingURL=useBoundDetection.d.ts.map