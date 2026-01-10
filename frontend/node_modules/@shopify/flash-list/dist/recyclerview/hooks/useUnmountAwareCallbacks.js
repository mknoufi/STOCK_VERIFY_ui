"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUnmountAwareTimeout = useUnmountAwareTimeout;
exports.useUnmountAwareAnimationFrame = useUnmountAwareAnimationFrame;
var tslib_1 = require("tslib");
var react_1 = require("react");
/**
 * Hook that provides a setTimeout which is aware of component unmount state.
 * Any timeouts created with this hook will be automatically cleared when the component unmounts.
 */
function useUnmountAwareTimeout() {
    // Store active timeout IDs in a Set for more efficient add/remove operations
    var _a = tslib_1.__read((0, react_1.useState)(function () { return new Set(); }), 1), timeoutIds = _a[0];
    // Clear all timeouts on unmount
    (0, react_1.useEffect)(function () {
        return function () {
            timeoutIds.forEach(function (id) { return global.clearTimeout(id); });
            timeoutIds.clear();
        };
    }, [timeoutIds]);
    // Create a safe setTimeout that will be cleared on unmount
    var setTimeout = (0, react_1.useCallback)(function (callback, delay) {
        var id = global.setTimeout(function () {
            // Remove this timeout ID from the tracking set
            timeoutIds.delete(id);
            callback();
        }, delay);
        // Track this timeout ID
        timeoutIds.add(id);
    }, [timeoutIds]);
    return {
        setTimeout: setTimeout,
    };
}
/**
 * Hook that provides a requestAnimationFrame which is aware of component unmount state.
 * Any animation frames requested with this hook will be automatically canceled when the component unmounts.
 */
function useUnmountAwareAnimationFrame() {
    // Store active animation frame request IDs in a Set for more efficient add/remove operations
    var _a = tslib_1.__read((0, react_1.useState)(function () { return new Set(); }), 1), requestIds = _a[0];
    // Cancel all animation frame requests on unmount
    (0, react_1.useEffect)(function () {
        return function () {
            requestIds.forEach(function (id) { return cancelAnimationFrame(id); });
            requestIds.clear();
        };
    }, [requestIds]);
    // Create a safe requestAnimationFrame that will be canceled on unmount
    var requestAnimationFrame = (0, react_1.useCallback)(function (callback) {
        var id = global.requestAnimationFrame(function (timestamp) {
            // Remove this request ID from the tracking set
            requestIds.delete(id);
            callback(timestamp);
        });
        // Track this request ID
        requestIds.add(id);
    }, [requestIds]);
    return {
        requestAnimationFrame: requestAnimationFrame,
    };
}
//# sourceMappingURL=useUnmountAwareCallbacks.js.map