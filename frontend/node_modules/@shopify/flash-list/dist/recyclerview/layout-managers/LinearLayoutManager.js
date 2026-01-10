"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RVLinearLayoutManagerImpl = void 0;
var tslib_1 = require("tslib");
var LayoutManager_1 = require("./LayoutManager");
/**
 * LinearLayoutManager implementation that arranges items in a single row or column.
 * Supports both horizontal and vertical layouts with dynamic item sizing.
 */
var RVLinearLayoutManagerImpl = /** @class */ (function (_super) {
    tslib_1.__extends(RVLinearLayoutManagerImpl, _super);
    function RVLinearLayoutManagerImpl(params, previousLayoutManager) {
        var _this = _super.call(this, params, previousLayoutManager) || this;
        /** Whether the bounded size has been set */
        _this.hasSize = false;
        /** Height of the tallest item */
        _this.tallestItemHeight = 0;
        _this.boundedSize = _this.horizontal
            ? params.windowSize.height
            : params.windowSize.width;
        _this.hasSize = _this.boundedSize > 0;
        return _this;
    }
    /**
     * Updates layout parameters and triggers recomputation if necessary.
     * @param params New layout parameters
     */
    RVLinearLayoutManagerImpl.prototype.updateLayoutParams = function (params) {
        var prevHorizontal = this.horizontal;
        _super.prototype.updateLayoutParams.call(this, params);
        var oldBoundedSize = this.boundedSize;
        this.boundedSize = this.horizontal
            ? params.windowSize.height
            : params.windowSize.width;
        if (oldBoundedSize !== this.boundedSize ||
            prevHorizontal !== this.horizontal) {
            if (this.layouts.length > 0) {
                // console.log("-----> recomputeLayouts", this.horizontal);
                this.recomputeLayouts(0, this.layouts.length - 1);
                this.requiresRepaint = true;
            }
        }
    };
    /**
     * Processes layout information for items, updating their dimensions.
     * For horizontal layouts, also normalizes heights of items.
     * @param layoutInfo Array of layout information for items
     * @param itemCount Total number of items in the list
     */
    RVLinearLayoutManagerImpl.prototype.processLayoutInfo = function (layoutInfo, itemCount) {
        var e_1, _a;
        try {
            // Update layout information
            for (var layoutInfo_1 = tslib_1.__values(layoutInfo), layoutInfo_1_1 = layoutInfo_1.next(); !layoutInfo_1_1.done; layoutInfo_1_1 = layoutInfo_1.next()) {
                var info = layoutInfo_1_1.value;
                var index = info.index, dimensions = info.dimensions;
                var layout = this.layouts[index];
                layout.width = this.horizontal ? dimensions.width : this.boundedSize;
                layout.isHeightMeasured = true;
                layout.isWidthMeasured = true;
                layout.height = dimensions.height;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (layoutInfo_1_1 && !layoutInfo_1_1.done && (_a = layoutInfo_1.return)) _a.call(layoutInfo_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (this.horizontal && !this.hasSize) {
            this.normalizeLayoutHeights(layoutInfo);
        }
    };
    /**
     * Estimates layout dimensions for an item at the given index.
     * @param index Index of the item to estimate layout for
     */
    RVLinearLayoutManagerImpl.prototype.estimateLayout = function (index) {
        var layout = this.layouts[index];
        layout.width = this.horizontal
            ? this.getEstimatedWidth(index)
            : this.boundedSize;
        layout.height = this.getEstimatedHeight(index);
        layout.isWidthMeasured = !this.horizontal;
        layout.enforcedWidth = !this.horizontal;
    };
    /**
     * Returns the total size of the layout area.
     * @returns RVDimension containing width and height of the layout
     */
    RVLinearLayoutManagerImpl.prototype.getLayoutSize = function () {
        var _a, _b;
        if (this.layouts.length === 0)
            return { width: 0, height: 0 };
        var lastLayout = this.layouts[this.layouts.length - 1];
        return {
            width: this.horizontal
                ? lastLayout.x + lastLayout.width
                : this.boundedSize,
            height: this.horizontal
                ? (_b = (_a = this.tallestItem) === null || _a === void 0 ? void 0 : _a.height) !== null && _b !== void 0 ? _b : this.boundedSize
                : lastLayout.y + lastLayout.height,
        };
    };
    /**
     * Normalizes heights of items in horizontal layout to match the tallest item.
     * @param layoutInfo Array of layout information for items
     */
    RVLinearLayoutManagerImpl.prototype.normalizeLayoutHeights = function (layoutInfo) {
        var e_2, _a, e_3, _b;
        var _c, _d;
        var newTallestItem;
        try {
            for (var layoutInfo_2 = tslib_1.__values(layoutInfo), layoutInfo_2_1 = layoutInfo_2.next(); !layoutInfo_2_1.done; layoutInfo_2_1 = layoutInfo_2.next()) {
                var info = layoutInfo_2_1.value;
                var index = info.index;
                var layout = this.layouts[index];
                if (layout.height > ((_c = layout.minHeight) !== null && _c !== void 0 ? _c : 0) &&
                    layout.height > ((_d = newTallestItem === null || newTallestItem === void 0 ? void 0 : newTallestItem.height) !== null && _d !== void 0 ? _d : 0)) {
                    newTallestItem = layout;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (layoutInfo_2_1 && !layoutInfo_2_1.done && (_a = layoutInfo_2.return)) _a.call(layoutInfo_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
        if (newTallestItem && newTallestItem.height !== this.tallestItemHeight) {
            var targetMinHeight = newTallestItem.height;
            if (newTallestItem.height < this.tallestItemHeight) {
                this.requiresRepaint = true;
                targetMinHeight = 0;
            }
            try {
                // set minHeight for all layouts
                for (var _e = tslib_1.__values(this.layouts), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var layout = _f.value;
                    if (targetMinHeight > 0) {
                        layout.height = newTallestItem.height;
                    }
                    layout.minHeight = targetMinHeight;
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
                }
                finally { if (e_3) throw e_3.error; }
            }
            newTallestItem.minHeight = 0;
            this.tallestItem = newTallestItem;
            this.tallestItemHeight = newTallestItem.height;
        }
    };
    /**
     * Recomputes layouts for items in the given range.
     * Positions items sequentially based on layout direction.
     * @param startIndex Starting index of items to recompute
     * @param endIndex Ending index of items to recompute
     */
    RVLinearLayoutManagerImpl.prototype.recomputeLayouts = function (startIndex, endIndex) {
        for (var i = startIndex; i <= endIndex; i++) {
            var layout = this.getLayout(i);
            // Set positions based on whether this is the first item or not
            if (i === 0) {
                layout.x = 0;
                layout.y = 0;
            }
            else {
                var prevLayout = this.getLayout(i - 1);
                layout.x = this.horizontal ? prevLayout.x + prevLayout.width : 0;
                layout.y = this.horizontal ? 0 : prevLayout.y + prevLayout.height;
            }
            // Set width for vertical layouts
            if (!this.horizontal) {
                layout.width = this.boundedSize;
            }
            else if (this.hasSize) {
                layout.minHeight = this.boundedSize;
            }
        }
    };
    return RVLinearLayoutManagerImpl;
}(LayoutManager_1.RVLayoutManager));
exports.RVLinearLayoutManagerImpl = RVLinearLayoutManagerImpl;
//# sourceMappingURL=LinearLayoutManager.js.map