import { RVLayout } from "../layout-managers/LayoutManager";
/**
 * Finds the first visible index in a sorted array of RVLayout objects.
 * This is a wrapper around binarySearchVisibleIndex that specifically finds
 * the first item that becomes visible in the viewport.
 *
 * @param layouts - The sorted array of RVLayout objects
 * @param threshold - The threshold value to determine visibility
 * @param isSortedByX - A boolean indicating if the array is sorted by x (true) or y (false)
 * @returns The index of the first visible layout or -1 if none are visible
 */
export declare function findFirstVisibleIndex(layouts: RVLayout[], threshold: number, isSortedByX: boolean): number;
/**
 * Finds the last visible index in a sorted array of RVLayout objects.
 * This is a wrapper around binarySearchVisibleIndex that specifically finds
 * the last item that remains visible in the viewport.
 *
 * @param layouts - The sorted array of RVLayout objects
 * @param threshold - The threshold value to determine visibility
 * @param isSortedByX - A boolean indicating if the array is sorted by x (true) or y (false)
 * @returns The index of the last visible layout or -1 if none are visible
 */
export declare function findLastVisibleIndex(layouts: RVLayout[], threshold: number, isSortedByX: boolean): number;
//# sourceMappingURL=findVisibleIndex.d.ts.map