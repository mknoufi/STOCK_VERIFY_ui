"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSecondaryProps = useSecondaryProps;
var tslib_1 = require("tslib");
var react_native_1 = require("react-native");
var react_1 = tslib_1.__importStar(require("react"));
var componentUtils_1 = require("../utils/componentUtils");
var CompatView_1 = require("../components/CompatView");
var CompatScroller_1 = require("../components/CompatScroller");
/**
 * Hook that manages secondary props and components for the RecyclerView.
 * This hook handles the creation and management of:
 * 1. Pull-to-refresh functionality
 * 2. Header and footer components
 * 3. Empty state component
 * 4. Custom scroll component with animation support
 *
 * @param props - The RecyclerViewProps containing all configuration options
 * @returns An object containing:
 *   - refreshControl: The pull-to-refresh control component
 *   - renderHeader: The header component renderer
 *   - renderFooter: The footer component renderer
 *   - renderEmpty: The empty state component renderer
 *   - CompatScrollView: The animated scroll component
 */
function useSecondaryProps(props) {
    var ListHeaderComponent = props.ListHeaderComponent, ListHeaderComponentStyle = props.ListHeaderComponentStyle, ListFooterComponent = props.ListFooterComponent, ListFooterComponentStyle = props.ListFooterComponentStyle, ListEmptyComponent = props.ListEmptyComponent, renderScrollComponent = props.renderScrollComponent, refreshing = props.refreshing, progressViewOffset = props.progressViewOffset, onRefresh = props.onRefresh, data = props.data, customRefreshControl = props.refreshControl;
    /**
     * Creates the refresh control component if onRefresh is provided.
     */
    var refreshControl = (0, react_1.useMemo)(function () {
        if (customRefreshControl) {
            return customRefreshControl;
        }
        else if (onRefresh) {
            return (react_1.default.createElement(react_native_1.RefreshControl, { refreshing: Boolean(refreshing), progressViewOffset: progressViewOffset, onRefresh: onRefresh }));
        }
        return undefined;
    }, [onRefresh, refreshing, progressViewOffset, customRefreshControl]);
    /**
     * Creates the header component with optional styling.
     */
    var renderHeader = (0, react_1.useMemo)(function () {
        if (!ListHeaderComponent) {
            return null;
        }
        return (react_1.default.createElement(CompatView_1.CompatView, { style: ListHeaderComponentStyle }, (0, componentUtils_1.getValidComponent)(ListHeaderComponent)));
    }, [ListHeaderComponent, ListHeaderComponentStyle]);
    /**
     * Creates the footer component with optional styling.
     */
    var renderFooter = (0, react_1.useMemo)(function () {
        if (!ListFooterComponent) {
            return null;
        }
        return (react_1.default.createElement(CompatView_1.CompatView, { style: ListFooterComponentStyle }, (0, componentUtils_1.getValidComponent)(ListFooterComponent)));
    }, [ListFooterComponent, ListFooterComponentStyle]);
    /**
     * Creates the empty state component when there's no data.
     * Only rendered when ListEmptyComponent is provided and data is empty.
     */
    var renderEmpty = (0, react_1.useMemo)(function () {
        if (!ListEmptyComponent || (data && data.length > 0)) {
            return null;
        }
        return (0, componentUtils_1.getValidComponent)(ListEmptyComponent);
    }, [ListEmptyComponent, data]);
    /**
     * Creates an animated scroll component based on the provided renderScrollComponent.
     * If no custom component is provided, uses the default CompatAnimatedScroller.
     */
    var CompatScrollView = (0, react_1.useMemo)(function () {
        var scrollComponent = CompatScroller_1.CompatAnimatedScroller;
        if (typeof renderScrollComponent === "function") {
            // Create a forwarded ref wrapper for the custom scroll component
            var ForwardedScrollComponent = react_1.default.forwardRef(function (_props, ref) {
                return renderScrollComponent(tslib_1.__assign(tslib_1.__assign({}, _props), { ref: ref }));
            });
            ForwardedScrollComponent.displayName = "CustomScrollView";
            scrollComponent = ForwardedScrollComponent;
        }
        else if (renderScrollComponent) {
            scrollComponent = renderScrollComponent;
        }
        // Wrap the scroll component with Animated.createAnimatedComponent
        return react_native_1.Animated.createAnimatedComponent(scrollComponent);
    }, [renderScrollComponent]);
    return {
        refreshControl: refreshControl,
        renderHeader: renderHeader,
        renderFooter: renderFooter,
        renderEmpty: renderEmpty,
        CompatScrollView: CompatScrollView,
    };
}
//# sourceMappingURL=useSecondaryProps.js.map