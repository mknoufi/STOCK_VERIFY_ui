import { ViewabilityConfig } from "react-native";
import { RVDimension, RVLayout } from "../layout-managers/LayoutManager";
/**
 * Helper class for computing viewable items based on the passed `viewabilityConfig`.
 * Note methods in this class will be invoked on every scroll and should be optimized for performance.
 */
declare class ViewabilityHelper {
    /**
     * Viewable indices regardless of the viewability config
     */
    possiblyViewableIndices: number[];
    hasInteracted: boolean;
    private viewableIndices;
    private lastReportedViewableIndices;
    private viewabilityConfig;
    private viewableIndicesChanged;
    private timers;
    constructor(viewabilityConfig: ViewabilityConfig | null | undefined, viewableIndicesChanged: (indices: number[], newlyVisibleIndicies: number[], newlyNonvisibleIndices: number[]) => void);
    dispose(): void;
    updateViewableItems(horizontal: boolean, scrollOffset: number, listSize: RVDimension, getLayout: (index: number) => RVLayout | undefined, viewableIndices?: number[]): void;
    checkViewableIndicesChanges(newViewableIndices: number[]): void;
    clearLastReportedViewableIndices(): void;
    private isItemViewable;
}
export default ViewabilityHelper;
//# sourceMappingURL=ViewabilityHelper.d.ts.map