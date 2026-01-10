"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useOnLoad = exports.useOnListLoad = void 0;
var tslib_1 = require("tslib");
var react_1 = require("react");
var useUnmountAwareCallbacks_1 = require("./useUnmountAwareCallbacks");
// import { ToastAndroid } from "react-native";
/**
 * Hook to track when the RecyclerView has loaded its items and notify when loading is complete.
 * Similar to FlashList's onLoad functionality, this hook tracks the time it takes to render
 * the initial set of items in the RecyclerView and provides performance metrics.
 *
 * @param recyclerViewManager - The RecyclerViewManager instance managing the list
 * @param onLoad - Optional callback function that will be called when the list has loaded with timing information
 * @returns Object containing isLoaded state indicating whether the list has completed initial rendering
 */
var useOnListLoad = function (recyclerViewManager, onLoad) {
    var loadStartTimeRef = (0, react_1.useRef)(Date.now());
    var _a = tslib_1.__read((0, react_1.useState)(false), 2), isLoaded = _a[0], setIsLoaded = _a[1];
    var dataLength = recyclerViewManager.getDataLength();
    // const dataCollector = useRef<number[]>([]);
    var requestAnimationFrame = (0, useUnmountAwareCallbacks_1.useUnmountAwareAnimationFrame)().requestAnimationFrame;
    // Track render cycles by collecting elapsed time on each render
    // useEffect(() => {
    //   const elapsedTimeInMs = Date.now() - loadStartTimeRef.current;
    //   dataCollector.current?.push(elapsedTimeInMs);
    // });
    (0, react_1.useMemo)(function () {
        loadStartTimeRef.current = Date.now();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataLength]);
    (0, exports.useOnLoad)(recyclerViewManager, function () {
        var elapsedTimeInMs = Date.now() - loadStartTimeRef.current;
        // Commented code below was used for debugging purposes
        // to display all collected timing data points
        // const dataCollectorString = dataCollector.current
        //   ?.map((value) => value.toString())
        //   .join(", ");
        // ToastAndroid?.show(
        //   `onLoad called after ${dataCollectorString}`,
        //   ToastAndroid.SHORT
        // );
        // console.log("----------> dataCollector", dataCollectorString);
        // console.log("----------> FlashList v2 load in", `${elapsedTimeInMs} ms`);
        requestAnimationFrame(function () {
            onLoad === null || onLoad === void 0 ? void 0 : onLoad({ elapsedTimeInMs: elapsedTimeInMs });
            setIsLoaded(true);
        });
    });
    return { isLoaded: isLoaded };
};
exports.useOnListLoad = useOnListLoad;
/**
 * Core hook that detects when a RecyclerView has completed its initial layout.
 * This hook monitors the RecyclerViewManager and triggers the provided callback
 * once the first layout is complete.
 *
 * @param recyclerViewManager - The RecyclerViewManager instance to monitor
 * @param onLoad - Callback function that will be called once when the first layout is complete
 */
var useOnLoad = function (recyclerViewManager, onLoad) {
    var isLoaded = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(function () {
        // Only trigger onLoad callback once when first layout is complete
        if (recyclerViewManager.getIsFirstLayoutComplete() && !isLoaded.current) {
            isLoaded.current = true;
            onLoad();
        }
    });
};
exports.useOnLoad = useOnLoad;
//# sourceMappingURL=useOnLoad.js.map