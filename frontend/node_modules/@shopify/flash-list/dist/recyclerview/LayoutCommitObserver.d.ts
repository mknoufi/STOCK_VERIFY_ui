import React from "react";
export interface LayoutCommitObserverProps {
    children: React.ReactNode;
    onCommitLayoutEffect?: () => void;
}
/**
 * LayoutCommitObserver can be used to observe when FlashList commits a layout.
 * It is useful when your component has one or more FlashLists somewhere down the tree.
 * LayoutCommitObserver will trigger `onCommitLayoutEffect` when all of the FlashLists in the tree have finished their first commit.
 */
export declare const LayoutCommitObserver: React.MemoExoticComponent<(props: LayoutCommitObserverProps) => React.JSX.Element>;
//# sourceMappingURL=LayoutCommitObserver.d.ts.map