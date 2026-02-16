/**
 * Hook that provides a way to track component unmounting state.
 * This hook is particularly useful for preventing state updates or side effects
 * after a component has unmounted, helping to avoid memory leaks and race conditions.
 *
 * @returns A ref containing a boolean flag that indicates whether the component is unmounted
 *         (true) or mounted (false)
 */
export declare const useUnmountFlag: () => import("react").MutableRefObject<boolean>;
//# sourceMappingURL=useUnmountFlag.d.ts.map