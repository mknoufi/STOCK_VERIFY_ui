/**
 * RecyclerView is a high-performance list component that efficiently renders and recycles list items.
 * It's designed to handle large lists with optimal memory usage and smooth scrolling.
 */
import React from "react";
import { FlashListRef } from "../FlashListRef";
import { RecyclerViewProps } from "./RecyclerViewProps";
type RecyclerViewType = <T>(props: RecyclerViewProps<T> & {
    ref?: React.Ref<FlashListRef<T>>;
}) => React.JSX.Element;
declare const RecyclerView: RecyclerViewType;
export { RecyclerView };
//# sourceMappingURL=RecyclerView.d.ts.map