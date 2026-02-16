export declare class RenderTimeTracker {
    private renderTimeAvgWindow;
    private lastTimerStartedAt;
    private maxRenderTime;
    private defaultRenderTime;
    private rendersWithoutCommit;
    private maxRendersWithoutCommit;
    startTracking(): void;
    markRenderComplete(): void;
    hasExceededMaxRendersWithoutCommit(): boolean;
    getRawValue(): number;
    getAverageRenderTime(): number;
}
//# sourceMappingURL=RenderTimeTracker.d.ts.map