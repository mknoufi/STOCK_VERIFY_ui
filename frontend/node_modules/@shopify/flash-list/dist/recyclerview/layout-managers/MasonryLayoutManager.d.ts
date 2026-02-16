import { LayoutParams, RVDimension, RVLayoutInfo, RVLayoutManager } from "./LayoutManager";
/**
 * MasonryLayoutManager implementation that arranges items in a masonry/pinterest-style layout.
 * Items are placed in columns, with support for items spanning multiple columns.
 * Can optimize item placement to minimize column height differences.
 */
export declare class RVMasonryLayoutManagerImpl extends RVLayoutManager {
    /** The width of the bounded area for the masonry layout */
    private boundedSize;
    /** Array tracking the current height of each column */
    private columnHeights;
    /** Current column index for sequential placement */
    private currentColumn;
    /** If there's a span change for masonry layout, we need to recompute all the widths */
    private fullRelayoutRequired;
    constructor(params: LayoutParams, previousLayoutManager?: RVLayoutManager);
    /**
     * Updates layout parameters and triggers recomputation if necessary.
     * @param params New layout parameters
     */
    updateLayoutParams(params: LayoutParams): void;
    /**
     * Processes layout information for items, updating their dimensions.
     * @param layoutInfo Array of layout information for items (real measurements)
     * @param itemCount Total number of items in the list
     */
    processLayoutInfo(layoutInfo: RVLayoutInfo[], itemCount: number): 0 | undefined;
    /**
     * Estimates layout dimensions for an item at the given index.
     * Can be called by base class if estimate is required.
     * @param index Index of the item to estimate layout for
     */
    estimateLayout(index: number): void;
    /**
     * Handles span change for an item.
     * @param index Index of the item
     */
    handleSpanChange(index: number): void;
    /**
     * Returns the total size of the layout area.
     * @returns RVDimension containing width and height of the layout
     */
    getLayoutSize(): RVDimension;
    /**
     * Recomputes layouts for items in the given range.
     * Uses different placement strategies based on optimization settings.
     * @param startIndex Starting index of items to recompute
     * @param endIndex Ending index of items to recompute
     */
    recomputeLayouts(startIndex: number, endIndex: number): void;
    /**
     * Calculates the width of an item based on its span.
     * @param index Index of the item
     * @returns Width of the item
     */
    private getWidth;
    private updateAllWidths;
    /**
     * Places an item sequentially in the next available position.
     * @param layout Layout information for the item
     * @param span Number of columns the item spans
     */
    private placeItemSequentially;
    /**
     * Places a single-column item in the shortest available column.
     * @param layout Layout information for the item
     */
    private placeSingleColumnItem;
    /**
     * Places a multi-column item in the position that minimizes total column heights.
     * @param layout Layout information for the item
     * @param span Number of columns the item spans
     */
    private placeOptimizedMultiColumnItem;
    /**
     * Updates column heights up to a given index by recalculating item positions.
     * @param index Index to update column heights up to
     */
    private updateColumnHeightsToIndex;
}
//# sourceMappingURL=MasonryLayoutManager.d.ts.map