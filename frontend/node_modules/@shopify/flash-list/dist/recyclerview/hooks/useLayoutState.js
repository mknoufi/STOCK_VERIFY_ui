"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLayoutState = useLayoutState;
var tslib_1 = require("tslib");
var react_1 = require("react");
var RecyclerViewContextProvider_1 = require("../RecyclerViewContextProvider");
/**
 * Custom hook that combines state management with RecyclerView layout updates.
 * This hook provides a way to manage state that affects the layout of the RecyclerView,
 * ensuring that any state changes trigger a layout recalculation.
 *
 * @param initialState - The initial state value or a function that returns the initial state
 * @returns A tuple containing:
 *   - The current state value
 *   - A setter function that updates the state and triggers a layout recalculation
 */
function useLayoutState(initialState) {
    // Initialize state with the provided initial value
    var _a = tslib_1.__read((0, react_1.useState)(initialState), 2), state = _a[0], setState = _a[1];
    // Get the RecyclerView context for layout management
    var recyclerViewContext = (0, RecyclerViewContextProvider_1.useRecyclerViewContext)();
    /**
     * Setter function that updates the state and triggers a layout recalculation.
     * This ensures that any state changes that affect the layout are properly reflected
     * in the RecyclerView's visual representation.
     *
     * @param newValue - Either a new state value or a function that receives the previous state
     *                   and returns the new state
     */
    var setLayoutState = (0, react_1.useCallback)(function (newValue, skipParentLayout) {
        // Update the state using either the new value or the result of the updater function
        setState(function (prevValue) {
            return typeof newValue === "function"
                ? newValue(prevValue)
                : newValue;
        });
        if (!skipParentLayout) {
            // Trigger a layout recalculation in the RecyclerView
            recyclerViewContext === null || recyclerViewContext === void 0 ? void 0 : recyclerViewContext.layout();
        }
    }, [recyclerViewContext]);
    return [state, setLayoutState];
}
//# sourceMappingURL=useLayoutState.js.map