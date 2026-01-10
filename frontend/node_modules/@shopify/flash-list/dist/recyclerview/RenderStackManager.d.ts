import { ConsecutiveNumbers } from "./helpers/ConsecutiveNumbers";
/**
 * Manages the recycling of rendered items in a virtualized list.
 * This class handles tracking, recycling, and reusing item keys to optimize
 * rendering performance by minimizing creation/destruction of components.
 */
export declare class RenderStackManager {
    disableRecycling: boolean;
    private maxItemsInRecyclePool;
    private recycleKeyPools;
    private keyMap;
    private stableIdMap;
    private keyCounter;
    private unProcessedIndices;
    /**
     * @param maxItemsInRecyclePool - Maximum number of items that can be in the recycle pool
     */
    constructor(maxItemsInRecyclePool?: number);
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
    sync(getStableId: (index: number) => string, getItemType: (index: number) => string, engagedIndices: ConsecutiveNumbers, dataLength: number): void;
    /**
     * Checks if a stable ID already has an assigned key
     */
    private hasOptimizedKey;
    /**
     * Cleans up stale keys and manages the recycle pool size.
     * This ensures we don't maintain references to items that are no longer in the dataset,
     * and limits the number of recycled items to avoid excessive memory usage.
     */
    private cleanup;
    /**
     * Places a key back into its type-specific recycle pool for future reuse
     */
    private recycleKey;
    /**
     * Returns the current render stack containing all active keys and their metadata
     */
    getRenderStack(): Map<string, {
        itemType: string;
        index: number;
        stableId: string;
    }>;
    /**
     * Syncs an individual item by assigning it an appropriate key.
     * Will use an existing key if available, or generate a new one.
     *
     * @returns The key assigned to the item
     */
    private syncItem;
    /**
     * Clears all recycled keys from the pool, effectively resetting the recycling system.
     * This operation does not affect currently active keys.
     */
    private clearRecyclePool;
    /**
     * Generates a unique sequential key using an internal counter.
     * @returns A unique key as a string
     */
    private generateKey;
    /**
     * Removes a specific key from its type's recycle pool
     */
    private deleteKeyFromRecyclePool;
    /**
     * Gets or creates a recycle pool for a specific item type
     */
    private getRecyclePoolForType;
    /**
     * Retrieves and removes a key from the type's recycle pool
     * @returns A recycled key or undefined if none available
     */
    private getKeyFromRecyclePool;
}
//# sourceMappingURL=RenderStackManager.d.ts.map