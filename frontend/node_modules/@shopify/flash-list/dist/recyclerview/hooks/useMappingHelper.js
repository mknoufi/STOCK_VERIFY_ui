"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMappingHelper = void 0;
var react_1 = require("react");
var RecyclerViewContextProvider_1 = require("../RecyclerViewContextProvider");
/**
 * Returns a function that can help create a mapping key for the items.
 * Useful when doing .map on items to create a list of components.
 * Using this ensures that performance is optimal for FlashList
 */
var useMappingHelper = function () {
    var recyclerViewContext = (0, RecyclerViewContextProvider_1.useRecyclerViewContext)();
    var getMappingKey = (0, react_1.useCallback)(function (itemKey, index) {
        return recyclerViewContext ? index : itemKey;
    }, [recyclerViewContext]);
    return { getMappingKey: getMappingKey };
};
exports.useMappingHelper = useMappingHelper;
//# sourceMappingURL=useMappingHelper.js.map