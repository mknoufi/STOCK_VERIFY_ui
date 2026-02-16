import { RVLayoutManager } from "../layout-managers/LayoutManager";
import { ConsecutiveNumbers } from "./ConsecutiveNumbers";
export interface RVEngagedIndicesTracker {
    scrollOffset: number;
    drawDistance: number;
    enableOffsetProjection: boolean;
    averageRenderTime: number;
    /**
     * Updates the scroll offset and calculates which items should be rendered (engaged indices).
     * @param offset - The new scroll offset position
     * @param velocity - Current scroll velocity to optimize buffer distribution
     * @param layoutManager - Layout manager to fetch item positions and dimensions
     * @returns New engaged indices if changed, undefined if no change
     */
    updateScrollOffset: (offset: number, velocity: Velocity | null | undefined, layoutManager: RVLayoutManager) => ConsecutiveNumbers | undefined;
    /**
     * Returns the currently engaged (rendered) indices.
     * This includes both visible items and buffer items.
     * @returns The last computed set of engaged indices
     */
    getEngagedIndices: () => ConsecutiveNumbers;
    /**
     * Computes the visible indices in the viewport.
     * @param layoutManager - Layout manager to fetch item positions and dimensions
     * @returns Indices of items currently visible in the viewport
     */
    computeVisibleIndices: (layoutManager: RVLayoutManager) => ConsecutiveNumbers;
    /**
     * Sets the scroll direction for velocity history tracking.
     * @param scrollDirection - The direction of scrolling ("forward" or "backward")
     */
    setScrollDirection: (scrollDirection: "forward" | "backward") => void;
    /**
     * Resets the velocity history based on the current scroll direction.
     */
    resetVelocityHistory: () => void;
}
export interface Velocity {
    x: number;
    y: number;
}
export declare class RVEngagedIndicesTrackerImpl implements RVEngagedIndicesTracker {
    scrollOffset: number;
    drawDistance: number;
    enableOffsetProjection: boolean;
    averageRenderTime: number;
    private forceDisableOffsetProjection;
    private engagedIndices;
    private smallMultiplier;
    private largeMultiplier;
    private velocityHistory;
    private velocityIndex;
    /**
     * Updates scroll position and determines which items should be rendered.
     * Implements a smart buffer system that:
     * 1. Calculates the visible viewport
     * 2. Determines optimal buffer distribution based on scroll direction
     * 3. Adjusts buffer sizes at list boundaries
     * 4. Returns new indices that need to be rendered
     */
    updateScrollOffset(offset: number, velocity: Velocity | null | undefined, layoutManager: RVLayoutManager): ConsecutiveNumbers | undefined;
    /**
     * Updates the velocity history with a new velocity value.
     * @param velocity - Current scroll velocity component (x or y)
     */
    private updateVelocityHistory;
    /**
     * Determines scroll direction by analyzing recent velocity history.
     * Uses a majority voting system on the last 5 velocity values.
     * @returns true if scrolling backward (negative direction), false otherwise
     */
    private isScrollingBackward;
    /**
     * Calculates the median velocity based on velocity history
     * Medina works better agains outliers
     * @returns Median velocity over the recent history
     */
    private getMedianVelocity;
    /**
     * Projects the next scroll offset based on median velocity
     * @param timeMs Time in milliseconds to predict ahead
     * @returns Projected scroll offset
     */
    private getProjectedScrollOffset;
    /**
     * Calculates which items are currently visible in the viewport.
     * Unlike getEngagedIndices, this doesn't include buffer items.
     * @param layoutManager - Layout manager to fetch item positions
     * @returns Indices of items currently visible in the viewport
     */
    computeVisibleIndices(layoutManager: RVLayoutManager): ConsecutiveNumbers;
    /**
     * Returns the currently engaged (rendered) indices.
     * This includes both visible items and buffer items.
     * @returns The last computed set of engaged indices
     */
    getEngagedIndices(): ConsecutiveNumbers;
    setScrollDirection(scrollDirection: "forward" | "backward"): void;
    /**
     * Resets the velocity history based on the current scroll direction.
     * This ensures that the velocity history is always in sync with the current scroll direction.
     */
    resetVelocityHistory(): void;
}
//# sourceMappingURL=EngagedIndicesTracker.d.ts.map