import { useState, useRef } from "react";
import { Alert, TextInput } from "react-native";
import { useBatchManagement } from "./useBatchManagement";
import type { Item } from "@/types/scan";

export const useItemForm = () => {
  // Core fields
  const [quantity, setQuantity] = useState("");
  const [mrp, setMrp] = useState("");
  const [mrpEditable, setMrpEditable] = useState(false);

  // Category correction
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [categoryEditable, setCategoryEditable] = useState(false);

  // Condition & Damage
  const [condition, setCondition] = useState("No Issue");
  const [conditionDetails, setConditionDetails] = useState("");
  const [isDamageEnabled, setIsDamageEnabled] = useState(false);
  const [damageQty, setDamageQty] = useState("");
  const [damageRemark, setDamageRemark] = useState("");

  // Serial Numbers
  const [isSerialEnabled, setIsSerialEnabled] = useState(false);
  const [serialNumbers, setSerialNumbers] = useState<string[]>([]);

  // Other
  const [mfgDate, setMfgDate] = useState("");
  const [remark, setRemark] = useState("");
  const [itemPhoto, setItemPhoto] = useState<{
    uri: string;
    base64?: string;
  } | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const quantityInputRef = useRef<TextInput>(null);

  // Batch Management
  const batchManager = useBatchManagement();

  const handleSerialChange = (text: string, index: number) => {
    const newSerials = [...serialNumbers];
    newSerials[index] = text;
    setSerialNumbers(newSerials);
  };

  // Update serial numbers array size when quantity changes
  const updateSerialNumbersSize = (qty: string) => {
    const numQty = parseInt(qty) || 0;
    if (isSerialEnabled && numQty > 0 && numQty < 100) {
      // Reasonable limit
      if (serialNumbers.length !== numQty) {
        const newSerials = [...serialNumbers];
        if (newSerials.length < numQty) {
          // Add empty slots
          for (let i = newSerials.length; i < numQty; i++) {
            newSerials.push("");
          }
        } else {
          // Trim
          newSerials.splice(numQty);
        }
        setSerialNumbers(newSerials);
      }
    }
  };

  const validateForm = (item: Item | null, _sessionType: string | null) => {
    if (!item) return false;

    // If batch mode, validate batches
    if (batchManager.isBatchMode) {
      if (batchManager.batches.length === 0) {
        Alert.alert("Error", "Please add at least one batch");
        return false;
      }
      return true;
    }

    // Standard validation
    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return false;
    }

    if (isSerialEnabled) {
      const validSerials = serialNumbers.filter(
        (s) => s && s.trim().length > 0,
      );
      if (validSerials.length !== Number(quantity)) {
        Alert.alert(
          "Missing Serials",
          `Please enter all ${quantity} serial numbers.`,
        );
        return false;
      }
    }

    if (isDamageEnabled) {
      const dQty = Number(damageQty);
      if (isNaN(dQty) || dQty < 0 || dQty > Number(quantity)) {
        Alert.alert(
          "Invalid Damage Qty",
          "Damage quantity cannot exceed total quantity.",
        );
        return false;
      }
    }

    return true;
  };

  const resetForm = () => {
    setQuantity("");
    setMrp("");
    setMrpEditable(false);
    setCategory("");
    setSubCategory("");
    setCategoryEditable(false);
    setCondition("No Issue");
    setConditionDetails("");
    setIsDamageEnabled(false);
    setDamageQty("");
    setDamageRemark("");
    setIsSerialEnabled(false);
    setSerialNumbers([]);
    setMfgDate("");
    setRemark("");
    setItemPhoto(null);
    setShowPhotoModal(false);
    batchManager.resetBatches();
  };

  return {
    // State
    quantity,
    setQuantity,
    mrp,
    setMrp,
    mrpEditable,
    setMrpEditable,
    category,
    setCategory,
    subCategory,
    setSubCategory,
    categoryEditable,
    setCategoryEditable,
    condition,
    setCondition,
    conditionDetails,
    setConditionDetails,
    isDamageEnabled,
    setIsDamageEnabled,
    damageQty,
    setDamageQty,
    damageRemark,
    setDamageRemark,
    isSerialEnabled,
    setIsSerialEnabled,
    serialNumbers,
    setSerialNumbers,
    mfgDate,
    setMfgDate,
    remark,
    setRemark,
    itemPhoto,
    setItemPhoto,
    showPhotoModal,
    setShowPhotoModal,
    quantityInputRef,

    // Batch Manager
    ...batchManager,

    // Methods
    handleSerialChange,
    updateSerialNumbersSize,
    validateForm,
    resetForm,
  };
};
