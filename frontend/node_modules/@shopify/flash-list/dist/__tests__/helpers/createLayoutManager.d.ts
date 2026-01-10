import { LayoutParams, RVLayout, RVLayoutInfo, RVLayoutManager } from "../../recyclerview/layout-managers/LayoutManager";
/**
 * Layout manager types available in the app
 */
export declare enum LayoutManagerType {
    LINEAR = "linear",
    GRID = "grid",
    MASONRY = "masonry"
}
/**
 * Create layout parameters with sensible defaults
 */
export declare function createLayoutParams(params?: Partial<LayoutParams>): LayoutParams;
/**
 * Create a layout manager of the specified type
 */
export declare function createLayoutManager(type: LayoutManagerType, params?: Partial<LayoutParams>, previousLayoutManager?: RVLayoutManager): RVLayoutManager;
/**
 * Generate mock layout info for testing
 */
export declare function createMockLayoutInfo(index: number, width: number, height: number): RVLayoutInfo;
/**
 * Populate layout data in a layout manager
 */
export declare function populateLayouts(layoutManager: RVLayoutManager, itemCount: number, itemWidth?: number, itemHeight?: number, variableSize?: boolean): void;
/**
 * Create and populate a layout manager in one step
 */
export declare function createPopulatedLayoutManager(type: LayoutManagerType, itemCount: number, params?: Partial<LayoutParams>, itemWidth?: number, itemHeight?: number, variableSize?: boolean): RVLayoutManager;
/**
 * Get all layouts from a layout manager
 */
export declare function getAllLayouts(layoutManager: RVLayoutManager): RVLayout[];
//# sourceMappingURL=createLayoutManager.d.ts.map