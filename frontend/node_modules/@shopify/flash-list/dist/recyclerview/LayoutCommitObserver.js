"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutCommitObserver = void 0;
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var RecyclerViewContextProvider_1 = require("./RecyclerViewContextProvider");
var useLayoutState_1 = require("./hooks/useLayoutState");
/**
 * LayoutCommitObserver can be used to observe when FlashList commits a layout.
 * It is useful when your component has one or more FlashLists somewhere down the tree.
 * LayoutCommitObserver will trigger `onCommitLayoutEffect` when all of the FlashLists in the tree have finished their first commit.
 */
exports.LayoutCommitObserver = react_1.default.memo(function (props) {
    var children = props.children, onCommitLayoutEffect = props.onCommitLayoutEffect;
    var parentRecyclerViewContext = (0, RecyclerViewContextProvider_1.useRecyclerViewContext)();
    var _a = tslib_1.__read((0, useLayoutState_1.useLayoutState)(0), 2), _ = _a[0], setRenderId = _a[1];
    var pendingChildIds = (0, react_1.useRef)(new Set()).current;
    (0, react_1.useLayoutEffect)(function () {
        if (pendingChildIds.size > 0) {
            return;
        }
        onCommitLayoutEffect === null || onCommitLayoutEffect === void 0 ? void 0 : onCommitLayoutEffect();
    });
    // Create context for child components
    var recyclerViewContext = (0, react_1.useMemo)(function () {
        return {
            layout: function () {
                setRenderId(function (prev) { return prev + 1; });
            },
            getRef: function () {
                var _a;
                return (_a = parentRecyclerViewContext === null || parentRecyclerViewContext === void 0 ? void 0 : parentRecyclerViewContext.getRef()) !== null && _a !== void 0 ? _a : null;
            },
            getParentRef: function () {
                var _a;
                return (_a = parentRecyclerViewContext === null || parentRecyclerViewContext === void 0 ? void 0 : parentRecyclerViewContext.getParentRef()) !== null && _a !== void 0 ? _a : null;
            },
            getParentScrollViewRef: function () {
                var _a;
                return (_a = parentRecyclerViewContext === null || parentRecyclerViewContext === void 0 ? void 0 : parentRecyclerViewContext.getParentScrollViewRef()) !== null && _a !== void 0 ? _a : null;
            },
            getScrollViewRef: function () {
                var _a;
                return (_a = parentRecyclerViewContext === null || parentRecyclerViewContext === void 0 ? void 0 : parentRecyclerViewContext.getScrollViewRef()) !== null && _a !== void 0 ? _a : null;
            },
            markChildLayoutAsPending: function (id) {
                parentRecyclerViewContext === null || parentRecyclerViewContext === void 0 ? void 0 : parentRecyclerViewContext.markChildLayoutAsPending(id);
                pendingChildIds.add(id);
            },
            unmarkChildLayoutAsPending: function (id) {
                parentRecyclerViewContext === null || parentRecyclerViewContext === void 0 ? void 0 : parentRecyclerViewContext.unmarkChildLayoutAsPending(id);
                if (pendingChildIds.has(id)) {
                    pendingChildIds.delete(id);
                    recyclerViewContext.layout();
                }
            },
        };
    }, [parentRecyclerViewContext, pendingChildIds, setRenderId]);
    return (react_1.default.createElement(RecyclerViewContextProvider_1.RecyclerViewContextProvider, { value: recyclerViewContext }, children));
});
exports.LayoutCommitObserver.displayName = "LayoutCommitObserver";
//# sourceMappingURL=LayoutCommitObserver.js.map