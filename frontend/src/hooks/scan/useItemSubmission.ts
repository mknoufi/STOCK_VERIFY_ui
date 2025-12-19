import { useState } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  checkItemCounted,
  createCountLine,
  addQuantityToCountLine,
} from "@/services/api";
import { normalizeSerialValue } from "@/utils/scanUtils";
import { Item } from "@/types/scan";
import { useItemForm } from "./useItemForm";

interface UseItemSubmissionProps {
  form: ReturnType<typeof useItemForm>;
  item: Item | null;
  sessionId: string | null;
  sessionType: string | null;
}

export const useItemSubmission = ({ form, item, sessionId, sessionType }: UseItemSubmissionProps) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!form.validateForm(item, sessionType)) return;
    if (!item || !sessionId) return;

    let finalQty = 0;
    if (form.isBatchMode) {
      finalQty = form.batches.reduce((sum, b) => sum + b.quantity, 0);
    } else {
      finalQty = parseFloat(form.quantity);
    }

    // Strict Mode Variance Check
    if (sessionType === "STRICT") {
      const currentStock = Number(item.stock_qty || 0);
      const enteredQty = finalQty;
      if (enteredQty !== currentStock) {
        const confirmed = await new Promise((resolve) => {
          Alert.alert(
            "Strict Mode Warning",
            `Counted quantity (${enteredQty}) does not match stock quantity (${currentStock}). Are you sure?`,
            [
              { text: "Cancel", onPress: () => resolve(false), style: "cancel" },
              { text: "Confirm Variance", onPress: () => resolve(true), style: "destructive" },
            ]
          );
        });
        if (!confirmed) return;
      }
    }

    // Check for existing count
    try {
      const checkResult = await checkItemCounted(sessionId as string, item.item_code);
      if (checkResult.already_counted && checkResult.count_lines && checkResult.count_lines.length > 0) {
        const existingLine = checkResult.count_lines[0];

        const userChoice = await new Promise<"ADD" | "CANCEL" | "NEW">((resolve) => {
          Alert.alert(
            "Item Already Counted",
            `This item has already been counted (Qty: ${existingLine.counted_qty}). Do you want to add to the existing count?`,
            [
              { text: "Cancel", onPress: () => resolve("CANCEL"), style: "cancel" },
              { text: "Add to Existing", onPress: () => resolve("ADD") },
              { text: "Create New Entry", onPress: () => resolve("NEW") }
            ]
          );
        });

        if (userChoice === "CANCEL") return;

        if (userChoice === "ADD") {
          setLoading(true);
          try {
            await addQuantityToCountLine(existingLine.line_id, finalQty, form.isBatchMode ? form.batches : undefined);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Quantity added successfully", [
              { text: "OK", onPress: () => router.back() },
            ]);
            return;
          } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to add quantity");
            setLoading(false);
            return;
          }
        }
        // If NEW, proceed to createCountLine below
      }
    } catch (error) {
      console.warn("Error checking item counted:", error);
      // Proceed to create new line if check fails
    }

    setLoading(true);
    try {
      const payload: any = {
        session_id: sessionId as string,
        item_code: item.item_code,
        counted_qty: finalQty,
        batches: form.isBatchMode ? form.batches : undefined,
        damaged_qty: form.isDamageEnabled ? Number(form.damageQty) : 0,
        item_condition: form.condition,
        condition_details: form.condition === "Other" ? form.conditionDetails : undefined,
        remark: form.remark || undefined,
        photo_base64: form.itemPhoto?.base64,
        mrp_counted: form.mrpEditable && form.mrp ? Number(form.mrp) : undefined,
        category_correction: form.categoryEditable ? form.category : undefined,
        subcategory_correction: form.categoryEditable ? form.subCategory : undefined,
        manufacturing_date: form.mfgDate || undefined,
      };

      if (form.isSerialEnabled) {
        payload.serial_numbers = form.serialNumbers.map((sn, idx) => ({
          label: `Serial #${idx + 1}`,
          value: normalizeSerialValue(sn),
          captured_at: new Date().toISOString(),
        }));
      }

      await createCountLine(payload);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Item counted successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);

    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit count");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSubmit
  };
};
