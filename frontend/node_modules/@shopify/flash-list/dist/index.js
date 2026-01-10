"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LayoutCommitObserver = exports.useFlashListContext = exports.Cancellable = exports.autoScroll = exports.JSFPSMonitor = exports.useMappingHelper = exports.useRecyclingState = exports.useLayoutState = exports.useFlatListBenchmark = exports.useDataMultiplier = exports.useBenchmark = exports.AnimatedFlashList = exports.RenderTargetOptions = exports.FlashList = void 0;
var tslib_1 = require("tslib");
// Keep this unmodified for TS type checking
var isNewArch_1 = require("./isNewArch");
var ErrorMessages_1 = require("./errors/ErrorMessages");
var FlashList_1 = require("./FlashList");
Object.defineProperty(exports, "FlashList", { enumerable: true, get: function () { return FlashList_1.FlashList; } });
var FlashListProps_1 = require("./FlashListProps");
Object.defineProperty(exports, "RenderTargetOptions", { enumerable: true, get: function () { return FlashListProps_1.RenderTargetOptions; } });
var AnimatedFlashList_1 = require("./AnimatedFlashList");
Object.defineProperty(exports, "AnimatedFlashList", { enumerable: true, get: function () { return tslib_1.__importDefault(AnimatedFlashList_1).default; } });
var useBenchmark_1 = require("./benchmark/useBenchmark");
Object.defineProperty(exports, "useBenchmark", { enumerable: true, get: function () { return useBenchmark_1.useBenchmark; } });
var useDataMultiplier_1 = require("./benchmark/useDataMultiplier");
Object.defineProperty(exports, "useDataMultiplier", { enumerable: true, get: function () { return useDataMultiplier_1.useDataMultiplier; } });
var useFlatListBenchmark_1 = require("./benchmark/useFlatListBenchmark");
Object.defineProperty(exports, "useFlatListBenchmark", { enumerable: true, get: function () { return useFlatListBenchmark_1.useFlatListBenchmark; } });
var useLayoutState_1 = require("./recyclerview/hooks/useLayoutState");
Object.defineProperty(exports, "useLayoutState", { enumerable: true, get: function () { return useLayoutState_1.useLayoutState; } });
var useRecyclingState_1 = require("./recyclerview/hooks/useRecyclingState");
Object.defineProperty(exports, "useRecyclingState", { enumerable: true, get: function () { return useRecyclingState_1.useRecyclingState; } });
var useMappingHelper_1 = require("./recyclerview/hooks/useMappingHelper");
Object.defineProperty(exports, "useMappingHelper", { enumerable: true, get: function () { return useMappingHelper_1.useMappingHelper; } });
var JSFPSMonitor_1 = require("./benchmark/JSFPSMonitor");
Object.defineProperty(exports, "JSFPSMonitor", { enumerable: true, get: function () { return JSFPSMonitor_1.JSFPSMonitor; } });
var AutoScrollHelper_1 = require("./benchmark/AutoScrollHelper");
Object.defineProperty(exports, "autoScroll", { enumerable: true, get: function () { return AutoScrollHelper_1.autoScroll; } });
Object.defineProperty(exports, "Cancellable", { enumerable: true, get: function () { return AutoScrollHelper_1.Cancellable; } });
var RecyclerViewContextProvider_1 = require("./recyclerview/RecyclerViewContextProvider");
Object.defineProperty(exports, "useFlashListContext", { enumerable: true, get: function () { return RecyclerViewContextProvider_1.useFlashListContext; } });
var LayoutCommitObserver_1 = require("./recyclerview/LayoutCommitObserver");
Object.defineProperty(exports, "LayoutCommitObserver", { enumerable: true, get: function () { return LayoutCommitObserver_1.LayoutCommitObserver; } });
if (!(0, isNewArch_1.isNewArch)()) {
    throw new Error(ErrorMessages_1.ErrorMessages.flashListV2OnlySupportsNewArchitecture);
}
//# sourceMappingURL=index.js.map