/**
 * useItemState Hook
 * Manages item-related state (current item, MRP variants, etc.)
 */
import { useState, useCallback, useMemo } from 'react';
import { Item, NormalizedMrpVariant, VarianceReason } from '@/types/scan';
import { getNormalizedMrpVariants } from '@/utils/scanUtils';

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
  countedQty: '',
  returnableDamageQty: '',
  nonReturnableDamageQty: '',
  countedMrp: '',
  remark: '',
  varianceNote: '',
  selectedReason: null,
  varianceReasons: [],
  itemCondition: 'good',
  conditionManuallySet: false,
  selectedVariant: null,
  floorNo: '',
  rackNo: '',
  damageQty: '',
  srNo: '',
  manufacturingDate: '',
  markLocation: '',
  mrpVariantOptions: [],
};

export const useItemState = () => {
  const [itemState, setItemState] = useState<ItemState>(initialState);

  // Memoize MRP variants calculation to avoid recalculating on every render
  const mrpVariantOptions = useMemo(() => {
    return getNormalizedMrpVariants(itemState.currentItem);
  }, [itemState.currentItem]);

  const updateItemState = useCallback((updates: Partial<ItemState>) => {
    setItemState((prev) => {
      const newState = { ...prev, ...updates };
      // MRP variants will be recalculated via useMemo when currentItem changes
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
    }));
    // MRP variants will be recalculated via useMemo
  }, []);

  // Merge memoized MRP variants into itemState for return
  const enhancedItemState = useMemo(() => ({
    ...itemState,
    mrpVariantOptions,
  }), [itemState, mrpVariantOptions]);

  return {
    itemState: enhancedItemState,
    updateItemState,
    resetItemState,
    setCurrentItem,
  };
};

