import { LayoutStateSetter } from "./useLayoutState";
export type RecyclingStateSetter<T> = LayoutStateSetter<T>;
export type RecyclingStateInitialValue<T> = T | (() => T);
/**
 * A custom hook that provides state management with automatic reset functionality.
 * Similar to useState, but automatically resets the state when specified dependencies change.
 * This is particularly useful for managing state that needs to be reset when certain props or values change when items are recycled.
 * This also avoids another setState call on recycling and helps with performance.
 *
 * @param initialState - The initial state value or a function that returns the initial state
 * @param deps - Array of dependencies that trigger a state reset when changed
 * @param onReset - Optional callback function that is called when the state is reset
 * @returns A tuple containing:
 *   - The current state value
 *   - A setState function that works like useState's setState
 */
export declare function useRecyclingState<T>(initialState: RecyclingStateInitialValue<T>, deps: React.DependencyList, onReset?: () => void): [T, RecyclingStateSetter<T>];
//# sourceMappingURL=useRecyclingState.d.ts.map