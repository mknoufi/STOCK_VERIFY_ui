import { ConsecutiveNumbers } from "./helpers/ConsecutiveNumbers";
import { RVDimension, RVLayoutInfo } from "./layout-managers/LayoutManager";
import { RecyclerViewProps } from "./RecyclerViewProps";
import { Velocity } from "./helpers/EngagedIndicesTracker";
export declare class RecyclerViewManager<T> {
    private initialDrawBatchSize;
    private engagedIndicesTracker;
    private renderStackManager;
    private layoutManager?;
    private isFirstLayoutComplete;
    private hasRenderedProgressively;
    private progressiveRenderCount;
    private propsRef;
    private itemViewabilityManager;
    private _isDisposed;
    private _isLayoutManagerDirty;
    private _animationOptimizationsEnabled;
    firstItemOffset: number;
    ignoreScrollEvents: boolean;
    get animationOptimizationsEnabled(): boolean;
    set animationOptimizationsEnabled(value: boolean);
    get isOffsetProjectionEnabled(): boolean;
    get isDisposed(): boolean;
    get numColumns(): number;
    constructor(props: RecyclerViewProps<T>);
    private updateRenderStack;
    get props(): RecyclerViewProps<T>;
    setOffsetProjectionEnabled(value: boolean): void;
    updateProps(props: RecyclerViewProps<T>): void;
    /**
     * Updates the scroll offset and returns the engaged indices if any
     * @param offset
     * @param velocity
     */
    updateScrollOffset(offset: number, velocity?: Velocity): ConsecutiveNumbers | undefined;
    updateAverageRenderTime(time: number): void;
    getIsFirstLayoutComplete(): boolean;
    getLayout(index: number): import("./layout-managers/LayoutManager").RVLayout;
    tryGetLayout(index: number): import("./layout-managers/LayoutManager").RVLayout | undefined;
    getChildContainerDimensions(): RVDimension;
    getRenderStack(): Map<string, {
        itemType: string;
        index: number;
        stableId: string;
    }>;
    getWindowSize(): RVDimension;
    getLastScrollOffset(): number;
    getMaxScrollOffset(): number;
    getAbsoluteLastScrollOffset(): number;
    setScrollDirection(scrollDirection: "forward" | "backward"): void;
    resetVelocityCompute(): void;
    updateLayoutParams(windowSize: RVDimension, firstItemOffset: number): void;
    hasLayout(): boolean;
    computeVisibleIndices(): ConsecutiveNumbers;
    getEngagedIndices(): ConsecutiveNumbers;
    modifyChildrenLayout(layoutInfo: RVLayoutInfo[], dataLength: number): boolean;
    computeItemViewability(): void;
    recordInteraction(): void;
    recomputeViewableItems(): void;
    processDataUpdate(): void;
    recomputeEngagedIndices(): ConsecutiveNumbers | undefined;
    restoreIfNeeded(): void;
    dispose(): void;
    markLayoutManagerDirty(): void;
    getInitialScrollIndex(): number | undefined;
    shouldMaintainVisibleContentPosition(): boolean;
    getDataLength(): number;
    hasStableDataKeys(): boolean;
    getDataKey(index: number): string;
    private getLayoutManagerClass;
    private applyInitialScrollAdjustment;
    private renderProgressively;
    private getItemType;
    private overrideItemLayout;
}
//# sourceMappingURL=RecyclerViewManager.d.ts.map