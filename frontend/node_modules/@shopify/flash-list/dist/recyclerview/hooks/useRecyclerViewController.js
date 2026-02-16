"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRecyclerViewController = useRecyclerViewController;
var tslib_1 = require("tslib");
var react_1 = require("react");
var react_native_1 = require("react-native");
var adjustOffsetForRTL_1 = require("../utils/adjustOffsetForRTL");
var PlatformHelper_1 = require("../../native/config/PlatformHelper");
var WarningMessages_1 = require("../../errors/WarningMessages");
var useUnmountFlag_1 = require("./useUnmountFlag");
var useUnmountAwareCallbacks_1 = require("./useUnmountAwareCallbacks");
/**
 * Comprehensive hook that manages RecyclerView scrolling behavior and provides
 * imperative methods for controlling the RecyclerView.
 *
 * This hook combines content offset management and scroll handling functionality:
 * 1. Provides imperative methods for scrolling and measurement
 * 2. Handles initial scroll position when the list first loads
 * 3. Maintains visible content position during updates
 * 4. Manages scroll anchors for chat-like applications
 *
 * @param recyclerViewManager - The RecyclerViewManager instance that handles core functionality
 * @param ref - The ref to expose the imperative methods
 * @param scrollViewRef - Reference to the scrollable container component
 * @param scrollAnchorRef - Reference to the scroll anchor component
 * @param props - The RecyclerViewProps containing configuration
 */
