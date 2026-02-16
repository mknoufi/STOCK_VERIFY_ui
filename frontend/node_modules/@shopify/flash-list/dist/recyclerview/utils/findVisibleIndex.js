"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFirstVisibleIndex = findFirstVisibleIndex;
exports.findLastVisibleIndex = findLastVisibleIndex;
/**
 * A helper function to perform binary search for the first or last visible index.
 * This function efficiently finds items that are visible within a viewport by using
 * a binary search algorithm on sorted layouts.
 *
 * @param layouts - The sorted array of RVLayout objects, sorted by either x or y position
 * @param threshold - The threshold value to determine visibility (viewport boundary)
 * @param isSortedByX - A boolean indicating if the array is sorted by x (true) or y (false)
 * @param findFirst - A boolean indicating whether to find the first (true) or last (false) visible index
 * @returns The index of the visible layout or -1 if none are visible
 *
 * @remarks
 * The binary search implementation ensures O(log n) time complexity for finding visible items.
 * The function assumes the layouts array is pre-sorted by the relevant dimension (x or y).
 */
function binarySearchVisibleIndex(layouts, threshold, isSortedByX, findFirst) {
    var left = 0;
    var right = layouts.length - 1;
    var visibleIndex = -1;
    while (left <= right) {
        var mid = Math.floor((left + right) / 2);
        var layout = layouts[mid];
        // Check visibility based on the sorting criteria
        var position = isSortedByX ? layout.x : layout.y;
        var size = isSortedByX ? layout.width : layout.height;
        if (findFirst) {
            // Logic for finding the first visible index
            if (position >= threshold || position + size > threshold) {
                // Potential visible index found, continue searching left for earlier visible items
                visibleIndex = mid;
                right = mid - 1;
            }
            else {
                // Search in the right half for visible items
                left = mid + 1;
            }
        }
        else if (position <= threshold) {
            // Potential visible index found, continue searching right for later visible items
            visibleIndex = mid;
            left = mid + 1;
        }
        else {
            // Search in the left half for visible items
            right = mid - 1;
        }
    }
    return visibleIndex;
}
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
function findFirstVisibleIndex(layouts, threshold, isSortedByX) {
    return binarySearchVisibleIndex(layouts, threshold, isSortedByX, true);
}
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
function findLastVisibleIndex(layouts, threshold, isSortedByX) {
    return binarySearchVisibleIndex(layouts, threshold, isSortedByX, false);
}
//# sourceMappingURL=findVisibleIndex.js.map