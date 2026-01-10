"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBoundDetection = useBoundDetection;
var react_1 = require("react");
var useUnmountAwareCallbacks_1 = require("./useUnmountAwareCallbacks");
/**
 * Hook to detect when the scroll position reaches near the start or end of the list
 * and trigger the appropriate callbacks. This hook is responsible for:
 * 1. Detecting when the user scrolls near the end of the list (onEndReached)
 * 2. Detecting when the user scrolls near the start of the list (onStartReached)
 * 3. Managing auto-scrolling to bottom when new content is added
 *
 * @param recyclerViewManager - The RecyclerViewManager instance that handles the list's core functionality
 * @param props - The RecyclerViewProps containing configuration and callbacks
 * @param scrollViewRef - Reference to the scrollable container component
 */
function useBoundDetection(recyclerViewManager, scrollViewRef) {
    // Track whether we've already triggered the end reached callback to prevent duplicate calls
    var pendingEndReached = (0, react_1.useRef)(false);
    // Track whether we've already triggered the start reached callback to prevent duplicate calls
    var pendingStartReached = (0, react_1.useRef)(false);
    // Track whether we should auto-scroll to bottom when new content is added
    var pendingAutoscrollToBottom = (0, react_1.useRef)(false);
    var lastCheckBoundsTime = (0, react_1.useRef)(Date.now());
    var data = recyclerViewManager.props.data;
    var requestAnimationFrame = (0, useUnmountAwareCallbacks_1.useUnmountAwareAnimationFrame)().requestAnimationFrame;
    var windowHeight = recyclerViewManager.hasLayout()
        ? recyclerViewManager.getWindowSize().height
        : 0;
    var contentHeight = recyclerViewManager.hasLayout()
        ? recyclerViewManager.getChildContainerDimensions().height
        : 0;
    var windowWidth = recyclerViewManager.hasLayout()
        ? recyclerViewManager.getWindowSize().width
        : 0;
    var contentWidth = recyclerViewManager.hasLayout()
        ? recyclerViewManager.getChildContainerDimensions().width
        : 0;
    /**
     * Checks if the scroll position is near the start or end of the list
     * and triggers appropriate callbacks if configured.
     */
    var checkBounds = (0, react_1.useCallback)(function () {
        var _a;
        lastCheckBoundsTime.current = Date.now();
        var _b = recyclerViewManager.props, onEndReached = _b.onEndReached, onStartReached = _b.onStartReached, maintainVisibleContentPosition = _b.maintainVisibleContentPosition, horizontal = _b.horizontal, onEndReachedThresholdProp = _b.onEndReachedThreshold, onStartReachedThresholdProp = _b.onStartReachedThreshold;
        // Skip all calculations if neither callback is provided and autoscroll is disabled
        var autoscrollToBottomThreshold = (_a = maintainVisibleContentPosition === null || maintainVisibleContentPosition === void 0 ? void 0 : maintainVisibleContentPosition.autoscrollToBottomThreshold) !== null && _a !== void 0 ? _a : -1;
        if (!onEndReached && !onStartReached && autoscrollToBottomThreshold < 0) {
            return;
        }
        if (recyclerViewManager.getIsFirstLayoutComplete()) {
            var lastScrollOffset = recyclerViewManager.getAbsoluteLastScrollOffset();
            var contentSize = recyclerViewManager.getChildContainerDimensions();
            var windowSize = recyclerViewManager.getWindowSize();
            var isHorizontal = horizontal === true;
            // Calculate dimensions based on scroll direction
            var visibleLength = isHorizontal ? windowSize.width : windowSize.height;
            var contentLength = (isHorizontal ? contentSize.width : contentSize.height) +
                recyclerViewManager.firstItemOffset;
            // Check if we're near the end of the list
            if (onEndReached) {
                var onEndReachedThreshold = onEndReachedThresholdProp !== null && onEndReachedThresholdProp !== void 0 ? onEndReachedThresholdProp : 0.5;
                var endThresholdDistance = onEndReachedThreshold * visibleLength;
                var isNearEnd = Math.ceil(lastScrollOffset + visibleLength) >=
                    contentLength - endThresholdDistance;
                if (isNearEnd && !pendingEndReached.current) {
                    pendingEndReached.current = true;
                    onEndReached();
                }
                pendingEndReached.current = isNearEnd;
            }
            // Check if we're near the start of the list
            if (onStartReached) {
                var onStartReachedThreshold = onStartReachedThresholdProp !== null && onStartReachedThresholdProp !== void 0 ? onStartReachedThresholdProp : 0.2;
                var startThresholdDistance = onStartReachedThreshold * visibleLength;
                var isNearStart = lastScrollOffset <= startThresholdDistance;
                if (isNearStart && !pendingStartReached.current) {
                    pendingStartReached.current = true;
                    onStartReached();
                }
                pendingStartReached.current = isNearStart;
            }
            // Handle auto-scrolling to bottom for vertical lists
            if (!isHorizontal && autoscrollToBottomThreshold >= 0) {
                var autoscrollToBottomThresholdDistance = autoscrollToBottomThreshold * visibleLength;
                var isNearBottom = Math.ceil(lastScrollOffset + visibleLength) >=
                    contentLength - autoscrollToBottomThresholdDistance;
                if (isNearBottom) {
                    pendingAutoscrollToBottom.current = true;
                }
                else {
                    pendingAutoscrollToBottom.current = false;
                }
            }
        }
    }, [recyclerViewManager]);
    var runAutoScrollToBottomCheck = (0, react_1.useCallback)(function () {
        if (pendingAutoscrollToBottom.current) {
            pendingAutoscrollToBottom.current = false;
            requestAnimationFrame(function () {
                var _a, _b, _c;
                var shouldAnimate = (_b = (_a = recyclerViewManager.props.maintainVisibleContentPosition) === null || _a === void 0 ? void 0 : _a.animateAutoScrollToBottom) !== null && _b !== void 0 ? _b : true;
                (_c = scrollViewRef.current) === null || _c === void 0 ? void 0 : _c.scrollToEnd({
                    animated: shouldAnimate,
                });
            });
        }
    }, [requestAnimationFrame, scrollViewRef, recyclerViewManager]);
    // Reset end reached state when data changes
    (0, react_1.useMemo)(function () {
        pendingEndReached.current = false;
        // needs to run only when data changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);
    // Auto-scroll to bottom when new content is added and we're near the bottom
    (0, react_1.useEffect)(function () {
        runAutoScrollToBottomCheck();
    }, [data, runAutoScrollToBottomCheck, windowHeight, windowWidth]);
    // Since content changes frequently, we try and avoid doing the auto scroll during active scrolls
    (0, react_1.useEffect)(function () {
        if (Date.now() - lastCheckBoundsTime.current >= 100) {
            runAutoScrollToBottomCheck();
        }
    }, [
        contentHeight,
        contentWidth,
        recyclerViewManager.firstItemOffset,
        runAutoScrollToBottomCheck,
    ]);
    return {
        checkBounds: checkBounds,
    };
}
//# sourceMappingURL=useBoundDetection.js.map