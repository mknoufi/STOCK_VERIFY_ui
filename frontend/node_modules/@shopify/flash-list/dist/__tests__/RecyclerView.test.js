"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var react_native_1 = require("react-native");
require("@quilted/react-testing/matchers");
var react_testing_1 = require("@quilted/react-testing");
var RecyclerView_1 = require("../recyclerview/RecyclerView");
// Mock measureLayout to return fixed dimensions
jest.mock("../recyclerview/utils/measureLayout", function () {
    var originalModule = jest.requireActual("../recyclerview/utils/measureLayout");
    return tslib_1.__assign(tslib_1.__assign({}, originalModule), { measureParentSize: jest.fn().mockImplementation(function () { return ({
            x: 0,
            y: 0,
            width: 399,
            height: 899,
        }); }), measureFirstChildLayout: jest.fn().mockImplementation(function () { return ({
            x: 0,
            y: 0,
            width: 399,
            height: 899,
        }); }), measureItemLayout: jest.fn().mockImplementation(function () { return ({
            x: 0,
            y: 0,
            width: 100,
            height: 100,
        }); }) });
});
var renderRecyclerView = function (args) {
    var _a = args.numColumns, numColumns = _a === void 0 ? 1 : _a, _b = args.masonry, masonry = _b === void 0 ? false : _b, _c = args.horizontal, horizontal = _c === void 0 ? false : _c, ref = args.ref, data = args.data;
    return (0, react_testing_1.render)(react_1.default.createElement(RecyclerView_1.RecyclerView, { ref: ref, data: data !== null && data !== void 0 ? data : [
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        ], masonry: masonry, overrideProps: { initialDrawBatchSize: 1 }, drawDistance: 0, numColumns: numColumns, horizontal: horizontal, renderItem: function (_a) {
            var item = _a.item;
            return react_1.default.createElement(react_native_1.Text, null, item);
        } }));
};
describe("RecyclerView", function () {
    beforeEach(function () {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });
    describe("Linear Layout", function () {
        it("renders items ", function () {
            var result = renderRecyclerView({});
            expect(result).toContainReactComponent(react_native_1.Text, { children: 0 });
            expect(result).not.toContainReactComponent(react_native_1.Text, { children: 11 });
        });
    });
    describe("Masonry Layout", function () {
        it("renders items with masonry", function () {
            var result = renderRecyclerView({ masonry: true });
            expect(result).toContainReactComponent(react_native_1.Text, { children: 0 });
        });
        it("should not render item 18, 19 with numColumns 2", function () {
            var result = renderRecyclerView({ numColumns: 2, masonry: true });
            expect(result).toContainReactComponent(react_native_1.Text, {
                children: 17,
            });
            expect(result).not.toContainReactComponent(react_native_1.Text, {
                children: 18,
            });
            expect(result).not.toContainReactComponent(react_native_1.Text, {
                children: 19,
            });
        });
    });
    describe("Grid Layout", function () {
        it("renders items with numColumns 2", function () {
            var result = renderRecyclerView({ numColumns: 2 });
            expect(result).toContainReactComponent(react_native_1.Text, { children: 0 });
        });
        it("should not render item 18, 19 with numColumns 2", function () {
            var result = renderRecyclerView({ numColumns: 2 });
            expect(result).toContainReactComponent(react_native_1.Text, {
                children: 17,
            });
            expect(result).not.toContainReactComponent(react_native_1.Text, {
                children: 18,
            });
            expect(result).not.toContainReactComponent(react_native_1.Text, {
                children: 19,
            });
        });
    });
    describe("Horizontal Layout", function () {
        it("renders items with horizontal", function () {
            var result = renderRecyclerView({ horizontal: true });
            expect(result).toContainReactComponent(react_native_1.Text, { children: 0 });
            expect(result).not.toContainReactComponent(react_native_1.Text, { children: 4 });
        });
    });
    describe("RecyclerView ref", function () {
        it("check if ref has updated props after re-renders", function () {
            var _a;
            var ref = (0, react_1.createRef)();
            var result = renderRecyclerView({ ref: ref, data: [0, 1, 2] });
            result.setProps({ data: [0, 1, 2, 3] });
            expect((_a = ref.current) === null || _a === void 0 ? void 0 : _a.props.data).toEqual([0, 1, 2, 3]);
        });
    });
});
//# sourceMappingURL=RecyclerView.test.js.map