/**
 * Hook that provides a setTimeout which is aware of component unmount state.
 * Any timeouts created with this hook will be automatically cleared when the component unmounts.
 */
export declare function useUnmountAwareTimeout(): {
    setTimeout: (callback: () => void, delay: number) => void;
};
/**
 * Hook that provides a requestAnimationFrame which is aware of component unmount state.
 * Any animation frames requested with this hook will be automatically canceled when the component unmounts.
 */
export declare function useUnmountAwareAnimationFrame(): {
    requestAnimationFrame: (callback: FrameRequestCallback) => void;
};
//# sourceMappingURL=useUnmountAwareCallbacks.d.ts.map