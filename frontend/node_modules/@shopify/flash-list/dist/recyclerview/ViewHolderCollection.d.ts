/**
 * ViewHolderCollection is a container component that manages multiple ViewHolder instances.
 * It handles the rendering of a collection of list items, manages layout updates,
 * and coordinates with the RecyclerView context for layout changes.
 */
import React from "react";
import { FlashListProps } from "../FlashListProps";
import { ViewHolderProps } from "./ViewHolder";
import { RVDimension, RVLayout } from "./layout-managers/LayoutManager";
/**
 * Props interface for the ViewHolderCollection component
 * @template TItem - The type of items in the data array
 */
export interface ViewHolderCollectionProps<TItem> {
    /** The data array to be rendered */
    data: FlashListProps<TItem>["data"];
    /** Map of indices to React keys for each rendered item */
    renderStack: Map<string, {
        index: number;
    }>;
    /** Function to get layout information for a specific index */
    getLayout: (index: number) => RVLayout;
    /** Ref to control layout updates from parent components */
    viewHolderCollectionRef: React.Ref<ViewHolderCollectionRef>;
    /** Map to store refs for each ViewHolder instance */
    refHolder: ViewHolderProps<TItem>["refHolder"];
    /** Callback when any item's size changes */
    onSizeChanged: ViewHolderProps<TItem>["onSizeChanged"];
    /** Function to render each item */
    renderItem: FlashListProps<TItem>["renderItem"];
    /** Additional data passed to renderItem that can trigger re-renders */
    extraData: any;
    /** Function to get the container's layout dimensions */
    getChildContainerLayout: () => RVDimension | undefined;
    /** Callback after layout effects are committed */
    onCommitLayoutEffect: () => void;
    /** Callback after effects are committed */
    onCommitEffect: () => void;
    /** Optional custom component to wrap each item */
    CellRendererComponent?: FlashListProps<TItem>["CellRendererComponent"];
    /** Optional component to render between items */
    ItemSeparatorComponent?: FlashListProps<TItem>["ItemSeparatorComponent"];
    /** Whether the list is horizontal or vertical */
    horizontal: FlashListProps<TItem>["horizontal"];
    /** Function to get the adjustment margin for the container.
     * For startRenderingFromBottom, we need to adjust the height of the container
     */
    getAdjustmentMargin: () => number;
}
/**
 * Ref interface for ViewHolderCollection that exposes methods to control layout updates
 */
export interface ViewHolderCollectionRef {
    /** Forces a layout update by triggering a re-render */
    commitLayout: () => void;
}
/**
 * ViewHolderCollection component that manages the rendering of multiple ViewHolder instances
 * and handles layout updates for the entire collection
 * @template TItem - The type of items in the data array
 */
export declare const ViewHolderCollection: <TItem>(props: ViewHolderCollectionProps<TItem>) => React.JSX.Element;
//# sourceMappingURL=ViewHolderCollection.d.ts.map