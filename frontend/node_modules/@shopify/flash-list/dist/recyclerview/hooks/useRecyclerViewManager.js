"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRecyclerViewManager = void 0;
var tslib_1 = require("tslib");
var react_1 = require("react");
var RecyclerViewManager_1 = require("../RecyclerViewManager");
var VelocityTracker_1 = require("../helpers/VelocityTracker");
var useRecyclerViewManager = function (props) {
    var _a = tslib_1.__read((0, react_1.useState)(function () { return new RecyclerViewManager_1.RecyclerViewManager(props); }), 1), recyclerViewManager = _a[0];
    var _b = tslib_1.__read((0, react_1.useState)(function () { return new VelocityTracker_1.VelocityTracker(); }), 1), velocityTracker = _b[0];
    var data = props.data;
    (0, react_1.useMemo)(function () {
        recyclerViewManager.updateProps(props);
        // used to update props so rule can be disabled
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props]);
    /**
     * When data changes, we need to process the data update before the render happens
     */
    (0, react_1.useMemo)(function () {
        recyclerViewManager.processDataUpdate();
        // used to process data update so rule can be disabled
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);
    (0, react_1.useEffect)(function () {
        recyclerViewManager.restoreIfNeeded();
        return function () {
            recyclerViewManager.dispose();
            velocityTracker.cleanUp();
        };
        // Used to perform cleanup on unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return { recyclerViewManager: recyclerViewManager, velocityTracker: velocityTracker };
};
exports.useRecyclerViewManager = useRecyclerViewManager;
//# sourceMappingURL=useRecyclerViewManager.js.map