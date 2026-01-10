"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderStackManager = void 0;
var tslib_1 = require("tslib");
/**
 * Manages the recycling of rendered items in a virtualized list.
 * This class handles tracking, recycling, and reusing item keys to optimize
 * rendering performance by minimizing creation/destruction of components.
 */
var RenderStackManager = /** @class */ (function () {
    /**
     * @param maxItemsInRecyclePool - Maximum number of items that can be in the recycle pool
     */
    function RenderStackManager(maxItemsInRecyclePool) {
        if (maxItemsInRecyclePool === void 0) { maxItemsInRecyclePool = Number.MAX_SAFE_INTEGER; }
        this.disableRecycling = false;
        this.maxItemsInRecyclePool = maxItemsInRecyclePool;
        this.recycleKeyPools = new Map();
        this.keyMap = new Map();
        this.stableIdMap = new Map();
        this.keyCounter = 0;
        this.unProcessedIndices = new Set();
    }
    /**
     * Synchronizes the render stack with the current state of data.
     * This method is the core orchestrator that:
     * 1. Recycles keys for items that are no longer valid
     * 2. Updates existing keys for items that remain visible
     * 3. Assigns new keys for newly visible items
     * 4. Cleans up excess items to maintain the recycling pool size
     *
     * @param getStableId - Function to get a stable identifier for an item at a specific index
     * @param getItemType - Function to get the type of an item at a specific index
     * @param engagedIndices - Collection of indices that are currently visible or engaged
     * @param dataLength - Total length of the data set
     */
    RenderStackManager.prototype.sync = function (getStableId, getItemType, engagedIndices, dataLength) {
        var e_1, _a, e_2, _b, e_3, _c, e_4, _d, e_5, _e;
        var _this = this;
        this.clearRecyclePool();
        this.unProcessedIndices.clear();
        // Recycle keys for items that are no longer valid or visible
        this.keyMap.forEach(function (keyInfo, key) {
            var index = keyInfo.index, stableId = keyInfo.stableId, itemType = keyInfo.itemType;
            if (index >= dataLength) {
                _this.recycleKey(key);
                return;
            }
            if (!_this.disableRecycling) {
                _this.unProcessedIndices.add(index);
            }
            if (!engagedIndices.includes(index)) {
                _this.recycleKey(key);
                return;
            }
            var newStableId = getStableId(index);
            var newItemType = getItemType(index);
            if (stableId !== newStableId || itemType !== newItemType) {
                _this.recycleKey(key);
            }
        });
        try {
            // First pass: process items that already have optimized keys
            for (var engagedIndices_1 = tslib_1.__values(engagedIndices), engagedIndices_1_1 = engagedIndices_1.next(); !engagedIndices_1_1.done; engagedIndices_1_1 = engagedIndices_1.next()) {
                var index = engagedIndices_1_1.value;
                if (this.hasOptimizedKey(getStableId(index))) {
                    this.syncItem(index, getItemType(index), getStableId(index));
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (engagedIndices_1_1 && !engagedIndices_1_1.done && (_a = engagedIndices_1.return)) _a.call(engagedIndices_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        try {
            // Second pass: process remaining items that need new keys
            for (var engagedIndices_2 = tslib_1.__values(engagedIndices), engagedIndices_2_1 = engagedIndices_2.next(); !engagedIndices_2_1.done; engagedIndices_2_1 = engagedIndices_2.next()) {
                var index = engagedIndices_2_1.value;
                if (!this.hasOptimizedKey(getStableId(index))) {
                    this.syncItem(index, getItemType(index), getStableId(index));
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (engagedIndices_2_1 && !engagedIndices_2_1.done && (_b = engagedIndices_2.return)) _b.call(engagedIndices_2);
            }
            finally { if (e_2) throw e_2.error; }
        }
        // create indices that are not in the engagedIndices and less than dataLength
        // select only indices that are not in the engagedIndices
        var validIndicesInPool = [];
        try {
            for (var _f = tslib_1.__values(this.keyMap.values()), _g = _f.next(); !_g.done; _g = _f.next()) {
                var keyInfo = _g.value;
                var index = keyInfo.index;
                if (index < dataLength && !engagedIndices.includes(index)) {
                    validIndicesInPool.push(index);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
            }
            finally { if (e_3) throw e_3.error; }
        }
        try {
            // First pass: process items that already have optimized keys
            for (var validIndicesInPool_1 = tslib_1.__values(validIndicesInPool), validIndicesInPool_1_1 = validIndicesInPool_1.next(); !validIndicesInPool_1_1.done; validIndicesInPool_1_1 = validIndicesInPool_1.next()) {
                var index = validIndicesInPool_1_1.value;
                if (this.hasOptimizedKey(getStableId(index))) {
                    this.syncItem(index, getItemType(index), getStableId(index));
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (validIndicesInPool_1_1 && !validIndicesInPool_1_1.done && (_d = validIndicesInPool_1.return)) _d.call(validIndicesInPool_1);
            }
            finally { if (e_4) throw e_4.error; }
        }
        try {
            for (var validIndicesInPool_2 = tslib_1.__values(validIndicesInPool), validIndicesInPool_2_1 = validIndicesInPool_2.next(); !validIndicesInPool_2_1.done; validIndicesInPool_2_1 = validIndicesInPool_2.next()) {
                var index = validIndicesInPool_2_1.value;
                if (!this.hasOptimizedKey(getStableId(index))) {
                    this.syncItem(index, getItemType(index), getStableId(index));
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (validIndicesInPool_2_1 && !validIndicesInPool_2_1.done && (_e = validIndicesInPool_2.return)) _e.call(validIndicesInPool_2);
            }
            finally { if (e_5) throw e_5.error; }
        }
        // Clean up stale items and manage the recycle pool size
        this.cleanup(getStableId, getItemType, engagedIndices, dataLength);
    };
    /**
     * Checks if a stable ID already has an assigned key
     */
    RenderStackManager.prototype.hasOptimizedKey = function (stableId) {
        return this.stableIdMap.has(stableId);
    };
    /**
     * Cleans up stale keys and manages the recycle pool size.
     * This ensures we don't maintain references to items that are no longer in the dataset,
     * and limits the number of recycled items to avoid excessive memory usage.
     */
    RenderStackManager.prototype.cleanup = function (getStableId, getItemType, engagedIndices, dataLength) {
        var e_6, _a, e_7, _b;
        var itemsToDelete = new Array();
        try {
            // Remove items that are no longer in the dataset
            for (var _c = tslib_1.__values(this.keyMap.entries()), _d = _c.next(); !_d.done; _d = _c.next()) {
                var _e = tslib_1.__read(_d.value, 2), key = _e[0], keyInfo = _e[1];
                var index = keyInfo.index, itemType = keyInfo.itemType, stableId = keyInfo.stableId;
                var indexOutOfBounds = index >= dataLength;
                var hasStableIdChanged = !indexOutOfBounds && getStableId(index) !== stableId;
                if (indexOutOfBounds || hasStableIdChanged) {
                    var nextIndex = this.unProcessedIndices.values().next().value;
                    var shouldDeleteKey = true;
                    if (nextIndex !== undefined) {
                        var nextItemType = getItemType(nextIndex);
                        var nextStableId = getStableId(nextIndex);
                        if (itemType === nextItemType) {
                            this.syncItem(nextIndex, nextItemType, nextStableId);
                            shouldDeleteKey = false;
                        }
                    }
                    if (shouldDeleteKey) {
                        this.deleteKeyFromRecyclePool(itemType, key);
                        this.stableIdMap.delete(stableId);
                        itemsToDelete.push(key);
                    }
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_6) throw e_6.error; }
        }
        try {
            for (var itemsToDelete_1 = tslib_1.__values(itemsToDelete), itemsToDelete_1_1 = itemsToDelete_1.next(); !itemsToDelete_1_1.done; itemsToDelete_1_1 = itemsToDelete_1.next()) {
                var key = itemsToDelete_1_1.value;
                this.keyMap.delete(key);
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (itemsToDelete_1_1 && !itemsToDelete_1_1.done && (_b = itemsToDelete_1.return)) _b.call(itemsToDelete_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
        // Limit the size of the recycle pool
        var itemsRenderedForRecycling = this.keyMap.size - engagedIndices.length;
        if (itemsRenderedForRecycling > this.maxItemsInRecyclePool) {
            var deleteCount = itemsRenderedForRecycling - this.maxItemsInRecyclePool;
            var deleted = 0;
            // Use a for loop so we can break early once we've deleted enough items
            var entries = Array.from(this.keyMap.entries()).reverse();
            for (var i = 0; i < entries.length && deleted < deleteCount; i++) {
                var _f = tslib_1.__read(entries[i], 2), key = _f[0], keyInfo = _f[1];
                var index = keyInfo.index, itemType = keyInfo.itemType, stableId = keyInfo.stableId;
                if (!engagedIndices.includes(index)) {
                    this.deleteKeyFromRecyclePool(itemType, key);
                    this.stableIdMap.delete(stableId);
                    this.keyMap.delete(key);
                    deleted++;
                }
            }
        }
    };
    /**
     * Places a key back into its type-specific recycle pool for future reuse
     */
    RenderStackManager.prototype.recycleKey = function (key) {
        if (this.disableRecycling) {
            return;
        }
        var keyInfo = this.keyMap.get(key);
        if (!keyInfo) {
            return;
        }
        var itemType = keyInfo.itemType;
        // Add key back to its type's pool
        var pool = this.getRecyclePoolForType(itemType);
        pool.add(key);
    };
    /**
     * Returns the current render stack containing all active keys and their metadata
     */
    RenderStackManager.prototype.getRenderStack = function () {
        return this.keyMap;
    };
    /**
     * Syncs an individual item by assigning it an appropriate key.
     * Will use an existing key if available, or generate a new one.
     *
     * @returns The key assigned to the item
     */
    RenderStackManager.prototype.syncItem = function (index, itemType, stableId) {
        // Try to reuse an existing key, or get one from the recycle pool, or generate a new one
        var newKey = this.stableIdMap.get(stableId) ||
            this.getKeyFromRecyclePool(itemType) ||
            this.generateKey();
        this.unProcessedIndices.delete(index);
        var keyInfo = this.keyMap.get(newKey);
        if (keyInfo) {
            // Update an existing key's metadata
            this.deleteKeyFromRecyclePool(itemType, newKey);
            this.deleteKeyFromRecyclePool(keyInfo.itemType, newKey);
            this.stableIdMap.delete(keyInfo.stableId);
            keyInfo.index = index;
            keyInfo.itemType = itemType;
            keyInfo.stableId = stableId;
        }
        else {
            // Create a new entry in the key map
            this.keyMap.set(newKey, {
                itemType: itemType,
                index: index,
                stableId: stableId,
            });
        }
        this.stableIdMap.set(stableId, newKey);
        return newKey;
    };
    /**
     * Clears all recycled keys from the pool, effectively resetting the recycling system.
     * This operation does not affect currently active keys.
     */
    RenderStackManager.prototype.clearRecyclePool = function () {
        var e_8, _a;
        try {
            // iterate over all pools and clear them
            for (var _b = tslib_1.__values(this.recycleKeyPools.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var pool = _c.value;
                pool.clear();
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
    };
    /**
     * Generates a unique sequential key using an internal counter.
     * @returns A unique key as a string
     */
    RenderStackManager.prototype.generateKey = function () {
        return (this.keyCounter++).toString();
    };
    /**
     * Removes a specific key from its type's recycle pool
     */
    RenderStackManager.prototype.deleteKeyFromRecyclePool = function (itemType, key) {
        var _a;
        (_a = this.recycleKeyPools.get(itemType)) === null || _a === void 0 ? void 0 : _a.delete(key);
    };
    /**
     * Gets or creates a recycle pool for a specific item type
     */
    RenderStackManager.prototype.getRecyclePoolForType = function (itemType) {
        var pool = this.recycleKeyPools.get(itemType);
        if (!pool) {
            pool = new Set();
            this.recycleKeyPools.set(itemType, pool);
        }
        return pool;
    };
    /**
     * Retrieves and removes a key from the type's recycle pool
     * @returns A recycled key or undefined if none available
     */
    RenderStackManager.prototype.getKeyFromRecyclePool = function (itemType) {
        var pool = this.getRecyclePoolForType(itemType);
        if (pool.size > 0) {
            var key = pool.values().next().value;
            pool.delete(key);
            return key;
        }
        return undefined;
    };
    return RenderStackManager;
}());
exports.RenderStackManager = RenderStackManager;
//# sourceMappingURL=RenderStackManager.js.map