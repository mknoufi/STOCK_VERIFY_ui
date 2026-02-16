"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutManagerType = void 0;
exports.createLayoutParams = createLayoutParams;
exports.createLayoutManager = createLayoutManager;
exports.createMockLayoutInfo = createMockLayoutInfo;
exports.populateLayouts = populateLayouts;
exports.createPopulatedLayoutManager = createPopulatedLayoutManager;
exports.getAllLayouts = getAllLayouts;
var LinearLayoutManager_1 = require("../../recyclerview/layout-managers/LinearLayoutManager");
var GridLayoutManager_1 = require("../../recyclerview/layout-managers/GridLayoutManager");
var MasonryLayoutManager_1 = require("../../recyclerview/layout-managers/MasonryLayoutManager");
/**
 * Layout manager types available in the app
 */
var LayoutManagerType;
(function (LayoutManagerType) {
    LayoutManagerType["LINEAR"] = "linear";
    LayoutManagerType["GRID"] = "grid";
    LayoutManagerType["MASONRY"] = "masonry";
})(LayoutManagerType || (exports.LayoutManagerType = LayoutManagerType = {}));
/**
 * Default window size for layout managers
 */
var DEFAULT_WINDOW_SIZE = {
    width: 400,
    height: 900,
};
/**
 * Create layout parameters with sensible defaults
 */
function createLayoutParams(params) {
    var _a, _b, _c, _d, _e;
    if (params === void 0) { params = {}; }
    return {
        windowSize: params.windowSize || DEFAULT_WINDOW_SIZE,
        horizontal: (_a = params.horizontal) !== null && _a !== void 0 ? _a : false,
        maxColumns: (_b = params.maxColumns) !== null && _b !== void 0 ? _b : 1,
        optimizeItemArrangement: (_c = params.optimizeItemArrangement) !== null && _c !== void 0 ? _c : true,
        overrideItemLayout: (_d = params.overrideItemLayout) !== null && _d !== void 0 ? _d : (function () { }),
        getItemType: (_e = params.getItemType) !== null && _e !== void 0 ? _e : (function () { return "default"; }),
    };
}
/**
 * Create a layout manager of the specified type
 */
function createLayoutManager(type, params, previousLayoutManager) {
    if (params === void 0) { params = {}; }
    var layoutParams = createLayoutParams(params);
    switch (type) {
        case LayoutManagerType.LINEAR:
            return new LinearLayoutManager_1.RVLinearLayoutManagerImpl(layoutParams, previousLayoutManager);
        case LayoutManagerType.GRID:
            return new GridLayoutManager_1.RVGridLayoutManagerImpl(layoutParams, previousLayoutManager);
        case LayoutManagerType.MASONRY:
            return new MasonryLayoutManager_1.RVMasonryLayoutManagerImpl(layoutParams, previousLayoutManager);
        default:
            throw new Error("Unknown layout manager type: ".concat(type));
    }
}
/**
 * Generate mock layout info for testing
 */
function createMockLayoutInfo(index, width, height) {
    return {
        index: index,
        dimensions: {
            width: width,
            height: height,
        },
    };
}
/**
 * Populate layout data in a layout manager
 */
function populateLayouts(layoutManager, itemCount, itemWidth, itemHeight, variableSize) {
    if (itemWidth === void 0) { itemWidth = 100; }
    if (itemHeight === void 0) { itemHeight = 100; }
    if (variableSize === void 0) { variableSize = false; }
    var layoutInfos = [];
    for (var i = 0; i < itemCount; i++) {
        // If variableSize is true, add some randomness to the item dimensions
        var width = variableSize ? itemWidth + (i % 3) * 20 : itemWidth;
        var height = variableSize ? itemHeight + (i % 5) * 25 : itemHeight;
        layoutInfos.push(createMockLayoutInfo(i, width, height));
    }
    layoutManager.modifyLayout(layoutInfos, itemCount);
}
/**
 * Create and populate a layout manager in one step
 */
function createPopulatedLayoutManager(type, itemCount, params, itemWidth, itemHeight, variableSize) {
    if (params === void 0) { params = {}; }
    if (itemWidth === void 0) { itemWidth = 100; }
    if (itemHeight === void 0) { itemHeight = 100; }
    if (variableSize === void 0) { variableSize = false; }
    var layoutManager = createLayoutManager(type, params);
    populateLayouts(layoutManager, itemCount, itemWidth, itemHeight, variableSize);
    return layoutManager;
}
/**
 * Get all layouts from a layout manager
 */
function getAllLayouts(layoutManager) {
    // Access the internal layouts array
    return Array.from({ length: layoutManager.getLayoutCount() }, function (_, index) {
        return layoutManager.getLayout(index);
    });
}
//# sourceMappingURL=createLayoutManager.js.map