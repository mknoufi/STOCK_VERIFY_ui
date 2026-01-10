"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RVEngagedIndicesTrackerImpl = void 0;
var tslib_1 = require("tslib");
var PlatformHelper_1 = require("../../native/config/PlatformHelper");
var ConsecutiveNumbers_1 = require("./ConsecutiveNumbers");
var RVEngagedIndicesTrackerImpl = /** @class */ (function () {
    function RVEngagedIndicesTrackerImpl() {
        // Current scroll position of the list
        this.scrollOffset = 0;
        // Distance to pre-render items before and after the visible viewport (in pixels)
        this.drawDistance = PlatformHelper_1.PlatformConfig.defaultDrawDistance;
        // Whether to use offset projection to predict the next scroll offset
        this.enableOffsetProjection = true;
        // Average render time of the list
        this.averageRenderTime = 16;
        // Internal override to disable offset projection
        this.forceDisableOffsetProjection = false;
        // Currently rendered item indices (including buffer items)
        this.engagedIndices = ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY;
        // Buffer distribution multipliers for scroll direction optimization
        this.smallMultiplier = 0.3; // Used for buffer in the opposite direction of scroll
        this.largeMultiplier = 0.7; // Used for buffer in the direction of scroll
        // Circular buffer to track recent scroll velocities for direction detection
        this.velocityHistory = [0, 0, 0, -0.1, -0.1];
        this.velocityIndex = 0;
    }
    /**
     * Updates scroll position and determines which items should be rendered.
     * Implements a smart buffer system that:
     * 1. Calculates the visible viewport
     * 2. Determines optimal buffer distribution based on scroll direction
     * 3. Adjusts buffer sizes at list boundaries
     * 4. Returns new indices that need to be rendered
     */
    RVEngagedIndicesTrackerImpl.prototype.updateScrollOffset = function (offset, velocity, layoutManager) {
        // Update current scroll position
        this.scrollOffset = offset;
        // STEP 1: Determine the currently visible viewport
        var windowSize = layoutManager.getWindowsSize();
        var isHorizontal = layoutManager.isHorizontal();
        // Update velocity history
        if (velocity) {
            this.updateVelocityHistory(isHorizontal ? velocity.x : velocity.y);
        }
        // Determine scroll direction to optimize buffer distribution
        var isScrollingBackward = this.isScrollingBackward();
        var viewportStart = this.enableOffsetProjection && !this.forceDisableOffsetProjection
            ? this.getProjectedScrollOffset(offset, this.averageRenderTime)
            : offset;
        // console.log("timeMs", this.averageRenderTime, offset, viewportStart);
        var viewportSize = isHorizontal ? windowSize.width : windowSize.height;
        var viewportEnd = viewportStart + viewportSize;
        // STEP 2: Determine buffer size and distribution
        // The total extra space where items will be pre-rendered
        var totalBuffer = this.drawDistance * 2;
        // Distribute more buffer in the direction of scrolling
        // When scrolling forward: more buffer after viewport
        // When scrolling backward: more buffer before viewport
        var beforeRatio = isScrollingBackward
            ? this.largeMultiplier
            : this.smallMultiplier;
        var afterRatio = isScrollingBackward
            ? this.smallMultiplier
            : this.largeMultiplier;
        var bufferBefore = Math.ceil(totalBuffer * beforeRatio);
        var bufferAfter = Math.ceil(totalBuffer * afterRatio);
        // STEP 3: Calculate the extended viewport (visible area + buffers)
        // The start position with buffer (never less than 0)
        var extendedStart = Math.max(0, viewportStart - bufferBefore);
        // If we couldn't apply full buffer at start, calculate how much was unused
        var unusedStartBuffer = Math.max(0, bufferBefore - viewportStart);
        // Add any unused start buffer to the end buffer
        var extendedEnd = viewportEnd + bufferAfter + unusedStartBuffer;
        // STEP 4: Handle end boundary adjustments
        // Get the total content size to check for end boundary
        var layoutSize = layoutManager.getLayoutSize();
        var maxPosition = isHorizontal ? layoutSize.width : layoutSize.height;
        // If we hit the end boundary, redistribute unused buffer to the start
        if (extendedEnd > maxPosition) {
            // Calculate unused end buffer and apply it to the start if possible
            var unusedEndBuffer = extendedEnd - maxPosition;
            extendedEnd = maxPosition;
            // Try to extend start position further with the unused end buffer
            extendedStart = Math.max(0, extendedStart - unusedEndBuffer);
        }
        // STEP 5: Get and return the new engaged indices
        var newEngagedIndices = layoutManager.getVisibleLayouts(extendedStart, extendedEnd);
        // console.log(
        //   "newEngagedIndices",
        //   newEngagedIndices,
        //   this.scrollOffset,
        //   viewportStart
        // );
        // Only return new indices if they've changed
        var oldEngagedIndices = this.engagedIndices;
        this.engagedIndices = newEngagedIndices;
        return newEngagedIndices.equals(oldEngagedIndices)
            ? undefined
            : newEngagedIndices;
    };
    /**
     * Updates the velocity history with a new velocity value.
     * @param velocity - Current scroll velocity component (x or y)
     */
    RVEngagedIndicesTrackerImpl.prototype.updateVelocityHistory = function (velocity) {
        this.velocityHistory[this.velocityIndex] = velocity;
        this.velocityIndex = (this.velocityIndex + 1) % this.velocityHistory.length;
    };
    /**
     * Determines scroll direction by analyzing recent velocity history.
     * Uses a majority voting system on the last 5 velocity values.
     * @returns true if scrolling backward (negative direction), false otherwise
     */
    RVEngagedIndicesTrackerImpl.prototype.isScrollingBackward = function () {
        // should decide based on whether we have more positive or negative values, use for loop
        var positiveCount = 0;
        var negativeCount = 0;
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (var i = 0; i < this.velocityHistory.length; i++) {
            if (this.velocityHistory[i] > 0) {
                positiveCount++;
            }
            else if (this.velocityHistory[i] < 0) {
                negativeCount++;
            }
        }
        return positiveCount < negativeCount;
    };
    /**
     * Calculates the median velocity based on velocity history
     * Medina works better agains outliers
     * @returns Median velocity over the recent history
     */
    RVEngagedIndicesTrackerImpl.prototype.getMedianVelocity = function () {
        // Make a copy of velocity history and sort it
        var sortedVelocities = tslib_1.__spreadArray([], tslib_1.__read(this.velocityHistory), false).sort(function (valueA, valueB) { return valueA - valueB; });
        var length = sortedVelocities.length;
        // If length is odd, return the middle element
        if (length % 2 === 1) {
            return sortedVelocities[Math.floor(length / 2)];
        }
        // If length is even, return the average of the two middle elements
        var midIndex = length / 2;
        return (sortedVelocities[midIndex - 1] + sortedVelocities[midIndex]) / 2;
    };
    /**
     * Projects the next scroll offset based on median velocity
     * @param timeMs Time in milliseconds to predict ahead
     * @returns Projected scroll offset
     */
    RVEngagedIndicesTrackerImpl.prototype.getProjectedScrollOffset = function (offset, timeMs) {
        var medianVelocity = this.getMedianVelocity();
        // Convert time from ms to seconds for velocity calculation
        // Predict next position: current position + (velocity * time)
        return offset + medianVelocity * timeMs;
    };
    /**
     * Calculates which items are currently visible in the viewport.
     * Unlike getEngagedIndices, this doesn't include buffer items.
     * @param layoutManager - Layout manager to fetch item positions
     * @returns Indices of items currently visible in the viewport
     */
    RVEngagedIndicesTrackerImpl.prototype.computeVisibleIndices = function (layoutManager) {
        var windowSize = layoutManager.getWindowsSize();
        var isHorizontal = layoutManager.isHorizontal();
        // Calculate viewport boundaries
        var viewportStart = this.scrollOffset;
        var viewportSize = isHorizontal ? windowSize.width : windowSize.height;
        var viewportEnd = viewportStart + viewportSize;
        // Get indices of items currently visible in the viewport
        var newVisibleIndices = layoutManager.getVisibleLayouts(viewportStart, viewportEnd);
        return newVisibleIndices;
    };
    /**
     * Returns the currently engaged (rendered) indices.
     * This includes both visible items and buffer items.
     * @returns The last computed set of engaged indices
     */
    RVEngagedIndicesTrackerImpl.prototype.getEngagedIndices = function () {
        return this.engagedIndices;
    };
    RVEngagedIndicesTrackerImpl.prototype.setScrollDirection = function (scrollDirection) {
        if (scrollDirection === "forward") {
            this.velocityHistory = [0, 0, 0, 0.1, 0.1];
            this.velocityIndex = 0;
        }
        else {
            this.velocityHistory = [0, 0, 0, -0.1, -0.1];
            this.velocityIndex = 0;
        }
    };
    /**
     * Resets the velocity history based on the current scroll direction.
     * This ensures that the velocity history is always in sync with the current scroll direction.
     */
    RVEngagedIndicesTrackerImpl.prototype.resetVelocityHistory = function () {
        if (this.isScrollingBackward()) {
            this.setScrollDirection("backward");
        }
        else {
            this.setScrollDirection("forward");
        }
    };
    return RVEngagedIndicesTrackerImpl;
}());
exports.RVEngagedIndicesTrackerImpl = RVEngagedIndicesTrackerImpl;
//# sourceMappingURL=EngagedIndicesTracker.js.map