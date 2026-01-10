/**
 * ViewHolder is a core component in FlashList that manages individual item rendering and layout.
 * It handles the rendering of list items, separators, and manages layout updates for each item.
 * The component is memoized to prevent unnecessary re-renders and includes layout comparison logic.
 */
import React, { RefObject } from "react";
import { FlashListProps, RenderTarget } from "../FlashListProps";
import { RVDimension, RVLayout } from "./layout-managers/LayoutManager";
import { CompatView } from "./components/CompatView";
/**
 * Props interface for the ViewHolder component
 * @template TItem - The type of item being rendered in the list
 */
export interface ViewHolderProps<TItem> {
    /** Index of the item in the data array */
    index: number;
    /** Layout information for positioning and sizing the item */
    layout: RVLayout;
    /** Map to store refs for each ViewHolder instance, keyed by index */
    refHolder: Map<number, RefObject<CompatView | null>>;
    /** Additional data passed to renderItem that can trigger re-renders */
    extraData: any;
    /** Specifies the rendering target (e.g., "Cell", "StickyHeader") */
    target: RenderTarget;
    /** The actual item data to be rendered */
    item: TItem;
    /** The next item in the list, used for rendering separators */
    trailingItem: TItem | undefined;
    /** Function to render the item content */
    renderItem: FlashListProps<TItem>["renderItem"];
    /** Optional custom component to wrap each item */
    CellRendererComponent?: FlashListProps<TItem>["CellRendererComponent"];
    /** Optional component to render between items */
    ItemSeparatorComponent?: FlashListProps<TItem>["ItemSeparatorComponent"];
    /** Whether the list is horizontal or vertical */
    horizontal?: FlashListProps<TItem>["horizontal"];
    /** Callback when the item's size changes */
    onSizeChanged?: (index: number, size: RVDimension) => void;
}
/**
 * Memoized ViewHolder component that prevents unnecessary re-renders by comparing props
 * @template TItem - The type of item being rendered in the list
 */
export declare const ViewHolder: React.MemoExoticComponent<(<TItem>(props: ViewHolderProps<TItem>) => React.JSX.Element)>;
//# sourceMappingURL=ViewHolder.d.ts.map