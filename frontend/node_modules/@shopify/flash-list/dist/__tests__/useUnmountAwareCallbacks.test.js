"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importDefault(require("react"));
var react_testing_1 = require("@quilted/react-testing");
var useUnmountAwareCallbacks_1 = require("../recyclerview/hooks/useUnmountAwareCallbacks");
var TestComponent = function (_a) {
    var onRender = _a.onRender;
    var api = (0, useUnmountAwareCallbacks_1.useUnmountAwareTimeout)();
    onRender(api);
    return null;
};
describe("useUnmountAwareCallbacks", function () {
    beforeEach(function () {
        jest.useFakeTimers();
    });
    afterEach(function () {
        jest.clearAllTimers();
        jest.clearAllMocks();
    });
    it("returns a setTimeout function", function () {
        var api;
        (0, react_testing_1.render)(react_1.default.createElement(TestComponent, { onRender: function (hookApi) {
                api = hookApi;
            } }));
        expect(api).toBeDefined();
        expect(api === null || api === void 0 ? void 0 : api.setTimeout).toBeDefined();
        expect(typeof (api === null || api === void 0 ? void 0 : api.setTimeout)).toBe("function");
    });
    it("executes the callback after the specified delay", function () {
        var callback = jest.fn();
        var api;
        (0, react_testing_1.render)(react_1.default.createElement(TestComponent, { onRender: function (hookApi) {
                api = hookApi;
            } }));
        api === null || api === void 0 ? void 0 : api.setTimeout(callback, 1000);
        expect(callback).not.toHaveBeenCalled();
        // Fast-forward time
        jest.advanceTimersByTime(1000);
        expect(callback).toHaveBeenCalledTimes(1);
    });
    it("executes multiple callbacks after their respective delays", function () {
        var callback1 = jest.fn();
        var callback2 = jest.fn();
        var api;
        (0, react_testing_1.render)(react_1.default.createElement(TestComponent, { onRender: function (hookApi) {
                api = hookApi;
            } }));
        api === null || api === void 0 ? void 0 : api.setTimeout(callback1, 1000);
        api === null || api === void 0 ? void 0 : api.setTimeout(callback2, 2000);
        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();
        // Fast-forward time by 1000ms
        jest.advanceTimersByTime(1000);
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).not.toHaveBeenCalled();
        // Fast-forward time by another 1000ms
        jest.advanceTimersByTime(1000);
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).toHaveBeenCalledTimes(1);
    });
    it("clears all timeouts when the component unmounts", function () {
        var callback = jest.fn();
        var api;
        var component = (0, react_testing_1.render)(react_1.default.createElement(TestComponent, { onRender: function (hookApi) {
                api = hookApi;
            } }));
        api === null || api === void 0 ? void 0 : api.setTimeout(callback, 1000);
        api === null || api === void 0 ? void 0 : api.setTimeout(callback, 2000);
        // Spy on clearTimeout to verify it's called during unmount
        var clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
        // Unmount the component
        component.unmount();
        // Fast-forward time
        jest.advanceTimersByTime(2000);
        // Expect callbacks not to be called because timeouts were cleared
        expect(callback).not.toHaveBeenCalled();
        expect(clearTimeoutSpy).toHaveBeenCalled();
    });
    it("removes timeout from tracking set once it executes", function () {
        var callback = jest.fn();
        var api;
        var component = (0, react_testing_1.render)(react_1.default.createElement(TestComponent, { onRender: function (hookApi) {
                api = hookApi;
            } }));
        api === null || api === void 0 ? void 0 : api.setTimeout(callback, 1000);
        // Fast-forward time
        jest.advanceTimersByTime(1000);
        // Verify callback was called
        expect(callback).toHaveBeenCalledTimes(1);
        // We can't directly check the timeoutIds Set, so we'll verify indirectly
        // by making sure no clearTimeout calls happen on unmount (since the timeout was already cleared)
        var clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
        clearTimeoutSpy.mockClear(); // Reset the mock calls before unmount
        // Unmount the component
        component.unmount();
        // If the timeout was properly removed from the set, clearTimeout won't be called on unmount
        expect(clearTimeoutSpy).not.toHaveBeenCalled();
    });
    it("handles multiple timeouts correctly", function () {
        var callback1 = jest.fn();
        var callback2 = jest.fn();
        var callback3 = jest.fn();
        var api;
        var component = (0, react_testing_1.render)(react_1.default.createElement(TestComponent, { onRender: function (hookApi) {
                api = hookApi;
            } }));
        // Set up three timeouts with different delays
        api === null || api === void 0 ? void 0 : api.setTimeout(callback1, 1000);
        api === null || api === void 0 ? void 0 : api.setTimeout(callback2, 2000);
        api === null || api === void 0 ? void 0 : api.setTimeout(callback3, 3000);
        // Fast-forward time by 1500ms (should trigger only the first callback)
        jest.advanceTimersByTime(1500);
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).not.toHaveBeenCalled();
        expect(callback3).not.toHaveBeenCalled();
        // Unmount the component (should clear remaining timeouts)
        component.unmount();
        // Fast-forward time to when all callbacks would have been called
        jest.advanceTimersByTime(2000);
        // Only the first callback should have been called
        expect(callback1).toHaveBeenCalledTimes(1);
        expect(callback2).not.toHaveBeenCalled();
        expect(callback3).not.toHaveBeenCalled();
    });
    it("handles callbacks that trigger new timeouts", function () {
        var finalCallback = jest.fn();
        var api;
        (0, react_testing_1.render)(react_1.default.createElement(TestComponent, { onRender: function (hookApi) {
                api = hookApi;
            } }));
        var firstCallback = function () {
            api === null || api === void 0 ? void 0 : api.setTimeout(finalCallback, 1000);
        };
        api === null || api === void 0 ? void 0 : api.setTimeout(firstCallback, 1000);
        // Fast-forward time to trigger first callback
        jest.advanceTimersByTime(1000);
        expect(finalCallback).not.toHaveBeenCalled();
        // Fast-forward time to trigger second callback
        jest.advanceTimersByTime(1000);
        expect(finalCallback).toHaveBeenCalledTimes(1);
    });
    it("handles zero delay timeouts", function () {
        var callback = jest.fn();
        var api;
        (0, react_testing_1.render)(react_1.default.createElement(TestComponent, { onRender: function (hookApi) {
                api = hookApi;
            } }));
        api === null || api === void 0 ? void 0 : api.setTimeout(callback, 0);
        expect(callback).not.toHaveBeenCalled();
        // Even with zero delay, we need to advance the timer to execute
        jest.advanceTimersByTime(0);
        expect(callback).toHaveBeenCalledTimes(1);
    });
    it("handles errors in callbacks without affecting other timeouts", function () {
        var errorCallback = jest.fn(function () {
            throw new Error("Test error");
        });
        var successCallback = jest.fn();
        var api;
        // Suppress error log during test
        var originalConsoleError = console.error;
        console.error = jest.fn();
        (0, react_testing_1.render)(react_1.default.createElement(TestComponent, { onRender: function (hookApi) {
                api = hookApi;
            } }));
        api === null || api === void 0 ? void 0 : api.setTimeout(errorCallback, 1000);
        api === null || api === void 0 ? void 0 : api.setTimeout(successCallback, 2000);
        // Fast-forward time to trigger error callback
        try {
            jest.advanceTimersByTime(1000);
        }
        catch (error) {
            // Expected error
        }
        expect(errorCallback).toHaveBeenCalledTimes(1);
        expect(successCallback).not.toHaveBeenCalled();
        // Fast-forward time to trigger success callback
        jest.advanceTimersByTime(1000);
        expect(successCallback).toHaveBeenCalledTimes(1);
        // Restore console.error
        console.error = originalConsoleError;
    });
});
//# sourceMappingURL=useUnmountAwareCallbacks.test.js.map