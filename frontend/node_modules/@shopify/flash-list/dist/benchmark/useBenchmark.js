"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBenchmark = useBenchmark;
exports.getFormattedString = getFormattedString;
var tslib_1 = require("tslib");
var react_1 = require("react");
var ErrorMessages_1 = require("../errors/ErrorMessages");
var AutoScrollHelper_1 = require("./AutoScrollHelper");
var JSFPSMonitor_1 = require("./JSFPSMonitor");
/**
 * Runs the benchmark on FlashList.
 * Response object has a formatted string that can be printed to the console or shown as an alert.
 * Result is posted to the callback method passed to the hook.
 */
function useBenchmark(flashListRef, callback, params) {
    var _this = this;
    if (params === void 0) { params = {}; }
    (0, react_1.useEffect)(function () {
        var _a;
        var cancellable = new AutoScrollHelper_1.Cancellable();
        var suggestions = [];
        if (flashListRef.current) {
            if (!(Number((_a = flashListRef.current.props.data) === null || _a === void 0 ? void 0 : _a.length) > 0)) {
                throw new Error(ErrorMessages_1.ErrorMessages.dataEmptyCannotRunBenchmark);
            }
        }
        var cancelTimeout = setTimeout(function () { return tslib_1.__awaiter(_this, void 0, void 0, function () {
            var jsFPSMonitor, i, jsProfilerResponse, result;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        jsFPSMonitor = new JSFPSMonitor_1.JSFPSMonitor();
                        jsFPSMonitor.startTracking();
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < (params.repeatCount || 1))) return [3 /*break*/, 4];
                        return [4 /*yield*/, runScrollBenchmark(flashListRef, cancellable, params.speedMultiplier || 1)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4:
                        jsProfilerResponse = jsFPSMonitor.stopAndGetData();
                        if (jsProfilerResponse.averageFPS < 35) {
                            suggestions.push("Your average JS FPS is low. This can indicate that your components are doing too much work. Try to optimize your components and reduce re-renders if any");
                        }
                        computeSuggestions(flashListRef, suggestions);
                        result = generateResult(jsProfilerResponse, suggestions, cancellable);
                        if (!cancellable.isCancelled()) {
                            result.formattedString = getFormattedString(result);
                        }
                        callback(result);
                        return [2 /*return*/];
                }
            });
        }); }, params.startDelayInMs || 3000);
        return function () {
            clearTimeout(cancelTimeout);
            cancellable.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
function getFormattedString(res) {
    var _a, _b, _c;
    return ("Results:\n\n" +
        "JS FPS: Avg: ".concat((_a = res.js) === null || _a === void 0 ? void 0 : _a.averageFPS, " | Min: ").concat((_b = res.js) === null || _b === void 0 ? void 0 : _b.minFPS, " | Max: ").concat((_c = res.js) === null || _c === void 0 ? void 0 : _c.maxFPS, "\n\n") +
        "".concat(res.suggestions.length > 0
            ? "Suggestions:\n\n".concat(res.suggestions
                .map(function (value, index) { return "".concat(index + 1, ". ").concat(value); })
                .join("\n"))
            : ""));
}
function generateResult(jsProfilerResponse, suggestions, cancellable) {
    return {
        js: jsProfilerResponse,
        suggestions: suggestions,
        interrupted: cancellable.isCancelled(),
    };
}
/**
 * Scrolls to the end of the list and then back to the top
 */
function runScrollBenchmark(flashListRef, cancellable, scrollSpeedMultiplier) {
    return tslib_1.__awaiter(this, void 0, void 0, function () {
        var horizontal_1, rv, rvSize, rvContentSize, fromX, fromY, toX, toY, scrollNow;
        return tslib_1.__generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!flashListRef.current) return [3 /*break*/, 3];
                    horizontal_1 = flashListRef.current.props.horizontal;
                    rv = flashListRef.current;
                    if (!rv) return [3 /*break*/, 3];
                    rvSize = rv.getWindowSize();
                    rvContentSize = rv.getChildContainerDimensions();
                    fromX = 0;
                    fromY = 0;
                    toX = rvContentSize.width - rvSize.width;
                    toY = rvContentSize.height - rvSize.height;
                    scrollNow = function (x, y) {
                        var _a;
                        (_a = flashListRef.current) === null || _a === void 0 ? void 0 : _a.scrollToOffset({
                            offset: horizontal_1 ? x : y,
                            animated: false,
                        });
                    };
                    return [4 /*yield*/, (0, AutoScrollHelper_1.autoScroll)(scrollNow, fromX, fromY, toX, toY, scrollSpeedMultiplier, cancellable)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, AutoScrollHelper_1.autoScroll)(scrollNow, toX, toY, fromX, fromY, scrollSpeedMultiplier, cancellable)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function computeSuggestions(flashListRef, suggestions) {
    if (flashListRef.current) {
        if (flashListRef.current.props.data.length < 200) {
            suggestions.push("Data count is low. Try to increase it to a large number (e.g 200) using the 'useDataMultiplier' hook.");
        }
    }
}
//# sourceMappingURL=useBenchmark.js.map