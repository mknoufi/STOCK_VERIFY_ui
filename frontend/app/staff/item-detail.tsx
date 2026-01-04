/**
 * Modern Item Detail Screen - Lavanya Mart Stock Verify
 * Clean, efficient item verification interface
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useScanSessionStore } from "../../src/store/scanSessionStore";
import {
  getItemByBarcode,
  createCountLine,
  checkItemScanStatus,
  searchItems,
} from "../../src/services/api/api";
import { RecentItemsService } from "../../src/services/enhancedFeatures";
import { toastService } from "../../src/services/utils/toastService";
import {
  CreateCountLinePayload,
  SerialEntryData,
  DateFormatType,
} from "../../src/types/scan";
import {
  normalizeSerialValue,
  validateSerialNumber,
  validateSerialNumbers,
  validateScannedSerial,
} from "../../src/utils/scanUtils";
import { SerialScannerModal } from "../../src/components/modals/SerialScannerModal";

import ModernHeader from "../../src/components/ui/ModernHeader";
import ModernCard from "../../src/components/ui/ModernCard";
import ModernButton from "../../src/components/ui/ModernButton";
import ModernInput from "../../src/components/ui/ModernInput";
import { ThemedScreen } from "../../src/components/ui/ThemedScreen";
import {
  colors,
  semanticColors,
  spacing,
  fontSize,
  fontWeight,
  radius as borderRadius,
  shadows,
} from "../../src/theme/unified";

const CONDITION_OPTIONS = [
  "Good",
  "Aging",
  "Non-moving",
  "Rate Issue",
  "Scratches",
  "Damaged",
];

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ barcode: string; sessionId: string }>();
  const { barcode, sessionId } = params;
  const { currentFloor, currentRack } = useScanSessionStore();

  // State
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [item, setItem] = useState<any>(null);

  // Form State
  const [quantity, setQuantity] = useState("0");
  const [mrp, setMrp] = useState("");
  const [mrpEditable, setMrpEditable] = useState(false);
  const [condition, setCondition] = useState("Good");
  const [remark, setRemark] = useState("");

  // Serial Number State - Enhanced for serialized items with per-serial MRP/mfg date
  const [serialEntries, setSerialEntries] = useState<SerialEntryData[]>([]);
  const [isSerializedItem, setIsSerializedItem] = useState(false);
  const [serialValidationErrors, setSerialValidationErrors] = useState<
    string[]
  >([]);
  const [showSerialScanner, setShowSerialScanner] = useState(false);
  const [activeSerialIndex, setActiveSerialIndex] = useState(0);

  // Legacy array for backward compatibility
  const serialNumbers = useMemo(
    () => serialEntries.map((e) => e.serial_number),
    [serialEntries],
  );

  // Legacy single serial (for backward compatibility)
  const [serialNumber, setSerialNumber] = useState("");
  const [varianceRemark, setVarianceRemark] = useState("");
  const [mrpVariants, setMrpVariants] = useState<any[]>([]);
  const [selectedMrpVariant, setSelectedMrpVariant] = useState<any>(null);

  // Variants with same name
  const [sameNameVariants, setSameNameVariants] = useState<any[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Damage State
  const [isDamageEnabled, setIsDamageEnabled] = useState(false);
  const [damageQty, setDamageQty] = useState("");
  const [damageType, setDamageType] = useState<"returnable" | "nonreturnable">(
    "returnable",
  );

  // Manufacturing & Expiry Date State (for item-level or non-serialized items)
  const [hasMfgDate, setHasMfgDate] = useState(false);
  const [hasExpiryDate, setHasExpiryDate] = useState(false);
  const [itemMfgDate, setItemMfgDate] = useState("");
  const [itemMfgDateFormat, setItemMfgDateFormat] =
    useState<DateFormatType>("full");
  const [itemExpiryDate, setItemExpiryDate] = useState("");
  const [itemExpiryDateFormat, setItemExpiryDateFormat] =
    useState<DateFormatType>("full");

  const loadItem = useCallback(async () => {
    if (!barcode) return;
    setLoading(true);
    try {
      const itemData = await getItemByBarcode(barcode);
      if (itemData) {
        setItem(itemData);
        setMrp(String(itemData.mrp || ""));

        // Serial capture is now user-controlled via toggle
        // User can enable it for items that require serial tracking
        setIsSerializedItem(false);
        setSerialEntries([]);

        // Handle MRP Variants
        if (
          itemData.mrp_variants &&
          Array.isArray(itemData.mrp_variants) &&
          itemData.mrp_variants.length > 0
        ) {
          setMrpVariants(itemData.mrp_variants);
          // Default to the first one or the one matching current MRP
          const variants = itemData.mrp_variants as any[];
          const match = variants.find((v: any) => v.value === itemData.mrp);
          const selected = match || variants[0];
          setSelectedMrpVariant(selected);
          if (selected) {
            setMrp(String(selected.value));
          }
        }

        // Check for existing count
        try {
          const scanStatus = await checkItemScanStatus(
            sessionId!,
            itemData.item_code || barcode,
          );
          if (scanStatus.scanned) {
            const existing = scanStatus.locations.find(
              (loc: any) =>
                loc.floor_no === currentFloor && loc.rack_no === currentRack,
            );
            if (existing) {
              setQuantity(String(existing.counted_qty));
              toastService.show("Loaded existing count", { type: "info" });
            }
          }
        } catch (_) {
          // Ignore
        }

        await RecentItemsService.addRecent(
          itemData.item_code || barcode,
          itemData,
        );
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
  }, [barcode, sessionId, currentFloor, currentRack, router]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  // Load variants with same name
  useEffect(() => {
    const loadVariants = async () => {
      if (!item?.item_name) return;

      setLoadingVariants(true);
      try {
        const results = await searchItems(item.item_name);
        // Filter out current item and items with 0 stock
        const filtered = results.filter(
          (v) =>
            v.item_code !== item.item_code &&
            v.barcode !== item.barcode &&
            (v.stock_qty || 0) > 0,
        );
        setSameNameVariants(filtered);
      } catch (error) {
        console.warn("Failed to load variants:", error);
      } finally {
        setLoadingVariants(false);
      }
    };

    if (item) {
      loadVariants();
    }
  }, [item?.item_name, item?.item_code, item?.barcode]);

  // Check if item uses weight-based UOM (kg) - allows fractional quantities
  const isWeightBasedUOM = useMemo(() => {
    const uom = (
      item?.uom ||
      item?.uom_name ||
      item?.uom_code ||
      ""
    ).toLowerCase();
    return (
      uom.includes("kg") ||
      uom.includes("gram") ||
      uom.includes("gm") ||
      uom.includes("liter") ||
      uom.includes("litre") ||
      uom.includes("ml")
    );
  }, [item]);

  // Format quantity based on UOM - 2 decimals for kg, integers for units
  const formatQuantity = useCallback(
    (value: string): string => {
      const num = parseFloat(value);
      if (isNaN(num)) return "0";

      if (isWeightBasedUOM) {
        // Allow up to 2 decimal places for weight-based items
        return num.toFixed(2).replace(/\.?0+$/, "") || "0";
      } else {
        // Integer only for unit-based items
        return Math.floor(num).toString();
      }
    },
    [isWeightBasedUOM],
  );

  // Handle quantity change with UOM validation
  const handleQuantityChange = useCallback(
    (value: string) => {
      // Allow empty or partial input while typing
      if (value === "" || value === "." || value === "0.") {
        setQuantity(value);
        return;
      }

      // Validate input format based on UOM
      if (isWeightBasedUOM) {
        // Allow decimals up to 2 places
        const regex = /^\d*\.?\d{0,2}$/;
        if (regex.test(value)) {
          setQuantity(value);
        }
      } else {
        // Only allow integers
        const regex = /^\d*$/;
        if (regex.test(value)) {
          setQuantity(value);
        }
      }
    },
    [isWeightBasedUOM],
  );

  // Get quantity step for +/- buttons
  const getQuantityStep = useCallback((): number => {
    return isWeightBasedUOM ? 0.25 : 1;
  }, [isWeightBasedUOM]);

  // Sync quantity with serial entries count for serialized items
  // When serials are scanned, quantity auto-updates
  useEffect(() => {
    if (isSerializedItem && serialEntries.length > 0) {
      setQuantity(String(serialEntries.length));
    }
  }, [serialEntries.length, isSerializedItem]);

  // Serial number handling functions
  const handleSerialChange = useCallback(
    (index: number, field: keyof SerialEntryData, value: string | number) => {
      setSerialEntries((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            [field]:
              field === "serial_number" ? String(value).toUpperCase() : value,
          };
        }
        return updated;
      });
      // Clear validation errors when user types
      setSerialValidationErrors([]);
    },
    [],
  );

  // Handle scanned serial from SerialScannerModal (auto-increments quantity)
  const handleSerialScanned = useCallback(
    (data: {
      serial_number: string;
      mrp?: number;
      manufacturing_date?: string;
    }) => {
      const newEntry: SerialEntryData = {
        id: `serial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        serial_number: data.serial_number,
        mrp: data.mrp ?? parseFloat(mrp) ?? item?.mrp,
        manufacturing_date: data.manufacturing_date ?? item?.manufacturing_date,
        scanned_at: new Date().toISOString(),
        is_valid: true,
      };

      setSerialEntries((prev) => [...prev, newEntry]);
      // Quantity auto-increments via useEffect above
    },
    [mrp, item],
  );

  // Add empty serial entry for manual input
  const handleAddSerial = useCallback(() => {
    const newEntry: SerialEntryData = {
      id: `serial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      serial_number: "",
      mrp: parseFloat(mrp) ?? item?.mrp,
      manufacturing_date: item?.manufacturing_date,
      is_valid: false,
    };
    setSerialEntries((prev) => [...prev, newEntry]);
  }, [mrp, item]);

  const handleRemoveSerial = useCallback(
    (index: number) => {
      if (serialEntries.length <= 1) {
        // If it's the last entry, just clear it
        setSerialEntries([
          {
            id: `serial_${Date.now()}`,
            serial_number: "",
            mrp: parseFloat(mrp) || item?.mrp,
            is_valid: false,
          },
        ]);
        return;
      }
      setSerialEntries((prev) => prev.filter((_, i) => i !== index));
    },
    [serialEntries.length, mrp, item],
  );

  // Date format options for flexible date input
  const DATE_FORMAT_OPTIONS: {
    value: DateFormatType;
    label: string;
    placeholder: string;
  }[] = [
    { value: "full", label: "Full Date", placeholder: "DD/MM/YYYY" },
    { value: "month_year", label: "Month & Year", placeholder: "MM/YYYY" },
    { value: "year_only", label: "Year Only", placeholder: "YYYY" },
  ];

  // Local pieces for picker-based date selection
  const [mfgDay, setMfgDay] = useState<string>("");
  const [mfgMonth, setMfgMonth] = useState<string>("");
  const [mfgYear, setMfgYear] = useState<string>("");
  const [expiryDay, setExpiryDay] = useState<string>("");
  const [expiryMonth, setExpiryMonth] = useState<string>("");
  const [expiryYear, setExpiryYear] = useState<string>("");
  const [selectVisible, setSelectVisible] = useState(false);
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [selectTitle, setSelectTitle] = useState("");
  const [selectType, setSelectType] = useState<"day" | "month" | "year" | null>(
    null,
  );
  const [selectFor, setSelectFor] = useState<"mfg" | "exp" | null>(null);

  const today = useMemo(() => new Date(), []);
  const currentYear = today.getFullYear();
  const earliestYear = currentYear - 10; // last 10 years

  // Initialize parts when itemMfgDate changes (or when format changes)
  useEffect(() => {
    if (!itemMfgDate) {
      setMfgDay("");
      setMfgMonth("");
      setMfgYear("");
      return;
    }
    const parts = itemMfgDate.split("/");
    if (itemMfgDateFormat === "full" && parts.length === 3) {
      setMfgDay(parts[0] ?? "");
      setMfgMonth(parts[1] ?? "");
      setMfgYear(parts[2] ?? "");
    } else if (itemMfgDateFormat === "month_year" && parts.length === 2) {
      setMfgDay("");
      setMfgMonth(parts[0] ?? "");
      setMfgYear(parts[1] ?? "");
    } else if (itemMfgDateFormat === "year_only") {
      setMfgDay("");
      setMfgMonth("");
      setMfgYear(parts[0] || "");
    }
  }, [itemMfgDate, itemMfgDateFormat]);

  // Initialize parts when itemExpiryDate changes (or when format changes)
  useEffect(() => {
    if (!itemExpiryDate) {
      setExpiryDay("");
      setExpiryMonth("");
      setExpiryYear("");
      return;
    }
    const parts = itemExpiryDate.split("/");
    if (itemExpiryDateFormat === "full" && parts.length === 3) {
      setExpiryDay(parts[0] ?? "");
      setExpiryMonth(parts[1] ?? "");
      setExpiryYear(parts[2] ?? "");
    } else if (itemExpiryDateFormat === "month_year" && parts.length === 2) {
      setExpiryDay("");
      setExpiryMonth(parts[0] ?? "");
      setExpiryYear(parts[1] ?? "");
    } else if (itemExpiryDateFormat === "year_only") {
      setExpiryDay("");
      setExpiryMonth("");
      setExpiryYear(parts[0] || "");
    }
  }, [itemExpiryDate, itemExpiryDateFormat]);

  // Compose itemMfgDate from parts
  const composeMfgDate = useCallback(() => {
    if (itemMfgDateFormat === "full") {
      if (!mfgDay || !mfgMonth || !mfgYear) return "";
      return `${mfgDay.padStart(2, "0")}/${mfgMonth.padStart(2, "0")}/${mfgYear}`;
    }
    if (itemMfgDateFormat === "month_year") {
      if (!mfgMonth || !mfgYear) return "";
      return `${mfgMonth.padStart(2, "0")}/${mfgYear}`;
    }
    if (itemMfgDateFormat === "year_only") {
      return mfgYear || "";
    }
    return "";
  }, [mfgDay, mfgMonth, mfgYear, itemMfgDateFormat]);

  const composeExpiryDate = useCallback(() => {
    if (itemExpiryDateFormat === "full") {
      if (!expiryDay || !expiryMonth || !expiryYear) return "";
      return `${expiryDay.padStart(2, "0")}/${expiryMonth.padStart(2, "0")}/${expiryYear}`;
    }
    if (itemExpiryDateFormat === "month_year") {
      if (!expiryMonth || !expiryYear) return "";
      return `${expiryMonth.padStart(2, "0")}/${expiryYear}`;
    }
    if (itemExpiryDateFormat === "year_only") {
      return expiryYear || "";
    }
    return "";
  }, [expiryDay, expiryMonth, expiryYear, itemExpiryDateFormat]);

  const isMfgFull = itemMfgDateFormat === "full";
  const isMfgMonthYear = itemMfgDateFormat === "month_year";
  const isMfgYearOnly = itemMfgDateFormat === "year_only";

  const isExpiryFull = itemExpiryDateFormat === "full";
  const isExpiryMonthYear = itemExpiryDateFormat === "month_year";
  const isExpiryYearOnly = itemExpiryDateFormat === "year_only";

  const generateMonthOptions = useCallback((): string[] => {
    return Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  }, []);

  const generateYearOptions = useCallback((): string[] => {
    const years: string[] = [];
    for (let y = currentYear; y >= earliestYear; y--) years.push(String(y));
    return years;
  }, [currentYear, earliestYear]);

  const generateDayOptions = useCallback((): string[] => {
    const month = Number(mfgMonth) || 1;
    const year = Number(mfgYear) || currentYear;
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) =>
      String(i + 1).padStart(2, "0"),
    );
  }, [mfgMonth, mfgYear, currentYear]);

  const generateExpiryDayOptions = useCallback((): string[] => {
    const month = Number(expiryMonth) || 1;
    const year = Number(expiryYear) || currentYear;
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) =>
      String(i + 1).padStart(2, "0"),
    );
  }, [expiryMonth, expiryYear, currentYear]);

  const openSelect = useCallback(
    (type: "day" | "month" | "year", target: "mfg" | "exp" = "mfg") => {
      setSelectFor(target);
      setSelectType(type);
      if (type === "day") {
        setSelectOptions(
          target === "mfg" ? generateDayOptions() : generateExpiryDayOptions(),
        );
        setSelectTitle("Select Day");
      } else if (type === "month") {
        setSelectOptions(generateMonthOptions());
        setSelectTitle("Select Month");
      } else {
        setSelectOptions(generateYearOptions());
        setSelectTitle("Select Year");
      }
      setSelectVisible(true);
    },
    [
      generateDayOptions,
      generateMonthOptions,
      generateYearOptions,
      generateExpiryDayOptions,
    ],
  );

  const onSelectOption = useCallback(
    (val: string) => {
      if (selectFor === "mfg") {
        if (selectType === "day") setMfgDay(val);
        if (selectType === "month") {
          setMfgMonth(val);
          setMfgDay("");
        }
        if (selectType === "year") {
          setMfgYear(val);
          setMfgDay("");
        }
        setSelectVisible(false);
        setTimeout(() => {
          const composed = composeMfgDate();
          setItemMfgDate(composed);
        }, 0);
        return;
      }

      if (selectFor === "exp") {
        if (selectType === "day") setExpiryDay(val);
        if (selectType === "month") {
          setExpiryMonth(val);
          setExpiryDay("");
        }
        if (selectType === "year") {
          setExpiryYear(val);
          setExpiryDay("");
        }
        setSelectVisible(false);
        setTimeout(() => {
          const composed = composeExpiryDate();
          setItemExpiryDate(composed);
        }, 0);
        return;
      }
    },
    [
      selectType,
      selectFor,
      composeMfgDate,
      composeExpiryDate,
      setItemMfgDate,
      setItemExpiryDate,
    ],
  );

  // Parse user date input based on format
  const parseDateInput = useCallback(
    (input: string, format: DateFormatType): string => {
      const cleanInput = input.replace(/[^0-9/]/g, "");

      switch (format) {
        case "full":
          // Auto-format as DD/MM/YYYY
          if (cleanInput.length <= 2) return cleanInput;
          if (cleanInput.length <= 4)
            return `${cleanInput.slice(0, 2)}/${cleanInput.slice(2)}`;
          return `${cleanInput.slice(0, 2)}/${cleanInput.slice(2, 4)}/${cleanInput.slice(4, 8)}`;
        case "month_year":
          // Auto-format as MM/YYYY
          if (cleanInput.length <= 2) return cleanInput;
          return `${cleanInput.slice(0, 2)}/${cleanInput.slice(2, 6)}`;
        case "year_only":
          // Just year YYYY
          return cleanInput.slice(0, 4);
        default:
          return cleanInput;
      }
    },
    [],
  );

  // Validate date input based on format
  const validateDateInput = useCallback(
    (input: string, format: DateFormatType): boolean => {
      if (!input) return true; // Empty is valid (optional)

      const now = new Date();

      switch (format) {
        case "full": {
          const parts = input.split("/");
          if (parts.length !== 3) return false;
          const day = Number(parts[0]);
          const month = Number(parts[1]);
          const year = Number(parts[2]);
          if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
          if (day < 1 || day > 31 || month < 1 || month > 12) return false;
          // Build date and ensure not in future
          const dt = new Date(year, month - 1, day);
          if (isNaN(dt.getTime())) return false;
          if (dt > now) return false;
          if (year < earliestYear) return false;
          return true;
        }
        case "month_year": {
          const parts = input.split("/");
          if (parts.length !== 2) return false;
          const month = Number(parts[0]);
          const year = Number(parts[1]);
          if (isNaN(month) || isNaN(year)) return false;
          if (month < 1 || month > 12) return false;
          // If same year, month must not be in future
          if (year > now.getFullYear()) return false;
          if (year === now.getFullYear() && month > now.getMonth() + 1)
            return false;
          if (year < earliestYear) return false;
          return true;
        }
        case "year_only": {
          const year = Number(input);
          if (isNaN(year)) return false;
          if (year > now.getFullYear()) return false;
          if (year < earliestYear) return false;
          return true;
        }
        default:
          return true;
      }
    },
    [earliestYear],
  );

  // Handle date input change with auto-formatting
  const handleDateInputChange = useCallback(
    (value: string, format: DateFormatType, setter: (val: string) => void) => {
      const formatted = parseDateInput(value, format);
      setter(formatted);
    },
    [parseDateInput],
  );

  // Handle serial entry date change
  const handleSerialDateChange = useCallback(
    (
      index: number,
      field: "manufacturing_date" | "expiry_date",
      value: string,
      format: DateFormatType,
    ) => {
      const formatted = parseDateInput(value, format);
      setSerialEntries((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          updated[index] = {
            ...updated[index],
            [field]: formatted,
            [field === "manufacturing_date"
              ? "mfg_date_format"
              : "expiry_date_format"]: format,
          };
        }
        return updated;
      });
    },
    [parseDateInput],
  );

  // Update serial entry date format
  const handleSerialDateFormatChange = useCallback(
    (
      index: number,
      field: "mfg_date_format" | "expiry_date_format",
      format: DateFormatType,
    ) => {
      setSerialEntries((prev) => {
        const updated = [...prev];
        if (updated[index]) {
          // Clear the date when format changes
          const dateField =
            field === "mfg_date_format" ? "manufacturing_date" : "expiry_date";
          updated[index] = {
            ...updated[index],
            [field]: format,
            [dateField]: "",
          };
        }
        return updated;
      });
    },
    [],
  );

  const validateSerials = useCallback((): boolean => {
    if (!isSerializedItem) return true;

    const qty = parseInt(quantity) || 1;
    const filledSerials = serialNumbers.filter((s) => s.trim().length > 0);

    // For serialized items, validate that we have the right count
    const validation = validateSerialNumbers(filledSerials, qty);

    if (!validation.valid) {
      setSerialValidationErrors(validation.errors);
      return false;
    }

    setSerialValidationErrors([]);
    return true;
  }, [isSerializedItem, quantity, serialNumbers]);

  const handleSubmit = async () => {
    if (!item || !sessionId) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity");
      return;
    }

    // Validate serial numbers for serialized items (only if any are entered)
    const hasSerials = serialEntries.some(
      (e) => e.serial_number.trim().length > 0,
    );
    if (isSerializedItem && hasSerials && !validateSerials()) {
      Alert.alert(
        "Serial Number Error",
        "Please enter valid serial numbers. " +
          serialValidationErrors.join(", "),
      );
      return;
    }

    if (isDamageEnabled) {
      const dQty = parseFloat(damageQty);
      if (isNaN(dQty) || dQty <= 0) {
        Alert.alert(
          "Invalid Damage Quantity",
          "Please enter a valid damage quantity",
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      // Collect valid serial numbers from either serialized item array or legacy field
      const validSerials = isSerializedItem
        ? serialNumbers
            .filter((s) => s.trim().length > 0)
            .map(normalizeSerialValue)
        : serialNumber
          ? [normalizeSerialValue(serialNumber)]
          : [];

      // Prepare serial entries data with full details (for serialized items)
      const serialEntriesData = isSerializedItem
        ? serialEntries
            .filter((e) => e.serial_number.trim().length > 0)
            .map((e) => ({
              serial_number: normalizeSerialValue(e.serial_number),
              mrp: e.mrp,
              manufacturing_date: e.manufacturing_date,
              mfg_date_format: e.mfg_date_format,
              expiry_date: e.expiry_date,
              expiry_date_format: e.expiry_date_format,
            }))
        : [];

      // Determine manufacturing date - from item-level input or existing item data
      const mfgDate =
        hasMfgDate && itemMfgDate ? itemMfgDate : item.manufacturing_date;

      // Determine expiry date - from item-level input
      const expDate =
        hasExpiryDate && itemExpiryDate ? itemExpiryDate : item.expiry_date;

      const payload: CreateCountLinePayload = {
        session_id: sessionId,
        item_code: item.item_code || barcode,
        counted_qty: qty,
        floor_no: currentFloor || "Unknown",
        rack_no: currentRack || "Unknown",
        item_condition: condition,
        remark: remark,
        damage_included: isDamageEnabled,
        damaged_qty:
          isDamageEnabled && damageType === "returnable"
            ? parseFloat(damageQty)
            : 0,
        non_returnable_damaged_qty:
          isDamageEnabled && damageType === "nonreturnable"
            ? parseFloat(damageQty)
            : 0,
        // Serial numbers - use validated array (backward compatibility)
        serial_numbers: validSerials,
        // Enhanced serial entries with per-item details
        serial_entries:
          serialEntriesData.length > 0 ? serialEntriesData : undefined,
        variance_note: varianceRemark,
        variance_reason: varianceRemark,
        mrp_counted: parseFloat(mrp) || item.mrp,
        manufacturing_date: mfgDate,
        mfg_date_format: hasMfgDate ? itemMfgDateFormat : undefined,
        expiry_date: expDate,
        expiry_date_format: hasExpiryDate ? itemExpiryDateFormat : undefined,
      };

      await createCountLine(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toastService.show("Item verified successfully", { type: "success" });
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save count");
    } finally {
      setSubmitting(false);
    }
  };

  // Skeleton Loader Component for enterprise loading state
  const SkeletonLoader = ({ style }: { style?: any }) => (
    <View style={[styles.skeleton, style]} />
  );

  // Loading Skeleton Screen
  const LoadingSkeleton = () => (
    <ThemedScreen>
      <ModernHeader
        title="Verify Item"
        showBackButton
        onBackPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Item Card Skeleton */}
        <ModernCard style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <SkeletonLoader
              style={{ width: 48, height: 48, borderRadius: 24 }}
            />
            <View style={[styles.itemInfo, { marginLeft: spacing.md }]}>
              <SkeletonLoader
                style={{ width: "70%", height: 20, borderRadius: 6 }}
              />
              <SkeletonLoader
                style={{
                  width: "40%",
                  height: 14,
                  borderRadius: 4,
                  marginTop: 8,
                }}
              />
            </View>
          </View>
          <View style={styles.detailsGrid}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.detailItem}>
                <SkeletonLoader
                  style={{ width: 40, height: 12, borderRadius: 4 }}
                />
                <SkeletonLoader
                  style={{
                    width: 50,
                    height: 18,
                    borderRadius: 4,
                    marginTop: 4,
                  }}
                />
              </View>
            ))}
          </View>
        </ModernCard>

        {/* Quantity Skeleton */}
        <ModernCard style={{ marginTop: spacing.lg, padding: spacing.lg }}>
          <SkeletonLoader style={{ width: 80, height: 14, borderRadius: 4 }} />
          <SkeletonLoader
            style={{
              width: "100%",
              height: 72,
              borderRadius: 12,
              marginTop: spacing.md,
            }}
          />
        </ModernCard>

        {/* Condition Skeleton */}
        <ModernCard style={{ marginTop: spacing.lg, padding: spacing.lg }}>
          <SkeletonLoader style={{ width: 80, height: 14, borderRadius: 4 }} />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: spacing.md,
              gap: spacing.sm,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <SkeletonLoader
                key={i}
                style={{ width: 80, height: 36, borderRadius: 18 }}
              />
            ))}
          </View>
        </ModernCard>
      </ScrollView>
    </ThemedScreen>
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!item) return null;

  return (
    <ThemedScreen>
      <ModernHeader
        title="Verify Item"
        showBackButton
        onBackPress={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          {/* Item Header Card */}
          <Animated.View entering={FadeInDown.duration(500)}>
            <ModernCard style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: colors.primary[50] },
                  ]}
                >
                  <Ionicons name="cube" size={24} color={colors.primary[600]} />
                </View>
                <View style={styles.itemInfo}>
                  <Text
                    style={[
                      styles.itemName,
                      { color: semanticColors.text.primary },
                    ]}
                  >
                    {item.item_name || item.name}
                  </Text>
                  <Text
                    style={[
                      styles.itemCode,
                      { color: semanticColors.text.secondary },
                    ]}
                  >
                    {item.category || "-"} • {item.subcategory || "-"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: semanticColors.text.secondary },
                    ]}
                  >
                    Stock
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: semanticColors.text.primary },
                    ]}
                  >
                    {(() => {
                      const qty = item.current_stock ?? item.stock_qty ?? 0;
                      const uom = item.uom_name || item.uom_code || "";
                      return uom ? `${qty} ${uom}` : String(qty);
                    })()}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: semanticColors.text.secondary },
                    ]}
                  >
                    MRP
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: semanticColors.text.primary },
                    ]}
                  >
                    ₹{item.mrp || 0}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: semanticColors.text.secondary },
                    ]}
                  >
                    Price
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: semanticColors.text.primary },
                    ]}
                  >
                    ₹{item.sale_price || item.sales_price || 0}
                  </Text>
                </View>
              </View>
            </ModernCard>
          </Animated.View>

          {/* Is Serialized Toggle - MOVED UP */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(500)}
            style={styles.section}
          >
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelContainer}>
                <Ionicons
                  name="barcode-outline"
                  size={20}
                  color={colors.primary[600]}
                />
                <Text
                  style={[
                    styles.toggleLabel,
                    { color: semanticColors.text.primary },
                  ]}
                >
                  Is Serialized Item
                </Text>
              </View>
              <Switch
                value={isSerializedItem}
                onValueChange={setIsSerializedItem}
                trackColor={{
                  false: colors.neutral[200],
                  true: colors.primary[600],
                }}
                thumbColor={
                  isSerializedItem ? colors.white : colors.neutral[50]
                }
              />
            </View>
            <Text
              style={[
                styles.toggleHint,
                { color: semanticColors.text.secondary },
              ]}
            >
              {isSerializedItem
                ? "Enable to capture individual serial numbers for each unit"
                : "Turn on if this item has unique serial numbers"}
            </Text>
          </Animated.View>

          {/* STANDARD COUNT MODE */}
          {!isSerializedItem && (
            <>
              {/* Quantity Input */}
              <Animated.View
                entering={FadeInDown.delay(100).duration(500)}
                style={styles.section}
              >
                {/* Barcode Display */}
                <View
                  style={{ alignItems: "center", marginBottom: spacing.md }}
                >
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      color: semanticColors.text.secondary,
                      marginBottom: 4,
                    }}
                  >
                    Barcode
                  </Text>
                  <Text
                    style={{
                      fontSize: fontSize.xl,
                      fontWeight: fontWeight.bold,
                      color: semanticColors.text.primary,
                      letterSpacing: 1,
                    }}
                  >
                    {item.item_code || barcode}
                  </Text>
                </View>

                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: semanticColors.text.primary },
                    ]}
                  >
                    Counted Quantity{" "}
                    {isWeightBasedUOM && (
                      <Text style={styles.uomHint}>({item?.uom || "kg"})</Text>
                    )}
                  </Text>
                </View>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={[
                      styles.qtyButton,
                      { backgroundColor: colors.neutral[200] },
                    ]}
                    onPress={() => {
                      const val = parseFloat(quantity) || 0;
                      const step = getQuantityStep();
                      if (val > step) {
                        const newVal = val - step;
                        setQuantity(formatQuantity(String(newVal)));
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } else if (val > 0) {
                        setQuantity("0");
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="remove"
                      size={28}
                      color={semanticColors.text.primary}
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.qtyDisplay,
                      {
                        backgroundColor: semanticColors.background.paper,
                        borderColor: colors.primary[200],
                      },
                    ]}
                  >
                    <TextInput
                      style={[
                        styles.qtyText,
                        { color: semanticColors.text.primary },
                      ]}
                      value={quantity}
                      onChangeText={handleQuantityChange}
                      onBlur={() => {
                        // Format on blur
                        if (quantity && quantity !== "." && quantity !== "0.") {
                          setQuantity(formatQuantity(quantity));
                        } else {
                          setQuantity("0");
                        }
                      }}
                      keyboardType={
                        isWeightBasedUOM ? "decimal-pad" : "number-pad"
                      }
                      selectTextOnFocus
                      placeholder="0"
                      placeholderTextColor={semanticColors.text.disabled}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.qtyButton,
                      { backgroundColor: colors.primary[600] },
                    ]}
                    onPress={() => {
                      const val = parseFloat(quantity) || 0;
                      const step = getQuantityStep();
                      const newVal = val + step;
                      setQuantity(formatQuantity(String(newVal)));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={28} color={colors.white} />
                  </TouchableOpacity>
                </View>
                {isWeightBasedUOM && (
                  <Text
                    style={[
                      styles.quantityHint,
                      { color: semanticColors.text.secondary },
                    ]}
                  >
                    +/- {getQuantityStep()} per tap • Max 2 decimal places
                  </Text>
                )}
              </Animated.View>

              {/* MRP Selection / Override - MOVED UP */}
              <Animated.View
                entering={FadeInDown.delay(150).duration(500)}
                style={styles.section}
              >
                <View style={styles.sectionHeader}>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: semanticColors.text.primary },
                    ]}
                  >
                    MRP
                  </Text>
                  {mrpVariants.length === 0 && (
                    <Switch
                      value={mrpEditable}
                      onValueChange={setMrpEditable}
                      trackColor={{
                        false: colors.neutral[200],
                        true: colors.primary[600],
                      }}
                    />
                  )}
                </View>

                {mrpVariants.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipsScroll}
                  >
                    {mrpVariants.map((variant: any, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: semanticColors.background.paper,
                            borderColor: semanticColors.border.default,
                          },
                          selectedMrpVariant?.value === variant.value && {
                            backgroundColor: colors.primary[50],
                            borderColor: colors.primary[600],
                          },
                        ]}
                        onPress={() => {
                          setSelectedMrpVariant(variant);
                          setMrp(String(variant.value));
                        }}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: semanticColors.text.secondary },
                            selectedMrpVariant?.value === variant.value && {
                              color: colors.primary[700],
                              fontWeight: fontWeight.medium,
                            },
                          ]}
                        >
                          ₹{variant.value}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : mrpEditable ? (
                  <ModernInput
                    value={mrp}
                    onChangeText={setMrp}
                    keyboardType="numeric"
                    placeholder="Enter new MRP"
                    icon="pricetag"
                  />
                ) : (
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "bold",
                      color: semanticColors.text.primary,
                    }}
                  >
                    ₹{mrp || item.mrp || 0}
                  </Text>
                )}
              </Animated.View>

              {/* Manufacturing & Expiry Date Toggle Section - MOVED UP */}
              <Animated.View
                entering={FadeInDown.delay(200).duration(500)}
                style={styles.section}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: semanticColors.text.primary },
                  ]}
                >
                  Dates
                </Text>
                <ModernCard style={{ padding: spacing.sm }}>
                  {/* Has Manufacturing Date Toggle */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleLabelContainer}>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color={colors.primary[600]}
                      />
                      <Text
                        style={[
                          styles.toggleLabel,
                          { color: semanticColors.text.primary },
                        ]}
                      >
                        Has Manufacturing Date
                      </Text>
                    </View>
                    <Switch
                      value={hasMfgDate}
                      onValueChange={(val) => {
                        setHasMfgDate(val);
                        if (!val) {
                          setItemMfgDate("");
                        }
                      }}
                      trackColor={{
                        false: colors.neutral[200],
                        true: colors.primary[600],
                      }}
                      thumbColor={
                        hasMfgDate ? colors.white : colors.neutral[50]
                      }
                    />
                  </View>

                  {/* Manufacturing Date Input */}
                  {hasMfgDate && (
                    <View style={styles.itemDateSection}>
                      <View style={styles.dateLabelRow}>
                        <Text style={styles.itemDateLabel}>
                          Manufacturing Date
                        </Text>
                        <View style={styles.dateFormatPicker}>
                          {DATE_FORMAT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.dateFormatOption,
                                itemMfgDateFormat === opt.value &&
                                  styles.dateFormatOptionActive,
                              ]}
                              onPress={() => {
                                setItemMfgDateFormat(opt.value);
                                setItemMfgDate("");
                              }}
                            >
                              <Text
                                style={[
                                  styles.dateFormatOptionText,
                                  itemMfgDateFormat === opt.value &&
                                    styles.dateFormatOptionTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      <View
                        style={[
                          styles.itemDateInput,
                          {
                            borderColor:
                              itemMfgDate &&
                              !validateDateInput(itemMfgDate, itemMfgDateFormat)
                                ? colors.error[500]
                                : colors.neutral[300],
                            backgroundColor: semanticColors.background.paper,
                          },
                        ]}
                      >
                        {isMfgFull && (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                              style={styles.smallPicker}
                              onPress={() => openSelect("day")}
                            >
                              <Text
                                style={[
                                  styles.smallPickerText,
                                  !mfgDay && styles.placeholderText,
                                ]}
                              >
                                {mfgDay || "DD"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.smallPicker}
                              onPress={() => openSelect("month")}
                            >
                              <Text
                                style={[
                                  styles.smallPickerText,
                                  !mfgMonth && styles.placeholderText,
                                ]}
                              >
                                {mfgMonth || "MM"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.smallPicker}
                              onPress={() => openSelect("year")}
                            >
                              <Text
                                style={[
                                  styles.smallPickerText,
                                  !mfgYear && styles.placeholderText,
                                ]}
                              >
                                {mfgYear || "YYYY"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {isMfgMonthYear && (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                              style={styles.smallPicker}
                              onPress={() => openSelect("month")}
                            >
                              <Text
                                style={[
                                  styles.smallPickerText,
                                  !mfgMonth && styles.placeholderText,
                                ]}
                              >
                                {mfgMonth || "MM"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.smallPicker}
                              onPress={() => openSelect("year")}
                            >
                              <Text
                                style={[
                                  styles.smallPickerText,
                                  !mfgYear && styles.placeholderText,
                                ]}
                              >
                                {mfgYear || "YYYY"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {isMfgYearOnly && (
                          <TouchableOpacity
                            style={styles.smallPickerFull}
                            onPress={() => openSelect("year")}
                          >
                            <Text
                              style={[
                                styles.smallPickerText,
                                !mfgYear && styles.placeholderText,
                              ]}
                            >
                              {mfgYear || "YYYY"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Has Expiry Date Toggle */}
                  <View style={[styles.toggleRow, { marginTop: spacing.md }]}>
                    <View style={styles.toggleLabelContainer}>
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={colors.warning[600]}
                      />
                      <Text
                        style={[
                          styles.toggleLabel,
                          { color: semanticColors.text.primary },
                        ]}
                      >
                        Has Expiry Date
                      </Text>
                    </View>
                    <Switch
                      value={hasExpiryDate}
                      onValueChange={(val) => {
                        setHasExpiryDate(val);
                        if (!val) {
                          setItemExpiryDate("");
                        }
                      }}
                      trackColor={{
                        false: colors.neutral[200],
                        true: colors.warning[600],
                      }}
                      thumbColor={
                        hasExpiryDate ? colors.white : colors.neutral[50]
                      }
                    />
                  </View>

                  {/* Expiry Date Input */}
                  {hasExpiryDate && (
                    <View style={styles.itemDateSection}>
                      <View style={styles.dateLabelRow}>
                        <Text style={styles.itemDateLabel}>Expiry Date</Text>
                        <View style={styles.dateFormatPicker}>
                          {DATE_FORMAT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.dateFormatOption,
                                itemExpiryDateFormat === opt.value &&
                                  styles.dateFormatOptionActive,
                              ]}
                              onPress={() => {
                                setItemExpiryDateFormat(opt.value);
                                setItemExpiryDate("");
                              }}
                            >
                              <Text
                                style={[
                                  styles.dateFormatOptionText,
                                  itemExpiryDateFormat === opt.value &&
                                    styles.dateFormatOptionTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      <View
                        style={[
                          styles.itemDateInput,
                          {
                            borderColor:
                              itemExpiryDate &&
                              !validateDateInput(
                                itemExpiryDate,
                                itemExpiryDateFormat,
                              )
                                ? colors.error[500]
                                : colors.neutral[300],
                            backgroundColor: semanticColors.background.paper,
                          },
                        ]}
                      >
                        {isExpiryFull && (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                              style={styles.smallPicker}
                              onPress={() => openSelect("day", "exp")}
                            >
                              <Text
                                style={[
                                  styles.smallPickerText,
                                  !expiryDay && styles.placeholderText,
                                ]}
                              >
                                {expiryDay || "DD"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.smallPicker}
                              onPress={() => openSelect("month", "exp")}
                            >
                              <Text
                                style={[
                                  styles.smallPickerText,
                                  !expiryMonth && styles.placeholderText,
                                ]}
                              >
                                {expiryMonth || "MM"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.smallPicker}
                              onPress={() => openSelect("year", "exp")}
                            >
                              <Text
                                style={[
                                  styles.smallPickerText,
                                  !expiryYear && styles.placeholderText,
                                ]}
                              >
                                {expiryYear || "YYYY"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {isExpiryMonthYear && (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                              style={styles.smallPicker}
                              onPress={() => openSelect("month", "exp")}
                            >
                              <Text
                                style={[
                                  styles.smallPickerText,
                                  !expiryMonth && styles.placeholderText,
                                ]}
                              >
                                {expiryMonth || "MM"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.smallPicker}
                              onPress={() => openSelect("year", "exp")}
                            >
                              <Text
                                style={[
                                  styles.smallPickerText,
                                  !expiryYear && styles.placeholderText,
                                ]}
                              >
                                {expiryYear || "YYYY"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {isExpiryYearOnly && (
                          <TouchableOpacity
                            style={styles.smallPickerFull}
                            onPress={() => openSelect("year", "exp")}
                          >
                            <Text
                              style={[
                                styles.smallPickerText,
                                !expiryYear && styles.placeholderText,
                              ]}
                            >
                              {expiryYear || "YYYY"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </ModernCard>

                {/* Global Selection Modal */}
                <Modal
                  visible={selectVisible}
                  transparent
                  animationType="slide"
                >
                  <View style={styles.modalBackdrop}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>{selectTitle}</Text>
                      <FlatList
                        data={selectOptions}
                        keyExtractor={(i) => i}
                        renderItem={({ item: opt }) => (
                          <Pressable
                            onPress={() => onSelectOption(opt)}
                            style={({ pressed }) => [
                              styles.modalOption,
                              pressed && { opacity: 0.6 },
                            ]}
                          >
                            <Text style={styles.modalOptionText}>{opt}</Text>
                          </Pressable>
                        )}
                      />
                      <TouchableOpacity
                        style={styles.modalClose}
                        onPress={() => setSelectVisible(false)}
                      >
                        <Text style={styles.modalCloseText}>Close</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </Animated.View>
            </>
          )}

          {/* SERIALIZED MODE: Serial Number Input */}
          {isSerializedItem && (
            <Animated.View
              entering={FadeInDown.delay(100).duration(500)}
              style={styles.section}
            >
              {/* Multiple serial inputs for serialized items with per-serial MRP/mfg date */}
              <View>
                <View style={styles.serialHeader}>
                  <View style={styles.serialTitleRow}>
                    <Ionicons
                      name="barcode-outline"
                      size={20}
                      color={colors.primary[600]}
                    />
                    <Text
                      style={[
                        styles.sectionTitle,
                        {
                          color: semanticColors.text.primary,
                          marginLeft: spacing.xs,
                        },
                      ]}
                    >
                      Serial Numbers
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.serialHelperText,
                      { color: semanticColors.text.secondary },
                    ]}
                  >
                    Scan or type serial numbers - quantity auto-updates (
                    {serialEntries.length} scanned)
                  </Text>
                </View>

                {/* Scan Button - Primary Action */}
                <TouchableOpacity
                  style={styles.scanSerialButton}
                  onPress={() => setShowSerialScanner(true)}
                >
                  <Ionicons name="scan" size={24} color={colors.white} />
                  <Text style={styles.scanSerialButtonText}>
                    Scan Serial Numbers
                  </Text>
                </TouchableOpacity>

                {/* Validation Errors */}
                {serialValidationErrors.length > 0 && (
                  <View style={styles.validationErrorContainer}>
                    {serialValidationErrors.map((error, idx) => (
                      <Text key={idx} style={styles.validationErrorText}>
                        • {error}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Serial Entries with per-item MRP and Manufacturing Date */}
                {serialEntries.map((entry, index) => (
                  <View key={entry.id} style={styles.serialEntryCard}>
                    <View style={styles.serialEntryHeader}>
                      <Text
                        style={[
                          styles.serialLabel,
                          { color: semanticColors.text.secondary },
                        ]}
                      >
                        Unit #{index + 1}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeSerialButton}
                        onPress={() => handleRemoveSerial(index)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.error[500]}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Serial Number Input */}
                    <View style={styles.serialInputContainer}>
                      <TextInput
                        style={[
                          styles.serialTextInput,
                          {
                            color: semanticColors.text.primary,
                            backgroundColor: semanticColors.background.paper,
                            borderColor: entry.serial_number.trim()
                              ? validateSerialNumber(entry.serial_number)
                                ? colors.error[500]
                                : colors.success[500]
                              : colors.neutral[300],
                          },
                        ]}
                        value={entry.serial_number}
                        onChangeText={(text) =>
                          handleSerialChange(index, "serial_number", text)
                        }
                        placeholder="Serial number"
                        placeholderTextColor={semanticColors.text.disabled}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                    </View>
                    {entry.serial_number.trim() &&
                      validateSerialNumber(entry.serial_number) && (
                        <Text style={styles.serialErrorText}>
                          {validateSerialNumber(entry.serial_number)}
                        </Text>
                      )}

                    {/* MRP Field */}
                    <View style={styles.serialDetailsRow}>
                      <View style={[styles.serialDetailField, { flex: 1 }]}>
                        <Text style={styles.serialDetailLabel}>MRP (₹)</Text>
                        <TextInput
                          style={[
                            styles.serialDetailInput,
                            {
                              color: semanticColors.text.primary,
                              backgroundColor: semanticColors.background.paper,
                            },
                          ]}
                          value={entry.mrp ? String(entry.mrp) : ""}
                          onChangeText={(text) =>
                            handleSerialChange(
                              index,
                              "mrp",
                              parseFloat(text) || 0,
                            )
                          }
                          placeholder="MRP"
                          placeholderTextColor={semanticColors.text.disabled}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    {/* Manufacturing Date with Format Selector */}
                    <View style={styles.dateSection}>
                      <View style={styles.dateLabelRow}>
                        <Text style={styles.serialDetailLabel}>
                          Manufacturing Date
                        </Text>
                        <View style={styles.dateFormatPicker}>
                          {DATE_FORMAT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.dateFormatOption,
                                (entry.mfg_date_format || "full") ===
                                  opt.value && styles.dateFormatOptionActive,
                              ]}
                              onPress={() =>
                                handleSerialDateFormatChange(
                                  index,
                                  "mfg_date_format",
                                  opt.value,
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.dateFormatOptionText,
                                  (entry.mfg_date_format || "full") ===
                                    opt.value &&
                                    styles.dateFormatOptionTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      <TextInput
                        style={[
                          styles.serialDetailInput,
                          {
                            color: semanticColors.text.primary,
                            backgroundColor: semanticColors.background.paper,
                            borderColor:
                              entry.manufacturing_date &&
                              !validateDateInput(
                                entry.manufacturing_date,
                                entry.mfg_date_format || "full",
                              )
                                ? colors.error[500]
                                : colors.neutral[300],
                          },
                        ]}
                        value={entry.manufacturing_date || ""}
                        onChangeText={(text) =>
                          handleSerialDateChange(
                            index,
                            "manufacturing_date",
                            text,
                            entry.mfg_date_format || "full",
                          )
                        }
                        placeholder={
                          DATE_FORMAT_OPTIONS.find(
                            (o) =>
                              o.value === (entry.mfg_date_format || "full"),
                          )?.placeholder || "DD/MM/YYYY"
                        }
                        placeholderTextColor={semanticColors.text.disabled}
                        keyboardType="number-pad"
                        maxLength={
                          entry.mfg_date_format === "year_only"
                            ? 4
                            : entry.mfg_date_format === "month_year"
                              ? 7
                              : 10
                        }
                      />
                    </View>

                    {/* Expiry Date with Format Selector */}
                    <View style={styles.dateSection}>
                      <View style={styles.dateLabelRow}>
                        <Text style={styles.serialDetailLabel}>
                          Expiry Date
                        </Text>
                        <View style={styles.dateFormatPicker}>
                          {DATE_FORMAT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.dateFormatOption,
                                (entry.expiry_date_format || "full") ===
                                  opt.value && styles.dateFormatOptionActive,
                              ]}
                              onPress={() =>
                                handleSerialDateFormatChange(
                                  index,
                                  "expiry_date_format",
                                  opt.value,
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.dateFormatOptionText,
                                  (entry.expiry_date_format || "full") ===
                                    opt.value &&
                                    styles.dateFormatOptionTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      <TextInput
                        style={[
                          styles.serialDetailInput,
                          {
                            color: semanticColors.text.primary,
                            backgroundColor: semanticColors.background.paper,
                            borderColor:
                              entry.expiry_date &&
                              !validateDateInput(
                                entry.expiry_date,
                                entry.expiry_date_format || "full",
                              )
                                ? colors.error[500]
                                : colors.neutral[300],
                          },
                        ]}
                        value={entry.expiry_date || ""}
                        onChangeText={(text) =>
                          handleSerialDateChange(
                            index,
                            "expiry_date",
                            text,
                            entry.expiry_date_format || "full",
                          )
                        }
                        placeholder={
                          DATE_FORMAT_OPTIONS.find(
                            (o) =>
                              o.value === (entry.expiry_date_format || "full"),
                          )?.placeholder || "DD/MM/YYYY"
                        }
                        placeholderTextColor={semanticColors.text.disabled}
                        keyboardType="number-pad"
                        maxLength={
                          entry.expiry_date_format === "year_only"
                            ? 4
                            : entry.expiry_date_format === "month_year"
                              ? 7
                              : 10
                        }
                      />
                    </View>
                  </View>
                ))}

                {/* Add Manual Serial Button */}
                <TouchableOpacity
                  style={styles.addSerialButton}
                  onPress={handleAddSerial}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={colors.primary[600]}
                  />
                  <Text style={styles.addSerialButtonText}>
                    Add Serial Manually
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Quality & Status Section - Grouped */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(500)}
            style={styles.section}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: semanticColors.text.primary },
              ]}
            >
              Quality & Status
            </Text>

            {/* Condition */}
            <View style={{ marginBottom: spacing.md }}>
              <Text
                style={[
                  styles.detailLabel,
                  {
                    color: semanticColors.text.secondary,
                    marginBottom: spacing.sm,
                  },
                ]}
              >
                Condition
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
              >
                {CONDITION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: semanticColors.background.paper,
                        borderColor: semanticColors.border.default,
                      },
                      condition === opt && {
                        backgroundColor: colors.primary[50],
                        borderColor: colors.primary[600],
                      },
                    ]}
                    onPress={() => setCondition(opt)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: semanticColors.text.secondary },
                        condition === opt && {
                          color: colors.primary[700],
                          fontWeight: fontWeight.medium,
                        },
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Damage Toggle */}
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: semanticColors.status.error,
                    fontSize: fontSize.sm,
                    marginBottom: 0,
                  },
                ]}
              >
                Report Damage
              </Text>
              <Switch
                value={isDamageEnabled}
                onValueChange={setIsDamageEnabled}
                trackColor={{
                  false: colors.neutral[200],
                  true: semanticColors.status.error,
                }}
              />
            </View>

            {isDamageEnabled && (
              <View
                style={[
                  styles.damageContainer,
                  {
                    backgroundColor: colors.error[50],
                    borderColor: colors.error[500],
                  },
                ]}
              >
                <ModernInput
                  value={damageQty}
                  onChangeText={setDamageQty}
                  keyboardType="numeric"
                  placeholder="Damaged Quantity"
                  label="Quantity"
                />

                <View style={styles.damageTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.damageTypeButton,
                      { borderColor: colors.error[500] },
                      damageType === "returnable" && {
                        backgroundColor: colors.error[600],
                        borderColor: colors.error[600],
                      },
                    ]}
                    onPress={() => setDamageType("returnable")}
                  >
                    <Text
                      style={[
                        styles.damageTypeText,
                        { color: colors.error[600] },
                        damageType === "returnable" && {
                          color: colors.white,
                          fontWeight: fontWeight.medium,
                        },
                      ]}
                    >
                      Returnable
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.damageTypeButton,
                      { borderColor: colors.error[500] },
                      damageType === "nonreturnable" && {
                        backgroundColor: colors.error[600],
                        borderColor: colors.error[600],
                      },
                    ]}
                    onPress={() => setDamageType("nonreturnable")}
                  >
                    <Text
                      style={[
                        styles.damageTypeText,
                        { color: colors.error[600] },
                        damageType === "nonreturnable" && {
                          color: colors.white,
                          fontWeight: fontWeight.medium,
                        },
                      ]}
                    >
                      Non-Returnable
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Remarks Section */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(500)}
            style={styles.section}
          >
            {/* Variance Remark */}
            <View style={{ marginBottom: spacing.md }}>
              <ModernInput
                value={varianceRemark}
                onChangeText={setVarianceRemark}
                placeholder="Variance reason (if any)"
                label="Variance Remark"
              />
            </View>

            {/* General Remarks */}
            <ModernInput
              value={remark}
              onChangeText={setRemark}
              placeholder="Add remarks (optional)"
              label="Remarks"
              multiline
              numberOfLines={3}
            />
          </Animated.View>

          {/* Batch History List - MOVED TO BOTTOM */}
          {sameNameVariants.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(500).duration(500)}
              style={styles.section}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: semanticColors.text.primary },
                ]}
              >
                Batch History
              </Text>
              <View style={{ gap: spacing.sm }}>
                {sameNameVariants.map((variant) => (
                  <ModernCard
                    key={variant.item_code}
                    style={{ padding: spacing.sm }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fontSize.md,
                          fontWeight: fontWeight.bold,
                          color: semanticColors.text.primary,
                        }}
                      >
                        {variant.batch_no || variant.item_code}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Ionicons
                          name="cube-outline"
                          size={14}
                          color={semanticColors.text.secondary}
                        />
                        <Text
                          style={{
                            fontSize: fontSize.sm,
                            fontWeight: fontWeight.medium,
                            color: semanticColors.text.primary,
                          }}
                        >
                          {variant.stock_qty || 0}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fontSize.xs,
                          color: semanticColors.text.secondary,
                        }}
                      >
                        Exp:{" "}
                        {variant.expiry_date
                          ? new Date(variant.expiry_date).toLocaleDateString()
                          : "N/A"}
                      </Text>
                      <Text
                        style={{
                          fontSize: fontSize.xs,
                          color: semanticColors.text.secondary,
                        }}
                      >
                        Mfg:{" "}
                        {variant.manufacturing_date
                          ? new Date(
                              variant.manufacturing_date,
                            ).toLocaleDateString()
                          : "N/A"}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        borderTopWidth: 1,
                        borderTopColor: semanticColors.border.default,
                        paddingTop: 4,
                        marginTop: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: fontSize.xs,
                          color: semanticColors.text.secondary,
                        }}
                      >
                        MRP: ₹{variant.mrp || 0}
                      </Text>
                      <Text
                        style={{
                          fontSize: fontSize.xs,
                          color: semanticColors.text.secondary,
                        }}
                      >
                        Barcode: {variant.barcode || variant.item_code}
                      </Text>
                    </View>
                  </ModernCard>
                ))}
              </View>
            </Animated.View>
          )}

          <View style={styles.footerSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action */}
      <View
        style={[
          styles.bottomContainer,
          {
            backgroundColor: semanticColors.background.paper,
            borderTopColor: semanticColors.border.default,
          },
        ]}
      >
        <ModernButton
          title="Save & Verify"
          onPress={handleSubmit}
          loading={submitting}
          variant="primary"
          icon="checkmark-circle"
          fullWidth
        />
      </View>

      {/* Serial Scanner Modal */}
      <SerialScannerModal
        visible={showSerialScanner}
        existingSerials={serialNumbers}
        itemName={item?.item_name || item?.name}
        defaultMrp={parseFloat(mrp) || item?.mrp}
        onSerialScanned={handleSerialScanned}
        onClose={() => setShowSerialScanner(false)}
      />
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Background handled by ThemedScreen
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: spacing.md,
  },
  itemCard: {
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.neutral[900],
    marginBottom: 2,
  },
  itemCode: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
  },
  detailsGrid: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: spacing.md,
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.neutral[900],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  qtyButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[400],
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  qtyDisplay: {
    minWidth: 100,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary[200],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    ...shadows.md,
  },
  qtyText: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    color: colors.neutral[900],
    textAlign: "center",
    minWidth: 60,
  },
  chipsScroll: {
    flexDirection: "row",
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    marginRight: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.neutral[700],
  },
  chipTextSelected: {
    color: colors.primary[700],
    fontWeight: fontWeight.medium,
  },
  damageContainer: {
    backgroundColor: colors.error[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error[500],
  },
  damageTypeContainer: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  damageTypeButton: {
    flex: 1,
    padding: spacing.sm,
    alignItems: "center",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error[500],
    marginRight: spacing.sm,
  },
  damageTypeSelected: {
    backgroundColor: colors.error[600],
    borderColor: colors.error[600],
  },
  damageTypeText: {
    fontSize: fontSize.sm,
    color: colors.error[600],
  },
  damageTypeTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  footerSpacer: {
    height: 80,
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  // Skeleton Styles
  skeleton: {
    backgroundColor: colors.neutral[200],
    overflow: "hidden",
  },
  // Serial Number Styles for Serialized Items
  serialHeader: {
    marginBottom: spacing.md,
  },
  serialTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  requiredBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.error[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  requiredBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.error[600],
  },
  serialHelperText: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
  },
  validationErrorContainer: {
    backgroundColor: colors.error[50],
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error[200],
  },
  validationErrorText: {
    fontSize: fontSize.sm,
    color: colors.error[600],
    marginBottom: 2,
  },
  serialInputRow: {
    marginBottom: spacing.sm,
  },
  serialInputWrapper: {
    flex: 1,
  },
  serialLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
    color: colors.neutral[600],
  },
  serialInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  serialTextInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    backgroundColor: colors.white,
    borderColor: colors.neutral[300],
  },
  removeSerialButton: {
    marginLeft: spacing.sm,
    padding: spacing.sm,
  },
  serialErrorText: {
    fontSize: fontSize.xs,
    color: colors.error[500],
    marginTop: 4,
  },
  addSerialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: borderRadius.md,
    borderStyle: "dashed",
  },
  addSerialButtonText: {
    marginLeft: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary[600],
  },
  // Enhanced Serial Styles - Per-serial MRP/Mfg Date
  scanSerialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[600],
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  scanSerialButtonText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    color: colors.white,
  },
  serialEntryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    ...shadows.sm,
  },
  serialEntryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  serialDetailsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  serialDetailField: {
    flex: 1,
  },
  serialDetailLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  serialDetailInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm,
    borderColor: colors.neutral[300],
  },
  // UOM and Quantity Hint Styles
  uomHint: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
  },
  quantityHint: {
    fontSize: fontSize.xs,
    textAlign: "center" as const,
    marginTop: spacing.xs,
  },
  // Toggle Switch Styles
  toggleRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: spacing.sm,
  },
  toggleLabelContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  toggleHint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  // Date Section Styles for Manufacturing and Expiry Dates
  dateSection: {
    marginTop: spacing.md,
  },
  dateLabelRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: spacing.xs,
    flexWrap: "wrap" as const,
  },
  dateFormatPicker: {
    flexDirection: "row" as const,
    gap: 4,
  },
  dateFormatOption: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  dateFormatOptionActive: {
    backgroundColor: colors.primary[100],
    borderColor: colors.primary[500],
  },
  dateFormatOptionText: {
    fontSize: fontSize.xs - 1,
    color: colors.neutral[600],
    fontWeight: fontWeight.regular,
  },
  dateFormatOptionTextActive: {
    color: colors.primary[700],
    fontWeight: fontWeight.medium,
  },
  // Item-level Date Section (for non-serialized items)
  itemDateSection: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  itemDateLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.neutral[700],
    marginBottom: spacing.xs,
  },
  itemDateInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.md,
    borderColor: colors.neutral[300],
    backgroundColor: colors.white,
  },
  smallPicker: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  smallPickerFull: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  smallPickerText: {
    fontSize: fontSize.md,
    color: colors.neutral[900],
  },
  placeholderText: {
    color: colors.neutral[400],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "60%",
    backgroundColor: colors.white,
    padding: spacing.md,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semiBold,
    marginBottom: spacing.sm,
  },
  modalOption: {
    paddingVertical: spacing.sm,
  },
  modalOptionText: {
    fontSize: fontSize.md,
    color: colors.neutral[900],
  },
  modalClose: {
    marginTop: spacing.sm,
    alignItems: "center",
    padding: spacing.sm,
  },
  modalCloseText: {
    color: colors.primary[600],
    fontWeight: fontWeight.semiBold,
  },
});
