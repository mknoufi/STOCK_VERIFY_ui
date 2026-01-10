"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var createLayoutManager_1 = require("./helpers/createLayoutManager");
describe("LinearLayoutManager", function () {
    var windowSize = { width: 400, height: 900 };
    var defaultParams = { windowSize: windowSize, horizontal: false };
    var horizontalParams = { windowSize: windowSize, horizontal: true };
    describe("Vertical layout", function () {
        it("should stack items vertically", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 3, defaultParams, 100, // itemWidth
            100 // itemHeight
            );
            var layouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(layouts.length).toBe(3);
            expect(layouts[0].y).toBe(0);
            expect(layouts[1].y).toBe(100);
            expect(layouts[2].y).toBe(200);
            expect(layouts[0].x).toBe(0);
            expect(layouts[0].width).toBe(400); // Should take full width
        });
        it("should handle variable item heights", function () {
            var manager = (0, createLayoutManager_1.createLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, defaultParams);
            var layoutInfos = [
                (0, createLayoutManager_1.createMockLayoutInfo)(0, 400, 100),
                (0, createLayoutManager_1.createMockLayoutInfo)(1, 400, 150),
                (0, createLayoutManager_1.createMockLayoutInfo)(2, 400, 50),
            ];
            manager.modifyLayout(layoutInfos, 3);
            var layouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(layouts[0].height).toBe(100);
            expect(layouts[1].height).toBe(150);
            expect(layouts[2].height).toBe(50);
            expect(layouts[0].y).toBe(0);
            expect(layouts[1].y).toBe(100); // 0 + 100
            expect(layouts[2].y).toBe(250); // 100 + 150
        });
        it("should calculate total layout size correctly", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 3, defaultParams, 100, 100);
            var layoutSize = manager.getLayoutSize();
            expect(layoutSize.width).toBe(400);
            expect(layoutSize.height).toBe(300); // 3 items * 100 height
        });
    });
    describe("Horizontal layout", function () {
        it("should stack items horizontally", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 3, horizontalParams, 100, // itemWidth
            100 // itemHeight - should take full height
            );
            var layouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(layouts.length).toBe(3);
            expect(layouts[0].x).toBe(0);
            expect(layouts[1].x).toBe(100);
            expect(layouts[2].x).toBe(200);
            expect(layouts[0].y).toBe(0);
            expect(layouts[0].minHeight).toBe(900); // Should take full height
        });
        it("should handle variable item widths", function () {
            var manager = (0, createLayoutManager_1.createLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, horizontalParams);
            var layoutInfos = [
                (0, createLayoutManager_1.createMockLayoutInfo)(0, 100, 900),
                (0, createLayoutManager_1.createMockLayoutInfo)(1, 150, 900),
                (0, createLayoutManager_1.createMockLayoutInfo)(2, 50, 900),
            ];
            manager.modifyLayout(layoutInfos, 3);
            var layouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(layouts[0].width).toBe(100);
            expect(layouts[1].width).toBe(150);
            expect(layouts[2].width).toBe(50);
            expect(layouts[0].x).toBe(0);
            expect(layouts[1].x).toBe(100); // 0 + 100
            expect(layouts[2].x).toBe(250); // 100 + 150
        });
        it("should calculate total layout size correctly in horizontal mode", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 3, horizontalParams, 100, 100);
            var layoutSize = manager.getLayoutSize();
            expect(layoutSize.width).toBe(300); // 3 items * 100 width
            expect(layoutSize.height).toBe(900);
        });
    });
    describe("Layout modifications", function () {
        it("should update layout when items are added", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 2, defaultParams, 100, 100);
            var initialLayouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(initialLayouts.length).toBe(2);
            // Add one more item
            var newLayoutInfo = [(0, createLayoutManager_1.createMockLayoutInfo)(2, 400, 120)];
            manager.modifyLayout(newLayoutInfo, 3);
            var updatedLayouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(updatedLayouts.length).toBe(3);
            expect(updatedLayouts[2].y).toBe(200); // 100 + 100
            expect(updatedLayouts[2].height).toBe(120);
            expect(manager.getLayoutSize().height).toBe(320); // 100 + 100 + 120
        });
        it("should update layout when items are removed", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 3, defaultParams, 100, 100);
            expect((0, createLayoutManager_1.getAllLayouts)(manager).length).toBe(3);
            expect(manager.getLayoutSize().height).toBe(300);
            // Remove the last item
            manager.modifyLayout([], 2);
            var updatedLayouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(updatedLayouts.length).toBe(2);
            expect(manager.getLayoutSize().height).toBe(200);
        });
        it("should handle replacing all items", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 3, defaultParams, 100, 100);
            var newLayoutInfos = [
                (0, createLayoutManager_1.createMockLayoutInfo)(0, 400, 50),
                (0, createLayoutManager_1.createMockLayoutInfo)(1, 400, 60),
            ];
            manager.modifyLayout(newLayoutInfos, 2);
            var layouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(layouts.length).toBe(2);
            expect(layouts[0].height).toBe(50);
            expect(layouts[1].height).toBe(60);
            expect(layouts[1].y).toBe(50);
            expect(manager.getLayoutSize().height).toBe(110); // 50 + 60
        });
        it("should recalculate layout when window size changes", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 3, defaultParams, 100, 100);
            var initialLayouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(initialLayouts[0].width).toBe(400);
            manager.updateLayoutParams((0, createLayoutManager_1.createLayoutParams)(tslib_1.__assign(tslib_1.__assign({}, defaultParams), { windowSize: { width: 600, height: 900 } })));
            var updatedLayouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(updatedLayouts[0].width).toBe(600); // Width should adapt
            expect(updatedLayouts[1].y).toBe(initialLayouts[1].y); // Vertical position shouldn't change
        });
    });
    describe("Empty layout", function () {
        it("should return zero size for empty layout", function () {
            var manager = (0, createLayoutManager_1.createLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, defaultParams);
            manager.modifyLayout([], 0);
            var layoutSize = manager.getLayoutSize();
            expect(layoutSize.width).toBe(0);
            expect(layoutSize.height).toBe(0);
            expect((0, createLayoutManager_1.getAllLayouts)(manager).length).toBe(0);
        });
    });
});
//# sourceMappingURL=LinearLayoutManager.test.js.map