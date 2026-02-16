"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecyclerView = void 0;
var tslib_1 = require("tslib");
/**
 * RecyclerView is a high-performance list component that efficiently renders and recycles list items.
 * It's designed to handle large lists with optimal memory usage and smooth scrolling.
 */
var react_1 = tslib_1.__importStar(require("react"));
var react_native_1 = require("react-native");
var ErrorMessages_1 = require("../errors/ErrorMessages");
var WarningMessages_1 = require("../errors/WarningMessages");
var measureLayout_1 = require("./utils/measureLayout");
var RecyclerViewContextProvider_1 = require("./RecyclerViewContextProvider");
var useLayoutState_1 = require("./hooks/useLayoutState");
var useRecyclerViewManager_1 = require("./hooks/useRecyclerViewManager");
var useOnLoad_1 = require("./hooks/useOnLoad");
var ViewHolderCollection_1 = require("./ViewHolderCollection");
var CompatView_1 = require("./components/CompatView");
var useBoundDetection_1 = require("./hooks/useBoundDetection");
var adjustOffsetForRTL_1 = require("./utils/adjustOffsetForRTL");
var useSecondaryProps_1 = require("./hooks/useSecondaryProps");
var StickyHeaders_1 = require("./components/StickyHeaders");
var ScrollAnchor_1 = require("./components/ScrollAnchor");
var useRecyclerViewController_1 = require("./hooks/useRecyclerViewController");
var RenderTimeTracker_1 = require("./helpers/RenderTimeTracker");
/**
 * Main RecyclerView component that handles list rendering, scrolling, and item recycling.
 * @template T - The type of items in the list
 */
