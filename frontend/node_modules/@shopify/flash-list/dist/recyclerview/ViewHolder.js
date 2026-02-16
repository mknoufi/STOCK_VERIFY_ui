"use strict";
/**
 * ViewHolder is a core component in FlashList that manages individual item rendering and layout.
 * It handles the rendering of list items, separators, and manages layout updates for each item.
 * The component is memoized to prevent unnecessary re-renders and includes layout comparison logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViewHolder = void 0;
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var CompatView_1 = require("./components/CompatView");
/**
 * Internal ViewHolder component that handles the actual rendering of list items
 * @template TItem - The type of item being rendered in the list
 */
var ViewHolderInternal = function (props) {
    // create ref for View
    var viewRef = (0, react_1.useRef)(null);
    var index = props.index, refHolder = props.refHolder, layout = props.layout, onSizeChanged = props.onSizeChanged, renderItem = props.renderItem, extraData = props.extraData, item = props.item, target = props.target, CellRendererComponent = props.CellRendererComponent, ItemSeparatorComponent = props.ItemSeparatorComponent, trailingItem = props.trailingItem, horizontal = props.horizontal;
    (0, react_1.useLayoutEffect)(function () {
        refHolder.set(index, viewRef);
        return function () {
            if (refHolder.get(index) === viewRef) {
                refHolder.delete(index);
            }
        };
    }, [index, refHolder]);
    var onLayout = (0, react_1.useCallback)(function (event) {
        onSizeChanged === null || onSizeChanged === void 0 ? void 0 : onSizeChanged(index, event.nativeEvent.layout);
    }, [index, onSizeChanged]);
    var separator = (0, react_1.useMemo)(function () {
        return ItemSeparatorComponent && trailingItem !== undefined ? (react_1.default.createElement(ItemSeparatorComponent, { leadingItem: item, trailingItem: trailingItem })) : null;
    }, [ItemSeparatorComponent, item, trailingItem]);
    // console.log("ViewHolder re-render", index);
    var children = (0, react_1.useMemo)(function () {
        var _a;
        return (_a = renderItem === null || renderItem === void 0 ? void 0 : renderItem({ item: item, index: index, extraData: extraData, target: target })) !== null && _a !== void 0 ? _a : null;
        // TODO: Test more thoroughly
        // We don't really  to re-render the children when the index changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item, extraData, target, renderItem]);
    var style = {
        flexDirection: horizontal ? "row" : "column",
        position: target === "StickyHeader" ? "relative" : "absolute",
        width: layout.enforcedWidth ? layout.width : undefined,
        height: layout.enforcedHeight ? layout.height : undefined,
        minHeight: layout.minHeight,
        minWidth: layout.minWidth,
        maxHeight: layout.maxHeight,
        maxWidth: layout.maxWidth,
        left: layout.x,
        top: layout.y,
    };
    // TODO: Fix this type issue
    var CompatContainer = (CellRendererComponent !== null && CellRendererComponent !== void 0 ? CellRendererComponent : CompatView_1.CompatView);
    return (react_1.default.createElement(CompatContainer, { ref: viewRef, onLayout: onLayout, style: style, index: index },
        children,
        separator));
};
/**
 * Memoized ViewHolder component that prevents unnecessary re-renders by comparing props
 * @template TItem - The type of item being rendered in the list
 */
exports.ViewHolder = react_1.default.memo(ViewHolderInternal, function (prevProps, nextProps) {
    // compare all props and spread layout
    return (prevProps.index === nextProps.index &&
        areLayoutsEqual(prevProps.layout, nextProps.layout) &&
        prevProps.refHolder === nextProps.refHolder &&
        prevProps.onSizeChanged === nextProps.onSizeChanged &&
        prevProps.extraData === nextProps.extraData &&
        prevProps.target === nextProps.target &&
        prevProps.item === nextProps.item &&
        prevProps.renderItem === nextProps.renderItem &&
        prevProps.CellRendererComponent === nextProps.CellRendererComponent &&
        prevProps.ItemSeparatorComponent === nextProps.ItemSeparatorComponent &&
        prevProps.trailingItem === nextProps.trailingItem &&
        prevProps.horizontal === nextProps.horizontal);
});
/**
 * Compares two RVLayout objects to determine if they are equal
 * Used in the memo comparison function to prevent unnecessary re-renders
 * @param prevLayout - Previous layout object
 * @param nextLayout - Next layout object
 * @returns boolean indicating if layouts are equal
 */
function areLayoutsEqual(prevLayout, nextLayout) {
    return (prevLayout.x === nextLayout.x &&
        prevLayout.y === nextLayout.y &&
        prevLayout.width === nextLayout.width &&
        prevLayout.height === nextLayout.height &&
        prevLayout.enforcedWidth === nextLayout.enforcedWidth &&
        prevLayout.enforcedHeight === nextLayout.enforcedHeight &&
        prevLayout.minWidth === nextLayout.minWidth &&
        prevLayout.minHeight === nextLayout.minHeight &&
        prevLayout.maxWidth === nextLayout.maxWidth &&
        prevLayout.maxHeight === nextLayout.maxHeight);
}
//# sourceMappingURL=ViewHolder.js.map