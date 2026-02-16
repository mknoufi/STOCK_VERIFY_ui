import { LayoutParams, RVDimension, RVLayoutInfo, RVLayoutManager } from "./LayoutManager";
/**
 * LinearLayoutManager implementation that arranges items in a single row or column.
 * Supports both horizontal and vertical layouts with dynamic item sizing.
 */
export declare class RVLinearLayoutManagerImpl extends RVLayoutManager {
    /** The bounded size (width for vertical, height for horizontal) */
    private boundedSize;
    /** Whether the bounded size has been set */
    private hasSize;
    /** Reference to the tallest item in the layout */
    private tallestItem?;
    /** Height of the tallest item */
    private tallestItemHeight;
    constructor(params: LayoutParams, previousLayoutManager?: RVLayoutManager);
    /**
     * Updates layout parameters and triggers recomputation if necessary.
     * @param params New layout parameters
     */
    updateLayoutParams(params: LayoutParams): void;
    /**
     * Processes layout information for items, updating their dimensions.
     * For horizontal layouts, also normalizes heights of items.
     * @param layoutInfo Array of layout information for items
     * @param itemCount Total number of items in the list
     */
    processLayoutInfo(layoutInfo: RVLayoutInfo[], itemCount: number): void;
    /**
     * Estimates layout dimensions for an item at the given index.
     * @param index Index of the item to estimate layout for
     */
    estimateLayout(index: number): void;
    /**
     * Returns the total size of the layout area.
     * @returns RVDimension containing width and height of the layout
     */
    getLayoutSize(): RVDimension;
    /**
     * Normalizes heights of items in horizontal layout to match the tallest item.
     * @param layoutInfo Array of layout information for items
     */
    private normalizeLayoutHeights;
    /**
     * Recomputes layouts for items in the given range.
     * Positions items sequentially based on layout direction.
     * @param startIndex Starting index of items to recompute
     * @param endIndex Ending index of items to recompute
     */
    recomputeLayouts(startIndex: number, endIndex: number): void;
}
//# sourceMappingURL=LinearLayoutManager.d.ts.map