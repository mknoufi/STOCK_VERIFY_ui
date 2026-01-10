"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiTypeAverageWindow = exports.AverageWindow = void 0;
/**
 * Helper class to calculate running average of the most recent n values
 */
var AverageWindow = /** @class */ (function () {
    function AverageWindow(size, startValue) {
        this.nextIndex = 0;
        this.inputValues = new Array(Math.max(1, size));
        this.currentAverage = startValue !== null && startValue !== void 0 ? startValue : 0;
        this.currentCount = startValue === undefined ? 0 : 1;
        this.nextIndex = this.currentCount;
        this.inputValues[0] = startValue;
    }
    Object.defineProperty(AverageWindow.prototype, "currentValue", {
        /**
         * Can be used to get the current average value
         */
        get: function () {
            return this.currentAverage;
        },
        enumerable: false,
        configurable: true
    });
    /**
     *
     * @param value Add new value to the average window and updated current average
     */
    AverageWindow.prototype.addValue = function (value) {
        var target = this.getNextIndex();
        var oldValue = this.inputValues[target];
        var newCount = oldValue === undefined ? this.currentCount + 1 : this.currentCount;
        this.inputValues[target] = value;
        this.currentAverage =
            this.currentAverage * (this.currentCount / newCount) +
                (value - (oldValue !== null && oldValue !== void 0 ? oldValue : 0)) / newCount;
        this.currentCount = newCount;
    };
    AverageWindow.prototype.getNextIndex = function () {
        // starts from 0 once we reach end of the array
        var newTarget = this.nextIndex;
        this.nextIndex = (this.nextIndex + 1) % this.inputValues.length;
        return newTarget;
    };
    return AverageWindow;
}());
exports.AverageWindow = AverageWindow;
var MultiTypeAverageWindow = /** @class */ (function () {
    /**
     * @param windowSize Size of the average window
     * @param defaultValue Default value to return if no value is available
     */
    function MultiTypeAverageWindow(windowSize, defaultValue) {
        this.averageWindows = new Map();
        this.windowSize = windowSize;
        this.defaultValue = defaultValue;
    }
    MultiTypeAverageWindow.prototype.addValue = function (value, type) {
        var averageWindow = this.averageWindows.get(type);
        if (!averageWindow) {
            averageWindow = new AverageWindow(this.windowSize);
            this.averageWindows.set(type, averageWindow);
        }
        averageWindow.addValue(value);
    };
    MultiTypeAverageWindow.prototype.getCurrentValue = function (type) {
        var _a, _b;
        var averageWindow = this.averageWindows.get(type);
        return (_b = (_a = averageWindow === null || averageWindow === void 0 ? void 0 : averageWindow.currentValue) !== null && _a !== void 0 ? _a : this.defaultValue) !== null && _b !== void 0 ? _b : 0;
    };
    MultiTypeAverageWindow.prototype.reset = function () {
        this.averageWindows.clear();
    };
    return MultiTypeAverageWindow;
}());
exports.MultiTypeAverageWindow = MultiTypeAverageWindow;
//# sourceMappingURL=AverageWindow.js.map