var RecyclerViewComponent = function (props, ref) {
    var _a;
    // Destructure props and initialize refs
    var horizontal = props.horizontal, renderItem = props.renderItem, data = props.data, extraData = props.extraData, onLoad = props.onLoad, CellRendererComponent = props.CellRendererComponent, overrideProps = props.overrideProps, refreshing = props.refreshing, onRefresh = props.onRefresh, progressViewOffset = props.progressViewOffset, ListEmptyComponent = props.ListEmptyComponent, ListHeaderComponent = props.ListHeaderComponent, ListHeaderComponentStyle = props.ListHeaderComponentStyle, ListFooterComponent = props.ListFooterComponent, ListFooterComponentStyle = props.ListFooterComponentStyle, ItemSeparatorComponent = props.ItemSeparatorComponent, renderScrollComponent = props.renderScrollComponent, style = props.style, stickyHeaderIndices = props.stickyHeaderIndices, maintainVisibleContentPosition = props.maintainVisibleContentPosition, onCommitLayoutEffect = props.onCommitLayoutEffect, rest = tslib_1.__rest(props, ["horizontal", "renderItem", "data", "extraData", "onLoad", "CellRendererComponent", "overrideProps", "refreshing", "onRefresh", "progressViewOffset", "ListEmptyComponent", "ListHeaderComponent", "ListHeaderComponentStyle", "ListFooterComponent", "ListFooterComponentStyle", "ItemSeparatorComponent", "renderScrollComponent", "style", "stickyHeaderIndices", "maintainVisibleContentPosition", "onCommitLayoutEffect"]);
    var _b = tslib_1.__read((0, react_1.useState)(function () { return new RenderTimeTracker_1.RenderTimeTracker(); }), 1), renderTimeTracker = _b[0];
    renderTimeTracker.startTracking();
    // Core refs for managing scroll view, internal view, and child container
    var scrollViewRef = (0, react_1.useRef)(null);
    var internalViewRef = (0, react_1.useRef)(null);
    var firstChildViewRef = (0, react_1.useRef)(null);
    var containerViewSizeRef = (0, react_1.useRef)(undefined);
    var pendingChildIds = (0, react_1.useRef)(new Set()).current;
    // Track scroll position
    var scrollY = (0, react_1.useRef)(new react_native_1.Animated.Value(0)).current;
    // Refs for sticky headers and scroll anchoring
    var stickyHeaderRef = (0, react_1.useRef)(null);
    var scrollAnchorRef = (0, react_1.useRef)(null);
    // State for managing layout and render updates
    var _c = tslib_1.__read((0, useLayoutState_1.useLayoutState)(0), 2), _ = _c[0], setLayoutTreeId = _c[1];
    var _d = tslib_1.__read((0, react_1.useState)(0), 2), __ = _d[0], setRenderId = _d[1];
    // Map to store refs for each item in the list
    var refHolder = (0, react_1.useMemo)(function () { return new Map(); }, []);
    // Initialize core RecyclerView manager and content offset management
    var _e = (0, useRecyclerViewManager_1.useRecyclerViewManager)(props), recyclerViewManager = _e.recyclerViewManager, velocityTracker = _e.velocityTracker;
    var _f = (0, useRecyclerViewController_1.useRecyclerViewController)(recyclerViewManager, ref, scrollViewRef, scrollAnchorRef), applyOffsetCorrection = _f.applyOffsetCorrection, computeFirstVisibleIndexForOffsetCorrection = _f.computeFirstVisibleIndexForOffsetCorrection, applyInitialScrollIndex = _f.applyInitialScrollIndex, handlerMethods = _f.handlerMethods;
    // Initialize view holder collection ref
    var viewHolderCollectionRef = (0, react_1.useRef)(null);
    // Hook to handle list loading
    (0, useOnLoad_1.useOnListLoad)(recyclerViewManager, onLoad);
    // Hook to detect when scrolling reaches list bounds
    var checkBounds = (0, useBoundDetection_1.useBoundDetection)(recyclerViewManager, scrollViewRef).checkBounds;
    var isHorizontalRTL = react_native_1.I18nManager.isRTL && horizontal;
    /**
     * Initialize the RecyclerView by measuring and setting up the window size
     * This effect runs when the component mounts or when layout changes
     */
    (0, react_1.useLayoutEffect)(function () {
        if (internalViewRef.current && firstChildViewRef.current) {
            // Measure the outer and inner container layouts
            var outerViewLayout = (0, measureLayout_1.measureParentSize)(internalViewRef.current);
            var firstChildViewLayout = (0, measureLayout_1.measureFirstChildLayout)(firstChildViewRef.current, internalViewRef.current);
            containerViewSizeRef.current = outerViewLayout;
            // Calculate offset of first item
            var firstItemOffset = horizontal
                ? firstChildViewLayout.x - outerViewLayout.x
                : firstChildViewLayout.y - outerViewLayout.y;
            // Update the RecyclerView manager with window dimensions
            recyclerViewManager.updateLayoutParams({
                width: horizontal
                    ? outerViewLayout.width
                    : firstChildViewLayout.width,
                height: horizontal
                    ? firstChildViewLayout.height
                    : outerViewLayout.height,
            }, isHorizontalRTL && recyclerViewManager.hasLayout()
                ? firstItemOffset -
                    recyclerViewManager.getChildContainerDimensions().width
                : firstItemOffset);
        }
    });
    /**
     * Effect to handle layout updates for list items
     * This ensures proper positioning and recycling of items
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    (0, react_1.useLayoutEffect)(function () {
        var _a, _b;
        if (pendingChildIds.size > 0) {
            return;
        }
        var layoutInfo = Array.from(refHolder, function (_a) {
            var _b = tslib_1.__read(_a, 2), index = _b[0], viewHolderRef = _b[1];
            var layout = (0, measureLayout_1.measureItemLayout)(viewHolderRef.current, recyclerViewManager.tryGetLayout(index));
            // comapre height with stored layout
            // const storedLayout = recyclerViewManager.getLayout(index);
            // if (
            //   storedLayout.height !== layout.height &&
            //   storedLayout.isHeightMeasured
            // ) {
            //   console.log(
            //     "height changed",
            //     index,
            //     layout.height,
            //     storedLayout.height
            //   );
            // }
            return { index: index, dimensions: layout };
        });
        var hasExceededMaxRendersWithoutCommit = renderTimeTracker.hasExceededMaxRendersWithoutCommit();
        if (hasExceededMaxRendersWithoutCommit) {
            console.warn(WarningMessages_1.WarningMessages.exceededMaxRendersWithoutCommit);
        }
        if (recyclerViewManager.modifyChildrenLayout(layoutInfo, (_a = data === null || data === void 0 ? void 0 : data.length) !== null && _a !== void 0 ? _a : 0) &&
            !hasExceededMaxRendersWithoutCommit) {
            // Trigger re-render if layout modifications were made
            setRenderId(function (prev) { return prev + 1; });
        }
        else {
            (_b = viewHolderCollectionRef.current) === null || _b === void 0 ? void 0 : _b.commitLayout();
            applyOffsetCorrection();
        }
    });
    /**
     * Scroll event handler that manages scroll position, velocity, and RTL support
     */
    var onScrollHandler = (0, react_1.useCallback)(function (event) {
        var _a, _b, _c;
        if (recyclerViewManager.ignoreScrollEvents) {
            return;
        }
        var scrollOffset = horizontal
            ? event.nativeEvent.contentOffset.x
            : event.nativeEvent.contentOffset.y;
        // Handle RTL (Right-to-Left) layout adjustments
        if (isHorizontalRTL) {
            scrollOffset = (0, adjustOffsetForRTL_1.adjustOffsetForRTL)(scrollOffset, event.nativeEvent.contentSize.width, event.nativeEvent.layoutMeasurement.width);
        }
        velocityTracker.computeVelocity(scrollOffset, recyclerViewManager.getAbsoluteLastScrollOffset(), Boolean(horizontal), function (velocity, isMomentumEnd) {
            if (recyclerViewManager.ignoreScrollEvents) {
                return;
            }
            if (isMomentumEnd) {
                computeFirstVisibleIndexForOffsetCorrection();
                if (!recyclerViewManager.isOffsetProjectionEnabled) {
                    return;
                }
                recyclerViewManager.resetVelocityCompute();
            }
            // Update scroll position and trigger re-render if needed
            if (recyclerViewManager.updateScrollOffset(scrollOffset, velocity)) {
                setRenderId(function (prev) { return prev + 1; });
            }
        });
        // Update sticky headers and check bounds
        (_a = stickyHeaderRef.current) === null || _a === void 0 ? void 0 : _a.reportScrollEvent(event.nativeEvent);
        checkBounds();
        // Record interaction and compute item visibility
        recyclerViewManager.recordInteraction();
        recyclerViewManager.computeItemViewability();
        // Call user-provided onScroll handler
        (_c = (_b = recyclerViewManager.props).onScroll) === null || _c === void 0 ? void 0 : _c.call(_b, event);
    }, [
        checkBounds,
        computeFirstVisibleIndexForOffsetCorrection,
        horizontal,
        isHorizontalRTL,
        recyclerViewManager,
        velocityTracker,
    ]);
    var parentRecyclerViewContext = (0, RecyclerViewContextProvider_1.useRecyclerViewContext)();
    var recyclerViewId = (0, react_1.useId)();
    // Create context for child components
    var recyclerViewContext = (0, react_1.useMemo)(function () {
        return {
            layout: function () {
                setLayoutTreeId(function (prev) { return prev + 1; });
            },
            getRef: function () {
                if (recyclerViewManager.isDisposed) {
                    return null;
                }
                return handlerMethods;
            },
            getParentRef: function () {
                var _a;
                return (_a = parentRecyclerViewContext === null || parentRecyclerViewContext === void 0 ? void 0 : parentRecyclerViewContext.getRef()) !== null && _a !== void 0 ? _a : null;
            },
            getParentScrollViewRef: function () {
                var _a;
                return (_a = parentRecyclerViewContext === null || parentRecyclerViewContext === void 0 ? void 0 : parentRecyclerViewContext.getScrollViewRef()) !== null && _a !== void 0 ? _a : null;
            },
            getScrollViewRef: function () {
                return scrollViewRef.current;
            },
            markChildLayoutAsPending: function (id) {
                pendingChildIds.add(id);
            },
            unmarkChildLayoutAsPending: function (id) {
                if (pendingChildIds.has(id)) {
                    pendingChildIds.delete(id);
                    recyclerViewContext.layout();
                }
            },
        };
    }, [
        handlerMethods,
        parentRecyclerViewContext,
        pendingChildIds,
        recyclerViewManager.isDisposed,
        setLayoutTreeId,
    ]);
    /**
     * Validates that item dimensions match the expected layout
     */
    var validateItemSize = (0, react_1.useCallback)(function (index, size) {
        var _a, _b, _c, _d;
        var layout = recyclerViewManager.getLayout(index);
        var width = Math.max(Math.min(layout.width, (_a = layout.maxWidth) !== null && _a !== void 0 ? _a : Infinity), (_b = layout.minWidth) !== null && _b !== void 0 ? _b : 0);
        var height = Math.max(Math.min(layout.height, (_c = layout.maxHeight) !== null && _c !== void 0 ? _c : Infinity), (_d = layout.minHeight) !== null && _d !== void 0 ? _d : 0);
        if ((0, measureLayout_1.areDimensionsNotEqual)(width, size.width) ||
            (0, measureLayout_1.areDimensionsNotEqual)(height, size.height)) {
            // console.log(
            //   "invalid size",
            //   index,
            //   width,
            //   size.width,
            //   height,
            //   size.height
            // );
            // TODO: Add a warning for missing useLayoutState
            recyclerViewContext.layout();
        }
    }, [recyclerViewContext, recyclerViewManager]);
    // Get secondary props and components
    var _g = (0, useSecondaryProps_1.useSecondaryProps)(props), refreshControl = _g.refreshControl, renderHeader = _g.renderHeader, renderFooter = _g.renderFooter, renderEmpty = _g.renderEmpty, CompatScrollView = _g.CompatScrollView;
    if (!recyclerViewManager.getIsFirstLayoutComplete() &&
        recyclerViewManager.getDataLength() > 0) {
        parentRecyclerViewContext === null || parentRecyclerViewContext === void 0 ? void 0 : parentRecyclerViewContext.markChildLayoutAsPending(recyclerViewId);
    }
    // Render sticky headers if configured
    var stickyHeaders = (0, react_1.useMemo)(function () {
        if (data &&
            data.length > 0 &&
            stickyHeaderIndices &&
            stickyHeaderIndices.length > 0) {
            if (horizontal) {
                throw new Error(ErrorMessages_1.ErrorMessages.stickyHeadersNotSupportedForHorizontal);
            }
            return (react_1.default.createElement(StickyHeaders_1.StickyHeaders, { stickyHeaderIndices: stickyHeaderIndices, data: data, renderItem: renderItem, scrollY: scrollY, stickyHeaderRef: stickyHeaderRef, recyclerViewManager: recyclerViewManager, extraData: extraData }));
        }
        return null;
    }, [
        data,
        stickyHeaderIndices,
        renderItem,
        scrollY,
        horizontal,
        recyclerViewManager,
        extraData,
    ]);
    // Set up scroll event handling with animation support for sticky headers
    var animatedEvent = (0, react_1.useMemo)(function () {
        if (stickyHeaders) {
            return react_native_1.Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true, listener: onScrollHandler });
        }
        return onScrollHandler;
    }, [onScrollHandler, scrollY, stickyHeaders]);
    var shouldMaintainVisibleContentPosition = recyclerViewManager.shouldMaintainVisibleContentPosition();
    var maintainVisibleContentPositionInternal = (0, react_1.useMemo)(function () {
        if (shouldMaintainVisibleContentPosition) {
            return tslib_1.__assign(tslib_1.__assign({}, maintainVisibleContentPosition), { minIndexForVisible: 0 });
        }
        return undefined;
    }, [maintainVisibleContentPosition, shouldMaintainVisibleContentPosition]);
    var shouldRenderFromBottom = recyclerViewManager.getDataLength() > 0 &&
        ((_a = maintainVisibleContentPosition === null || maintainVisibleContentPosition === void 0 ? void 0 : maintainVisibleContentPosition.startRenderingFromBottom) !== null && _a !== void 0 ? _a : false);
    // Create view for measuring bounded size
    var viewToMeasureBoundedSize = (0, react_1.useMemo)(function () {
        return (react_1.default.createElement(CompatView_1.CompatView, { style: {
                height: horizontal ? undefined : 0,
                width: horizontal ? 0 : undefined,
            }, ref: firstChildViewRef }));
    }, [horizontal]);
    var scrollAnchor = (0, react_1.useMemo)(function () {
        if (shouldMaintainVisibleContentPosition) {
            return (react_1.default.createElement(ScrollAnchor_1.ScrollAnchor, { horizontal: Boolean(horizontal), scrollAnchorRef: scrollAnchorRef }));
        }
        return null;
    }, [horizontal, shouldMaintainVisibleContentPosition]);
    // console.log("render", recyclerViewManager.getRenderStack());
    // Render the main RecyclerView structure
    return (react_1.default.createElement(RecyclerViewContextProvider_1.RecyclerViewContextProvider, { value: recyclerViewContext },
        react_1.default.createElement(CompatView_1.CompatView, { style: tslib_1.__assign({ flex: horizontal ? undefined : 1, overflow: "hidden" }, style), ref: internalViewRef, collapsable: false, onLayout: function (event) {
                var _a, _b, _c, _d;
                if ((0, measureLayout_1.areDimensionsNotEqual)(event.nativeEvent.layout.width, (_b = (_a = containerViewSizeRef.current) === null || _a === void 0 ? void 0 : _a.width) !== null && _b !== void 0 ? _b : 0) ||
                    (0, measureLayout_1.areDimensionsNotEqual)(event.nativeEvent.layout.height, (_d = (_c = containerViewSizeRef.current) === null || _c === void 0 ? void 0 : _c.height) !== null && _d !== void 0 ? _d : 0)) {
                    // console.log(
                    //   "onLayout",
                    //   recyclerViewManager.getWindowSize(),
                    //   event.nativeEvent.layout
                    // );
                    recyclerViewContext.layout();
                }
            } },
            react_1.default.createElement(CompatScrollView, tslib_1.__assign({}, rest, { horizontal: horizontal, ref: scrollViewRef, onScroll: animatedEvent, maintainVisibleContentPosition: maintainVisibleContentPositionInternal, refreshControl: refreshControl }, overrideProps),
                scrollAnchor,
                isHorizontalRTL && viewToMeasureBoundedSize,
                renderHeader,
                !isHorizontalRTL && viewToMeasureBoundedSize,
                react_1.default.createElement(ViewHolderCollection_1.ViewHolderCollection, { viewHolderCollectionRef: viewHolderCollectionRef, data: data, horizontal: horizontal, renderStack: recyclerViewManager.getRenderStack(), getLayout: function (index) { return recyclerViewManager.getLayout(index); }, getAdjustmentMargin: function () {
                        if (!shouldRenderFromBottom || !recyclerViewManager.hasLayout()) {
                            return 0;
                        }
                        var windowSize = horizontal
                            ? recyclerViewManager.getWindowSize().width
                            : recyclerViewManager.getWindowSize().height;
                        var childContainerSize = horizontal
                            ? recyclerViewManager.getChildContainerDimensions().width
                            : recyclerViewManager.getChildContainerDimensions().height;
                        return Math.max(0, windowSize -
                            childContainerSize -
                            recyclerViewManager.firstItemOffset);
                    }, refHolder: refHolder, onSizeChanged: validateItemSize, renderItem: renderItem, extraData: extraData, onCommitLayoutEffect: function () {
                        applyInitialScrollIndex();
                        parentRecyclerViewContext === null || parentRecyclerViewContext === void 0 ? void 0 : parentRecyclerViewContext.unmarkChildLayoutAsPending(recyclerViewId);
                        onCommitLayoutEffect === null || onCommitLayoutEffect === void 0 ? void 0 : onCommitLayoutEffect();
                    }, onCommitEffect: function () {
                        renderTimeTracker.markRenderComplete();
                        recyclerViewManager.updateAverageRenderTime(renderTimeTracker.getAverageRenderTime());
                        applyInitialScrollIndex();
                        checkBounds();
                        recyclerViewManager.computeItemViewability();
                        recyclerViewManager.animationOptimizationsEnabled = false;
                    }, CellRendererComponent: CellRendererComponent, ItemSeparatorComponent: ItemSeparatorComponent, getChildContainerLayout: function () {
                        return recyclerViewManager.hasLayout()
                            ? recyclerViewManager.getChildContainerDimensions()
                            : undefined;
                    } }),
                renderEmpty,
                renderFooter),
            stickyHeaders)));
};
// Set displayName for the inner component
RecyclerViewComponent.displayName = "FlashList";
// Create and export the memoized, forwarded ref component
var RecyclerView = react_1.default.memo((0, react_1.forwardRef)(RecyclerViewComponent));
exports.RecyclerView = RecyclerView;
//# sourceMappingURL=RecyclerView.js.map