/**
 * Tracks and calculates velocity for scroll/drag movements
 * Used to determine momentum scrolling behavior
 */
export declare class VelocityTracker<T> {
    /** Timestamp of the last velocity update */
    private lastUpdateTime;
    /** Current velocity vector with x and y components */
    private velocity;
    /** Reference to the momentum end timeout */
    private timeoutId;
    /**
     * Calculates velocity based on position change over time
     * @param newOffset Current position value
     * @param oldOffset Previous position value
     * @param isHorizontal Whether movement is horizontal (true) or vertical (false)
     * @param isRTL Whether layout direction is right-to-left
     * @param callback Function to call with velocity updates and momentum end signal
     */
    computeVelocity(newOffset: number, oldOffset: number, isHorizontal: boolean, callback: (velocity: {
        x: number;
        y: number;
    }, isMomentumEnd: boolean) => void): void;
    /**
     * Cleans up resources by clearing any pending timeout
     */
    cleanUp(): void;
}
//# sourceMappingURL=VelocityTracker.d.ts.map