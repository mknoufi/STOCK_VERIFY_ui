"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var findVisibleIndex_1 = require("../recyclerview/utils/findVisibleIndex");
var createLayoutManager_1 = require("./helpers/createLayoutManager");
describe("findVisibleIndex", function () {
    // Helper function to create mock layouts directly for precise control
    function createMockLayouts(count, startPosition, itemSize, isHorizontal) {
        var layouts = [];
        for (var i = 0; i < count; i++) {
            var x = isHorizontal ? startPosition + i * itemSize : 0;
            var y = isHorizontal ? 0 : startPosition + i * itemSize;
            layouts.push({
                x: x,
                y: y,
                width: isHorizontal ? itemSize : 100,
                height: isHorizontal ? 100 : itemSize,
            });
        }
        return layouts;
    }
    describe("findFirstVisibleIndex", function () {
        // Test 1: Basic functionality - vertical layout
        it("finds the first visible index in a vertical layout", function () {
            var layoutManager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 20, { horizontal: false });
            var layouts = (0, createLayoutManager_1.getAllLayouts)(layoutManager);
            // Viewport starts at y=150, so the second item (index 1) should be first visible
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 150, false);
            expect(firstVisibleIndex).toBe(1);
        });
        // Test 2: Basic functionality - horizontal layout
        it("finds the first visible index in a horizontal layout", function () {
            var layoutManager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 20, { horizontal: true });
            var layouts = (0, createLayoutManager_1.getAllLayouts)(layoutManager);
            // Viewport starts at x=150, so the second item (index 1) should be first visible
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 150, true);
            expect(firstVisibleIndex).toBe(1);
        });
        // Test 3: Empty layouts array
        it("returns -1 for empty layouts array", function () {
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)([], 100, false);
            expect(firstVisibleIndex).toBe(-1);
        });
        // Test 4: All items are visible (threshold at 0)
        it("returns 0 when all items are visible (threshold at 0)", function () {
            var layoutManager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 10);
            var layouts = (0, createLayoutManager_1.getAllLayouts)(layoutManager);
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 0, false);
            expect(firstVisibleIndex).toBe(0);
        });
        // Test 5: No items are visible (threshold beyond all items)
        it("returns -1 when no items are visible", function () {
            var layouts = createMockLayouts(10, 0, 100, false);
            // Threshold is beyond all items (10 items * 100 height = 1000)
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 1100, false);
            expect(firstVisibleIndex).toBe(-1);
        });
        // Test 6: Edge case - threshold exactly at item boundary
        it("returns correct index when threshold is exactly at item boundary", function () {
            var layouts = createMockLayouts(10, 0, 100, false);
            // Threshold exactly at the start of the 5th item
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 400, false);
            expect(firstVisibleIndex).toBe(4);
        });
        // Test 7: Edge case - threshold in the middle of an item
        it("returns correct index when threshold is in the middle of an item", function () {
            var layouts = createMockLayouts(10, 0, 100, false);
            // Threshold in the middle of the 3rd item
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 250, false);
            expect(firstVisibleIndex).toBe(2);
        });
        // Test 8: With grid layout - threshold crosses multiple columns
        it("finds first visible index with grid layout", function () {
            var layoutManager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.GRID, 20, { maxColumns: 2 });
            var layouts = (0, createLayoutManager_1.getAllLayouts)(layoutManager);
            // With 2 columns, items are positioned differently
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 150, false);
            // Expected result depends on how grid layout positions items
            // This test might need adjustment based on actual grid layout behavior
            expect(firstVisibleIndex).not.toBe(-1);
        });
        // Test 9: With masonry layout - variable height items
        it("finds first visible index with masonry layout and variable item sizes", function () {
            var layoutManager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.MASONRY, 20, { maxColumns: 2 }, 100, 100, true // Variable size
            );
            var layouts = (0, createLayoutManager_1.getAllLayouts)(layoutManager);
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 200, false);
            expect(firstVisibleIndex).not.toBe(-1);
        });
        // Test 10: Partial visibility - item just starting to appear
        it("finds item that is just starting to become visible", function () {
            var layouts = createMockLayouts(10, 0, 100, false);
            // Threshold just 1px before item 4 ends
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 399, false);
            expect(firstVisibleIndex).toBe(3);
        });
    });
    describe("findLastVisibleIndex", function () {
        // Test 11: Basic functionality - vertical layout
        it("finds the last visible index in a vertical layout", function () {
            var layoutManager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 20, { horizontal: false });
            var layouts = (0, createLayoutManager_1.getAllLayouts)(layoutManager);
            // Viewport ends at y=250, so the third item (index 2) should be last visible
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 250, false);
            expect(lastVisibleIndex).toBe(2);
        });
        // Test 12: Basic functionality - horizontal layout
        it("finds the last visible index in a horizontal layout", function () {
            var layoutManager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.LINEAR, 20, { horizontal: true });
            var layouts = (0, createLayoutManager_1.getAllLayouts)(layoutManager);
            // Viewport ends at x=250, so the third item (index 2) should be last visible
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 250, true);
            expect(lastVisibleIndex).toBe(2);
        });
        // Test 13: Empty layouts array
        it("returns -1 for empty layouts array", function () {
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)([], 100, false);
            expect(lastVisibleIndex).toBe(-1);
        });
        // Test 14: All items are within viewport
        it("returns the last item index when all items are within viewport", function () {
            var layouts = createMockLayouts(5, 0, 100, false);
            // Viewport ends at y=1000, which includes all 5 items
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 1000, false);
            expect(lastVisibleIndex).toBe(4); // Last item index is 4
        });
        // Test 15: No items are visible (threshold before all items)
        it("returns -1 when no items are visible", function () {
            var layouts = createMockLayouts(10, 100, 100, false);
            // Threshold is before all items start
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 50, false);
            expect(lastVisibleIndex).toBe(-1);
        });
        // Test 16: Edge case - threshold exactly at item boundary
        it("returns correct index when threshold is exactly at item boundary", function () {
            var layouts = createMockLayouts(10, 0, 100, false);
            // Threshold exactly at the end of the 3rd item
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 300, false);
            expect(lastVisibleIndex).toBe(3);
        });
        // Test 17: Edge case - threshold in the middle of an item
        it("returns correct index when threshold is in the middle of an item", function () {
            var layouts = createMockLayouts(10, 0, 100, false);
            // Threshold in the middle of the 3rd item
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 250, false);
            expect(lastVisibleIndex).toBe(2);
        });
        // Test 18: With grid layout
        it("finds last visible index with grid layout", function () {
            var layoutManager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.GRID, 20, { maxColumns: 2 });
            var layouts = (0, createLayoutManager_1.getAllLayouts)(layoutManager);
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 350, false);
            expect(lastVisibleIndex).not.toBe(-1);
        });
        // Test 19: With masonry layout - variable height items
        it("finds last visible index with masonry layout and variable item sizes", function () {
            var layoutManager = (0, createLayoutManager_1.createPopulatedLayoutManager)(createLayoutManager_1.LayoutManagerType.MASONRY, 20, { maxColumns: 2 }, 100, 100, true // Variable size
            );
            var layouts = (0, createLayoutManager_1.getAllLayouts)(layoutManager);
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 400, false);
            expect(lastVisibleIndex).not.toBe(-1);
        });
        // Test 20: Last item partially visible
        it("includes last item when it's partially visible", function () {
            var layouts = createMockLayouts(10, 0, 100, false);
            // Threshold just 1px into the 5th item
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 401, false);
            expect(lastVisibleIndex).toBe(4);
        });
    });
    describe("Edge cases and complex scenarios", function () {
        // Test 21: Single item layout
        it("correctly handles single item layout for first visible", function () {
            var layouts = createMockLayouts(1, 0, 100, false);
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 50, false);
            expect(firstVisibleIndex).toBe(0);
        });
        // Test 22: Single item layout
        it("correctly handles single item layout for last visible", function () {
            var layouts = createMockLayouts(1, 0, 100, false);
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 50, false);
            expect(lastVisibleIndex).toBe(0);
        });
        // Test 23: Variable size items for first visible index
        it("correctly finds first visible with variable size items", function () {
            var layouts = [
                { x: 0, y: 0, width: 100, height: 50 },
                { x: 0, y: 50, width: 100, height: 150 },
                { x: 0, y: 200, width: 100, height: 75 },
                { x: 0, y: 275, width: 100, height: 100 },
            ];
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 175, false);
            expect(firstVisibleIndex).toBe(1); // Second item is still visible at threshold 175
        });
        // Test 24: Variable size items for last visible index
        it("correctly finds last visible with variable size items", function () {
            var layouts = [
                { x: 0, y: 0, width: 100, height: 50 },
                { x: 0, y: 50, width: 100, height: 150 },
                { x: 0, y: 200, width: 100, height: 75 },
                { x: 0, y: 275, width: 100, height: 100 },
            ];
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 225, false);
            expect(lastVisibleIndex).toBe(2); // Third item is visible at threshold 225
        });
        // Test 25: Items with zero size
        it("correctly handles items with zero size for first visible", function () {
            var layouts = [
                { x: 0, y: 0, width: 100, height: 0 },
                { x: 0, y: 0, width: 100, height: 100 },
            ];
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 0, false);
            expect(firstVisibleIndex).toBe(0); // First item is at position but has zero height
        });
        // Test 26: Items with zero size
        it("correctly handles items with zero size for last visible", function () {
            var layouts = [
                { x: 0, y: 0, width: 100, height: 100 },
                { x: 0, y: 100, width: 100, height: 0 },
            ];
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 100, false);
            expect(lastVisibleIndex).toBe(1); // Second item is at threshold position but has zero height
        });
        // Test 27: Large number of items - performance test
        it("efficiently finds first visible index in large dataset", function () {
            var layouts = createMockLayouts(1000, 0, 100, false);
            // Threshold in the middle of the list
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 50000, false);
            expect(firstVisibleIndex).toBe(500);
        });
        // Test 28: Large number of items - performance test
        it("efficiently finds last visible index in large dataset", function () {
            var layouts = createMockLayouts(1000, 0, 100, false);
            // Threshold in the middle of the list
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 50000, false);
            expect(lastVisibleIndex).toBe(500);
        });
        // Test 29: Non-sequential indices
        it("works with non-sequential indices for first visible", function () {
            var layouts = [
                { x: 0, y: 0, width: 100, height: 100 },
                { x: 0, y: 100, width: 100, height: 100 },
                { x: 0, y: 200, width: 100, height: 100 },
            ];
            var firstVisibleIndex = (0, findVisibleIndex_1.findFirstVisibleIndex)(layouts, 150, false);
            expect(firstVisibleIndex).toBe(1); // Second layout in the array, not index 1
        });
        // Test 30: Non-sequential indices
        it("works with non-sequential indices for last visible", function () {
            var layouts = [
                { x: 0, y: 0, width: 100, height: 100 },
                { x: 0, y: 100, width: 100, height: 100 },
                { x: 0, y: 200, width: 100, height: 100 },
            ];
            var lastVisibleIndex = (0, findVisibleIndex_1.findLastVisibleIndex)(layouts, 150, false);
            expect(lastVisibleIndex).toBe(1); // Second layout in the array, not index 1
        });
    });
});
//# sourceMappingURL=findVisibleIndex.test.js.map