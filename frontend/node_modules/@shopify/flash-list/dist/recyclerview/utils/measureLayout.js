"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areDimensionsNotEqual = areDimensionsNotEqual;
exports.areDimensionsEqual = areDimensionsEqual;
exports.roundOffPixel = roundOffPixel;
exports.measureParentSize = measureParentSize;
exports.measureFirstChildLayout = measureFirstChildLayout;
exports.measureItemLayout = measureItemLayout;
var react_native_1 = require("react-native");
/**
 * Measures the layout of a view relative to itselft.
 * Using measure wasn't returing accurate values but this workaround does.
 * Returns the x, y coordinates and dimensions of the view.
 *
 * @param view - The React Native View component to measure
 * @returns An object containing x, y, width, and height measurements
 */
function measureLayout(view, oldLayout) {
    // const layout = view.unstable_getBoundingClientRect();
    // layout.width = roundOffPixel(layout.width);
    // layout.height = roundOffPixel(layout.height);
    // return layout;
    return measureLayoutRelative(view, view, oldLayout);
}
/**
 * Measures the layout of a view relative to another view.
 * Useful for measuring positions relative to a specific reference view.
 *
 * @param view - The React Native View component to measure
 * @param relativeTo - The reference view to measure against
 * @returns An object containing x, y, width, and height measurements
 */
function measureLayoutRelative(view, relativeTo, oldLayout) {
    var layout = { x: 0, y: 0, width: 0, height: 0 };
    view.measureLayout(relativeTo, function (x, y, width, height) {
        layout.x = x;
        layout.y = y;
        layout.width = roundOffPixel(width);
        layout.height = roundOffPixel(height);
    });
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
/**
 * Checks if two dimension values are not equal, with a small tolerance.
 * Used to handle floating-point precision issues in layout measurements.
 *
 * @param value1 - First dimension value to compare
 * @param value2 - Second dimension value to compare
 * @returns true if the values are significantly different, false otherwise
 */
function areDimensionsNotEqual(value1, value2) {
    return !areDimensionsEqual(value1, value2);
}
/**
 * Checks if two dimension values are equal, with a small tolerance.
 * Used to handle floating-point precision issues in layout measurements.
 *
 * @param value1 - First dimension value to compare
 * @param value2 - Second dimension value to compare
 * @returns true if the values are approximately equal, false otherwise
 */
function areDimensionsEqual(value1, value2) {
    return (Math.abs(react_native_1.PixelRatio.getPixelSizeForLayoutSize(value1) -
        react_native_1.PixelRatio.getPixelSizeForLayoutSize(value2)) <= 1);
}
function roundOffPixel(value) {
    return react_native_1.PixelRatio.roundToNearestPixel(value);
}
/**
 * Specific method for easier mocking
 * Measures the layout of parent of RecyclerView
 * Returns the x, y coordinates and dimensions of the view.
 * @param view - The React Native View component to measure
 * @returns An object containing x, y, width, and height measurements
 */
function measureParentSize(view) {
    return measureLayout(view, undefined);
}
/**
 * Specific method for easier mocking
 * Measures the layout of child container of RecyclerView
 * @param childContainerView
 * @param parentView
 * @returns
 */
function measureFirstChildLayout(childContainerView, parentView) {
    return measureLayoutRelative(childContainerView, parentView, undefined);
}
/**
 * Specific method for easier mocking
 * Measures the layout of items of RecyclerView
 * @param item
 * @param oldLayout
 * @returns
 */
function measureItemLayout(item, oldLayout) {
    return measureLayout(item, oldLayout);
}
//# sourceMappingURL=measureLayout.js.map