import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useScanSessionStore } from "@/store/scanSessionStore";
import { getItemByBarcode, refreshItemStock } from "@/services/api";
import { CountLineBatch } from "@/types/scan";
import { useItemForm } from "./useItemForm";
import { useItemSubmission } from "./useItemSubmission";

export const useItemDetailLogic = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode: string; sessionId: string }>();
  const { barcode, sessionId } = params;
  const { sessionType } = useScanSessionStore();

  const [loading, setLoading] = useState(false);
  const [refreshingStock, setRefreshingStock] = useState(false);
  const [item, setItem] = useState<any>(null);

  const refreshErrorCountRef = useRef<number>(0);
  const MAX_REFRESH_ERRORS = 3;

  const form = useItemForm();
  const submission = useItemSubmission({
    form,
    item,
    sessionId: sessionId as string,
    sessionType: sessionType as string
  });

  // Load Item Details
  useEffect(() => {
    const loadItem = async () => {
      if (!barcode) {
        console.error("No barcode provided to ItemDetailScreen");
        return;
      }
      setLoading(true);
      try {
        const itemData = await getItemByBarcode(barcode as string);
        if (itemData) {
          setItem(itemData);
          form.setMrp(itemData.mrp ? String(itemData.mrp) : "");
          form.setCategory(itemData.category || "");
          form.setSubCategory(itemData.subcategory || "");

          // Auto-detect batches
          if (itemData.batches && itemData.batches.length > 0) {
            form.setIsBatchMode(true);
            const mappedBatches: CountLineBatch[] = itemData.batches.map((b: any) => ({
              quantity: b.stock_qty || 0,
              mrp: b.mrp,
              manufacturing_date: b.manufacturing_date,
              item_condition: "No Issue",
              condition_details: "",
              barcode: b.barcode,
              batch_no: b.batch_no,
            }));
            form.setBatches(mappedBatches);
          }
        } else {
          Alert.alert("Error", "Item not found");
          router.back();
        }
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to load item");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (barcode) {
      loadItem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode, router]);

  // Auto-focus quantity input when item loads
  useEffect(() => {
    if (item && !loading) {
      const timer = setTimeout(() => {
        form.quantityInputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, loading]);

  const handleRefreshStock = useCallback(async (silent: boolean = false) => {
    if (!item || !item.item_code) return;

    if (silent && refreshErrorCountRef.current >= MAX_REFRESH_ERRORS) return;

    setRefreshingStock(true);
    try {
      const result = await refreshItemStock(item.item_code);
      if (result.success && result.item) {
        setItem(result.item);
        if (!form.mrpEditable) {
          form.setMrp(result.item.mrp ? String(result.item.mrp) : "");
        }
        refreshErrorCountRef.current = 0;
      } else {
        throw new Error("Failed to refresh stock");
      }
    } catch {
      refreshErrorCountRef.current += 1;
      if (!silent) {
        Alert.alert("Error", "Failed to refresh stock");
      }
    } finally {
      setRefreshingStock(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, form.mrpEditable]);

  const { loading: submitting, handleSubmit } = submission;

  return {
    item,
    loading,
    submitting,
    refreshingStock,
    handleRefreshStock,
    sessionType,
    sessionId,
    barcode,
    ...form,
    handleSubmit
  };
};
