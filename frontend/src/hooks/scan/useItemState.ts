/**
 * useItemState Hook
 * Manages item-related state (current item, MRP variants, etc.)
 */
import { useState, useCallback } from "react";
import { Item, NormalizedMrpVariant, VarianceReason } from "@/types/scan";
import { getNormalizedMrpVariants } from "@/utils/scanUtils";

interface ItemState {
  currentItem: Item | null;
  countedQty: string;
  returnableDamageQty: string;
  nonReturnableDamageQty: string;
  countedMrp: string;
  remark: string;
  varianceNote: string;
  selectedReason: string | null;
  varianceReasons: VarianceReason[];
  itemCondition: string;
  conditionManuallySet: boolean;
  selectedVariant: NormalizedMrpVariant | null;
  floorNo: string;
  rackNo: string;
  shelfNo: string;
  damageQty: string;
  srNo: string;
  manufacturingDate: string;
  markLocation: string;
  mrpVariantOptions: NormalizedMrpVariant[];
  // Additional fields for compatibility
  selectedReasonCode?: string;
}

const initialState: ItemState = {
  currentItem: null,
  countedQty: "",
  returnableDamageQty: "",
  nonReturnableDamageQty: "",
  countedMrp: "",
  remark: "",
  varianceNote: "",
  selectedReason: null,
  varianceReasons: [],
  itemCondition: "good",
  conditionManuallySet: false,
  selectedVariant: null,
  floorNo: "",
  rackNo: "",
  shelfNo: "",
  damageQty: "",
  srNo: "",
  manufacturingDate: "",
  markLocation: "",
  mrpVariantOptions: [],
};

export const useItemState = () => {
  const [itemState, setItemState] = useState<ItemState>(initialState);

  const updateItemState = useCallback((updates: Partial<ItemState>) => {
    setItemState((prev) => {
      const newState = { ...prev, ...updates };
      // Auto-update MRP variants when item changes
      if (updates.currentItem !== undefined) {
        newState.mrpVariantOptions = getNormalizedMrpVariants(
          updates.currentItem ?? null,
        );
      }
      return newState;
    });
  }, []);

  const resetItemState = useCallback(() => {
    setItemState(initialState);
  }, []);

  const setCurrentItem = useCallback((item: Item | null) => {
    setItemState((prev) => ({
      ...prev,
      currentItem: item,
      mrpVariantOptions: getNormalizedMrpVariants(item),
    }));
  }, []);

  return {
    itemState,
    updateItemState,
    resetItemState,
    setCurrentItem,
  };
};
