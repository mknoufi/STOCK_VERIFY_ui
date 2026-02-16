"use strict";
/**
 * StickyHeaders component manages the sticky header behavior in a FlashList.
 * It handles the animation and positioning of headers that should remain fixed
 * at the top of the list while scrolling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StickyHeaders = void 0;
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var ViewHolder_1 = require("../ViewHolder");
var CompatView_1 = require("./CompatView");
var StickyHeaders = function (_a) {
    var stickyHeaderIndices = _a.stickyHeaderIndices, renderItem = _a.renderItem, stickyHeaderRef = _a.stickyHeaderRef, recyclerViewManager = _a.recyclerViewManager, scrollY = _a.scrollY, data = _a.data, extraData = _a.extraData;
    var _b = tslib_1.__read((0, react_1.useState)({
        currentStickyIndex: -1,
        pushStartsAt: Number.MAX_SAFE_INTEGER,
    }), 2), stickyHeaderState = _b[0], setStickyHeaderState = _b[1];
    var currentStickyIndex = stickyHeaderState.currentStickyIndex, pushStartsAt = stickyHeaderState.pushStartsAt;
    // sort indices and memoize compute
    var sortedIndices = (0, react_1.useMemo)(function () {
        return tslib_1.__spreadArray([], tslib_1.__read(stickyHeaderIndices), false).sort(function (first, second) { return first - second; });
    }, [stickyHeaderIndices]);
    var legthInvalid = sortedIndices.length === 0 ||
        recyclerViewManager.getDataLength() <=
            sortedIndices[sortedIndices.length - 1];
    var compute = (0, react_1.useCallback)(function () {
        var _a, _b, _c, _d, _e, _f;
        if (legthInvalid) {
            return;
        }
        var adjustedScrollOffset = recyclerViewManager.getLastScrollOffset();
        // Binary search for current sticky index
        var currentIndexInArray = findCurrentStickyIndex(sortedIndices, adjustedScrollOffset, function (index) { return recyclerViewManager.getLayout(index).y; });
        var newStickyIndex = (_a = sortedIndices[currentIndexInArray]) !== null && _a !== void 0 ? _a : -1;
        var newNextStickyIndex = (_b = sortedIndices[currentIndexInArray + 1]) !== null && _b !== void 0 ? _b : -1;
        if (newNextStickyIndex > recyclerViewManager.getEngagedIndices().endIndex) {
            newNextStickyIndex = -1;
        }
        // To make sure header offset is 0 in the interpolate compute
        var newNextStickyY = newNextStickyIndex === -1
            ? Number.MAX_SAFE_INTEGER
            : ((_d = (_c = recyclerViewManager.tryGetLayout(newNextStickyIndex)) === null || _c === void 0 ? void 0 : _c.y) !== null && _d !== void 0 ? _d : 0) +
                recyclerViewManager.firstItemOffset;
        var newCurrentStickyHeight = (_f = (_e = recyclerViewManager.tryGetLayout(newStickyIndex)) === null || _e === void 0 ? void 0 : _e.height) !== null && _f !== void 0 ? _f : 0;
        var newPushStartsAt = newNextStickyY - newCurrentStickyHeight;
        if (newStickyIndex !== currentStickyIndex ||
            newPushStartsAt !== pushStartsAt) {
            setStickyHeaderState({
                currentStickyIndex: newStickyIndex,
                pushStartsAt: newPushStartsAt,
            });
        }
    }, [
        legthInvalid,
        recyclerViewManager,
        sortedIndices,
        currentStickyIndex,
        pushStartsAt,
    ]);
    (0, react_1.useEffect)(function () {
        compute();
    }, [compute]);
    // Optimized scroll handler using binary search pattern
    (0, react_1.useImperativeHandle)(stickyHeaderRef, function () { return ({
        reportScrollEvent: function () {
            compute();
        },
    }); }, [compute]);
    var refHolder = (0, react_1.useRef)(new Map()).current;
    var translateY = (0, react_1.useMemo)(function () {
        var _a, _b;
        var currentStickyHeight = (_b = (_a = recyclerViewManager.tryGetLayout(currentStickyIndex)) === null || _a === void 0 ? void 0 : _a.height) !== null && _b !== void 0 ? _b : 0;
        return scrollY.interpolate({
            inputRange: [pushStartsAt, pushStartsAt + currentStickyHeight],
            outputRange: [0, -currentStickyHeight],
            extrapolate: "clamp",
        });
    }, [recyclerViewManager, currentStickyIndex, scrollY, pushStartsAt]);
    // Memoize header content
    var headerContent = (0, react_1.useMemo)(function () {
        return (react_1.default.createElement(CompatView_1.CompatAnimatedView, { style: {
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1,
                transform: [{ translateY: translateY }],
            } }, currentStickyIndex !== -1 && currentStickyIndex < data.length ? (react_1.default.createElement(ViewHolder_1.ViewHolder, { index: currentStickyIndex, item: data[currentStickyIndex], renderItem: renderItem, layout: { x: 0, y: 0, width: 0, height: 0 }, refHolder: refHolder, extraData: extraData, trailingItem: null, target: "StickyHeader" })) : null));
    }, [translateY, currentStickyIndex, data, renderItem, refHolder, extraData]);
    return headerContent;
};
exports.StickyHeaders = StickyHeaders;
/**
 * Binary search utility to find the current sticky header index based on scroll position
 * @param sortedIndices - Array of indices sorted by Y position
 * @param adjustedValue - Current scroll position
 * @param getY - Function to get Y position for an index
 * @returns Index of the current sticky header
 */
function findCurrentStickyIndex(sortedIndices, adjustedValue, getY) {
    var left = 0;
    var right = sortedIndices.length - 1;
    var result = -1;
    while (left <= right) {
        var mid = Math.floor((left + right) / 2);
        var currentY = getY(sortedIndices[mid]);
        if (currentY <= adjustedValue) {
            result = mid;
            left = mid + 1;
        }
        else {
            right = mid - 1;
        }
    }
    return result;
}
//# sourceMappingURL=StickyHeaders.js.map