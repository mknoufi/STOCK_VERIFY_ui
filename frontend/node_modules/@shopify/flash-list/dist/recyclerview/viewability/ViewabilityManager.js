"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var ViewabilityHelper_1 = tslib_1.__importDefault(require("./ViewabilityHelper"));
/**
 * Manager for viewability tracking. It holds multiple viewability callback pairs and keeps them updated.
 */
var ViewabilityManager = /** @class */ (function () {
    function ViewabilityManager(rvManager) {
        var _this = this;
        var _a;
        this.viewabilityHelpers = [];
        this.hasInteracted = false;
        this.dispose = function () {
            _this.viewabilityHelpers.forEach(function (viewabilityHelper) {
                return viewabilityHelper.dispose();
            });
        };
        this.onVisibleIndicesChanged = function (all) {
            _this.updateViewableItems(all);
        };
        this.recordInteraction = function () {
            if (_this.hasInteracted) {
                return;
            }
            _this.hasInteracted = true;
            _this.viewabilityHelpers.forEach(function (viewabilityHelper) {
                viewabilityHelper.hasInteracted = true;
            });
            _this.updateViewableItems();
        };
        this.updateViewableItems = function (newViewableIndices) {
            var _a;
            var listSize = _this.rvManager.getWindowSize();
            if (listSize === undefined || !_this.shouldListenToVisibleIndices) {
                return;
            }
            var scrollOffset = ((_a = _this.rvManager.getAbsoluteLastScrollOffset()) !== null && _a !== void 0 ? _a : 0) -
                _this.rvManager.firstItemOffset;
            _this.viewabilityHelpers.forEach(function (viewabilityHelper) {
                var _a;
                viewabilityHelper.updateViewableItems((_a = _this.rvManager.props.horizontal) !== null && _a !== void 0 ? _a : false, scrollOffset, listSize, function (index) { return _this.rvManager.getLayout(index); }, newViewableIndices);
            });
        };
        this.recomputeViewableItems = function () {
            _this.viewabilityHelpers.forEach(function (viewabilityHelper) {
                return viewabilityHelper.clearLastReportedViewableIndices();
            });
            _this.updateViewableItems();
        };
        /**
         * Creates a new `ViewabilityHelper` instance with `onViewableItemsChanged` callback and `ViewabilityConfig`
         * @returns `ViewabilityHelper` instance
         */
        this.createViewabilityHelper = function (viewabilityConfig, onViewableItemsChanged) {
            var mapViewToken = function (index, isViewable) {
                var item = _this.rvManager.props.data[index];
                var key = item === undefined || _this.rvManager.props.keyExtractor === undefined
                    ? index.toString()
                    : _this.rvManager.props.keyExtractor(item, index);
                return {
                    index: index,
                    isViewable: isViewable,
                    item: item,
                    key: key,
                    timestamp: Date.now(),
                };
            };
            return new ViewabilityHelper_1.default(viewabilityConfig, function (indices, newlyVisibleIndices, newlyNonvisibleIndices) {
                onViewableItemsChanged === null || onViewableItemsChanged === void 0 ? void 0 : onViewableItemsChanged({
                    viewableItems: indices.map(function (index) { return mapViewToken(index, true); }),
                    changed: tslib_1.__spreadArray(tslib_1.__spreadArray([], tslib_1.__read(newlyVisibleIndices.map(function (index) { return mapViewToken(index, true); })), false), tslib_1.__read(newlyNonvisibleIndices.map(function (index) {
                        return mapViewToken(index, false);
                    })), false),
                });
            });
        };
        this.rvManager = rvManager;
        if (rvManager.props.onViewableItemsChanged !== null &&
            rvManager.props.onViewableItemsChanged !== undefined) {
            this.viewabilityHelpers.push(this.createViewabilityHelper(rvManager.props.viewabilityConfig, function (info) {
                var _a, _b;
                (_b = (_a = rvManager.props).onViewableItemsChanged) === null || _b === void 0 ? void 0 : _b.call(_a, info);
            }));
        }
        ((_a = rvManager.props.viewabilityConfigCallbackPairs) !== null && _a !== void 0 ? _a : []).forEach(function (pair, index) {
            _this.viewabilityHelpers.push(_this.createViewabilityHelper(pair.viewabilityConfig, function (info) {
                var _a, _b;
                var callback = (_b = (_a = rvManager.props.viewabilityConfigCallbackPairs) === null || _a === void 0 ? void 0 : _a[index]) === null || _b === void 0 ? void 0 : _b.onViewableItemsChanged;
                callback === null || callback === void 0 ? void 0 : callback(info);
            }));
        });
    }
    Object.defineProperty(ViewabilityManager.prototype, "shouldListenToVisibleIndices", {
        /**
         * @returns true if the viewability manager has any viewability callback pairs registered.
         */
        get: function () {
            return this.viewabilityHelpers.length > 0;
        },
        enumerable: false,
        configurable: true
    });
    return ViewabilityManager;
}());
exports.default = ViewabilityManager;
//# sourceMappingURL=ViewabilityManager.js.map