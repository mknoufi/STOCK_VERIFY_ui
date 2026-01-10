"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importDefault(require("react"));
var react_testing_1 = require("@quilted/react-testing");
var RecyclerView_1 = require("../recyclerview/RecyclerView");
var RecyclerViewContextProvider_1 = require("../recyclerview/RecyclerViewContextProvider");
var LayoutCommitObserver_1 = require("../recyclerview/LayoutCommitObserver");
describe("LayoutCommitObserver", function () {
    it("should not alter ref captured by child", function () {
        var ChildComponent = function () {
            var _a, _b, _c, _d;
            var context = (0, RecyclerViewContextProvider_1.useFlashListContext)();
            expect((_a = context === null || context === void 0 ? void 0 : context.getRef()) === null || _a === void 0 ? void 0 : _a.props.testID).toBe("child");
            expect((_b = context === null || context === void 0 ? void 0 : context.getParentRef()) === null || _b === void 0 ? void 0 : _b.props.testID).toBe("parent");
            expect((_c = context === null || context === void 0 ? void 0 : context.getScrollViewRef()) === null || _c === void 0 ? void 0 : _c.props.testID).toBe("child");
            expect((_d = context === null || context === void 0 ? void 0 : context.getParentScrollViewRef()) === null || _d === void 0 ? void 0 : _d.props.testID).toBe("parent");
            return null;
        };
        var commitLayoutEffectCount = 0;
        var content = (react_1.default.createElement(RecyclerView_1.RecyclerView, { testID: "parent", data: [1], renderItem: function () { return (react_1.default.createElement(LayoutCommitObserver_1.LayoutCommitObserver, { onCommitLayoutEffect: function () {
                    commitLayoutEffectCount++;
                } },
                react_1.default.createElement(RecyclerView_1.RecyclerView, { testID: "child", data: [1], renderItem: function () { return (react_1.default.createElement(LayoutCommitObserver_1.LayoutCommitObserver, { onCommitLayoutEffect: function () {
                            commitLayoutEffectCount++;
                        } },
                        react_1.default.createElement(LayoutCommitObserver_1.LayoutCommitObserver, { onCommitLayoutEffect: function () {
                                commitLayoutEffectCount++;
                            } },
                            react_1.default.createElement(ChildComponent, null)))); } }))); } }));
        (0, react_testing_1.render)(content);
        expect(commitLayoutEffectCount).toBe(3);
    });
});
//# sourceMappingURL=LayoutCommitObserver.test.js.map