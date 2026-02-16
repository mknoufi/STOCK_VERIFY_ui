"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecyclerViewManager = void 0;
var tslib_1 = require("tslib");
var ErrorMessages_1 = require("../errors/ErrorMessages");
var ViewabilityManager_1 = tslib_1.__importDefault(require("./viewability/ViewabilityManager"));
var GridLayoutManager_1 = require("./layout-managers/GridLayoutManager");
var LinearLayoutManager_1 = require("./layout-managers/LinearLayoutManager");
var MasonryLayoutManager_1 = require("./layout-managers/MasonryLayoutManager");
var EngagedIndicesTracker_1 = require("./helpers/EngagedIndicesTracker");
var RenderStackManager_1 = require("./RenderStackManager");
// Abstracts layout manager, render stack manager and viewability manager and generates render stack (progressively on load)
var RecyclerViewManager = /** @class */ (function () {
    function RecyclerViewManager(props) {
        var _this = this;
        this.initialDrawBatchSize = 2;
        // Map of index to key
        this.isFirstLayoutComplete = false;
        this.hasRenderedProgressively = false;
        this.progressiveRenderCount = 0;
        this._isDisposed = false;
        this._isLayoutManagerDirty = false;
        this._animationOptimizationsEnabled = false;
        this.firstItemOffset = 0;
        this.ignoreScrollEvents = false;
        // updates render stack based on the engaged indices which are sorted. Recycles unused keys.
        this.updateRenderStack = function (engagedIndices) {
            _this.renderStackManager.sync(_this.getDataKey, _this.getItemType, engagedIndices, _this.getDataLength());
        };
        this.getDataKey = this.getDataKey.bind(this);
        this.getItemType = this.getItemType.bind(this);
        this.overrideItemLayout = this.overrideItemLayout.bind(this);
        this.propsRef = props;
        this.engagedIndicesTracker = new EngagedIndicesTracker_1.RVEngagedIndicesTrackerImpl();
        this.renderStackManager = new RenderStackManager_1.RenderStackManager(props.maxItemsInRecyclePool);
        this.itemViewabilityManager = new ViewabilityManager_1.default(this);
    }
    Object.defineProperty(RecyclerViewManager.prototype, "animationOptimizationsEnabled", {
        get: function () {
            return this._animationOptimizationsEnabled;
        },
        set: function (value) {
            this._animationOptimizationsEnabled = value;
            this.renderStackManager.disableRecycling = value;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RecyclerViewManager.prototype, "isOffsetProjectionEnabled", {
        get: function () {
            return this.engagedIndicesTracker.enableOffsetProjection;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RecyclerViewManager.prototype, "isDisposed", {
        get: function () {
            return this._isDisposed;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RecyclerViewManager.prototype, "numColumns", {
        get: function () {
            var _a;
            return (_a = this.propsRef.numColumns) !== null && _a !== void 0 ? _a : 1;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(RecyclerViewManager.prototype, "props", {
        get: function () {
            return this.propsRef;
        },
        enumerable: false,
        configurable: true
    });
    RecyclerViewManager.prototype.setOffsetProjectionEnabled = function (value) {
        this.engagedIndicesTracker.enableOffsetProjection = value;
    };
    RecyclerViewManager.prototype.updateProps = function (props) {
        var _a, _b, _c;
        this.propsRef = props;
        this.engagedIndicesTracker.drawDistance =
            (_a = props.drawDistance) !== null && _a !== void 0 ? _a : this.engagedIndicesTracker.drawDistance;
        this.initialDrawBatchSize =
            (_c = (_b = this.propsRef.overrideProps) === null || _b === void 0 ? void 0 : _b.initialDrawBatchSize) !== null && _c !== void 0 ? _c : this.initialDrawBatchSize;
    };
    /**
     * Updates the scroll offset and returns the engaged indices if any
     * @param offset
     * @param velocity
     */
    RecyclerViewManager.prototype.updateScrollOffset = function (offset, velocity) {
        if (this.layoutManager && !this._isDisposed) {
            var engagedIndices = this.engagedIndicesTracker.updateScrollOffset(offset - this.firstItemOffset, velocity, this.layoutManager);
            if (engagedIndices) {
                this.updateRenderStack(engagedIndices);
                return engagedIndices;
            }
        }
        return undefined;
    };
    RecyclerViewManager.prototype.updateAverageRenderTime = function (time) {
        this.engagedIndicesTracker.averageRenderTime = time;
    };
    RecyclerViewManager.prototype.getIsFirstLayoutComplete = function () {
        return this.isFirstLayoutComplete;
    };
    RecyclerViewManager.prototype.getLayout = function (index) {
        if (!this.layoutManager) {
            throw new Error(ErrorMessages_1.ErrorMessages.layoutManagerNotInitializedLayoutInfo);
        }
        return this.layoutManager.getLayout(index);
    };
    RecyclerViewManager.prototype.tryGetLayout = function (index) {
        if (this.layoutManager &&
            index >= 0 &&
            index < this.layoutManager.getLayoutCount()) {
            return this.layoutManager.getLayout(index);
        }
        return undefined;
    };
    // Doesn't include header / foot etc
    RecyclerViewManager.prototype.getChildContainerDimensions = function () {
        if (!this.layoutManager) {
            throw new Error(ErrorMessages_1.ErrorMessages.layoutManagerNotInitializedChildContainer);
        }
        return this.layoutManager.getLayoutSize();
    };
    RecyclerViewManager.prototype.getRenderStack = function () {
        return this.renderStackManager.getRenderStack();
    };
    RecyclerViewManager.prototype.getWindowSize = function () {
        if (!this.layoutManager) {
            throw new Error(ErrorMessages_1.ErrorMessages.layoutManagerNotInitializedWindowSize);
        }
        return this.layoutManager.getWindowsSize();
    };
    // Includes first item offset correction
    RecyclerViewManager.prototype.getLastScrollOffset = function () {
        return this.engagedIndicesTracker.scrollOffset;
    };
    RecyclerViewManager.prototype.getMaxScrollOffset = function () {
        return Math.max(0, (this.propsRef.horizontal
            ? this.getChildContainerDimensions().width
            : this.getChildContainerDimensions().height) -
            (this.propsRef.horizontal
                ? this.getWindowSize().width
                : this.getWindowSize().height) +
            this.firstItemOffset);
    };
    // Doesn't include first item offset correction
    RecyclerViewManager.prototype.getAbsoluteLastScrollOffset = function () {
        return this.engagedIndicesTracker.scrollOffset + this.firstItemOffset;
    };
    RecyclerViewManager.prototype.setScrollDirection = function (scrollDirection) {
        this.engagedIndicesTracker.setScrollDirection(scrollDirection);
    };
    RecyclerViewManager.prototype.resetVelocityCompute = function () {
        this.engagedIndicesTracker.resetVelocityHistory();
    };
    RecyclerViewManager.prototype.updateLayoutParams = function (windowSize, firstItemOffset) {
        var _a, _b;
        this.firstItemOffset = firstItemOffset;
        var LayoutManagerClass = this.getLayoutManagerClass();
        if (this.layoutManager &&
            Boolean((_a = this.layoutManager) === null || _a === void 0 ? void 0 : _a.isHorizontal()) !==
                Boolean(this.propsRef.horizontal)) {
            throw new Error(ErrorMessages_1.ErrorMessages.horizontalPropCannotBeToggled);
        }
        if (this._isLayoutManagerDirty) {
            this.layoutManager = undefined;
            this._isLayoutManagerDirty = false;
        }
        var layoutManagerParams = {
            windowSize: windowSize,
            maxColumns: this.numColumns,
            horizontal: Boolean(this.propsRef.horizontal),
            optimizeItemArrangement: (_b = this.propsRef.optimizeItemArrangement) !== null && _b !== void 0 ? _b : true,
            overrideItemLayout: this.overrideItemLayout,
            getItemType: this.getItemType,
        };
        if (!(this.layoutManager instanceof LayoutManagerClass)) {
            // console.log("-----> new LayoutManagerClass");
            this.layoutManager = new LayoutManagerClass(layoutManagerParams, this.layoutManager);
        }
        else {
            this.layoutManager.updateLayoutParams(layoutManagerParams);
        }
    };
    RecyclerViewManager.prototype.hasLayout = function () {
        return this.layoutManager !== undefined;
    };
    RecyclerViewManager.prototype.computeVisibleIndices = function () {
        if (!this.layoutManager) {
            throw new Error(ErrorMessages_1.ErrorMessages.layoutManagerNotInitializedVisibleIndices);
        }
        return this.engagedIndicesTracker.computeVisibleIndices(this.layoutManager);
    };
    RecyclerViewManager.prototype.getEngagedIndices = function () {
        return this.engagedIndicesTracker.getEngagedIndices();
    };
    RecyclerViewManager.prototype.modifyChildrenLayout = function (layoutInfo, dataLength) {
        var _a, _b;
        (_a = this.layoutManager) === null || _a === void 0 ? void 0 : _a.modifyLayout(layoutInfo, dataLength);
        if (dataLength === 0) {
            return false;
        }
        if ((_b = this.layoutManager) === null || _b === void 0 ? void 0 : _b.requiresRepaint) {
            // console.log("requiresRepaint triggered");
            this.layoutManager.requiresRepaint = false;
            return true;
        }
        if (this.hasRenderedProgressively) {
            return this.recomputeEngagedIndices() !== undefined;
        }
        else {
            this.renderProgressively();
        }
        return !this.hasRenderedProgressively;
    };
    RecyclerViewManager.prototype.computeItemViewability = function () {
        // Using higher buffer for masonry to avoid missing items
        this.itemViewabilityManager.shouldListenToVisibleIndices &&
            this.itemViewabilityManager.updateViewableItems(this.propsRef.masonry
                ? this.engagedIndicesTracker.getEngagedIndices().toArray()
                : this.computeVisibleIndices().toArray());
    };
    RecyclerViewManager.prototype.recordInteraction = function () {
        this.itemViewabilityManager.recordInteraction();
    };
    RecyclerViewManager.prototype.recomputeViewableItems = function () {
        this.itemViewabilityManager.recomputeViewableItems();
    };
    RecyclerViewManager.prototype.processDataUpdate = function () {
        var _a, _b;
        if (this.hasLayout()) {
            this.modifyChildrenLayout([], (_b = (_a = this.propsRef.data) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0);
            if (this.hasRenderedProgressively && !this.recomputeEngagedIndices()) {
                // recomputeEngagedIndices will update the render stack if there are any changes in the engaged indices.
                // It's important to update render stack so that elements are assgined right keys incase items were deleted.
                this.updateRenderStack(this.engagedIndicesTracker.getEngagedIndices());
            }
        }
    };
    RecyclerViewManager.prototype.recomputeEngagedIndices = function () {
        return this.updateScrollOffset(this.getAbsoluteLastScrollOffset());
    };
    RecyclerViewManager.prototype.restoreIfNeeded = function () {
        if (this._isDisposed) {
            this._isDisposed = false;
        }
    };
    RecyclerViewManager.prototype.dispose = function () {
        this._isDisposed = true;
        this.itemViewabilityManager.dispose();
    };
    RecyclerViewManager.prototype.markLayoutManagerDirty = function () {
        this._isLayoutManagerDirty = true;
    };
    RecyclerViewManager.prototype.getInitialScrollIndex = function () {
        var _a, _b;
        return ((_a = this.propsRef.initialScrollIndex) !== null && _a !== void 0 ? _a : (((_b = this.propsRef.maintainVisibleContentPosition) === null || _b === void 0 ? void 0 : _b.startRenderingFromBottom)
            ? this.getDataLength() - 1
            : undefined));
    };
    RecyclerViewManager.prototype.shouldMaintainVisibleContentPosition = function () {
        var _a;
        // Return true if maintainVisibleContentPosition is enabled and not horizontal
        return (!((_a = this.propsRef.maintainVisibleContentPosition) === null || _a === void 0 ? void 0 : _a.disabled) &&
            !this.propsRef.horizontal);
    };
    RecyclerViewManager.prototype.getDataLength = function () {
        var _a, _b;
        return (_b = (_a = this.propsRef.data) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
    };
    RecyclerViewManager.prototype.hasStableDataKeys = function () {
        return Boolean(this.propsRef.keyExtractor);
    };
    RecyclerViewManager.prototype.getDataKey = function (index) {
        var _a, _b, _c;
        return ((_c = (_b = (_a = this.propsRef).keyExtractor) === null || _b === void 0 ? void 0 : _b.call(_a, this.propsRef.data[index], index)) !== null && _c !== void 0 ? _c : index.toString());
    };
    RecyclerViewManager.prototype.getLayoutManagerClass = function () {
        // throw errors for incompatible props
        if (this.propsRef.masonry && this.propsRef.horizontal) {
            throw new Error(ErrorMessages_1.ErrorMessages.masonryAndHorizontalIncompatible);
        }
        if (this.numColumns > 1 && this.propsRef.horizontal) {
            throw new Error(ErrorMessages_1.ErrorMessages.numColumnsAndHorizontalIncompatible);
        }
        return this.propsRef.masonry
            ? MasonryLayoutManager_1.RVMasonryLayoutManagerImpl
            : this.numColumns > 1 && !this.propsRef.horizontal
                ? GridLayoutManager_1.RVGridLayoutManagerImpl
                : LinearLayoutManager_1.RVLinearLayoutManagerImpl;
    };
    RecyclerViewManager.prototype.applyInitialScrollAdjustment = function () {
        var _a;
        if (!this.layoutManager || this.getDataLength() === 0) {
            return;
        }
        var initialScrollIndex = this.getInitialScrollIndex();
        var initialItemLayout = (_a = this.layoutManager) === null || _a === void 0 ? void 0 : _a.getLayout(initialScrollIndex !== null && initialScrollIndex !== void 0 ? initialScrollIndex : 0);
        var initialItemOffset = this.propsRef.horizontal
            ? initialItemLayout === null || initialItemLayout === void 0 ? void 0 : initialItemLayout.x
            : initialItemLayout === null || initialItemLayout === void 0 ? void 0 : initialItemLayout.y;
        if (initialScrollIndex !== undefined) {
            // console.log(
            //   "initialItemOffset",
            //   initialScrollIndex,
            //   initialItemOffset,
            //   this.firstItemOffset
            // );
            this.layoutManager.recomputeLayouts(0, initialScrollIndex);
            this.engagedIndicesTracker.scrollOffset =
                initialItemOffset !== null && initialItemOffset !== void 0 ? initialItemOffset : 0 + this.firstItemOffset;
        }
        else {
            // console.log("initialItemOffset", initialItemOffset, this.firstItemOffset);
            this.engagedIndicesTracker.scrollOffset =
                (initialItemOffset !== null && initialItemOffset !== void 0 ? initialItemOffset : 0) - this.firstItemOffset;
        }
    };
    RecyclerViewManager.prototype.renderProgressively = function () {
        this.progressiveRenderCount++;
        var layoutManager = this.layoutManager;
        if (layoutManager) {
            this.applyInitialScrollAdjustment();
            var visibleIndices = this.computeVisibleIndices();
            // console.log("---------> visibleIndices", visibleIndices);
            this.hasRenderedProgressively = visibleIndices.every(function (index) {
                return layoutManager.getLayout(index).isHeightMeasured &&
                    layoutManager.getLayout(index).isWidthMeasured;
            });
            if (this.hasRenderedProgressively) {
                this.isFirstLayoutComplete = true;
            }
            var batchSize = this.numColumns *
                Math.pow(this.initialDrawBatchSize, Math.ceil(this.progressiveRenderCount / 5));
            // If everything is measured then render stack will be in sync. The buffer items will get rendered in the next update
            // triggered by the useOnLoad hook.
            !this.hasRenderedProgressively &&
                this.updateRenderStack(
                // pick first n indices from visible ones based on batch size
                visibleIndices.slice(0, Math.min(visibleIndices.length, this.getRenderStack().size + batchSize)));
        }
    };
    RecyclerViewManager.prototype.getItemType = function (index) {
        var _a, _b, _c;
        return ((_c = (_b = (_a = this.propsRef).getItemType) === null || _b === void 0 ? void 0 : _b.call(_a, this.propsRef.data[index], index)) !== null && _c !== void 0 ? _c : "default").toString();
    };
    RecyclerViewManager.prototype.overrideItemLayout = function (index, layout) {
        var _a, _b;
        (_b = (_a = this.propsRef) === null || _a === void 0 ? void 0 : _a.overrideItemLayout) === null || _b === void 0 ? void 0 : _b.call(_a, layout, this.propsRef.data[index], index, this.numColumns, this.propsRef.extraData);
    };
    return RecyclerViewManager;
}());
exports.RecyclerViewManager = RecyclerViewManager;
//# sourceMappingURL=RecyclerViewManager.js.map