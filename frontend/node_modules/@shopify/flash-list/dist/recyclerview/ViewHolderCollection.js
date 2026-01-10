"use strict";
/**
 * ViewHolderCollection is a container component that manages multiple ViewHolder instances.
 * It handles the rendering of a collection of list items, manages layout updates,
 * and coordinates with the RecyclerView context for layout changes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewHolderCollection = void 0;
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var ViewHolder_1 = require("./ViewHolder");
var CompatView_1 = require("./components/CompatView");
var RecyclerViewContextProvider_1 = require("./RecyclerViewContextProvider");
/**
 * ViewHolderCollection component that manages the rendering of multiple ViewHolder instances
 * and handles layout updates for the entire collection
 * @template TItem - The type of items in the data array
 */
var ViewHolderCollection = function (props) {
    var data = props.data, renderStack = props.renderStack, getLayout = props.getLayout, refHolder = props.refHolder, onSizeChanged = props.onSizeChanged, renderItem = props.renderItem, extraData = props.extraData, viewHolderCollectionRef = props.viewHolderCollectionRef, getChildContainerLayout = props.getChildContainerLayout, onCommitLayoutEffect = props.onCommitLayoutEffect, CellRendererComponent = props.CellRendererComponent, ItemSeparatorComponent = props.ItemSeparatorComponent, onCommitEffect = props.onCommitEffect, horizontal = props.horizontal, getAdjustmentMargin = props.getAdjustmentMargin;
    var _a = tslib_1.__read(react_1.default.useState(0), 2), renderId = _a[0], setRenderId = _a[1];
    var containerLayout = getChildContainerLayout();
    var fixedContainerSize = horizontal
        ? containerLayout === null || containerLayout === void 0 ? void 0 : containerLayout.height
        : containerLayout === null || containerLayout === void 0 ? void 0 : containerLayout.width;
    var recyclerViewContext = (0, RecyclerViewContextProvider_1.useRecyclerViewContext)();
    (0, react_1.useLayoutEffect)(function () {
        if (renderId > 0) {
            // console.log(
            //   "parent layout trigger due to child container size change",
            //   fixedContainerSize
            // );
            recyclerViewContext === null || recyclerViewContext === void 0 ? void 0 : recyclerViewContext.layout();
        }
        // we need to run this callback on when fixedContainerSize changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fixedContainerSize]);
    (0, react_1.useLayoutEffect)(function () {
        if (renderId > 0) {
            onCommitLayoutEffect === null || onCommitLayoutEffect === void 0 ? void 0 : onCommitLayoutEffect();
        }
        // we need to run this callback on when renderId changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renderId]);
    (0, react_1.useEffect)(function () {
        if (renderId > 0) {
            onCommitEffect === null || onCommitEffect === void 0 ? void 0 : onCommitEffect();
        }
        // we need to run this callback on when renderId changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renderId]);
    // Expose forceUpdate through ref
    (0, react_1.useImperativeHandle)(viewHolderCollectionRef, function () { return ({
        commitLayout: function () {
            // This will trigger a re-render of the component
            setRenderId(function (prev) { return prev + 1; });
        },
    }); }, [setRenderId]);
    var hasData = data && data.length > 0;
    var containerStyle = {
        width: horizontal ? containerLayout === null || containerLayout === void 0 ? void 0 : containerLayout.width : undefined,
        height: containerLayout === null || containerLayout === void 0 ? void 0 : containerLayout.height,
        marginTop: horizontal ? undefined : getAdjustmentMargin(),
        marginLeft: horizontal ? getAdjustmentMargin() : undefined,
        // TODO: Temp workaround, useLayoutEffect doesn't block paint in some cases
        // We need to investigate why this is happening
        opacity: renderId > 0 ? 1 : 0,
    };
    // sort by index and log
    // const sortedRenderStack = Array.from(renderStack.entries()).sort(
    //   ([, a], [, b]) => a.index - b.index
    // );
    // console.log(
    //   "sortedRenderStack",
    //   sortedRenderStack.map(([reactKey, { index }]) => {
    //     return `${index} => ${reactKey}`;
    //   })
    // );
    return (react_1.default.createElement(CompatView_1.CompatView, { style: hasData && containerStyle }, containerLayout &&
        hasData &&
        Array.from(renderStack.entries(), function (_a) {
            var _b = tslib_1.__read(_a, 2), reactKey = _b[0], index = _b[1].index;
            var item = data[index];
            var trailingItem = ItemSeparatorComponent
                ? data[index + 1]
                : undefined;
            return (react_1.default.createElement(ViewHolder_1.ViewHolder, { key: reactKey, index: index, item: item, trailingItem: trailingItem, layout: tslib_1.__assign({}, getLayout(index)), refHolder: refHolder, onSizeChanged: onSizeChanged, target: "Cell", renderItem: renderItem, extraData: extraData, CellRendererComponent: CellRendererComponent, ItemSeparatorComponent: ItemSeparatorComponent, horizontal: horizontal }));
        })));
};
exports.ViewHolderCollection = ViewHolderCollection;
//# sourceMappingURL=ViewHolderCollection.js.map