function useRecyclerViewController(recyclerViewManager, ref, scrollViewRef, scrollAnchorRef) {
    var _this = this;
    var isUnmounted = (0, useUnmountFlag_1.useUnmountFlag)();
    var _a = tslib_1.__read((0, react_1.useState)(0), 2), _ = _a[0], setRenderId = _a[1];
    var pauseOffsetCorrection = (0, react_1.useRef)(false);
    var initialScrollCompletedRef = (0, react_1.useRef)(false);
    var lastDataLengthRef = (0, react_1.useRef)(recyclerViewManager.getDataLength());
    var setTimeout = (0, useUnmountAwareCallbacks_1.useUnmountAwareTimeout)().setTimeout;
    // Track the first visible item for maintaining scroll position
    var firstVisibleItemKey = (0, react_1.useRef)(undefined);
    var firstVisibleItemLayout = (0, react_1.useRef)(undefined);
    // Queue to store callbacks that should be executed after scroll offset updates
    var pendingScrollCallbacks = (0, react_1.useRef)([]);
    // Handle initial scroll position when the list first loads
    //   useOnLoad(recyclerViewManager, () => {
    //   });
    /**
     * Updates the scroll offset and calls the provided callback
     * after the update has been applied and the component has re-rendered.
     *
     * @param offset - The new scroll offset to apply
     * @param callback - Optional callback to execute after the update is applied
     */
    var updateScrollOffsetWithCallback = (0, react_1.useCallback)(function (offset, callback) {
        // Attempt to update the scroll offset in the RecyclerViewManager
        // This returns undefined if no update is needed
        if (recyclerViewManager.updateScrollOffset(offset) !== undefined) {
            // It will be executed after the next render
            pendingScrollCallbacks.current.push(callback);
            // Trigger a re-render to apply the scroll offset update
            setRenderId(function (prev) { return prev + 1; });
        }
        else {
            // No update needed, execute callback immediately
            callback();
        }
    }, [recyclerViewManager]);
    var computeFirstVisibleIndexForOffsetCorrection = (0, react_1.useCallback)(function () {
        if (recyclerViewManager.getIsFirstLayoutComplete() &&
            recyclerViewManager.hasStableDataKeys() &&
            recyclerViewManager.getDataLength() > 0 &&
            recyclerViewManager.shouldMaintainVisibleContentPosition()) {
            // Update the tracked first visible item
            var firstVisibleIndex = Math.max(0, recyclerViewManager.computeVisibleIndices().startIndex);
            if (firstVisibleIndex !== undefined && firstVisibleIndex >= 0) {
                firstVisibleItemKey.current =
                    recyclerViewManager.getDataKey(firstVisibleIndex);
                firstVisibleItemLayout.current = tslib_1.__assign({}, recyclerViewManager.getLayout(firstVisibleIndex));
            }
        }
    }, [recyclerViewManager]);
    /**
     * Maintains the visible content position when the list updates.
     * This is particularly useful for chat applications where we want to keep
     * the user's current view position when new messages are added.
     */
    var applyOffsetCorrection = (0, react_1.useCallback)(function () {
        var _a, _b, _c;
        var _d = recyclerViewManager.props, horizontal = _d.horizontal, data = _d.data;
        // Execute all pending callbacks from previous scroll offset updates
        // This ensures any scroll operations that were waiting for render are completed
        var callbacks = pendingScrollCallbacks.current;
        pendingScrollCallbacks.current = [];
        callbacks.forEach(function (callback) { return callback(); });
        var currentDataLength = recyclerViewManager.getDataLength();
        if (recyclerViewManager.getIsFirstLayoutComplete() &&
            recyclerViewManager.hasStableDataKeys() &&
            currentDataLength > 0 &&
            recyclerViewManager.shouldMaintainVisibleContentPosition()) {
            var hasDataChanged = currentDataLength !== lastDataLengthRef.current;
            // If we have a tracked first visible item, maintain its position
            if (firstVisibleItemKey.current) {
                var currentIndexOfFirstVisibleItem = (_a = recyclerViewManager
                    .getEngagedIndices()
                    .findValue(function (index) {
                    return recyclerViewManager.getDataKey(index) ===
                        firstVisibleItemKey.current;
                })) !== null && _a !== void 0 ? _a : (hasDataChanged
                    ? data === null || data === void 0 ? void 0 : data.findIndex(function (item, index) {
                        return recyclerViewManager.getDataKey(index) ===
                            firstVisibleItemKey.current;
                    })
                    : undefined);
                if (currentIndexOfFirstVisibleItem !== undefined &&
                    currentIndexOfFirstVisibleItem >= 0) {
                    // Calculate the difference in position and apply the offset
                    var diff = horizontal
                        ? recyclerViewManager.getLayout(currentIndexOfFirstVisibleItem).x -
                            firstVisibleItemLayout.current.x
                        : recyclerViewManager.getLayout(currentIndexOfFirstVisibleItem).y -
                            firstVisibleItemLayout.current.y;
                    firstVisibleItemLayout.current = tslib_1.__assign({}, recyclerViewManager.getLayout(currentIndexOfFirstVisibleItem));
                    if (diff !== 0 &&
                        !pauseOffsetCorrection.current &&
                        !recyclerViewManager.animationOptimizationsEnabled) {
                        // console.log("diff", diff, firstVisibleItemKey.current);
                        if (PlatformHelper_1.PlatformConfig.supportsOffsetCorrection) {
                            // console.log("scrollBy", diff);
                            (_b = scrollAnchorRef.current) === null || _b === void 0 ? void 0 : _b.scrollBy(diff);
                        }
                        else {
                            var scrollToParams = horizontal
                                ? {
                                    x: recyclerViewManager.getAbsoluteLastScrollOffset() + diff,
                                    animated: false,
                                }
                                : {
                                    y: recyclerViewManager.getAbsoluteLastScrollOffset() + diff,
                                    animated: false,
                                };
                            (_c = scrollViewRef.current) === null || _c === void 0 ? void 0 : _c.scrollTo(scrollToParams);
                        }
                        if (hasDataChanged) {
                            updateScrollOffsetWithCallback(recyclerViewManager.getAbsoluteLastScrollOffset() + diff, function () { });
                            recyclerViewManager.ignoreScrollEvents = true;
                            setTimeout(function () {
                                recyclerViewManager.ignoreScrollEvents = false;
                            }, 100);
                        }
                    }
                }
            }
            computeFirstVisibleIndexForOffsetCorrection();
        }
        lastDataLengthRef.current = recyclerViewManager.getDataLength();
    }, [
        recyclerViewManager,
        scrollAnchorRef,
        scrollViewRef,
        setTimeout,
        updateScrollOffsetWithCallback,
        computeFirstVisibleIndexForOffsetCorrection,
    ]);
    var handlerMethods = (0, react_1.useMemo)(function () {
        return {
            get props() {
                return recyclerViewManager.props;
            },
            /**
             * Scrolls the list to a specific offset position.
             * Handles RTL layouts and first item offset adjustments.
             */
            scrollToOffset: function (_a) {
                var offset = _a.offset, animated = _a.animated, _b = _a.skipFirstItemOffset, skipFirstItemOffset = _b === void 0 ? true : _b;
                var horizontal = recyclerViewManager.props.horizontal;
                if (scrollViewRef.current) {
                    // Adjust offset for RTL layouts in horizontal mode
                    if (react_native_1.I18nManager.isRTL && horizontal) {
                        // eslint-disable-next-line no-param-reassign
                        offset =
                            (0, adjustOffsetForRTL_1.adjustOffsetForRTL)(offset, recyclerViewManager.getChildContainerDimensions().width, recyclerViewManager.getWindowSize().width) +
                                (skipFirstItemOffset
                                    ? recyclerViewManager.firstItemOffset
                                    : -recyclerViewManager.firstItemOffset);
                    }
                    // Calculate the final offset including first item offset if needed
                    var adjustedOffset = offset +
                        (skipFirstItemOffset ? 0 : recyclerViewManager.firstItemOffset);
                    var scrollTo_1 = horizontal
                        ? { x: adjustedOffset, y: 0 }
                        : { x: 0, y: adjustedOffset };
                    scrollViewRef.current.scrollTo(tslib_1.__assign(tslib_1.__assign({}, scrollTo_1), { animated: animated }));
                }
            },
            clearLayoutCacheOnUpdate: function () {
                recyclerViewManager.markLayoutManagerDirty();
            },
            // Expose native scroll view methods
            flashScrollIndicators: function () {
                scrollViewRef.current.flashScrollIndicators();
            },
            getNativeScrollRef: function () {
                return scrollViewRef.current;
            },
            getScrollResponder: function () {
                return scrollViewRef.current.getScrollResponder();
            },
            getScrollableNode: function () {
                return scrollViewRef.current.getScrollableNode();
            },
            /**
             * Scrolls to the end of the list.
             */
            scrollToEnd: function () {
                var args_1 = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args_1[_i] = arguments[_i];
                }
                return tslib_1.__awaiter(_this, tslib_1.__spreadArray([], tslib_1.__read(args_1), false), void 0, function (_a) {
                    var data, lastIndex;
                    var _b = _a === void 0 ? {} : _a, animated = _b.animated;
                    return tslib_1.__generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                data = recyclerViewManager.props.data;
                                if (!(data && data.length > 0)) return [3 /*break*/, 2];
                                lastIndex = data.length - 1;
                                if (!!recyclerViewManager.getEngagedIndices().includes(lastIndex)) return [3 /*break*/, 2];
                                return [4 /*yield*/, handlerMethods.scrollToIndex({
                                        index: lastIndex,
                                        animated: animated,
                                    })];
                            case 1:
                                _c.sent();
                                _c.label = 2;
                            case 2:
                                setTimeout(function () {
                                    scrollViewRef.current.scrollToEnd({ animated: animated });
                                }, 0);
                                return [2 /*return*/];
                        }
                    });
                });
            },
            /**
             * Scrolls to the beginning of the list.
             */
            scrollToTop: function (_a) {
                var _b = _a === void 0 ? {} : _a, animated = _b.animated;
                handlerMethods.scrollToOffset({
                    offset: 0,
                    animated: animated,
                });
            },
            /**
             * Scrolls to a specific index in the list.
             * Supports viewPosition and viewOffset for precise positioning.
             * Returns a Promise that resolves when the scroll is complete.
             */
            scrollToIndex: function (_a) {
                var index = _a.index, animated = _a.animated, viewPosition = _a.viewPosition, viewOffset = _a.viewOffset;
                return new Promise(function (resolve) {
                    var horizontal = recyclerViewManager.props.horizontal;
                    if (scrollViewRef.current &&
                        index >= 0 &&
                        index < recyclerViewManager.getDataLength()) {
                        // Pause the scroll offset adjustments
                        pauseOffsetCorrection.current = true;
                        recyclerViewManager.setOffsetProjectionEnabled(false);
                        var getFinalOffset_1 = function () {
                            var layout = recyclerViewManager.getLayout(index);
                            var offset = horizontal ? layout.x : layout.y;
                            var finalOffset = offset;
                            // take viewPosition etc into account
                            if (viewPosition !== undefined || viewOffset !== undefined) {
                                var containerSize = horizontal
                                    ? recyclerViewManager.getWindowSize().width
                                    : recyclerViewManager.getWindowSize().height;
                                var itemSize = horizontal ? layout.width : layout.height;
                                if (viewPosition !== undefined) {
                                    // viewPosition: 0 = top, 0.5 = center, 1 = bottom
                                    finalOffset =
                                        offset - (containerSize - itemSize) * viewPosition;
                                }
                                if (viewOffset !== undefined) {
                                    finalOffset += viewOffset;
                                }
                            }
                            return finalOffset + recyclerViewManager.firstItemOffset;
                        };
                        var lastAbsoluteScrollOffset_1 = recyclerViewManager.getAbsoluteLastScrollOffset();
                        var bufferForScroll = horizontal
                            ? recyclerViewManager.getWindowSize().width
                            : recyclerViewManager.getWindowSize().height;
                        var bufferForCompute_1 = bufferForScroll * 2;
                        var getStartScrollOffset_1 = function () {
                            var lastScrollOffset = lastAbsoluteScrollOffset_1;
                            var finalOffset = getFinalOffset_1();
                            if (finalOffset > lastScrollOffset) {
                                lastScrollOffset = Math.max(finalOffset - bufferForCompute_1, lastScrollOffset);
                                recyclerViewManager.setScrollDirection("forward");
                            }
                            else {
                                lastScrollOffset = Math.min(finalOffset + bufferForCompute_1, lastScrollOffset);
                                recyclerViewManager.setScrollDirection("backward");
                            }
                            return lastScrollOffset;
                        };
                        var initialTargetOffset_1 = getFinalOffset_1();
                        var initialStartScrollOffset_1 = getStartScrollOffset_1();
                        var finalOffset_1 = initialTargetOffset_1;
                        var startScrollOffset_1 = initialStartScrollOffset_1;
                        var steps_1 = 5;
                        /**
                         * Recursively performs the scroll animation steps.
                         * This function replaces the async/await loop with callback-based execution.
                         *
                         * @param currentStep - The current step in the animation (0 to steps-1)
                         */
                        var performScrollStep_1 = function (currentStep) {
                            // Check if component is unmounted or we've completed all steps
                            if (isUnmounted.current) {
                                resolve();
                                return;
                            }
                            else if (currentStep >= steps_1) {
                                // All steps completed, perform final scroll
                                finishScrollToIndex_1();
                                return;
                            }
                            // Calculate the offset for this step
                            // For animated scrolls: interpolate from finalOffset to startScrollOffset
                            // For non-animated: interpolate from startScrollOffset to finalOffset
                            var nextOffset = animated
                                ? finalOffset_1 +
                                    (startScrollOffset_1 - finalOffset_1) *
                                        (currentStep / (steps_1 - 1))
                                : startScrollOffset_1 +
                                    (finalOffset_1 - startScrollOffset_1) *
                                        (currentStep / (steps_1 - 1));
                            // Update scroll offset with a callback to continue to the next step
                            updateScrollOffsetWithCallback(nextOffset, function () {
                                // Check if the index is still valid after the update
                                if (index >= recyclerViewManager.getDataLength()) {
                                    // Index out of bounds, scroll to end instead
                                    handlerMethods.scrollToEnd({ animated: animated });
                                    resolve(); // Resolve the promise as we're done
                                    return;
                                }
                                // Check if the target position has changed significantly
                                var newFinalOffset = getFinalOffset_1();
                                if ((newFinalOffset < initialTargetOffset_1 &&
                                    newFinalOffset < initialStartScrollOffset_1) ||
                                    (newFinalOffset > initialTargetOffset_1 &&
                                        newFinalOffset > initialStartScrollOffset_1)) {
                                    // Target has moved, recalculate and restart from beginning
                                    finalOffset_1 = newFinalOffset;
                                    startScrollOffset_1 = getStartScrollOffset_1();
                                    initialTargetOffset_1 = newFinalOffset;
                                    initialStartScrollOffset_1 = startScrollOffset_1;
                                    performScrollStep_1(0); // Restart from step 0
                                }
                                else {
                                    // Continue to next step
                                    performScrollStep_1(currentStep + 1);
                                }
                            });
                        };
                        /**
                         * Completes the scroll to index operation by performing the final scroll
                         * and re-enabling offset correction after a delay.
                         */
                        var finishScrollToIndex_1 = function () {
                            finalOffset_1 = getFinalOffset_1();
                            var maxOffset = recyclerViewManager.getMaxScrollOffset();
                            if (finalOffset_1 > maxOffset) {
                                finalOffset_1 = maxOffset;
                            }
                            if (animated) {
                                // For animated scrolls, first jump to the start position
                                // We don't need to add firstItemOffset here as it's already added
                                handlerMethods.scrollToOffset({
                                    offset: startScrollOffset_1,
                                    animated: false,
                                    skipFirstItemOffset: true,
                                });
                            }
                            // Perform the final scroll to the target position
                            handlerMethods.scrollToOffset({
                                offset: finalOffset_1,
                                animated: animated,
                                skipFirstItemOffset: true,
                            });
                            // Re-enable offset correction after a delay
                            // Longer delay for animated scrolls to allow animation to complete
                            setTimeout(function () {
                                pauseOffsetCorrection.current = false;
                                recyclerViewManager.setOffsetProjectionEnabled(true);
                                resolve(); // Resolve the promise after re-enabling corrections
                            }, animated ? 300 : 200);
                        };
                        // Start the scroll animation process
                        performScrollStep_1(0);
                    }
                    else {
                        // Invalid parameters, resolve immediately
                        resolve();
                    }
                });
            },
            /**
             * Scrolls to a specific item in the list.
             * Finds the item's index and uses scrollToIndex internally.
             */
            scrollToItem: function (_a) {
                var item = _a.item, animated = _a.animated, viewPosition = _a.viewPosition, viewOffset = _a.viewOffset;
                var data = recyclerViewManager.props.data;
                if (scrollViewRef.current && data) {
                    // Find the index of the item in the data array
                    var index = data.findIndex(function (dataItem) { return dataItem === item; });
                    if (index >= 0) {
                        handlerMethods.scrollToIndex({
                            index: index,
                            animated: animated,
                            viewPosition: viewPosition,
                            viewOffset: viewOffset,
                        });
                    }
                }
            },
            // Utility methods for measuring header height / top padding
            getFirstItemOffset: function () {
                return recyclerViewManager.firstItemOffset;
            },
            getWindowSize: function () {
                return recyclerViewManager.getWindowSize();
            },
            getLayout: function (index) {
                return recyclerViewManager.tryGetLayout(index);
            },
            getAbsoluteLastScrollOffset: function () {
                return recyclerViewManager.getAbsoluteLastScrollOffset();
            },
            getChildContainerDimensions: function () {
                return recyclerViewManager.getChildContainerDimensions();
            },
            recordInteraction: function () {
                recyclerViewManager.recordInteraction();
            },
            computeVisibleIndices: function () {
                return recyclerViewManager.computeVisibleIndices();
            },
            getFirstVisibleIndex: function () {
                return recyclerViewManager.computeVisibleIndices().startIndex;
            },
            recomputeViewableItems: function () {
                recyclerViewManager.recomputeViewableItems();
            },
            /**
             * Disables item recycling in preparation for layout animations.
             */
            prepareForLayoutAnimationRender: function () {
                if (!recyclerViewManager.props.keyExtractor) {
                    console.warn(WarningMessages_1.WarningMessages.keyExtractorNotDefinedForAnimation);
                }
                recyclerViewManager.animationOptimizationsEnabled = true;
            },
        };
    }, [
        recyclerViewManager,
        scrollViewRef,
        setTimeout,
        isUnmounted,
        updateScrollOffsetWithCallback,
    ]);
    var applyInitialScrollIndex = (0, react_1.useCallback)(function () {
        var _a, _b;
        var _c = recyclerViewManager.props, horizontal = _c.horizontal, data = _c.data;
        var initialScrollIndex = (_a = recyclerViewManager.getInitialScrollIndex()) !== null && _a !== void 0 ? _a : -1;
        var dataLength = (_b = data === null || data === void 0 ? void 0 : data.length) !== null && _b !== void 0 ? _b : 0;
        if (initialScrollIndex >= 0 &&
            initialScrollIndex < dataLength &&
            !initialScrollCompletedRef.current &&
            recyclerViewManager.getIsFirstLayoutComplete()) {
            // Use setTimeout to ensure that we keep trying to scroll on first few renders
            setTimeout(function () {
                initialScrollCompletedRef.current = true;
                pauseOffsetCorrection.current = false;
            }, 100);
            pauseOffsetCorrection.current = true;
            var offset_1 = horizontal
                ? recyclerViewManager.getLayout(initialScrollIndex).x
                : recyclerViewManager.getLayout(initialScrollIndex).y;
            handlerMethods.scrollToOffset({
                offset: offset_1,
                animated: false,
                skipFirstItemOffset: false,
            });
            setTimeout(function () {
                handlerMethods.scrollToOffset({
                    offset: offset_1,
                    animated: false,
                    skipFirstItemOffset: false,
                });
            }, 0);
        }
    }, [handlerMethods, recyclerViewManager, setTimeout]);
    // Expose imperative methods through the ref
    (0, react_1.useImperativeHandle)(ref, function () {
        var imperativeApi = tslib_1.__assign(tslib_1.__assign({}, scrollViewRef.current), handlerMethods);
        // Without this the props getter from handlerMethods is evaluated during spread and
        // future updates to props are not reflected in the ref
        Object.defineProperty(imperativeApi, "props", {
            get: function () {
                return recyclerViewManager.props;
            },
            enumerable: true,
            configurable: true,
        });
        return imperativeApi;
    }, [handlerMethods, scrollViewRef, recyclerViewManager]);
    return {
        applyOffsetCorrection: applyOffsetCorrection,
        computeFirstVisibleIndexForOffsetCorrection: computeFirstVisibleIndexForOffsetCorrection,
        applyInitialScrollIndex: applyInitialScrollIndex,
        handlerMethods: handlerMethods,
    };
}
//# sourceMappingURL=useRecyclerViewController.js.map