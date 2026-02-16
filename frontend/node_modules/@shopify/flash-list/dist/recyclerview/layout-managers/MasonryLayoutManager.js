"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RVMasonryLayoutManagerImpl = void 0;
var tslib_1 = require("tslib");
var LayoutManager_1 = require("./LayoutManager");
/**
 * MasonryLayoutManager implementation that arranges items in a masonry/pinterest-style layout.
 * Items are placed in columns, with support for items spanning multiple columns.
 * Can optimize item placement to minimize column height differences.
 */
var RVMasonryLayoutManagerImpl = /** @class */ (function (_super) {
    tslib_1.__extends(RVMasonryLayoutManagerImpl, _super);
    function RVMasonryLayoutManagerImpl(params, previousLayoutManager) {
        var _a;
        var _this = _super.call(this, params, previousLayoutManager) || this;
        /** Current column index for sequential placement */
        _this.currentColumn = 0;
        /** If there's a span change for masonry layout, we need to recompute all the widths */
        _this.fullRelayoutRequired = false;
        _this.boundedSize = params.windowSize.width;
        _this.optimizeItemArrangement = params.optimizeItemArrangement;
        _this.columnHeights = (_a = _this.columnHeights) !== null && _a !== void 0 ? _a : Array(_this.maxColumns).fill(0);
        return _this;
    }
    /**
     * Updates layout parameters and triggers recomputation if necessary.
     * @param params New layout parameters
     */
    RVMasonryLayoutManagerImpl.prototype.updateLayoutParams = function (params) {
        var prevMaxColumns = this.maxColumns;
        var prevOptimizeItemArrangement = this.optimizeItemArrangement;
        _super.prototype.updateLayoutParams.call(this, params);
        if (this.boundedSize !== params.windowSize.width ||
            prevMaxColumns !== params.maxColumns ||
            prevOptimizeItemArrangement !== params.optimizeItemArrangement) {
            this.boundedSize = params.windowSize.width;
            if (this.layouts.length > 0) {
                // console.log("-----> recomputeLayouts");
                // update all widths
                this.updateAllWidths();
                this.recomputeLayouts(0, this.layouts.length - 1);
                this.requiresRepaint = true;
            }
        }
    };
    /**
     * Processes layout information for items, updating their dimensions.
     * @param layoutInfo Array of layout information for items (real measurements)
     * @param itemCount Total number of items in the list
     */
    RVMasonryLayoutManagerImpl.prototype.processLayoutInfo = function (layoutInfo, itemCount) {
        var e_1, _a;
        try {
            // Update layout information
            for (var layoutInfo_1 = tslib_1.__values(layoutInfo), layoutInfo_1_1 = layoutInfo_1.next(); !layoutInfo_1_1.done; layoutInfo_1_1 = layoutInfo_1.next()) {
                var info = layoutInfo_1_1.value;
                var index = info.index, dimensions = info.dimensions;
                var layout = this.layouts[index];
                layout.height = dimensions.height;
                layout.isHeightMeasured = true;
                layout.isWidthMeasured = true;
                this.layouts[index] = layout;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (layoutInfo_1_1 && !layoutInfo_1_1.done && (_a = layoutInfo_1.return)) _a.call(layoutInfo_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // TODO: Can be optimized
        if (this.fullRelayoutRequired) {
            this.updateAllWidths();
            this.fullRelayoutRequired = false;
            return 0;
        }
    };
    /**
     * Estimates layout dimensions for an item at the given index.
     * Can be called by base class if estimate is required.
     * @param index Index of the item to estimate layout for
     */
    RVMasonryLayoutManagerImpl.prototype.estimateLayout = function (index) {
        var layout = this.layouts[index];
        // Set width based on columns and span
        layout.width = this.getWidth(index);
        layout.height = this.getEstimatedHeight(index);
        layout.isWidthMeasured = true;
        layout.enforcedWidth = true;
    };
    /**
     * Handles span change for an item.
     * @param index Index of the item
     */
    RVMasonryLayoutManagerImpl.prototype.handleSpanChange = function (index) {
        this.fullRelayoutRequired = true;
    };
    /**
     * Returns the total size of the layout area.
     * @returns RVDimension containing width and height of the layout
     */
    RVMasonryLayoutManagerImpl.prototype.getLayoutSize = function () {
        if (this.layouts.length === 0)
            return { width: 0, height: 0 };
        // Find the tallest column
        var maxHeight = Math.max.apply(Math, tslib_1.__spreadArray([], tslib_1.__read(this.columnHeights), false));
        return {
            width: this.boundedSize,
            height: maxHeight,
        };
    };
    /**
     * Recomputes layouts for items in the given range.
     * Uses different placement strategies based on optimization settings.
     * @param startIndex Starting index of items to recompute
     * @param endIndex Ending index of items to recompute
     */
    RVMasonryLayoutManagerImpl.prototype.recomputeLayouts = function (startIndex, endIndex) {
        // Reset column heights if starting from the beginning
        if (startIndex === 0) {
            this.columnHeights = Array(this.maxColumns).fill(0);
            this.currentColumn = 0;
        }
        else {
            // Find the y-position of the first item to recompute
            // and adjust column heights accordingly
            this.updateColumnHeightsToIndex(startIndex);
        }
        var itemCount = this.layouts.length;
        for (var i = startIndex; i < itemCount; i++) {
            var layout = this.getLayout(i);
            // Skip tracking span because we're not changing widths
            var span = this.getSpan(i, true);
            if (this.optimizeItemArrangement) {
                if (span === 1) {
                    // For single column items, place in the shortest column
                    this.placeSingleColumnItem(layout);
                }
                else {
                    // For multi-column items, find the best position
                    this.placeOptimizedMultiColumnItem(layout, span);
                }
            }
            else {
                // No optimization - place items sequentially
                this.placeItemSequentially(layout, span);
            }
        }
    };
    /**
     * Calculates the width of an item based on its span.
     * @param index Index of the item
     * @returns Width of the item
     */
    RVMasonryLayoutManagerImpl.prototype.getWidth = function (index) {
        return (this.boundedSize / this.maxColumns) * this.getSpan(index);
    };
    RVMasonryLayoutManagerImpl.prototype.updateAllWidths = function () {
        for (var i = 0; i < this.layouts.length; i++) {
            this.layouts[i].width = this.getWidth(i);
            this.layouts[i].minHeight = undefined;
        }
    };
    /**
     * Places an item sequentially in the next available position.
     * @param layout Layout information for the item
     * @param span Number of columns the item spans
     */
    RVMasonryLayoutManagerImpl.prototype.placeItemSequentially = function (layout, span) {
        // Check if the item can fit in the current row
        if (this.currentColumn + span > this.maxColumns) {
            // Move to the next row
            this.currentColumn = 0;
        }
        // Find the maximum height of the columns this item will span
        var maxHeight = this.columnHeights[this.currentColumn];
        for (var col = this.currentColumn + 1; col < this.currentColumn + span; col++) {
            if (col < this.maxColumns) {
                maxHeight = Math.max(maxHeight, this.columnHeights[col]);
            }
        }
        // Place the item
        layout.x = (this.boundedSize / this.maxColumns) * this.currentColumn;
        layout.y = maxHeight;
        // Update column heights
        for (var col = this.currentColumn; col < this.currentColumn + span; col++) {
            if (col < this.maxColumns) {
                this.columnHeights[col] = maxHeight + layout.height;
            }
        }
        // Move to the next column
        this.currentColumn += span;
        if (this.currentColumn >= this.maxColumns) {
            this.currentColumn = 0;
        }
    };
    /**
     * Places a single-column item in the shortest available column.
     * @param layout Layout information for the item
     */
    RVMasonryLayoutManagerImpl.prototype.placeSingleColumnItem = function (layout) {
        // Find the shortest column
        var shortestColumnIndex = 0;
        var minHeight = this.columnHeights[0];
        for (var i = 1; i < this.maxColumns; i++) {
            if (this.columnHeights[i] < minHeight) {
                minHeight = this.columnHeights[i];
                shortestColumnIndex = i;
            }
        }
        // Place the item in the shortest column
        layout.x = (this.boundedSize / this.maxColumns) * shortestColumnIndex;
        layout.y = this.columnHeights[shortestColumnIndex];
        // Update the column height
        this.columnHeights[shortestColumnIndex] += layout.height;
    };
    /**
     * Places a multi-column item in the position that minimizes total column heights.
     * @param layout Layout information for the item
     * @param span Number of columns the item spans
     */
    RVMasonryLayoutManagerImpl.prototype.placeOptimizedMultiColumnItem = function (layout, span) {
        var bestStartColumn = 0;
        var minTotalHeight = Number.MAX_VALUE;
        // Try all possible positions
        for (var startCol = 0; startCol <= this.maxColumns - span; startCol++) {
            // Find the maximum height among the columns this item would span
            var maxHeight_1 = this.columnHeights[startCol];
            for (var col = startCol + 1; col < startCol + span; col++) {
                maxHeight_1 = Math.max(maxHeight_1, this.columnHeights[col]);
            }
            // Calculate the total height after placing the item
            var totalHeight = 0;
            for (var col = 0; col < this.maxColumns; col++) {
                if (col >= startCol && col < startCol + span) {
                    totalHeight += maxHeight_1 + layout.height;
                }
                else {
                    totalHeight += this.columnHeights[col];
                }
            }
            // Update best position if this is better
            if (totalHeight < minTotalHeight) {
                minTotalHeight = totalHeight;
                bestStartColumn = startCol;
            }
        }
        // Place the item at the best position
        var maxHeight = Math.max.apply(Math, tslib_1.__spreadArray([], tslib_1.__read(this.columnHeights.slice(bestStartColumn, bestStartColumn + span)), false));
        layout.x = (this.boundedSize / this.maxColumns) * bestStartColumn;
        layout.y = maxHeight;
        // Update column heights
        for (var col = bestStartColumn; col < bestStartColumn + span; col++) {
            this.columnHeights[col] = maxHeight + layout.height;
        }
    };
    /**
     * Updates column heights up to a given index by recalculating item positions.
     * @param index Index to update column heights up to
     */
    RVMasonryLayoutManagerImpl.prototype.updateColumnHeightsToIndex = function (index) {
        // Reset column heights
        this.columnHeights = Array(this.maxColumns).fill(0);
        this.currentColumn = 0;
        // Recalculate column heights up to the given index
        for (var i = 0; i < index; i++) {
            var layout = this.layouts[i];
            var itemWidth = layout.width;
            var columnWidth = this.boundedSize / this.maxColumns;
            var span = Math.round(itemWidth / columnWidth);
            // Find which columns this item spans
            var startColumn = Math.round(layout.x / columnWidth);
            var endColumn = Math.min(startColumn + span, this.maxColumns);
            // Update column heights
            for (var col = startColumn; col < endColumn; col++) {
                this.columnHeights[col] = Math.max(this.columnHeights[col], layout.y + layout.height);
            }
            // Update current column for non-optimized layout
            if (!this.optimizeItemArrangement) {
                this.currentColumn = (startColumn + span) % this.maxColumns;
            }
        }
    };
    return RVMasonryLayoutManagerImpl;
}(LayoutManager_1.RVLayoutManager));
exports.RVMasonryLayoutManagerImpl = RVMasonryLayoutManagerImpl;
//# sourceMappingURL=MasonryLayoutManager.js.map