"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areDimensionsNotEqual = areDimensionsNotEqual;
exports.areDimensionsEqual = areDimensionsEqual;
exports.roundOffPixel = roundOffPixel;
exports.measureParentSize = measureParentSize;
exports.measureFirstChildLayout = measureFirstChildLayout;
exports.measureItemLayout = measureItemLayout;
/**
 * Gets scroll offsets from up to 3 parent elements
 */
function getScrollOffsets(element, stopAt) {
    var _a, _b;
    var scrollX = 0;
    var scrollY = 0;
    var currentElement = element;
    // Only check up to 3 parent elements
    while (currentElement && currentElement !== stopAt) {
        var htmlElement = currentElement;
        scrollX += (_a = htmlElement.scrollLeft) !== null && _a !== void 0 ? _a : 0;
        scrollY += (_b = htmlElement.scrollTop) !== null && _b !== void 0 ? _b : 0;
        currentElement = currentElement.parentElement;
    }
    return { scrollX: scrollX, scrollY: scrollY };
}
/**
 * Checks if two dimension values are not equal, with a small tolerance.
 */
function areDimensionsNotEqual(value1, value2) {
    return !areDimensionsEqual(value1, value2);
}
/**
 * Checks if two dimension values are equal, with a small tolerance.
 */
function areDimensionsEqual(value1, value2) {
    return Math.abs(value1 - value2) <= 1;
}
function roundOffPixel(value) {
    return value;
}
/**
 * Measures the layout of parent of RecyclerView
 */
function measureParentSize(view) {
    return {
        x: 0,
        y: 0,
        width: view.clientWidth,
        height: view.clientHeight,
    };
}
/**
 * Measures the layout of child container of RecyclerView
 */
function measureFirstChildLayout(childContainerView, parentView) {
    var childRect = childContainerView.getBoundingClientRect();
    var parentRect = parentView.getBoundingClientRect();
    // Get scroll offsets for child container (max 3 parents)
    var scrollOffsets = getScrollOffsets(childContainerView, parentView);
    return {
        x: childRect.left - parentRect.left + scrollOffsets.scrollX,
        y: childRect.top - parentRect.top + scrollOffsets.scrollY,
        width: roundOffPixel(childRect.width),
        height: roundOffPixel(childRect.height),
    };
}
/**
 * Measures the layout of items of RecyclerView
 */
function measureItemLayout(item, oldLayout) {
    var layout = {
        x: 0,
        y: 0,
        width: item.clientWidth,
        height: item.clientHeight,
    };
    if (oldLayout) {
        if (areDimensionsEqual(layout.width, oldLayout.width)) {
            layout.width = oldLayout.width;
        }
        if (areDimensionsEqual(layout.height, oldLayout.height)) {
            layout.height = oldLayout.height;
        }
    }
    return layout;
}
//# sourceMappingURL=measureLayout.web.js.map