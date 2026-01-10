/**
 * A simple wrapper for consecutive postive integer arrays
 * Only stores start and end indices for faster computation as numbers are consecutive.
 */
export declare class ConsecutiveNumbers {
    readonly startIndex: number;
    readonly endIndex: number;
    constructor(startIndex: number, endIndex: number);
    static readonly EMPTY: ConsecutiveNumbers;
    /**
     * Get the length of the array
     */
    get length(): number;
    /**
     * Get element at specified index
     */
    at(index: number): number;
    /**
     * Check if two consecutive numbers are equal
     */
    equals(other: ConsecutiveNumbers): boolean;
    /**
     * Converts the consecutive range to an actual array
     * @returns An array containing all consecutive numbers
     */
    toArray(): number[];
    /**
     * Check if array includes a value
     */
    includes(value: number): boolean;
    /**
     * Get index of a value in the consecutive range
     */
    indexOf(value: number): number;
    findValue(predicate: (value: number, index: number, array: ConsecutiveNumbers) => boolean | undefined): number | undefined;
    /**
     * Tests whether all elements in the consecutive range pass the provided test function
     * @param predicate A function that tests each element
     * @returns true if all elements pass the test; otherwise, false
     */
    every(predicate: (value: number, index: number, array: ConsecutiveNumbers) => boolean | undefined): boolean;
    /**
     * Get a slice of the consecutive array
     */
    slice(start?: number, end?: number): ConsecutiveNumbers;
    /**
     * Implement iterator to enable for...of
     */
    [Symbol.iterator](): Generator<number, void, unknown>;
}
//# sourceMappingURL=ConsecutiveNumbers.d.ts.map