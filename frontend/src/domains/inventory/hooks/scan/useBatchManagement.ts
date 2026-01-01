import { useState } from "react";
import { Alert } from "react-native";
import type { CountLineBatch } from "@/types/scan";

export const useBatchManagement = () => {
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batches, setBatches] = useState<CountLineBatch[]>([]);

  // Current batch input state
  const [currentBatchQty, setCurrentBatchQty] = useState("");
  const [currentBatchMrp, setCurrentBatchMrp] = useState("");
  const [currentBatchMfgDate, setCurrentBatchMfgDate] = useState("");
  const [currentBatchCondition, setCurrentBatchCondition] =
    useState("No Issue");
  const [batchConditionDetails, setBatchConditionDetails] = useState("");

  const handleAddBatch = () => {
    if (!currentBatchQty) {
      Alert.alert("Error", "Please enter quantity");
      return;
    }
    const newBatch: CountLineBatch = {
      quantity: parseFloat(currentBatchQty),
      mrp: currentBatchMrp ? parseFloat(currentBatchMrp) : undefined,
      manufacturing_date: currentBatchMfgDate || undefined,
      item_condition: currentBatchCondition,
      condition_details: batchConditionDetails || undefined,
    };
    setBatches([...batches, newBatch]);

    // Reset current batch inputs
    setCurrentBatchQty("");
    setCurrentBatchMrp("");
    setCurrentBatchMfgDate("");
    setCurrentBatchCondition("No Issue");
    setBatchConditionDetails("");
  };

  const handleRemoveBatch = (index: number) => {
    const newBatches = [...batches];
    newBatches.splice(index, 1);
    setBatches(newBatches);
  };

  const resetBatches = () => {
    setBatches([]);
    setCurrentBatchQty("");
    setCurrentBatchMrp("");
    setCurrentBatchMfgDate("");
    setCurrentBatchCondition("No Issue");
    setBatchConditionDetails("");
    setIsBatchMode(false);
  };

  return {
    isBatchMode,
    setIsBatchMode,
    batches,
    setBatches,
    currentBatchQty,
    setCurrentBatchQty,
    currentBatchMrp,
    setCurrentBatchMrp,
    currentBatchMfgDate,
    setCurrentBatchMfgDate,
    currentBatchCondition,
    setCurrentBatchCondition,
    batchConditionDetails,
    setBatchConditionDetails,
    handleAddBatch,
    handleRemoveBatch,
    resetBatches,
  };
};
