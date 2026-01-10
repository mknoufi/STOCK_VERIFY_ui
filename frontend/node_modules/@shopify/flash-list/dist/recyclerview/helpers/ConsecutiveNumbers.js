"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsecutiveNumbers = void 0;
var tslib_1 = require("tslib");
/**
 * A simple wrapper for consecutive postive integer arrays
 * Only stores start and end indices for faster computation as numbers are consecutive.
 */
var ConsecutiveNumbers = /** @class */ (function () {
    function ConsecutiveNumbers(startIndex, endIndex) {
        this.startIndex = startIndex;
        this.endIndex = endIndex;
    }
    Object.defineProperty(ConsecutiveNumbers.prototype, "length", {
        /**
         * Get the length of the array
         */
        get: function () {
            return Math.max(0, this.endIndex - this.startIndex + 1);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Get element at specified index
     */
    ConsecutiveNumbers.prototype.at = function (index) {
        return this.startIndex + index;
    };
    /**
     * Check if two consecutive numbers are equal
     */
    ConsecutiveNumbers.prototype.equals = function (other) {
        return (this.startIndex === other.startIndex && this.endIndex === other.endIndex);
    };
    /**
     * Converts the consecutive range to an actual array
     * @returns An array containing all consecutive numbers
     */
    ConsecutiveNumbers.prototype.toArray = function () {
        if (this.length === 0) {
            return [];
        }
        var array = new Array(this.length);
        for (var i = 0; i < this.length; i++) {
            array[i] = this.startIndex + i;
        }
        return array;
    };
    /**
     * Check if array includes a value
     */
    ConsecutiveNumbers.prototype.includes = function (value) {
        return value >= this.startIndex && value <= this.endIndex;
    };
    /**
     * Get index of a value in the consecutive range
     */
    ConsecutiveNumbers.prototype.indexOf = function (value) {
        return this.includes(value) ? value - this.startIndex : -1;
    };
    ConsecutiveNumbers.prototype.findValue = function (predicate) {
        for (var i = 0; i < this.length; i++) {
            var value = this.startIndex + i;
            if (predicate(value, i, this)) {
                return value;
            }
        }
        return undefined;
    };
    /**
     * Tests whether all elements in the consecutive range pass the provided test function
     * @param predicate A function that tests each element
     * @returns true if all elements pass the test; otherwise, false
     */
    ConsecutiveNumbers.prototype.every = function (predicate) {
        for (var i = 0; i < this.length; i++) {
            var value = this.startIndex + i;
            if (!predicate(value, i, this)) {
                return false;
            }
        }
        return true;
    };
    /**
     * Get a slice of the consecutive array
     */
    ConsecutiveNumbers.prototype.slice = function (start, end) {
        if (start === void 0) { start = 0; }
        if (end === void 0) { end = this.length; }
        var newStart = this.startIndex + start;
        var newEnd = this.startIndex + Math.min(end, this.length) - 1;
        return new ConsecutiveNumbers(newStart, Math.max(newStart - 1, newEnd));
    };
    /**
     * Implement iterator to enable for...of
     */
    ConsecutiveNumbers.prototype[Symbol.iterator] = function () {
        var i;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = this.startIndex;
                    _a.label = 1;
                case 1:
                    if (!(i <= this.endIndex)) return [3 /*break*/, 4];
                    return [4 /*yield*/, i];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    };
    ConsecutiveNumbers.EMPTY = new ConsecutiveNumbers(-1, -2);
    return ConsecutiveNumbers;
}());
exports.ConsecutiveNumbers = ConsecutiveNumbers;
//# sourceMappingURL=ConsecutiveNumbers.js.map