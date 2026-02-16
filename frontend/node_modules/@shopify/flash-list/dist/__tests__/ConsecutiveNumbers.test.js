"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
/* eslint-disable id-length */
var ConsecutiveNumbers_1 = require("../recyclerview/helpers/ConsecutiveNumbers");
describe("ConsecutiveNumbers", function () {
    describe("constructor", function () {
        it("should initialize with start and end indices", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(numbers.startIndex).toBe(5);
            expect(numbers.endIndex).toBe(10);
        });
    });
    describe("EMPTY", function () {
        it("should have correct values for EMPTY constant", function () {
            expect(ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY.startIndex).toBe(-1);
            expect(ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY.endIndex).toBe(-2);
            expect(ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY.length).toBe(0);
        });
    });
    describe("length", function () {
        it("should return correct length for valid range", function () {
            expect(new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10).length).toBe(6);
            expect(new ConsecutiveNumbers_1.ConsecutiveNumbers(0, 0).length).toBe(1);
        });
        it("should return 0 for invalid range", function () {
            expect(new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 4).length).toBe(0);
            expect(new ConsecutiveNumbers_1.ConsecutiveNumbers(10, 5).length).toBe(0);
        });
    });
    describe("at", function () {
        it("should return correct value at index", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(numbers.at(0)).toBe(5);
            expect(numbers.at(3)).toBe(8);
            expect(numbers.at(5)).toBe(10);
        });
        it("should work with negative ranges", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(-3, 2);
            expect(numbers.at(0)).toBe(-3);
            expect(numbers.at(3)).toBe(0);
            expect(numbers.at(5)).toBe(2);
        });
    });
    describe("equals", function () {
        it("should return true for identical ranges", function () {
            var a = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            var b = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(a.equals(b)).toBe(true);
        });
        it("should return false for different ranges", function () {
            var a = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            var b = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 11);
            var c = new ConsecutiveNumbers_1.ConsecutiveNumbers(6, 10);
            expect(a.equals(b)).toBe(false);
            expect(a.equals(c)).toBe(false);
        });
        it("should handle empty ranges", function () {
            expect(ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY.equals(ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY)).toBe(true);
            expect(ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY.equals(new ConsecutiveNumbers_1.ConsecutiveNumbers(1, 5))).toBe(false);
        });
    });
    describe("toArray", function () {
        it("should return correct array for valid range", function () {
            expect(new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 8).toArray()).toEqual([5, 6, 7, 8]);
            expect(new ConsecutiveNumbers_1.ConsecutiveNumbers(0, 3).toArray()).toEqual([0, 1, 2, 3]);
            expect(new ConsecutiveNumbers_1.ConsecutiveNumbers(-2, 1).toArray()).toEqual([-2, -1, 0, 1]);
        });
        it("should return empty array for invalid ranges", function () {
            expect(new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 4).toArray()).toEqual([]);
            expect(ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY.toArray()).toEqual([]);
        });
    });
    describe("includes", function () {
        it("should return true for values in range", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(numbers.includes(5)).toBe(true);
            expect(numbers.includes(7)).toBe(true);
            expect(numbers.includes(10)).toBe(true);
        });
        it("should return false for values outside range", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(numbers.includes(4)).toBe(false);
            expect(numbers.includes(11)).toBe(false);
        });
        it("should handle empty ranges", function () {
            expect(ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY.includes(0)).toBe(false);
        });
    });
    describe("indexOf", function () {
        it("should return correct index for values in range", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(numbers.indexOf(5)).toBe(0);
            expect(numbers.indexOf(7)).toBe(2);
            expect(numbers.indexOf(10)).toBe(5);
        });
        it("should return -1 for values outside range", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(numbers.indexOf(4)).toBe(-1);
            expect(numbers.indexOf(11)).toBe(-1);
        });
    });
    describe("findValue", function () {
        it("should find values matching predicate", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(numbers.findValue(function (v) { return v % 2 === 0; })).toBe(6);
            expect(numbers.findValue(function (v) { return v > 8; })).toBe(9);
        });
        it("should return undefined when no match found", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(numbers.findValue(function (v) { return v > 100; })).toBe(undefined);
        });
        it("should provide index and array to predicate", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 7);
            var mockFn = jest.fn().mockReturnValue(false);
            numbers.findValue(mockFn);
            expect(mockFn).toHaveBeenCalledTimes(3);
            expect(mockFn).toHaveBeenNthCalledWith(1, 5, 0, numbers);
            expect(mockFn).toHaveBeenNthCalledWith(2, 6, 1, numbers);
            expect(mockFn).toHaveBeenNthCalledWith(3, 7, 2, numbers);
        });
    });
    describe("every", function () {
        it("should return true when all values match predicate", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(numbers.every(function (v) { return v >= 5; })).toBe(true);
            expect(numbers.every(function (v) { return v <= 10; })).toBe(true);
        });
        it("should return false when some values do not match predicate", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            expect(numbers.every(function (v) { return v % 2 === 0; })).toBe(false);
            expect(numbers.every(function (v) { return v > 7; })).toBe(false);
        });
        it("should provide index and array to predicate", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 7);
            var mockFn = jest.fn().mockReturnValue(true);
            numbers.every(mockFn);
            expect(mockFn).toHaveBeenCalledTimes(3);
            expect(mockFn).toHaveBeenNthCalledWith(1, 5, 0, numbers);
            expect(mockFn).toHaveBeenNthCalledWith(2, 6, 1, numbers);
            expect(mockFn).toHaveBeenNthCalledWith(3, 7, 2, numbers);
        });
        it("should short-circuit when predicate returns false", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            var mockFn = jest.fn().mockImplementation(function (v) { return v < 7; });
            numbers.every(mockFn);
            expect(mockFn).toHaveBeenCalledTimes(3); // Should stop after v=7
        });
    });
    describe("slice", function () {
        it("should slice with both start and end", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            var sliced = numbers.slice(1, 4);
            expect(sliced.startIndex).toBe(6);
            expect(sliced.endIndex).toBe(8);
            expect(sliced.length).toBe(3);
        });
        it("should slice with only start", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            var sliced = numbers.slice(2);
            expect(sliced.startIndex).toBe(7);
            expect(sliced.endIndex).toBe(10);
            expect(sliced.length).toBe(4);
        });
        it("should handle out of bounds slices", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            var sliced = numbers.slice(0, 100);
            expect(sliced.length).toBe(6);
            expect(sliced.startIndex).toBe(5);
            expect(sliced.endIndex).toBe(10);
        });
        it("should handle invalid slices", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 10);
            var sliced = numbers.slice(4, 3);
            expect(sliced.length).toBe(0);
            expect(sliced.startIndex).toBe(9);
            expect(sliced.endIndex).toBe(8);
        });
    });
    describe("iterator", function () {
        it("should iterate over all values", function () {
            var e_1, _a;
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 8);
            var result = [];
            try {
                for (var numbers_1 = tslib_1.__values(numbers), numbers_1_1 = numbers_1.next(); !numbers_1_1.done; numbers_1_1 = numbers_1.next()) {
                    var num = numbers_1_1.value;
                    result.push(num);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (numbers_1_1 && !numbers_1_1.done && (_a = numbers_1.return)) _a.call(numbers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            expect(result).toEqual([5, 6, 7, 8]);
        });
        it("should handle empty ranges", function () {
            var e_2, _a;
            var result = [];
            try {
                for (var _b = tslib_1.__values(ConsecutiveNumbers_1.ConsecutiveNumbers.EMPTY), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var num = _c.value;
                    result.push(num);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            expect(result).toEqual([]);
        });
        it("should work with spread operator", function () {
            var numbers = new ConsecutiveNumbers_1.ConsecutiveNumbers(5, 8);
            expect(tslib_1.__spreadArray([], tslib_1.__read(numbers), false)).toEqual([5, 6, 7, 8]);
        });
    });
});
//# sourceMappingURL=ConsecutiveNumbers.test.js.map