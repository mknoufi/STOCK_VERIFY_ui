import { FlashListRef } from "../FlashListRef";
import { CompatScroller } from "./components/CompatScroller";
export interface RecyclerViewContext<T> extends FlashListContext<T> {
    /**
     * Mark the children FlashLists as pending for layout
     * This will force parent FlashList to wait for children to be laid out before
     * rendering the next batch of items.
     * @param id - The id of the child FlashList
     * @returns void
     */
    markChildLayoutAsPending: (id: string) => void;
    /**
     * Unmark the child FlashList as pending for layout
     * This will allow parent FlashList to render the next batch of items.
     * @param id - The id of the child FlashList
     * @returns void
     */
    unmarkChildLayoutAsPending: (id: string) => void;
}
export interface FlashListContext<T> {
    /**
     * Layout the current FlashList
     * @returns void
     */
    layout: () => void;
    /**
     * Get the ref for the current FlashList
     */
    getRef: () => FlashListRef<T> | null;
    /**
     * Get the ref for the parent FlashList if present
     */
    getParentRef: () => FlashListRef<unknown> | null;
    /**
     * Get the scrollView ref for the current FlashList if present
     */
    getScrollViewRef: () => CompatScroller | null;
    /**
     * Get the scrollView ref for the parent FlashList if present
     */
    getParentScrollViewRef: () => CompatScroller | null;
}
export declare const RecyclerViewContextProvider: import("react").Provider<RecyclerViewContext<unknown> | undefined>;
export declare function useRecyclerViewContext<T>(): RecyclerViewContext<T> | undefined;
export declare function useFlashListContext<T>(): FlashListContext<T> | undefined;
//# sourceMappingURL=RecyclerViewContextProvider.d.ts.map