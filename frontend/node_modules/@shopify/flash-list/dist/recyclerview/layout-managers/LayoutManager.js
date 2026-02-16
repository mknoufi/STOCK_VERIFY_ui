"use strict";
// Interface of layout manager for app's listviews
Object.defineProperty(exports, "__esModule", { value: true });
exports.RVLayoutManager = void 0;
var tslib_1 = require("tslib");
var AverageWindow_1 = require("../../utils/AverageWindow");
var ConsecutiveNumbers_1 = require("../helpers/ConsecutiveNumbers");
var findVisibleIndex_1 = require("../utils/findVisibleIndex");
var measureLayout_1 = require("../utils/measureLayout");
var ErrorMessages_1 = require("../../errors/ErrorMessages");
/**
 * Base abstract class for layout managers in the recycler view system.
 * Provides common functionality for managing item layouts and dimensions.
 * Supports both horizontal and vertical layouts with dynamic item sizing.
 */
var RVLayoutManager = /** @class */ (function () {
    function RVLayoutManager(params, previousLayoutManager) {
        var _a, _b;
        /** Flag indicating if the layout requires repainting */
        this.requiresRepaint = false;
        /** Maximum number of items to process in a single layout pass */
        this.maxItemsToProcess = 250;
        /** Information about item spans and sizes */
        this.spanSizeInfo = {};
        /** Span tracker for each item */
        this.spanTracker = [];
        /** Current max index with changed layout */
        this.currentMaxIndexWithChangedLayout = -1;
        /**
         * Last index that was skipped during layout computation.
         * Used to determine if a layout needs to be recomputed.
         */
        this.lastSkippedLayoutIndex = Number.MAX_VALUE;
        this.heightAverageWindow = new AverageWindow_1.MultiTypeAverageWindow(5, 200);
        this.widthAverageWindow = new AverageWindow_1.MultiTypeAverageWindow(5, 200);
        this.getItemType = params.getItemType;
        this.overrideItemLayout = params.overrideItemLayout;
        this.layouts = (_a = previousLayoutManager === null || previousLayoutManager === void 0 ? void 0 : previousLayoutManager.layouts) !== null && _a !== void 0 ? _a : [];
        if (previousLayoutManager) {
            this.updateLayoutParams(params);
        }
        else {
            this.horizontal = Boolean(params.horizontal);
            this.windowSize = params.windowSize;
            this.maxColumns = (_b = params.maxColumns) !== null && _b !== void 0 ? _b : 1;
        }
    }
    /**
     * Gets the estimated width for an item based on its type.
     * @param index Index of the item
     * @returns Estimated width
     */
    RVLayoutManager.prototype.getEstimatedWidth = function (index) {
        return this.widthAverageWindow.getCurrentValue(this.getItemType(index));
    };
    /**
     * Gets the estimated height for an item based on its type.
     * @param index Index of the item
     * @returns Estimated height
     */
    RVLayoutManager.prototype.getEstimatedHeight = function (index) {
        return this.heightAverageWindow.getCurrentValue(this.getItemType(index));
    };
    /**
     * Checks if the layout is horizontal.
     * @returns True if horizontal, false if vertical
     */
    RVLayoutManager.prototype.isHorizontal = function () {
        return this.horizontal;
    };
    /**
     * Gets the dimensions of the visible window.
     * @returns Window dimensions
     */
    RVLayoutManager.prototype.getWindowsSize = function () {
        return this.windowSize;
    };
    /**
     * Gets indices of items currently visible in the viewport.
     * Uses binary search for efficient lookup.
     * @param unboundDimensionStart Start position of viewport (start X or start Y)
     * @param unboundDimensionEnd End position of viewport (end X or end Y)
     * @returns ConsecutiveNumbers containing visible indices
     */
    RVLayoutManager.prototype.getVisibleLayouts = function (unboundDimensionStart, unboundDimensionEnd) {
        // Find the first visible index
        var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(this.layouts, unboundDimensionStart, this.horizontal);
        // Find the last visible index
        var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(this.layouts, unboundDimensionEnd, this.horizontal);
        // Collect the indices in the range
        if (firstVisibleIndex !== -1 && lastVisibleIndex !== -1) {
            return new ConsecutiveNumbers_1.ConsecutiveNumbers(firstVisibleIndex, lastVisibleIndex);
        }
        return ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY;
    };
    /**
     * Removes layout information for specified indices and recomputes layout.
     * @param indices Array of indices to remove
     */
    RVLayoutManager.prototype.deleteLayout = function (indices) {
        var e_1, _a;
        // Sort indices in descending order
        indices.sort(function (num1, num2) { return num2 - num1; });
        try {
            // Remove elements from the array
            for (var indices_1 = tslib_1.__values(indices), indices_1_1 = indices_1.next(); !indices_1_1.done; indices_1_1 = indices_1.next()) {
                var index = indices_1_1.value;
                this.layouts.splice(index, 1);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (indices_1_1 && !indices_1_1.done && (_a = indices_1.return)) _a.call(indices_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        var startIndex = Math.min.apply(Math, tslib_1.__spreadArray([], tslib_1.__read(indices), false));
        // Recompute layouts starting from the smallest index in the original indices array
        this._recomputeLayouts(this.getMinRecomputeIndex(startIndex), this.getMaxRecomputeIndex(startIndex));
    };
    /**
     * Updates layout information for items and recomputes layout if necessary.
     * @param layoutInfo Array of layout information for items (real measurements)
     * @param totalItemCount Total number of items in the list
     */
    RVLayoutManager.prototype.modifyLayout = function (layoutInfo, totalItemCount) {
        var _a;
        this.maxItemsToProcess = Math.max(this.maxItemsToProcess, layoutInfo.length * 10);
        var minRecomputeIndex = Number.MAX_VALUE;
        if (this.layouts.length > totalItemCount) {
            this.layouts.length = totalItemCount;
            this.spanTracker.length = totalItemCount;
            minRecomputeIndex = totalItemCount - 1; // <0 gets skipped so it's safe to set to totalItemCount - 1
        }
        // update average windows
        minRecomputeIndex = Math.min(minRecomputeIndex, this.computeEstimatesAndMinMaxChangedLayout(layoutInfo));
        if (this.layouts.length < totalItemCount && totalItemCount > 0) {
            var startIndex = this.layouts.length;
            this.layouts.length = totalItemCount;
            this.spanTracker.length = totalItemCount;
            for (var i = startIndex; i < totalItemCount; i++) {
                this.getLayout(i);
                this.getSpan(i);
            }
            this.recomputeLayouts(startIndex, totalItemCount - 1);
        }
        // compute minRecomputeIndex
        minRecomputeIndex = Math.min(minRecomputeIndex, this.lastSkippedLayoutIndex, this.computeMinIndexWithChangedSpan(layoutInfo), (_a = this.processLayoutInfo(layoutInfo, totalItemCount)) !== null && _a !== void 0 ? _a : minRecomputeIndex, this.computeEstimatesAndMinMaxChangedLayout(layoutInfo));
        if (minRecomputeIndex >= 0 && minRecomputeIndex < totalItemCount) {
            var maxRecomputeIndex = this.getMaxRecomputeIndex(minRecomputeIndex);
            this._recomputeLayouts(minRecomputeIndex, maxRecomputeIndex);
        }
        this.currentMaxIndexWithChangedLayout = -1;
    };
    /**
     * Gets layout information for an item at the given index.
     * Creates and initializes a new layout if one doesn't exist.
     * @param index Index of the item
     * @returns Layout information for the item
     */
    RVLayoutManager.prototype.getLayout = function (index) {
        if (index >= this.layouts.length) {
            throw new Error(ErrorMessages_1.ErrorMessages.indexOutOfBounds);
        }
        var layout = this.layouts[index];
        if (!layout) {
            // Create new layout with estimated dimensions
            layout = {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            };
            this.layouts[index] = layout;
        }
        if (!layout.isWidthMeasured || !layout.isHeightMeasured) {
            this.estimateLayout(index);
        }
        return layout;
    };
    /**
     * Updates layout parameters and triggers recomputation if necessary.
     * @param params New layout parameters
     */
    RVLayoutManager.prototype.updateLayoutParams = function (params) {
        var _a, _b, _c;
        this.windowSize = params.windowSize;
        this.horizontal = (_a = params.horizontal) !== null && _a !== void 0 ? _a : this.horizontal;
        this.maxColumns = (_b = params.maxColumns) !== null && _b !== void 0 ? _b : this.maxColumns;
        this.optimizeItemArrangement =
            (_c = params.optimizeItemArrangement) !== null && _c !== void 0 ? _c : this.optimizeItemArrangement;
    };
    RVLayoutManager.prototype.getLayoutCount = function () {
        return this.layouts.length;
    };
    /**
     * Gets span for an item, applying any overrides.
     * This is intended to be called during a relayout call. The value is tracked and used to determine if a span change has occurred.
     * If skipTracking is true, the operation is not tracked. Can be useful if span is required outside of a relayout call.
     * The tracker is used to call handleSpanChange if a span change has occurred before relayout call.
     * // TODO: improve this contract.
     * @param index Index of the item
     * @returns Span for the item
     */
    RVLayoutManager.prototype.getSpan = function (index, skipTracking) {
        var _a;
        if (skipTracking === void 0) { skipTracking = false; }
        this.spanSizeInfo.span = undefined;
        this.overrideItemLayout(index, this.spanSizeInfo);
        var span = Math.min((_a = this.spanSizeInfo.span) !== null && _a !== void 0 ? _a : 1, this.maxColumns);
        if (!skipTracking) {
            this.spanTracker[index] = span;
        }
        return span;
    };
    /**
     * Method to handle span change for an item. Can be overridden by subclasses.
     * @param index Index of the item
     */
    RVLayoutManager.prototype.handleSpanChange = function (index) { };
    /**
     * Gets the maximum index to process in a single layout pass.
     * @param startIndex Starting index
     * @returns Maximum index to process
     */
    RVLayoutManager.prototype.getMaxRecomputeIndex = function (startIndex) {
        return Math.min(Math.max(startIndex, this.currentMaxIndexWithChangedLayout) +
            this.maxItemsToProcess, this.layouts.length - 1);
    };
    /**
     * Gets the minimum index to process in a single layout pass.
     * @param startIndex Starting index
     * @returns Minimum index to process
     */
    RVLayoutManager.prototype.getMinRecomputeIndex = function (startIndex) {
        return startIndex;
    };
    RVLayoutManager.prototype._recomputeLayouts = function (startIndex, endIndex) {
        this.recomputeLayouts(startIndex, endIndex);
        if (this.lastSkippedLayoutIndex >= startIndex &&
            this.lastSkippedLayoutIndex <= endIndex) {
            this.lastSkippedLayoutIndex = Number.MAX_VALUE;
        }
        if (endIndex + 1 < this.layouts.length) {
            this.lastSkippedLayoutIndex = Math.min(endIndex + 1, this.lastSkippedLayoutIndex);
            var lastIndex = this.layouts.length - 1;
            // Since layout managers derive height from last indices we need to make
            // sure they're not too much out of sync.
            if (this.layouts[lastIndex].y < this.layouts[endIndex].y) {
                this.recomputeLayouts(this.lastSkippedLayoutIndex, lastIndex);
                this.lastSkippedLayoutIndex = Number.MAX_VALUE;
            }
        }
    };
    /**
     * Computes size estimates and finds the minimum recompute index.
     * @param layoutInfo Array of layout information for items
     * @returns Minimum index that needs recomputation
     */
    RVLayoutManager.prototype.computeEstimatesAndMinMaxChangedLayout = function (layoutInfo) {
        var e_2, _a;
        var minRecomputeIndex = Number.MAX_VALUE;
        try {
            for (var layoutInfo_1 = tslib_1.__values(layoutInfo), layoutInfo_1_1 = layoutInfo_1.next(); !layoutInfo_1_1.done; layoutInfo_1_1 = layoutInfo_1.next()) {
                var info = layoutInfo_1_1.value;
                var index = info.index, dimensions = info.dimensions;
                var storedLayout = this.layouts[index];
                if (index >= this.lastSkippedLayoutIndex ||
                    !storedLayout ||
                    !storedLayout.isHeightMeasured ||
                    !storedLayout.isWidthMeasured ||
                    (0, measureLayout_1.areDimensionsNotEqual)(storedLayout.height, dimensions.height) ||
                    (0, measureLayout_1.areDimensionsNotEqual)(storedLayout.width, dimensions.width)) {
                    minRecomputeIndex = Math.min(minRecomputeIndex, index);
                    this.currentMaxIndexWithChangedLayout = Math.max(this.currentMaxIndexWithChangedLayout, index);
                }
                this.heightAverageWindow.addValue(dimensions.height, this.getItemType(index));
                this.widthAverageWindow.addValue(dimensions.width, this.getItemType(index));
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (layoutInfo_1_1 && !layoutInfo_1_1.done && (_a = layoutInfo_1.return)) _a.call(layoutInfo_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return minRecomputeIndex;
    };
    RVLayoutManager.prototype.computeMinIndexWithChangedSpan = function (layoutInfo) {
        var e_3, _a;
        var minIndexWithChangedSpan = Number.MAX_VALUE;
        try {
            for (var layoutInfo_2 = tslib_1.__values(layoutInfo), layoutInfo_2_1 = layoutInfo_2.next(); !layoutInfo_2_1.done; layoutInfo_2_1 = layoutInfo_2.next()) {
                var info = layoutInfo_2_1.value;
                var index = info.index;
                var span = this.getSpan(index, true);
                var storedSpan = this.spanTracker[index];
                if (span !== storedSpan) {
                    this.spanTracker[index] = span;
                    this.handleSpanChange(index);
                    minIndexWithChangedSpan = Math.min(minIndexWithChangedSpan, index);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (layoutInfo_2_1 && !layoutInfo_2_1.done && (_a = layoutInfo_2.return)) _a.call(layoutInfo_2);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return minIndexWithChangedSpan;
    };
    return RVLayoutManager;
}());
exports.RVLayoutManager = RVLayoutManager;
//# sourceMappingURL=LayoutManager.js.map