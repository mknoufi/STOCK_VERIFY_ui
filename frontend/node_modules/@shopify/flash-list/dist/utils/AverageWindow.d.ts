/**
 * Helper class to calculate running average of the most recent n values
 */
export declare class AverageWindow {
    private currentAverage;
    private currentCount;
    private inputValues;
    private nextIndex;
    constructor(size: number, startValue?: number);
    /**
     * Can be used to get the current average value
     */
    get currentValue(): number;
    /**
     *
     * @param value Add new value to the average window and updated current average
     */
    addValue(value: number): void;
    private getNextIndex;
}
export declare class MultiTypeAverageWindow {
    private averageWindows;
    private windowSize;
    private defaultValue?;
    /**
     * @param windowSize Size of the average window
     * @param defaultValue Default value to return if no value is available
     */
    constructor(windowSize: number, defaultValue?: number);
    addValue(value: number, type: string | number): void;
    getCurrentValue(type: string | number): number;
    reset(): void;
}
//# sourceMappingURL=AverageWindow.d.ts.map