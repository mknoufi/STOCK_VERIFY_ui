/**
 * useScanState Hook
 * Manages scanner state (barcode scanning, manual entry, etc.)
 */
import { useState, useCallback } from "react";
import { ScannerMode } from "@/types/scan";

interface ScannerState {
  showScanner: boolean;
  manualBarcode: string;
  manualItemName: string;
  lastScannedBarcode: string;
  scanTimestamp: number;
  scanFeedback: string;
  continuousScanMode: boolean;
  scannerMode: ScannerMode;
  serialScanTargetId: string | null;
}

const initialState: ScannerState = {
  showScanner: false,
  manualBarcode: "",
  manualItemName: "",
  lastScannedBarcode: "",
  scanTimestamp: 0,
  scanFeedback: "",
  continuousScanMode: false,
  scannerMode: "item",
  serialScanTargetId: null,
};

export const useScanState = () => {
  const [scannerState, setScannerState] = useState<ScannerState>(initialState);

  const updateScannerState = useCallback((updates: Partial<ScannerState>) => {
    setScannerState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetScannerState = useCallback(() => {
    setScannerState(initialState);
  }, []);

  return {
    scannerState,
    updateScannerState,
    resetScannerState,
  };
};
