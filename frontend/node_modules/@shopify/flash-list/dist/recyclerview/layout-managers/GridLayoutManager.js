"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RVGridLayoutManagerImpl = void 0;
var tslib_1 = require("tslib");
var LayoutManager_1 = require("./LayoutManager");
/**
 * GridLayoutManager implementation that arranges items in a grid pattern.
 * Items are placed in rows and columns, with support for items spanning multiple columns.
 */
var RVGridLayoutManagerImpl = /** @class */ (function (_super) {
    tslib_1.__extends(RVGridLayoutManagerImpl, _super);
    function RVGridLayoutManagerImpl(params, previousLayoutManager) {
        var _this = _super.call(this, params, previousLayoutManager) || this;
        /** If there's a span change for grid layout, we need to recompute all the widths */
        _this.fullRelayoutRequired = false;
        _this.boundedSize = params.windowSize.width;
        return _this;
    }
    /**
     * Updates layout parameters and triggers recomputation if necessary.
     * @param params New layout parameters
     */
    RVGridLayoutManagerImpl.prototype.updateLayoutParams = function (params) {
        var prevNumColumns = this.maxColumns;
        _super.prototype.updateLayoutParams.call(this, params);
        if (this.boundedSize !== params.windowSize.width ||
            prevNumColumns !== params.maxColumns) {
            this.boundedSize = params.windowSize.width;
            if (this.layouts.length > 0) {
                // update all widths
                this.updateAllWidths();
                this.recomputeLayouts(0, this.layouts.length - 1);
                this.requiresRepaint = true;
            }
        }
    };
    /**
     * Processes layout information for items, updating their dimensions.
     * @param layoutInfo Array of layout information for items
     * @param itemCount Total number of items in the list
     */
    RVGridLayoutManagerImpl.prototype.processLayoutInfo = function (layoutInfo, itemCount) {
        var e_1, _a;
        try {
            for (var layoutInfo_1 = tslib_1.__values(layoutInfo), layoutInfo_1_1 = layoutInfo_1.next(); !layoutInfo_1_1.done; layoutInfo_1_1 = layoutInfo_1.next()) {
                var info = layoutInfo_1_1.value;
                var index = info.index, dimensions = info.dimensions;
                var layout = this.layouts[index];
                layout.height = dimensions.height;
                layout.isHeightMeasured = true;
                layout.isWidthMeasured = true;
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
     * @param index Index of the item to estimate layout for
     */
    RVGridLayoutManagerImpl.prototype.estimateLayout = function (index) {
        var layout = this.layouts[index];
        layout.width = this.getWidth(index);
        layout.height = this.getEstimatedHeight(index);
        layout.isWidthMeasured = true;
        layout.enforcedWidth = true;
    };
    /**
     * Handles span change for an item.
     * @param index Index of the item
     */
    RVGridLayoutManagerImpl.prototype.handleSpanChange = function (index) {
        this.fullRelayoutRequired = true;
    };
    /**
     * Returns the total size of the layout area.
     * @returns RVDimension containing width and height of the layout
     */
    RVGridLayoutManagerImpl.prototype.getLayoutSize = function () {
        if (this.layouts.length === 0)
            return { width: 0, height: 0 };
        var totalHeight = this.computeTotalHeightTillRow(this.layouts.length - 1);
        return {
            width: this.boundedSize,
            height: totalHeight,
        };
    };
    /**
     * Recomputes layouts for items in the given range.
     * @param startIndex Starting index of items to recompute
     * @param endIndex Ending index of items to recompute
     */
    RVGridLayoutManagerImpl.prototype.recomputeLayouts = function (startIndex, endIndex) {
        var newStartIndex = this.locateFirstIndexInRow(Math.max(0, startIndex - 1));
        var startVal = this.getLayout(newStartIndex);
        var startX = startVal.x;
        var startY = startVal.y;
        for (var i = newStartIndex; i <= endIndex; i++) {
            var layout = this.getLayout(i);
            if (!this.checkBounds(startX, layout.width)) {
                var tallestItem = this.processAndReturnTallestItemInRow(i - 1);
                startY = tallestItem.y + tallestItem.height;
                startX = 0;
            }
            layout.x = startX;
            layout.y = startY;
            startX += layout.width;
        }
        if (endIndex === this.layouts.length - 1) {
            this.processAndReturnTallestItemInRow(endIndex);
        }
    };
    /**
     * Calculates the width of an item based on its span.
     * @param index Index of the item
     * @returns Width of the item
     */
    RVGridLayoutManagerImpl.prototype.getWidth = function (index) {
        return (this.boundedSize / this.maxColumns) * this.getSpan(index);
    };
    /**
     * Processes items in a row and returns the tallest item.
     * Also handles height normalization for items in the same row.
     * Tallest item per row helps in forcing tallest items height on neighbouring items.
     * @param endIndex Index of the last item in the row
     * @returns The tallest item in the row
     */
    RVGridLayoutManagerImpl.prototype.processAndReturnTallestItemInRow = function (endIndex) {
        var _a, _b;
        var startIndex = this.locateFirstIndexInRow(endIndex);
        var tallestItem;
        var maxHeight = 0;
        var i = startIndex;
        var isMeasured = false;
        while (i <= endIndex) {
            var layout = this.layouts[i];
            isMeasured = isMeasured || Boolean(layout.isHeightMeasured);
            maxHeight = Math.max(maxHeight, layout.height);
            if (layout.height > ((_a = layout.minHeight) !== null && _a !== void 0 ? _a : 0) &&
                layout.height > ((_b = tallestItem === null || tallestItem === void 0 ? void 0 : tallestItem.height) !== null && _b !== void 0 ? _b : 0)) {
                tallestItem = layout;
            }
            i++;
            if (i >= this.layouts.length) {
                break;
            }
        }
        if (!tallestItem && maxHeight > 0) {
            maxHeight = Number.MAX_SAFE_INTEGER;
        }
        tallestItem = tallestItem !== null && tallestItem !== void 0 ? tallestItem : this.layouts[startIndex];
        if (!isMeasured) {
            return tallestItem;
        }
        if (tallestItem) {
            var targetHeight = tallestItem.height;
            if (maxHeight - tallestItem.height > 1) {
                targetHeight = 0;
                this.requiresRepaint = true;
            }
            i = startIndex;
            while (i <= endIndex) {
                this.layouts[i].minHeight = targetHeight;
                if (targetHeight > 0) {
                    this.layouts[i].height = targetHeight;
                }
                i++;
                if (i >= this.layouts.length) {
                    break;
                }
            }
            tallestItem.minHeight = 0;
        }
        return tallestItem;
    };
    /**
     * Computes the total height of the layout.
     * @param endIndex Index of the last item in the row
     * @returns Total height of the layout
     */
    RVGridLayoutManagerImpl.prototype.computeTotalHeightTillRow = function (endIndex) {
        var startIndex = this.locateFirstIndexInRow(endIndex);
        var y = this.layouts[startIndex].y;
        var maxHeight = 0;
        var i = startIndex;
        while (i <= endIndex) {
            maxHeight = Math.max(maxHeight, this.layouts[i].height);
            i++;
            if (i >= this.layouts.length) {
                break;
            }
        }
        return y + maxHeight;
    };
    RVGridLayoutManagerImpl.prototype.updateAllWidths = function () {
        for (var i = 0; i < this.layouts.length; i++) {
            this.layouts[i].width = this.getWidth(i);
        }
    };
    /**
     * Checks if an item can fit within the bounded width.
     * @param itemX Starting X position of the item
     * @param width Width of the item
     * @returns True if the item fits within bounds
     */
    RVGridLayoutManagerImpl.prototype.checkBounds = function (itemX, width) {
        return itemX + width <= this.boundedSize + 0.9;
    };
    /**
     * Locates the index of the first item in the current row.
     * @param itemIndex Index to start searching from
     * @returns Index of the first item in the row
     */
    RVGridLayoutManagerImpl.prototype.locateFirstIndexInRow = function (itemIndex) {
        if (itemIndex === 0) {
            return 0;
        }
        var i = itemIndex;
        for (; i >= 0; i--) {
            if (this.layouts[i].x === 0) {
                break;
            }
        }
        return Math.max(i, 0);
    };
    return RVGridLayoutManagerImpl;
}(LayoutManager_1.RVLayoutManager));
exports.RVGridLayoutManagerImpl = RVGridLayoutManagerImpl;
//# sourceMappingURL=GridLayoutManager.js.map