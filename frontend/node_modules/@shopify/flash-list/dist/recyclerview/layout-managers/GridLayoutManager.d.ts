import { LayoutParams, RVDimension, RVLayoutInfo, RVLayoutManager } from "./LayoutManager";
/**
 * GridLayoutManager implementation that arranges items in a grid pattern.
 * Items are placed in rows and columns, with support for items spanning multiple columns.
 */
export declare class RVGridLayoutManagerImpl extends RVLayoutManager {
    /** The width of the bounded area for the grid */
    private boundedSize;
    /** If there's a span change for grid layout, we need to recompute all the widths */
    private fullRelayoutRequired;
    constructor(params: LayoutParams, previousLayoutManager?: RVLayoutManager);
    /**
     * Updates layout parameters and triggers recomputation if necessary.
     * @param params New layout parameters
     */
    updateLayoutParams(params: LayoutParams): void;
    /**
     * Processes layout information for items, updating their dimensions.
     * @param layoutInfo Array of layout information for items
     * @param itemCount Total number of items in the list
     */
    processLayoutInfo(layoutInfo: RVLayoutInfo[], itemCount: number): 0 | undefined;
    /**
     * Estimates layout dimensions for an item at the given index.
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
    /**
     * Processes items in a row and returns the tallest item.
     * Also handles height normalization for items in the same row.
     * Tallest item per row helps in forcing tallest items height on neighbouring items.
     * @param endIndex Index of the last item in the row
     * @returns The tallest item in the row
     */
    private processAndReturnTallestItemInRow;
    /**
     * Computes the total height of the layout.
     * @param endIndex Index of the last item in the row
     * @returns Total height of the layout
     */
    private computeTotalHeightTillRow;
    private updateAllWidths;
    /**
     * Checks if an item can fit within the bounded width.
     * @param itemX Starting X position of the item
     * @param width Width of the item
     * @returns True if the item fits within bounds
     */
    private checkBounds;
    /**
     * Locates the index of the first item in the current row.
     * @param itemIndex Index to start searching from
     * @returns Index of the first item in the row
     */
    private locateFirstIndexInRow;
}
//# sourceMappingURL=GridLayoutManager.d.ts.map