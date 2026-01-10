"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var createLayoutManager_1 = require("./helpers/createLayoutManager");
describe("GridLayoutManager", function () {
    var windowSize = { width: 400, height: 900 };
    var defaultParams = { windowSize: windowSize, maxColumns: 2 };
    describe("Basic grid layout", function () {
        it("should arrange items in rows with equal widths", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.GRID, 4, defaultParams);
            var layouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(layouts[0].x).toBe(0);
            expect(layouts[0].width).toBe(200);
            expect(layouts[1].x).toBe(200);
            expect(layouts[2].y).toBe(layouts[0].height);
            expect(layouts[3].x).toBe(200);
        });
        it("should respect maxColumns configuration", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.GRID, 6, tslib_1.__assign(tslib_1.__assign({}, defaultParams), { maxColumns: 3 }));
            var layouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(layouts[0].width).toBeCloseTo(400 / 3);
            expect(layouts[3].x).toBe(0);
            expect(layouts[3].y).toBe(layouts[0].height);
        });
    });
    describe("Multi-column items", function () {
        it("should handle items spanning multiple columns", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.GRID, 3, tslib_1.__assign(tslib_1.__assign({}, defaultParams), { maxColumns: 3, overrideItemLayout: function (index, layout) {
                    layout.span = index === 0 ? 2 : undefined;
                } }));
            var layouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            // First item spans 2 columns
            expect(layouts[0].width).toBeCloseTo((400 / 3) * 2);
            // Next item starts in third column
            expect(layouts[1].x).toBeCloseTo((400 / 3) * 2);
        });
        it("should wrap items that exceed column count", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.GRID, 4, tslib_1.__assign(tslib_1.__assign({}, defaultParams), { overrideItemLayout: function (index, layout) {
                    layout.span = index % 2 === 0 ? 2 : 1;
                } }));
            var layouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            // Row 1: 2 columns (span 2 + span 2 would exceed 2 columns)
            expect(layouts[0].width).toBe(400);
            expect(layouts[1].x).toBe(0);
            expect(layouts[1].y).toBe(layouts[0].height);
            expect(layouts[2].x).toBe(0);
            expect(layouts[2].y).toBe(layouts[1].height + layouts[0].height);
        });
    });
    describe("Layout recalculations", function () {
        it("should adjust layout when window size changes", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.GRID, 4, defaultParams);
            // Update window size
            manager.updateLayoutParams((0, createLayoutManager_1.createLayoutParams)(tslib_1.__assign(tslib_1.__assign({}, defaultParams), { windowSize: { width: 600, height: 900 } })));
            var updatedWidth = (0, createLayoutManager_1.getAllLayouts)(manager)[0].width;
            expect(updatedWidth).toBe(300); // 600 / 2 columns
        });
        it("should maintain positions when adding new items", function () {
            var manager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.GRID, 2, defaultParams);
            var initialLayouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            // Add two more items
            manager.modifyLayout([], 4);
            var updatedLayouts = (0, createLayoutManager_1.getAllLayouts)(manager);
            expect(updatedLayouts[0]).toEqual(initialLayouts[0]);
            expect(updatedLayouts[3].y).toBe(initialLayouts[0].height);
        });
    });
});
//# sourceMappingURL=GridLayoutManager.test.js.map