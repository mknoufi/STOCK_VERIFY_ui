export type LayoutStateSetter<T> = (newValue: T | ((prevValue: T) => T), skipParentLayout?: boolean) => void;
export type LayoutStateInitialValue<T> = T | (() => T);
/**
 * Custom hook that combines state management with RecyclerView layout updates.
 * This hook provides a way to manage state that affects the layout of the RecyclerView,
 * ensuring that any state changes trigger a layout recalculation.
 *
 * @param initialState - The initial state value or a function that returns the initial state
 * @returns A tuple containing:
 *   - The current state value
 *   - A setter function that updates the state and triggers a layout recalculation
 */
export declare function useLayoutState<T>(initialState: LayoutStateInitialValue<T>): [T, LayoutStateSetter<T>];
//# sourceMappingURL=useLayoutState.d.ts.map