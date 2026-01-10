"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var RenderStackManager_1 = require("../recyclerview/RenderStackManager");
var ConsecutiveNumbers_1 = require("../recyclerview/helpers/ConsecutiveNumbers");
var mock1Data = [
    { id: 1, name: "Item 1", itemType: "type1" },
    { id: 2, name: "Item 2", itemType: "type2" },
    { id: 3, name: "Item 3", itemType: "type1" },
    { id: 4, name: "Item 4", itemType: "type2" },
    { id: 5, name: "Item 5", itemType: "type1" },
    { id: 6, name: "Item 6", itemType: "type2" },
    { id: 7, name: "Item 7", itemType: "type1" },
    { id: 8, name: "Item 8", itemType: "type2" },
    { id: 9, name: "Item 9", itemType: "type1" },
    { id: 10, name: "Item 10", itemType: "type2" },
    { id: 11, name: "Item 11", itemType: "type1" },
];
var mock1 = {
    data: mock1Data,
    getStableId: function (index) { return mock1Data[index].id.toString(); },
    getItemType: function (index) { return mock1Data[index].itemType; },
    length: mock1Data.length,
};
var mock2Data = [
    { id: 5, name: "Item 1", itemType: "type1" },
    { id: 6, name: "Item 2", itemType: "type2" },
    { id: 7, name: "Item 3", itemType: "type1" },
    { id: 8, name: "Item 4", itemType: "type2" },
    { id: 9, name: "Item 5", itemType: "type1" },
    { id: 10, name: "Item 6", itemType: "type2" },
    { id: 11, name: "Item 7", itemType: "type1" },
    { id: 12, name: "Item 8", itemType: "type2" },
    { id: 13, name: "Item 9", itemType: "type1" },
    { id: 14, name: "Item 10", itemType: "type2" },
    { id: 15, name: "Item 11", itemType: "type1" },
];
var mock2 = {
    data: mock2Data,
    getStableId: function (index) { return mock2Data[index].id.toString(); },
    getItemType: function (index) { return mock2Data[index].itemType; },
    length: mock2Data.length,
};
var mock3Data = [
    { id: 1, name: "Item 1", itemType: "type1" },
    { id: 2, name: "Item 2", itemType: "type1" },
    { id: 3, name: "Item 3", itemType: "type1" },
    { id: 4, name: "Item 4", itemType: "type1" },
    { id: 5, name: "Item 5", itemType: "type1" },
    { id: 6, name: "Item 6", itemType: "type1" },
    { id: 7, name: "Item 7", itemType: "type1" },
    { id: 8, name: "Item 8", itemType: "type1" },
    { id: 9, name: "Item 9", itemType: "type1" },
    { id: 10, name: "Item 10", itemType: "type1" },
    { id: 11, name: "Item 11", itemType: "type1" },
    { id: 12, name: "Item 12", itemType: "type1" },
    { id: 13, name: "Item 13", itemType: "type1" },
    { id: 14, name: "Item 14", itemType: "type1" },
    { id: 15, name: "Item 15", itemType: "type1" },
];
var mock3 = {
    data: mock3Data,
    getStableId: function (index) { return mock3Data[index].id.toString(); },
    getItemType: function (index) { return mock3Data[index].itemType; },
    length: mock3Data.length,
};
var mock4Data = [
    { id: 1, name: "Item 1", itemType: "type1" },
    { id: 2, name: "Item 2", itemType: "type1" },
    { id: 3, name: "Item 3", itemType: "type1" },
    { id: 4, name: "Item 4", itemType: "type1" },
    { id: 5, name: "Item 5", itemType: "type1" },
    { id: 6, name: "Item 6", itemType: "type1" },
    { id: 7, name: "Item 7", itemType: "type1" },
    { id: 8, name: "Item 8", itemType: "type2" },
    { id: 9, name: "Item 9", itemType: "type2" },
    { id: 10, name: "Item 10", itemType: "type2" },
    { id: 11, name: "Item 11", itemType: "type2" },
    { id: 12, name: "Item 12", itemType: "type2" },
    { id: 13, name: "Item 13", itemType: "type2" },
    { id: 14, name: "Item 14", itemType: "type2" },
    { id: 15, name: "Item 15", itemType: "type2" },
];
var mock4 = {
    data: mock4Data,
    getStableId: function (index) { return mock4Data[index].id.toString(); },
    getItemType: function (index) { return mock4Data[index].itemType; },
    length: mock4Data.length,
};
var mock5Data = [
    { id: 1, name: "Item 1", itemType: "type2" },
    { id: 2, name: "Item 2", itemType: "type2" },
    { id: 3, name: "Item 3", itemType: "type2" },
    { id: 4, name: "Item 4", itemType: "type2" },
    { id: 5, name: "Item 5", itemType: "type2" },
    { id: 6, name: "Item 6", itemType: "type2" },
    { id: 7, name: "Item 7", itemType: "type2" },
    { id: 8, name: "Item 8", itemType: "type1" },
    { id: 9, name: "Item 9", itemType: "type1" },
    { id: 10, name: "Item 10", itemType: "type1" },
    { id: 11, name: "Item 11", itemType: "type1" },
    { id: 12, name: "Item 12", itemType: "type1" },
    { id: 13, name: "Item 13", itemType: "type1" },
    { id: 14, name: "Item 14", itemType: "type1" },
    { id: 15, name: "Item 15", itemType: "type1" },
];
var mock5 = {
    data: mock5Data,
    getStableId: function (index) { return mock5Data[index].id.toString(); },
    getItemType: function (index) { return mock5Data[index].itemType; },
    length: mock5Data.length,
};
var mock6Data = [
    { id: 0, name: "Item 0", itemType: "type1" },
    { id: 1, name: "Item 1", itemType: "type1" },
    { id: 2, name: "Item 2", itemType: "type1" },
    { id: 3, name: "Item 3", itemType: "type1" },
    { id: 4, name: "Item 4", itemType: "type1" },
    { id: 5, name: "Item 5", itemType: "type1" },
    { id: 6, name: "Item 6", itemType: "type1" },
    { id: 7, name: "Item 7", itemType: "type1" },
];
var mock6 = {
    data: mock6Data,
    getStableId: function (index) { return mock6Data[index].id.toString(); },
    getItemType: function (index) { return mock6Data[index].itemType; },
    length: mock6Data.length,
};
var mock7Data = [
    { id: 0, name: "Item 0", itemType: "type1" },
    { id: 2, name: "Item 2", itemType: "type1" },
    { id: 3, name: "Item 3", itemType: "type1" },
    { id: 4, name: "Item 4", itemType: "type1" },
    { id: 5, name: "Item 5", itemType: "type1" },
    { id: 6, name: "Item 6", itemType: "type1" },
    { id: 7, name: "Item 7", itemType: "type1" },
    { id: 8, name: "Item 8", itemType: "type1" },
];
var mock7 = {
    data: mock7Data,
    getStableId: function (index) { return mock7Data[index].id.toString(); },
    getItemType: function (index) { return mock7Data[index].itemType; },
    length: mock7Data.length,
};
var mock8Data = [
    { id: 16, name: "Item 16", itemType: "type1" },
    { id: 17, name: "Item 17", itemType: "type1" },
    { id: 18, name: "Item 18", itemType: "type1" },
    { id: 19, name: "Item 19", itemType: "type1" },
    { id: 20, name: "Item 20", itemType: "type1" },
    { id: 1, name: "Item 1", itemType: "type1" },
    { id: 2, name: "Item 2", itemType: "type1" },
    { id: 3, name: "Item 3", itemType: "type1" },
    { id: 4, name: "Item 4", itemType: "type1" },
    { id: 5, name: "Item 5", itemType: "type1" },
    { id: 6, name: "Item 6", itemType: "type1" },
    { id: 7, name: "Item 7", itemType: "type1" },
    { id: 8, name: "Item 8", itemType: "type1" },
    { id: 9, name: "Item 9", itemType: "type1" },
    { id: 10, name: "Item 10", itemType: "type1" },
    { id: 11, name: "Item 11", itemType: "type1" },
    { id: 12, name: "Item 12", itemType: "type1" },
    { id: 13, name: "Item 13", itemType: "type1" },
    { id: 14, name: "Item 14", itemType: "type1" },
    { id: 15, name: "Item 15", itemType: "type1" },
];
var mock8 = {
    data: mock8Data,
    getStableId: function (index) { return mock8Data[index].id.toString(); },
    getItemType: function (index) { return mock8Data[index].itemType; },
    length: mock8Data.length,
};
// Helper to create mock data structures
var createMockData = function (items) {
    return {
        data: items.map(function (item) { return (tslib_1.__assign(tslib_1.__assign({}, item), { name: item.name || "Item ".concat(item.id) })); }),
        getStableId: function (index) { return items[index].id.toString(); },
        getItemType: function (index) { return items[index].itemType; },
        length: items.length,
    };
};
// Helper to run sync and get sorted keys from the entire keyMap
var runSyncAndGetEntireKeyMapKeys = function (manager, mock, engagedIndicesOverride) {
    var dataLength = mock.length;
    var engaged = engagedIndicesOverride !== null && engagedIndicesOverride !== void 0 ? engagedIndicesOverride : new ConsecutiveNumbers_1.ConsecutiveNumbers(0, dataLength > 0 ? dataLength - 1 : -1);
    manager.sync(mock.getStableId, mock.getItemType, engaged, dataLength);
    return Array.from(manager.getRenderStack().keys()).sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); });
};
// Helper to get keys specific to the items in a mock, after a sync
var getKeysForMockItems = function (manager, mockData) {
    var e_1, _a;
    var stack = manager.getRenderStack();
    var keys = [];
    // Ensure we only try to get keys for items that exist in mockData
    for (var i = 0; i < mockData.length; i++) {
        var stableId = mockData.getStableId(i);
        try {
            for (var _b = (e_1 = void 0, tslib_1.__values(stack.entries())), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = tslib_1.__read(_c.value, 2), key = _d[0], info = _d[1];
                if (info.stableId === stableId) {
                    keys.push(key);
                    break;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return keys.sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); });
};
var emptyMock = createMockData([]);
var mockDataA5 = createMockData([
    { id: "s1", itemType: "typeA" },
    { id: "s2", itemType: "typeA" },
    { id: "s3", itemType: "typeA" },
    { id: "s4", itemType: "typeA" },
    { id: "s5", itemType: "typeA" },
]);
var mockDataB3 = createMockData([
    { id: "s6", itemType: "typeA" },
    { id: "s7", itemType: "typeA" },
    { id: "s8", itemType: "typeA" },
]);
describe("RenderStackManager", function () {
    it("should reuse keys from removed items when transitioning from mock1 to mock2", function () {
        var renderStackManager = new RenderStackManager_1.RenderStackManager();
        runSyncAndGetEntireKeyMapKeys(renderStackManager, mock1);
        var oldRenderStackKeys = Array.from(renderStackManager.getRenderStack().keys()).sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); });
        runSyncAndGetEntireKeyMapKeys(renderStackManager, mock2);
        var newRenderStackKeys = Array.from(renderStackManager.getRenderStack().keys()).sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); });
        expect(newRenderStackKeys).toEqual(oldRenderStackKeys);
    });
    it("should reuse keys changing item types when transitioning from mock3 to mock4", function () {
        var renderStackManager = new RenderStackManager_1.RenderStackManager();
        runSyncAndGetEntireKeyMapKeys(renderStackManager, mock3);
        var oldRenderStackKeys = Array.from(renderStackManager.getRenderStack().keys()).sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); });
        runSyncAndGetEntireKeyMapKeys(renderStackManager, mock4);
        var newRenderStackKeys = Array.from(renderStackManager.getRenderStack().keys()).sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); });
        expect(newRenderStackKeys).toEqual(oldRenderStackKeys);
    });
    it("should reuse keys changing item types when transitioning from mock4 to mock5", function () {
        var renderStackManager = new RenderStackManager_1.RenderStackManager();
        runSyncAndGetEntireKeyMapKeys(renderStackManager, mock4);
        var oldRenderStackKeys = Array.from(renderStackManager.getRenderStack().keys()).sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); });
        runSyncAndGetEntireKeyMapKeys(renderStackManager, mock5);
        var newRenderStackKeys = Array.from(renderStackManager.getRenderStack().keys()).sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); });
        expect(newRenderStackKeys).toEqual(oldRenderStackKeys);
    });
    it("should have all keys from mock1 when going from mock1 to mock5", function () {
        var renderStackManager = new RenderStackManager_1.RenderStackManager();
        runSyncAndGetEntireKeyMapKeys(renderStackManager, mock1);
        var oldRenderStackKeys = Array.from(renderStackManager.getRenderStack().keys()).sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); });
        runSyncAndGetEntireKeyMapKeys(renderStackManager, mock5);
        var newRenderStackKeys = Array.from(renderStackManager.getRenderStack().keys()).sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); });
        oldRenderStackKeys.forEach(function (key) {
            expect(newRenderStackKeys).toContain(key);
        });
    });
});
describe("RenderStackManager with disableRecycling = true", function () {
    it("should assign new, non-recycled keys to new items when disableRecycling is true", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        rsm.disableRecycling = true;
        // Sync with A5 first
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA5);
        var keysA5 = getKeysForMockItems(rsm, mockDataA5);
        expect(keysA5).toEqual(["0", "1", "2", "3", "4"]);
        // Sync with B3
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataB3);
        var keysB3 = getKeysForMockItems(rsm, mockDataB3);
        expect(keysB3).toEqual(["5", "6", "7"]); // New keys for B3 items
        // Ensure B3 keys don't overlap with A5 keys that might remain in keyMap
        keysA5.forEach(function (keyA) {
            expect(keysB3).not.toContain(keyA);
        });
        // Check the final state of the entire keyMap
        // After B3 sync, keys for A5 items at original indices 3,4 (stableIds "s4","s5")
        // should be removed because 3 >= B3.length (3) and 4 >= B3.length (3). Keys for 0,1,2 from A5 remain.
        var allKeysInMap = runSyncAndGetEntireKeyMapKeys(rsm, mockDataB3); // This re-syncs B3, ensuring state is for B3
        expect(allKeysInMap.sort(function (keyA, keyB) { return Number(keyA) - Number(keyB); })).toEqual(["5", "6", "7"]);
    });
    it("should generate all new keys if starting with disableRecycling = true and items are removed then added", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        rsm.disableRecycling = true;
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA5); // Assigns keys "0" through "4"
        runSyncAndGetEntireKeyMapKeys(rsm, emptyMock); // Sync with empty
        expect(getKeysForMockItems(rsm, emptyMock)).toEqual([]);
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataB3); // Sync with new data
        var keysForNewItems = getKeysForMockItems(rsm, mockDataB3);
        expect(keysForNewItems).toEqual(["5", "6", "7"]);
    });
});
describe("RenderStackManager with maxItemsInRecyclePool", function () {
    it("should not recycle any keys when maxItemsInRecyclePool is 0", function () {
        var rsm = new RenderStackManager_1.RenderStackManager(0); // maxItemsInRecyclePool = 0
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA5);
        runSyncAndGetEntireKeyMapKeys(rsm, emptyMock); // Sync with empty, dataLength = 0. All keys are cleaned up.
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataB3);
        var keys2 = getKeysForMockItems(rsm, mockDataB3);
        expect(keys2).toEqual(["5", "6", "7"]); // Expect new keys as pool was cleared by emptyMock sync
    });
    it("should effectively not recycle if intermediate sync has dataLength 0, regardless of maxPoolSize", function () {
        var maxPoolSize = 2;
        var rsm = new RenderStackManager_1.RenderStackManager(maxPoolSize);
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA5);
        runSyncAndGetEntireKeyMapKeys(rsm, emptyMock); // Sync with empty, dataLength = 0. All keys are cleaned up from pool and map.
        var mockDataA3NewIds = createMockData([
            { id: "s10", itemType: "typeA" },
            { id: "s11", itemType: "typeA" },
            { id: "s12", itemType: "typeA" },
        ]);
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA3NewIds);
        var newKeys = getKeysForMockItems(rsm, mockDataA3NewIds);
        // Because emptyMock sync (dataLength=0) clears all keys, these will be new.
        expect(newKeys).toEqual(["5", "6", "7"]);
    });
    it("should not repeat index when going from mock6 to mock7", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        rsm.disableRecycling = true;
        runSyncAndGetEntireKeyMapKeys(rsm, mock6);
        runSyncAndGetEntireKeyMapKeys(rsm, mock7);
        var set = new Set();
        Array.from(rsm.getRenderStack().entries()).forEach(function (_a) {
            var _b = tslib_1.__read(_a, 2), key = _b[0], info = _b[1];
            expect(set.has(info.index)).toBe(false);
            set.add(info.index);
        });
    });
});
describe("RenderStackManager edge cases", function () {
    it("should handle initial sync with empty data and then add items", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        runSyncAndGetEntireKeyMapKeys(rsm, emptyMock);
        expect(getKeysForMockItems(rsm, emptyMock)).toEqual([]);
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA5);
        expect(getKeysForMockItems(rsm, mockDataA5)).toEqual([
            "0",
            "1",
            "2",
            "3",
            "4",
        ]);
    });
    it("should generate new keys if all items removed (synced with empty) and then different items added", function () {
        var rsm = new RenderStackManager_1.RenderStackManager(); // Default large pool size
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA5);
        runSyncAndGetEntireKeyMapKeys(rsm, emptyMock); // Sync with empty, dataLength = 0. All keys are cleaned up.
        var mockDataA3NewIds = createMockData([
            { id: "s10", itemType: "typeA" },
            { id: "s11", itemType: "typeA" },
            { id: "s12", itemType: "typeA" },
        ]);
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA3NewIds);
        var newKeys = getKeysForMockItems(rsm, mockDataA3NewIds);
        // Expect new keys as the emptyMock sync (dataLength=0) cleared the pool and map.
        expect(newKeys).toEqual(["5", "6", "7"]);
    });
    it("should use new keys if types change completely and no compatible recycled keys exist (after empty sync)", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA5);
        runSyncAndGetEntireKeyMapKeys(rsm, emptyMock); // Clear with empty sync
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataB3);
        var keysTypeB = getKeysForMockItems(rsm, mockDataB3);
        expect(keysTypeB).toEqual(["5", "6", "7"]); // Should be new keys after empty sync
        var mockSingleTypeA = createMockData([{ id: "s20", itemType: "typeA" }]);
        runSyncAndGetEntireKeyMapKeys(rsm, mockSingleTypeA);
        var keyForS20 = getKeysForMockItems(rsm, mockSingleTypeA);
        // After empty sync and B3 sync, A's pool is gone. Key counter is at 8.
        expect(keyForS20).toEqual(["5"]);
    });
    it("should maintain keys if data and engaged indices do not change", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA5);
        var keys1 = getKeysForMockItems(rsm, mockDataA5);
        runSyncAndGetEntireKeyMapKeys(rsm, mockDataA5);
        var keys2 = getKeysForMockItems(rsm, mockDataA5);
        expect(keys2).toEqual(keys1);
    });
    it("should not delete keys from pool if they are not visible on index changes when going from mock6 to mock7", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        runSyncAndGetEntireKeyMapKeys(rsm, mock6);
        runSyncAndGetEntireKeyMapKeys(rsm, mock7, new ConsecutiveNumbers_1.ConsecutiveNumbers(3, 5));
        var keys = getKeysForMockItems(rsm, mock7);
        expect(keys).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
    });
    it("should not delete keys from pool if they are not visible on index changes when going from mock3 to mock8", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        runSyncAndGetEntireKeyMapKeys(rsm, mock3, new ConsecutiveNumbers_1.ConsecutiveNumbers(0, 10));
        runSyncAndGetEntireKeyMapKeys(rsm, mock8, new ConsecutiveNumbers_1.ConsecutiveNumbers(0, 13));
        var keys = getKeysForMockItems(rsm, mock8);
        expect(keys).toEqual([
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
        ]);
    });
    it("should delete keys from pool if they are not visible on index changes when going from mock6 to mock7 (disableRecycling = true)", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        rsm.disableRecycling = true;
        runSyncAndGetEntireKeyMapKeys(rsm, mock6);
        runSyncAndGetEntireKeyMapKeys(rsm, mock7, new ConsecutiveNumbers_1.ConsecutiveNumbers(3, 5));
        var keys = getKeysForMockItems(rsm, mock7);
        expect(keys).toEqual(["0", "2", "3", "4", "5", "6", "8"]);
    });
    it("should not delete keys from pool if they are not visible on index changes when going from mock6 to mock7 (all engaged)", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        runSyncAndGetEntireKeyMapKeys(rsm, mock6);
        runSyncAndGetEntireKeyMapKeys(rsm, mock7);
        var keys = getKeysForMockItems(rsm, mock7);
        expect(keys).toEqual(["0", "1", "2", "3", "4", "5", "6", "7"]);
    });
    it("should delete keys from pool if they are not visible on index changes when going from mock6 to mock7 (all engaged,disableRecycling = true)", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        rsm.disableRecycling = true;
        runSyncAndGetEntireKeyMapKeys(rsm, mock6);
        runSyncAndGetEntireKeyMapKeys(rsm, mock7);
        var keys = getKeysForMockItems(rsm, mock7);
        expect(keys).toEqual(["0", "2", "3", "4", "5", "6", "7", "8"]);
    });
    it("should correctly handle partial replacement of items, reusing keys for stable items and recycling for replaced ones", function () {
        var rsm = new RenderStackManager_1.RenderStackManager();
        var initialMock = createMockData([
            { id: "s1", itemType: "typeA" },
            { id: "s2", itemType: "typeA" },
            { id: "s3", itemType: "typeA" },
            { id: "s4", itemType: "typeA" },
        ]);
        runSyncAndGetEntireKeyMapKeys(rsm, initialMock);
        var initialKeyMap = new Map();
        // Populate initialKeyMap correctly using getKeysForMockItems and stable IDs
        initialMock.data.forEach(function (itemData, index) {
            // Get the keys for the initialMock items AFTER the sync.
            var currentKeysForInitialMock = getKeysForMockItems(rsm, initialMock);
            var key = currentKeysForInitialMock[index]; // Assumes keys are in order of data
            if (key !== undefined) {
                // Ensure key exists before setting
                initialKeyMap.set(itemData.id.toString(), key);
            }
        });
        var keyForS1 = initialKeyMap.get("s1");
        var keyForS2 = initialKeyMap.get("s2");
        var keyForS3 = initialKeyMap.get("s3");
        var keyForS4 = initialKeyMap.get("s4");
        var partiallyReplacedMock = createMockData([
            { id: "s1", itemType: "typeA" },
            { id: "s5", itemType: "typeA" },
            { id: "s6", itemType: "typeA" },
            { id: "s4", itemType: "typeA" },
        ]);
        runSyncAndGetEntireKeyMapKeys(rsm, partiallyReplacedMock);
        var finalKeyMap = new Map();
        partiallyReplacedMock.data.forEach(function (itemData, index) {
            // Get keys for partiallyReplacedMock items AFTER the sync.
            var currentKeysForPartialMock = getKeysForMockItems(rsm, partiallyReplacedMock);
            var key = currentKeysForPartialMock[index]; // Assumes keys are in order
            if (key !== undefined) {
                // Ensure key exists
                finalKeyMap.set(itemData.id.toString(), key);
            }
        });
        expect(finalKeyMap.get("s1")).toBe(keyForS1);
        expect(finalKeyMap.get("s4")).toBe(keyForS4);
        expect([finalKeyMap.get("s5"), finalKeyMap.get("s6")]).toEqual(expect.arrayContaining([keyForS2, keyForS3]));
        expect(finalKeyMap.get("s5")).not.toBe(finalKeyMap.get("s6"));
        var finalKeysForCurrentItems = getKeysForMockItems(rsm, partiallyReplacedMock);
        expect(finalKeysForCurrentItems).toEqual(["0", "1", "2", "3"]);
    });
});
//# sourceMappingURL=RenderStackManager.test.js.map