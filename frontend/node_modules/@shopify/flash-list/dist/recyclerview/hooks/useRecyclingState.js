"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRecyclingState = useRecyclingState;
var tslib_1 = require("tslib");
var react_1 = require("react");
var useLayoutState_1 = require("./useLayoutState");
/**
 * A custom hook that provides state management with automatic reset functionality.
 * Similar to useState, but automatically resets the state when specified dependencies change.
 * This is particularly useful for managing state that needs to be reset when certain props or values change when items are recycled.
 * This also avoids another setState call on recycling and helps with performance.
 *
 * @param initialState - The initial state value or a function that returns the initial state
 * @param deps - Array of dependencies that trigger a state reset when changed
 * @param onReset - Optional callback function that is called when the state is reset
 * @returns A tuple containing:
 *   - The current state value
 *   - A setState function that works like useState's setState
 */
function useRecyclingState(initialState, deps, onReset) {
    // Store the current state value in a ref to persist between renders
    var valueStore = (0, react_1.useRef)();
    // Use layoutState to trigger re-renders when state changes
    var _a = tslib_1.__read((0, useLayoutState_1.useLayoutState)(0), 2), _ = _a[0], setCounter = _a[1];
    // Reset state when dependencies change
    (0, react_1.useMemo)(function () {
        // Calculate initial value from function or direct value
        var initialValue = typeof initialState === "function"
            ? initialState()
            : initialState;
        valueStore.current = initialValue;
        // Call onReset callback if provided
        onReset === null || onReset === void 0 ? void 0 : onReset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    /**
     * Proxy setState function that updates the stored value and triggers a re-render.
     * Only triggers a re-render if the new value is different from the current value.
     */
    var setStateProxy = (0, react_1.useCallback)(function (newValue, skipParentLayout) {
        // Calculate next state value from function or direct value
        var nextState = typeof newValue === "function"
            ? newValue(valueStore.current)
            : newValue;
        // Only update and trigger re-render if value has changed
        if (nextState !== valueStore.current) {
            valueStore.current = nextState;
            setCounter(function (prev) { return prev + 1; }, skipParentLayout);
        }
    }, [setCounter]);
    return [valueStore.current, setStateProxy];
}
//# sourceMappingURL=useRecyclingState.js.map