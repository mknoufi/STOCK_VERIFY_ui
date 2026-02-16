"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUnmountFlag = void 0;
var react_1 = require("react");
/**
 * Hook that provides a way to track component unmounting state.
 * This hook is particularly useful for preventing state updates or side effects
 * after a component has unmounted, helping to avoid memory leaks and race conditions.
 *
 * @returns A ref containing a boolean flag that indicates whether the component is unmounted
 *         (true) or mounted (false)
 */
var useUnmountFlag = function () {
    // Create a ref to store the unmount state
    // Using ref ensures the value persists between renders without causing re-renders
    var isUnmounted = (0, react_1.useRef)(false);
    // Use layoutEffect to set up cleanup on unmount
    // This ensures the flag is set before any other cleanup effects run
    (0, react_1.useLayoutEffect)(function () {
        isUnmounted.current = false;
        // Cleanup function that runs when the component unmounts
        return function () {
            isUnmounted.current = true;
        };
    }, []);
    return isUnmounted;
};
exports.useUnmountFlag = useUnmountFlag;
//# sourceMappingURL=useUnmountFlag.js.map