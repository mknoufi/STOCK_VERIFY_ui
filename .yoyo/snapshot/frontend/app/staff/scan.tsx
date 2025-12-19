import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Switch } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api, { createCountLine, checkItemCounted, getVarianceReasons, refreshItemStock, searchItems, addQuantityToCountLine, getSession, getItemByBarcode } from '@/services/api';
import { StatusBar } from 'expo-status-bar';
import { handleErrorWithRecovery } from '@/services/errorRecovery';
import { AnalyticsService, RecentItemsService } from '@/services/enhancedFeatures';
import { SearchResult, EnhancedSearchService } from '@/services/enhancedSearchService';
import { ErrorHandler } from '@/services/errorHandler';
import { ItemVerificationAPI } from '@/services/itemVerificationApi';
import usePowerSaving from '@/hooks/usePowerSaving';
import PowerSavingIndicator from '@/components/PowerSavingIndicator';
import { useAuthStore } from '@/store/authStore';
import { PremiumTheme, PremiumStyles } from '../../theme/designSystem';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ItemSearch } from '@/components/scan/ItemSearch';
import { ItemDisplay } from '@/components/scan/ItemDisplay';
import { QuantityInputForm } from '@/components/scan/QuantityInputForm';
import { BarcodeScanner } from '@/components/scan/BarcodeScanner';
import { SerialNumberEntry } from '@/components/scan/SerialNumberEntry';
import { PhotoCapture } from '@/components/scan/PhotoCapture';
import { useItemState, useWorkflowState, useScanState, usePhotoState } from '@/hooks/scan';

type NormalizedMrpVariant = {
  id?: string;
  value: number;
  barcode?: string;
  label?: string;
  source?: string;
  item_condition?: string;
};

type SerialInput = {
  id: string;
  label: string;
  value: string;
};

type PhotoProofType = 'ITEM' | 'SHELF' | 'SERIAL' | 'DAMAGE';

type PhotoProofDraft = {
  id: string;
  base64: string;
  previewUri: string;
  type: PhotoProofType;
  capturedAt: string;
};

type ScannerMode = 'item' | 'serial';

interface Item {
  id: string;
  name: string;
  item_code?: string;
  barcode?: string;
  mrp?: number | string;
  mrp_variants?: NormalizedMrpVariant[];
  mrp_history?: Array<{ value: number | string; date?: string; source?: string }>;
  quantity?: number;
  stock_qty?: number;
  counted_quantity?: number;
  serial_requirement?: 'optional' | 'single' | 'required' | 'dual';
  item_condition?: string;
  location?: string;
  category?: string;
  subcategory?: string;
  item_type?: string;
  item_group?: string;
  uom_name?: string;
}

interface VarianceReason {
  id: string;
  code: string;
  label: string;
  name?: string;
  description?: string;
}

interface WorkflowState {
  step: 'scan' | 'quantity' | 'serial' | 'photo' | 'complete';
  expectedSerialCount: number;
  showSerialEntry: boolean;
  showPhotoCapture: boolean;
  autoIncrementEnabled: boolean;
  serialCaptureEnabled: boolean;
  damageQtyEnabled: boolean;
  serialInputs: SerialInput[];
  requiredSerialCount: number;
  serialInputTarget: number;
  existingCountLine: any;
  showAddQuantityModal: boolean;
  additionalQty: string;
}

const MRP_MATCH_TOLERANCE = 0.01;

import { useForm, Controller } from 'react-hook-form';

interface ScanFormData {
  countedQty: string;
  returnableDamageQty: string;
  nonReturnableDamageQty: string;
  mrp: string;
  remark: string;
  varianceNote: string;
}

const PHOTO_PROOF_TYPES: { value: PhotoProofType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'ITEM', label: 'Item', icon: 'cube-outline' },
  { value: 'SHELF', label: 'Shelf', icon: 'albums-outline' },
  { value: 'SERIAL', label: 'Serial', icon: 'pricetag-outline' },
  { value: 'DAMAGE', label: 'Damage', icon: 'warning-outline' },
];

const PhotoCamera = CameraView;

const normalizeSerialValue = (input: string) => (input ? input.trim().toUpperCase() : '');

const toNumericMrp = (value: unknown): number | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    const candidate =
      obj.value ??
      obj.mrp ??
      obj.amount ??
      obj.price ??
      obj.rate ??
      null;

    if (candidate !== null && candidate !== undefined) {
      return toNumericMrp(candidate);
    }

    return null;
  }

  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(numericValue)) {
    return null;
  }
  return numericValue;
};

const formatMrpValue = (value: unknown) => {
  const numericValue = toNumericMrp(value);
  if (numericValue === null) {
    return '';
  }
  return numericValue.toString();
};

const normalizeMrpVariant = (input: unknown): NormalizedMrpVariant | null => {
  const numericValue = toNumericMrp(input);
  if (numericValue === null) {
    return null;
  }

  const roundedValue = Number(numericValue.toFixed(2));

  if (input && typeof input === 'object' && input !== null) {
    const obj = input as Record<string, unknown>;
    return {
      id: typeof obj.id === 'string' ? obj.id : undefined,
      value: roundedValue,
      barcode: typeof obj.barcode === 'string' ? obj.barcode : typeof obj.variant_barcode === 'string' ? obj.variant_barcode : undefined,
      label: typeof obj.label === 'string' ? obj.label : typeof obj.title === 'string' ? obj.title : undefined,
      source: typeof obj.source === 'string' ? obj.source : typeof obj.mrp_source === 'string' ? obj.mrp_source : undefined,
      item_condition: typeof obj.item_condition === 'string' ? obj.item_condition : undefined,
    };
  }

  return {
    value: roundedValue,
  };
};

const getNormalizedMrpVariants = (item: Item | null | undefined): NormalizedMrpVariant[] => {
  if (!item) {
    return [];
  }

  const seen = new Map<string, NormalizedMrpVariant>();
  const register = (entry: unknown) => {
    const normalized = normalizeMrpVariant(entry);
    if (!normalized) {
      return;
    }

    const key = `${normalized.value.toFixed(2)}|${normalized.barcode ?? ''}`;
    if (!seen.has(key)) {
      seen.set(key, normalized);
      return;
    }

    const existing = seen.get(key)!;
    seen.set(key, {
      ...existing,
      ...normalized,
      id: normalized.id ?? existing.id,
      source: normalized.source ?? existing.source,
      label: normalized.label ?? existing.label,
      item_condition: normalized.item_condition ?? existing.item_condition,
    });
  };

  register(item?.mrp);

  if (Array.isArray(item?.mrp_variants)) {
    item.mrp_variants.forEach(register);
  }

  if (Array.isArray(item?.mrp_history)) {
    item.mrp_history.forEach(register);
  }

  return Array.from(seen.values()).sort((a, b) => a.value - b.value);
};

const getDefaultMrpForItem = (item: Item | null | undefined): string => {
  if (!item) {
    return '';
  }

  if (Array.isArray(item?.mrp_history) && item.mrp_history.length > 0) {
    const latestEntry = item.mrp_history[item.mrp_history.length - 1];
    const latestValue = toNumericMrp(latestEntry?.value);
    if (latestValue !== null) {
      return formatMrpValue(latestValue);
    }
  }

  const directMrp = toNumericMrp(item?.mrp);
  if (directMrp !== null) {
    return formatMrpValue(directMrp);
  }

  const variants = getNormalizedMrpVariants(item);
  if (variants.length > 0) {
    const lastVariant = variants[variants.length - 1];
    if (lastVariant) {
      return formatMrpValue(lastVariant.value);
    }
  }

  return '';
};

const SERIAL_REQUIREMENT_LABELS: Record<string, string> = {
  optional: 'Serial capture optional',
  single: 'One serial number required',
  required: 'One serial number required',
  dual: 'Two serial numbers required',
};

const ITEM_CONDITION_OPTIONS: { value: string; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'aging', label: 'Aging' },
  { value: 'expired', label: 'Expired' },
  { value: 'packaging_damaged', label: 'Packaging Damaged' },
  { value: 'slow_moving', label: 'Slow Moving' },
];

export default function ScanScreen() {
  const { sessionId } = useLocalSearchParams();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const isWeb = Platform.OS === 'web';

  // Power-saving hook with scan-optimized configuration
  const {
    powerState,
    resetActivityTimer,
    throttleNetworkRequest
  } = usePowerSaving({
    enableAutoMode: true,
    lowBatteryThreshold: 20,
    throttleNetworkRequests: true
  });

  // Use extracted hooks for state management
  const { scannerState, updateScannerState } = useScanState();
  const { photoState, updatePhotoState, addPhoto, removePhoto } = usePhotoState();

  const photoCameraRef = React.useRef<any>(null);
  const barcodeScanHistoryRef = React.useRef<Map<string, number[]>>(new Map());

  React.useEffect(() => {
    if (!isWeb) {
      return;
    }

    if (scannerState.showScanner) {
      updateScannerState({ showScanner: false });
    }

    if (photoState.showPhotoCapture) {
      updatePhotoState({ showPhotoCapture: false });
    }
  }, [isWeb, scannerState.showScanner, photoState.showPhotoCapture, updateScannerState, updatePhotoState]);
  const SCAN_RATE_LIMIT = 5;
  const SCAN_RATE_WINDOW_MS = 15000;
  const registerScanAndCheckRateLimit = React.useCallback(
    (barcode: string, timestamp: number) => {
      const history = barcodeScanHistoryRef.current.get(barcode) ?? [];
      const recent = history.filter((entry) => timestamp - entry < SCAN_RATE_WINDOW_MS);
      recent.push(timestamp);
      barcodeScanHistoryRef.current.set(barcode, recent);
      return recent.length > SCAN_RATE_LIMIT;
    },
    [SCAN_RATE_LIMIT, SCAN_RATE_WINDOW_MS]
  );

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Consolidated search state
  const [searchState, setSearchState] = React.useState({
    allItems: [] as Item[],
    searchResults: [] as SearchResult[],
    showSearchResults: false,
    isSearching: false,
    isListening: false,
    voiceSearchText: '',
  });

  // Use extracted hooks for state management
  const { itemState, updateItemState, setCurrentItem } = useItemState();

  // Helper function for search state updates
  const updateSearchState = React.useCallback((updates: Partial<typeof searchState>) => {
    setSearchState(prev => ({ ...prev, ...updates }));
  }, []);

  // Consolidated UI state
  const [uiState, setUiState] = React.useState({
    showReasonModal: false,
    saving: false,
    showUnknownItemModal: false,
    unknownItemData: { barcode: '', description: '' },
    refreshingStock: false,
    sessionActive: false,
    showOptionalFields: false,
    scanFeedback: '',
    parsedMrpValue: null as number | null,
    continuousScanMode: false,
    showScanner: false,
    scannerMode: 'item' as ScannerMode,
    manualBarcode: '',
    manualItemName: '',
    searchQuery: '',
    searchResults: [] as SearchResult[],
    isSearching: false,
    selectedPhotoType: 'ITEM' as PhotoProofType,
  });

  // Use extracted hook for workflow state
  const { workflowState, updateWorkflowState, removeSerialInput, updateSerialInput } = useWorkflowState();

  const { control, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<ScanFormData>({
    defaultValues: {
      countedQty: '',
      returnableDamageQty: '',
      nonReturnableDamageQty: '',
      mrp: '',
      remark: '',
      varianceNote: '',
    }
  });

  // Watch values for calculations
  const watchedCountedQty = watch('countedQty');
  const watchedReturnableDamageQty = watch('returnableDamageQty');
  const watchedNonReturnableDamageQty = watch('nonReturnableDamageQty');
  const watchedMrp = watch('mrp');

  // Sync form values with itemState for backward compatibility during refactor
  React.useEffect(() => {
    updateItemState({
      countedQty: watchedCountedQty || '',
      returnableDamageQty: watchedReturnableDamageQty || '',
      nonReturnableDamageQty: watchedNonReturnableDamageQty || '',
      countedMrp: watchedMrp || '',
    });
  }, [watchedCountedQty, watchedReturnableDamageQty, watchedNonReturnableDamageQty, watchedMrp, updateItemState]);

  // Helper functions for additional state updates
  const updateUiState = React.useCallback((updates: Partial<typeof uiState>) => {
    setUiState(prev => ({ ...prev, ...updates }));
  }, []);
  // const [markLocation, setMarkLocation] = React.useState('');
  // const [sessionActive, setSessionActive] = React.React.useState(false);

  // Enhanced UI States (trimmed unused local states)


  // Duplicate scan handling
  // const [existingCountLine, setExistingCountLine] = React.useState<any>(null);
  // const [showAddQuantityModal, setShowAddQuantityModal] = React.useState(false);
  // const [additionalQty, setAdditionalQty] = React.useState('');

  // Additional Item Information Fields
  // const [srNo, setSrNo] = React.useState('');
  // const [manufacturingDate, setManufacturingDate] = React.useState('');
  const [showManufacturingDatePicker, setShowManufacturingDatePicker] = React.useState(false);
  // const [showOptionalFields, setShowOptionalFields] = React.useState(false);

  React.useEffect(() => {
    if (sessionId) {
      getSession(sessionId as string).then((session) => {
        if (session && session.warehouse) {
          // Parse "Floor - Rack"
          const parts = session.warehouse.split(' - ');
          if (parts.length >= 2) {
            updateItemState({
              floorNo: parts[0],
              rackNo: parts[1]
            });
          } else {
            // Fallback if not in "Floor - Rack" format
            updateItemState({ floorNo: session.warehouse });
          }
          // Auto-activate session if we have details
          updateUiState({ sessionActive: true });
        }
      }).catch(err => console.error("Failed to load session", err));
    }
  }, [sessionId]);

  const prepareItemForCounting = React.useCallback((item: Item) => {
    // Reset form values
    reset({
      countedQty: '',
      returnableDamageQty: '',
      nonReturnableDamageQty: '',
      mrp: '',
      remark: '',
      varianceNote: '',
    });

    updateItemState({
      currentItem: item,
      countedQty: '',
      selectedReason: '',
      countedMrp: getDefaultMrpForItem(item),
      varianceNote: '',
      remark: '',
      itemCondition: 'good',
      conditionManuallySet: false,
      selectedVariant: null,
      returnableDamageQty: '',
      nonReturnableDamageQty: '',
    });
    updateScannerState({ serialScanTargetId: null });
    updatePhotoState({
      photoProofs: [],
      selectedPhotoType: 'ITEM',
    });
    updateUiState({ showReasonModal: false });
    updateWorkflowState({
      serialCaptureEnabled: false,
      serialInputs: [],
    });

    // Reset warehouse location fields
    // Floor and Rack are now session-level and should persist
    updateItemState({
      markLocation: '',
      srNo: '',
      manufacturingDate: ''
    });
    updateUiState({ showOptionalFields: false });
  }, []);

  // Update parsedMrpValue in uiState
  React.useEffect(() => {
    const trimmed = itemState.countedMrp.trim();
    if (!trimmed) {
      updateUiState({ parsedMrpValue: null });
      return;
    }
    const value = parseFloat(trimmed);
    updateUiState({ parsedMrpValue: Number.isNaN(value) ? null : value });
  }, [itemState.countedMrp]);

  const mrpDifference = React.useMemo(() => {
    const baseMrp = itemState.currentItem?.mrp;
    if (
      uiState.parsedMrpValue === null ||
      baseMrp === undefined ||
      baseMrp === null
    ) {
      return null;
    }
    return uiState.parsedMrpValue - Number(baseMrp);
  }, [uiState.parsedMrpValue, itemState.currentItem]);

  const mrpChangePercent = React.useMemo(() => {
    if (
      mrpDifference === null ||
      uiState.parsedMrpValue === null ||
      itemState.currentItem?.mrp === undefined ||
      itemState.currentItem?.mrp === null ||
      Number(itemState.currentItem.mrp) === 0
    ) {
      return null;
    }
    return (mrpDifference / Number(itemState.currentItem.mrp)) * 100;
  }, [mrpDifference, uiState.parsedMrpValue, itemState.currentItem]);

  // Update mrpVariantOptions in itemState
  React.useEffect(() => {
    const variants = getNormalizedMrpVariants(itemState.currentItem);
    updateItemState({ mrpVariantOptions: variants });
  }, [itemState.currentItem]);

  const hasMrpChanged = React.useMemo(() => {
    if (mrpDifference === null || uiState.parsedMrpValue === null) {
      return false;
    }
    return Math.abs(mrpDifference) >= MRP_MATCH_TOLERANCE;
  }, [mrpDifference, uiState.parsedMrpValue]);

  const serialRequirement = React.useMemo(() => {
    if (!itemState.currentItem?.serial_requirement) {
      return 'optional';
    }
    return String(itemState.currentItem.serial_requirement).toLowerCase();
  }, [itemState.currentItem?.serial_requirement]);

  // Update requiredSerialCount in workflowState when serialRequirement changes
  React.useEffect(() => {
    let count = 0;
    if (serialRequirement === 'dual') {
      count = 2;
    } else if (serialRequirement === 'single' || serialRequirement === 'required') {
      count = 1;
    }
    updateWorkflowState({ requiredSerialCount: count });
  }, [serialRequirement]);

  const normalizedQuantity = React.useMemo(() => {
    const trimmedQty = itemState.countedQty.trim();
    if (!trimmedQty) {
      return 0;
    }
    const numericValue = parseFloat(trimmedQty);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return 0;
    }
    return Math.round(numericValue);
  }, [itemState.countedQty]);

  const serialsPerItem = React.useMemo(() => {
    switch (serialRequirement) {
      case 'dual':
        return 2;
      case 'single':
      case 'required':
        return 1;
      default:
        return workflowState.serialCaptureEnabled ? 1 : 0;
    }
  }, [serialRequirement, workflowState.serialCaptureEnabled]);

  // Update expectedSerialCount in workflowState
  React.useEffect(() => {
    if (normalizedQuantity <= 0) {
      updateWorkflowState({ expectedSerialCount: 0 });
      return;
    }

    const perItem = serialRequirement === 'optional' && !workflowState.serialCaptureEnabled ? 0 : serialsPerItem;
    if (perItem === 0) {
      updateWorkflowState({ expectedSerialCount: 0 });
      return;
    }

    updateWorkflowState({ expectedSerialCount: normalizedQuantity * perItem });
  }, [normalizedQuantity, serialRequirement, workflowState.serialCaptureEnabled, serialsPerItem]);

  const minimumSerialSlotCount = React.useMemo(() => {
    if (serialRequirement === 'optional') {
      return workflowState.serialCaptureEnabled ? Math.max(1, serialsPerItem) : 0;
    }
    return Math.max(workflowState.requiredSerialCount, serialsPerItem);
  }, [serialRequirement, workflowState.serialCaptureEnabled, workflowState.requiredSerialCount, serialsPerItem]);

  // Update serialInputTarget in workflowState
  React.useEffect(() => {
    const target = Math.max(workflowState.expectedSerialCount, minimumSerialSlotCount);
    updateWorkflowState({ serialInputTarget: target });
  }, [workflowState.expectedSerialCount, minimumSerialSlotCount]);

  const activeSerialEntries = React.useMemo(
    () => workflowState.serialInputs.filter((entry) => entry.value.trim().length > 0),
    [workflowState.serialInputs]
  );

  const completedSerialCount = activeSerialEntries.length;

  const missingSerialCount = React.useMemo(() => {
    if (workflowState.expectedSerialCount <= 0) {
      return 0;
    }
    return Math.max(workflowState.expectedSerialCount - completedSerialCount, 0);
  }, [workflowState.expectedSerialCount, completedSerialCount]);

  const extraSerialCount = React.useMemo(() => {
    if (workflowState.expectedSerialCount <= 0) {
      return 0;
    }
    return Math.max(completedSerialCount - workflowState.expectedSerialCount, 0);
  }, [workflowState.expectedSerialCount, completedSerialCount]);

  const serialPhotosRequired = React.useMemo(
    () => !isWeb && (workflowState.serialCaptureEnabled || workflowState.requiredSerialCount > 0) && activeSerialEntries.length > 0,
    [activeSerialEntries, isWeb, workflowState.requiredSerialCount, workflowState.serialCaptureEnabled]
  );

  const serialPhotoShortfall = React.useMemo(() => {
    if (!serialPhotosRequired) {
      return 0;
    }
    const serialPhotoCount = photoState.photoProofs.filter((photo) => photo.type === 'SERIAL').length;
    return Math.max(activeSerialEntries.length - serialPhotoCount, 0);
  }, [serialPhotosRequired, activeSerialEntries, photoState.photoProofs]);

  const serialRequirementMessage = React.useMemo(() => {
    if (workflowState.expectedSerialCount > 0) {
      return `Capture ${workflowState.expectedSerialCount} serial number${workflowState.expectedSerialCount > 1 ? 's' : ''} (${completedSerialCount}/${workflowState.expectedSerialCount} recorded)`;
    }
    return SERIAL_REQUIREMENT_LABELS[serialRequirement] ?? SERIAL_REQUIREMENT_LABELS.optional;
  }, [workflowState.expectedSerialCount, completedSerialCount, serialRequirement]);

  const activeSerialLabel = React.useMemo(() => {
    if (!scannerState.serialScanTargetId) {
      return null;
    }
    const entry = workflowState.serialInputs.find((serial) => serial.id === scannerState.serialScanTargetId);
    return entry?.label ?? null;
  }, [scannerState.serialScanTargetId, workflowState.serialInputs]);

  React.useEffect(() => {
    loadVarianceReasons();
    loadAllItems();
  }, []);

  const loadVarianceReasons = async () => {
    try {
      const reasons = await getVarianceReasons();
      updateItemState({ varianceReasons: Array.isArray(reasons) ? reasons : [] });
    } catch {
      // Error logged via error handler
    }
  };

  const loadAllItems = async () => {
    try {
      const response = await api.get('/erp/items');
      // Handle both old format (array) and new format (object with items/pagination)
      const items = Array.isArray(response.data)
        ? response.data
        : (response.data.items || []);
      updateSearchState({ allItems: items });
    } catch {
      // Error logged via error handler
    }
  };

  const createSerialInput = React.useCallback(
    (index: number): SerialInput => ({
      id: `serial-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      label: `Serial #${index + 1}`,
      value: '',
    }),
    [],
  );

  const ensureInitialSerials = React.useCallback(
    (count: number) => Array.from({ length: count }, (_: unknown, idx: number) => createSerialInput(idx)),
    [createSerialInput]
  );

  const addSerialInput = React.useCallback(() => {
    updateWorkflowState({
      serialInputs: [...workflowState.serialInputs, createSerialInput(workflowState.serialInputs.length)]
    });
  }, [createSerialInput, workflowState.serialInputs, updateWorkflowState]);

  const updateSerialValue = React.useCallback((id: string, rawValue: string) => {
    const normalized = normalizeSerialValue(rawValue);

    const currentSerials = workflowState.serialInputs;

    if (normalized.length === 0) {
      updateWorkflowState({
        serialInputs: currentSerials.map((entry) => (entry.id === id ? { ...entry, value: '' } : entry))
      });
      return;
    }

    if (
      currentSerials.some(
        (entry) =>
          entry.id !== id && normalizeSerialValue(entry.value) === normalized
      )
    ) {
      Alert.alert('Duplicate Serial', 'This serial number has already been recorded.');
      return;
    }

    updateWorkflowState({
      serialInputs: currentSerials.map((entry) => (entry.id === id ? { ...entry, value: normalized } : entry))
    });
  }, [workflowState.serialInputs]);

  const handleRemoveSerial = React.useCallback(
    (id: string) => {
      const minimumSerials = Math.max(workflowState.serialInputTarget, 0);
      if (workflowState.serialInputs.length <= minimumSerials) {
        if (minimumSerials > 0) {
          const detailMessage =
            workflowState.expectedSerialCount > 0
              ? `Capture ${workflowState.expectedSerialCount} serial number${workflowState.expectedSerialCount > 1 ? 's' : ''} to match the counted quantity.`
              : `Keep at least ${minimumSerials} serial number${minimumSerials > 1 ? 's' : ''} while serial capture is enabled.`;
          Alert.alert(
            'Serial Required',
            detailMessage
          );
        }
        return;
      }
      updateWorkflowState({
        serialInputs: workflowState.serialInputs.filter((entry) => entry.id !== id)
      });
      if (scannerState.serialScanTargetId === id) {
        updateScannerState({ serialScanTargetId: null });
      }
    },
    [workflowState.serialInputs, workflowState.serialInputTarget, workflowState.expectedSerialCount, scannerState.serialScanTargetId]
  );

  const handleToggleSerialCapture = React.useCallback(
    (value: boolean) => {
      if (workflowState.requiredSerialCount > 0) {
        updateWorkflowState({ serialCaptureEnabled: true });
        return;
      }

      updateWorkflowState({ serialCaptureEnabled: value });
      if (value) {
        const initialCount = Math.max(workflowState.serialInputTarget, 1);
        const currentSerials = workflowState.serialInputs;
        updateWorkflowState({
          serialInputs: currentSerials.length > 0 ? currentSerials : ensureInitialSerials(initialCount)
        });
      } else {
        updateWorkflowState({ serialInputs: [] });
      }
    },
    [workflowState.requiredSerialCount, workflowState.serialInputTarget, workflowState.serialInputs, ensureInitialSerials]
  );

  React.useEffect(() => {
    if (!itemState.currentItem) {
      updateWorkflowState({
        serialCaptureEnabled: false,
        serialInputs: []
      });
      updateItemState({
        itemCondition: 'good',
        conditionManuallySet: false,
        selectedVariant: null
      });
      return;
    }

    updateItemState({ conditionManuallySet: false });

    if (workflowState.requiredSerialCount > 0) {
      updateWorkflowState({
        serialCaptureEnabled: true,
        serialInputs: ensureInitialSerials(workflowState.requiredSerialCount)
      });
    } else {
      updateWorkflowState({
        serialCaptureEnabled: false,
        serialInputs: []
      });
    }

    updateItemState({ itemCondition: 'good' });
  }, [itemState.currentItem, ensureInitialSerials, workflowState.requiredSerialCount]);

  React.useEffect(() => {
    if (!itemState.currentItem) {
      return;
    }

    if (!workflowState.serialCaptureEnabled && workflowState.requiredSerialCount === 0) {
      if (workflowState.serialInputs.length > 0) {
        updateWorkflowState({ serialInputs: [] });
      }
      return;
    }

    if (workflowState.serialInputTarget <= 0) {
      if (workflowState.serialInputs.length > 0) {
        updateWorkflowState({ serialInputs: [] });
      }
      return;
    }

    if (
      workflowState.serialInputs.length === workflowState.serialInputTarget &&
      workflowState.serialInputs.every((entry, idx) => entry.label === `Serial #${idx + 1}`)
    ) {
      return;
    }

    const currentSerials = workflowState.serialInputs;
    const target = workflowState.serialInputTarget;
    let nextSerials = currentSerials;

    if (currentSerials.length > target) {
      nextSerials = currentSerials.slice(0, target);
    } else if (currentSerials.length < target) {
      const additions = Array.from({ length: target - currentSerials.length }, (_, idx) =>
        createSerialInput(currentSerials.length + idx)
      );
      nextSerials = [...currentSerials, ...additions];
    }

    const finalSerials = nextSerials.map((entry, idx) => ({
      ...entry,
      label: `Serial #${idx + 1}`,
    }));

    updateWorkflowState({ serialInputs: finalSerials });
  }, [itemState.currentItem, workflowState.serialInputs, workflowState.serialCaptureEnabled, workflowState.requiredSerialCount, workflowState.serialInputTarget, createSerialInput]);

  React.useEffect(() => {
    if (uiState.parsedMrpValue === null) {
      if (itemState.selectedVariant !== null) {
        updateItemState({ selectedVariant: null });
      }
      return;
    }

    const matched = itemState.mrpVariantOptions.find(
      (variant) => uiState.parsedMrpValue !== null && Math.abs(variant.value - uiState.parsedMrpValue) < MRP_MATCH_TOLERANCE
    );

    if (!matched) {
      if (itemState.selectedVariant !== null) {
        updateItemState({ selectedVariant: null });
      }
      return;
    }

    if (
      !itemState.selectedVariant ||
      itemState.selectedVariant.id !== matched.id ||
      Math.abs(itemState.selectedVariant.value - matched.value) >= MRP_MATCH_TOLERANCE ||
      itemState.selectedVariant.barcode !== matched.barcode
    ) {
      updateItemState({ selectedVariant: matched });
    }
  }, [uiState.parsedMrpValue, itemState.mrpVariantOptions, itemState.selectedVariant]);

  React.useEffect(() => {
    if (itemState.selectedVariant?.item_condition && !itemState.conditionManuallySet) {
      updateItemState({ itemCondition: itemState.selectedVariant.item_condition });
    }
  }, [itemState.selectedVariant, itemState.conditionManuallySet]);

  // Simple but effective fuzzy matching algorithm
  const fuzzyMatch = (search: string, target: string): number => {
    search = search.toLowerCase();
    target = target.toLowerCase();
    // Simple similarity score
    if (search === target) return 1.0;
    if (target.includes(search)) return 0.8;
    if (search.includes(target)) return 0.6;
    return 0.0;
  };

  const handleSerialBarcodeCaptured = React.useCallback(
      (rawData: string) => {
        const normalized = normalizeSerialValue((rawData ?? '').toString());
        if (!normalized) {
          return;
        }

        if (!workflowState.serialCaptureEnabled && workflowState.requiredSerialCount === 0) {
          return;
        }

        if (!scannerState.serialScanTargetId) {
          updateUiState({ scanFeedback: 'Select a serial slot before scanning.' });
          setTimeout(() => updateUiState({ scanFeedback: '' }), 1500);
          return;
        }

        let duplicateDetected = false;
        let missingTarget = false;
        let nextTarget: string | null = null;

        const currentSerials = workflowState.serialInputs;
        const targetId = scannerState.serialScanTargetId;

        const targetExists = currentSerials.some((entry) => entry.id === targetId);
        if (!targetExists) {
          missingTarget = true;
        } else {
          if (
            currentSerials.some(
              (entry) =>
                entry.id !== targetId &&
                normalizeSerialValue(entry.value) === normalized
            )
          ) {
            duplicateDetected = true;
          } else {
            const updated = currentSerials.map((entry) =>
              entry.id === targetId ? { ...entry, value: normalized } : entry
            );

            const currentIndex = updated.findIndex((entry) => entry.id === targetId);
            if (currentIndex >= 0) {
              const nextEmpty = updated
                .slice(currentIndex + 1)
                .find((entry) => entry.value.trim().length === 0);
              if (nextEmpty) {
                nextTarget = nextEmpty.id;
              } else {
                const firstEmpty = updated.find((entry) => entry.value.trim().length === 0);
                if (firstEmpty) {
                  nextTarget = firstEmpty.id;
                }
              }
            }

            updateWorkflowState({ serialInputs: updated });
          }
        }

        if (missingTarget) {
          Alert.alert('Serial Slot Removed', 'The selected serial slot is no longer available.');
          updateScannerState({ serialScanTargetId: null });
          updateUiState({
            showScanner: false,
            scannerMode: 'item'
          });
          return;
        }

        if (duplicateDetected) {
          Alert.alert('Duplicate Serial', 'This serial number has already been recorded.');
          return;
        }

        updateScannerState({
          lastScannedBarcode: normalized,
          scanTimestamp: Date.now()
        });
        updateUiState({ scanFeedback: `Serial captured: ${normalized}` });
        setTimeout(() => updateUiState({ scanFeedback: '' }), 2000);

        if (nextTarget) {
          updateScannerState({ serialScanTargetId: nextTarget });
        } else {
          updateScannerState({ serialScanTargetId: null });
          if (!uiState.continuousScanMode) {
            updateUiState({
              showScanner: false,
              scannerMode: 'item'
            });
          } else {
            updateUiState({ scanFeedback: 'Serial slots filled. Review entries.' });
            setTimeout(() => updateUiState({ scanFeedback: '' }), 2000);
          }
        }
      },
      [workflowState.serialCaptureEnabled, workflowState.requiredSerialCount, workflowState.serialInputs, scannerState.serialScanTargetId, uiState.continuousScanMode]
    );

    const handleSearch = React.useCallback((query: string) => {
      resetActivityTimer(); // Reset on search interaction

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      updateUiState({ searchQuery: query });

      if (query.trim().length === 0) {
        updateUiState({ searchResults: [] });
        return;
      }

      searchTimeoutRef.current = setTimeout(async () => {
        try {
          updateSearchState({ isSearching: true });
          const results = await searchItems(query);
          updateSearchState({ searchResults: results as SearchResult[], isSearching: false });
        } catch (error) {
          if (__DEV__) {
            console.error('Search failed:', error);
          }
          ErrorHandler.handleApiError(error, 'Item Search');
          Alert.alert('Error', 'Failed to search items');
        } finally {
          updateUiState({ isSearching: false });
        }
      }, 500);
    }, [resetActivityTimer, updateUiState]);

    const selectItemFromSearch = async (searchResult: SearchResult) => {
      resetActivityTimer(); // Reset on item selection

      // Clear manual inputs when item is selected
      updateUiState({
        manualBarcode: '',
        manualItemName: ''
      });
      updateSearchState({
        searchResults: [],
        showSearchResults: false
      });

      if (!sessionId) {
        Alert.alert('Error', 'Session ID is missing. Please restart the session.');
        return;
      }

      // Convert SearchResult to Item
      const item: Item = {
        id: searchResult.item_code,
        name: searchResult.item_name,
        item_code: searchResult.item_code,
        barcode: searchResult.barcode,
        stock_qty: searchResult.stock_qty,
        mrp: searchResult.mrp,
        category: searchResult.category,
      };

      // Check if already counted
      const countCheck = await checkItemCounted(sessionId as string, item.item_code || '');

      if (countCheck.already_counted) {
        Alert.alert(
          'Item Already Counted',
          `This item was already counted ${countCheck.count_lines.length} time(s). Do you want to add another count?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Add Count', onPress: () => prepareItemForCounting(item) }
          ]
        );
      } else {
        prepareItemForCounting(item);
      }
    };

    const handleBarCodeScanned = async ({ data }: any) => {
      resetActivityTimer(); // Reset on barcode scan

      const rawValue = (data ?? '').toString().trim();
      if (!rawValue) {
        return;
      }

      const now = Date.now();

      if (registerScanAndCheckRateLimit(rawValue, now)) {
        updateUiState({ scanFeedback: 'Too many scans detected, pause briefly.' });
        if (uiState.continuousScanMode) {
          updateUiState({ continuousScanMode: false });
        }
        setTimeout(() => updateUiState({ scanFeedback: '' }), 2000);
        return;
      }

      if (uiState.scannerMode === 'serial') {
        if (rawValue === scannerState.lastScannedBarcode && now - scannerState.scanTimestamp < 1000) {
          return;
        }
        handleSerialBarcodeCaptured(rawValue);
        return;
      }

      if (rawValue === scannerState.lastScannedBarcode && now - scannerState.scanTimestamp < 2000) {
        return;
      }

      updateScannerState({
        lastScannedBarcode: rawValue,
        scanTimestamp: now
      });
      updateUiState({ scanFeedback: `Scanned: ${rawValue}` });

      if (!uiState.continuousScanMode) {
        updateUiState({ showScanner: false });
      }

      await lookupItem(rawValue);

      setTimeout(() => updateUiState({ scanFeedback: '' }), 2000);
    };

    const ensureCameraPermission = React.useCallback(async () => {
      if (isWeb) {
        Alert.alert('Camera Unavailable', 'Camera access is not supported on web. Use manual options instead.');
        return false;
      }

      if (!permission) {
        const { status } = await requestPermission();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to use the camera');
          return false;
        }
        return true;
      }

      if (!permission.granted) {
        const { status } = await requestPermission();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to use the camera');
          return false;
        }
      }

      return true;
    }, [isWeb, permission, requestPermission]);

    const handleStartScanning = React.useCallback(
      async (mode: ScannerMode = 'item', targetSerialId?: string) => {
        if (isWeb) {
          Alert.alert('Scanner Unavailable', 'Barcode scanning via camera is not supported on web. Use manual entry instead.');
          return;
        }

        const permissionGranted = await ensureCameraPermission();
        if (!permissionGranted) {
          return;
        }

        if (mode === 'serial') {
          if (!workflowState.serialCaptureEnabled && workflowState.requiredSerialCount === 0) {
            Alert.alert('Serial Capture Disabled', 'Enable serial capture to scan serial numbers.');
            return;
          }

          let resolvedTarget = targetSerialId;
          if (!resolvedTarget) {
            const fallbackEntry = workflowState.serialInputs.find((entry) => entry.value.trim().length === 0) ?? workflowState.serialInputs[0];
            if (!fallbackEntry) {
              Alert.alert('No Serial Slots', 'Add a serial input before scanning serial numbers.');
              return;
            }
            resolvedTarget = fallbackEntry.id;
          }

          updateScannerState({ serialScanTargetId: resolvedTarget });
          if (photoState.selectedPhotoType !== 'SERIAL') {
            updatePhotoState({ selectedPhotoType: 'SERIAL' });
          }
        } else {
          updateScannerState({ serialScanTargetId: null });
        }

        updateUiState({
          scannerMode: mode,
          showScanner: true
        });
      },
      [ensureCameraPermission, isWeb, workflowState.requiredSerialCount, photoState.selectedPhotoType, workflowState.serialCaptureEnabled, workflowState.serialInputs]
    );

    const handleScanSerialSlot = React.useCallback(
      (entryId: string) => {
        handleStartScanning('serial', entryId);
      },
      [handleStartScanning]
    );

    const handleScanNextSerial = React.useCallback(() => {
      const targetEntry =
        workflowState.serialInputs.find((entry) => entry.value.trim().length === 0) ??
        workflowState.serialInputs[workflowState.serialInputs.length - 1];

      if (!targetEntry) {
        Alert.alert('No Serial Slots', 'Add a serial input before scanning serial numbers.');
        return;
      }

      handleStartScanning('serial', targetEntry.id);
    }, [workflowState.serialInputs, handleStartScanning]);

    const handleOpenPhotoCapture = React.useCallback(async () => {
      if (isWeb) {
        Alert.alert('Camera Unavailable', 'Photo capture uses device camera, which is not available on web.');
        return;
      }

      const permissionGranted = await ensureCameraPermission();
      if (!permissionGranted) {
        return;
      }
      updatePhotoState({ showPhotoCapture: true });
    }, [ensureCameraPermission, isWeb]);

    const handleCapturePhoto = React.useCallback(async () => {
      if (isWeb) {
        Alert.alert('Camera Unavailable', 'Photo capture is only available on mobile devices.');
        return;
      }

      if (!photoCameraRef.current) {
        Alert.alert('Camera Not Ready', 'Wait for the camera preview to initialize.');
        return;
      }

      try {
        updatePhotoState({ photoCaptureLoading: true });
        const captured = await photoCameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5,
          skipProcessing: false,
        });

        if (!captured?.base64) {
          Alert.alert('Capture Failed', 'Unable to read image data. Please try again.');
          return;
        }

        const photoId = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const previewUri = captured.uri ?? `data:image/jpeg;base64,${captured.base64}`;
        const capturedAt = new Date().toISOString();

        updatePhotoState({
          photoProofs: [
            ...photoState.photoProofs,
            {
              id: photoId,
              base64: captured.base64,
              previewUri,
              type: photoState.selectedPhotoType,
              capturedAt,
            },
          ],
        });

        updatePhotoState({ showPhotoCapture: false });
      } catch {
        // Error logged via error handler
        Alert.alert('Capture Failed', 'Unable to capture photo. Please try again.');
      } finally {
        updatePhotoState({ photoCaptureLoading: false });
      }
    }, [isWeb, photoState.selectedPhotoType]);

    const handleRemovePhoto = React.useCallback((photoId: string) => {
      updatePhotoState({
        photoProofs: photoState.photoProofs.filter((photo) => photo.id !== photoId)
      });
    }, [photoState.photoProofs]);

    const handleClosePhotoCapture = React.useCallback(() => {
      updatePhotoState({ showPhotoCapture: false });
    }, []);

    const handleFlipPhotoCamera = React.useCallback(() => {
      updatePhotoState({ photoCameraType: photoState.photoCameraType === 'back' ? 'front' : 'back' });
    }, [photoState.photoCameraType, updatePhotoState]);

    const [isLoadingItem, setIsLoadingItem] = React.useState(false);

    const lookupItem = async (barcode: string) => {
      setIsLoadingItem(true);
      updateScannerState({ scanFeedback: 'Looking up item...' });

      // Normalize barcode to 6-digit format for display
      const normalizedBarcode = barcode.trim().match(/^\d+$/)
        ? (barcode.trim().length < 6 ? barcode.trim().padStart(6, '0') : barcode.trim())
        : barcode.trim();

      try {
        // Barcode scan initiated

        // API call with power-saving throttle and proper offline support
        throttleNetworkRequest('barcode-scan', 300);
        const item = await getItemByBarcode(barcode, 3);

        // Item found

        // Track analytics
        AnalyticsService.trackItemScan(item.item_code, item.item_name).catch(() => { });

        updateScannerState({ scanFeedback: `Found: ${item.item_name}` });

        const countCheck = await checkItemCounted(sessionId as string, item.item_code || '');

        if (countCheck.already_counted) {
          // Item already counted - show options
          const existingLine = countCheck.count_lines[0];
          updateWorkflowState({ existingCountLine: existingLine });
          updateItemState({ currentItem: item });

          Alert.alert(
            '🔄 Duplicate Scan Detected',
            `${item.item_name}\n\nCurrent Count: ${existingLine.counted_qty} ${item.uom_name || ''}\nCounted by: ${existingLine.counted_by}\n\nWhat would you like to do?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resetForm() },
              {
                text: 'Add Quantity',
                onPress: () => {
                  updateWorkflowState({ additionalQty: '1' });
                  updateWorkflowState({ showAddQuantityModal: true });
                }
              },
              {
                text: 'Count Again',
                onPress: () => {
                  updateWorkflowState({ existingCountLine: null });
                  prepareItemForCounting(item);
                  if (item.item_code) {
                    RecentItemsService.addRecent(item.item_code, item).catch(() => { });
                  }
                }
              }
            ]
          );
        } else {
          prepareItemForCounting(item);
          // Add to recent items service
          if (item.item_code) {
            RecentItemsService.addRecent(item.item_code, item).catch(() => { });
          }
        }
      } catch (error: any) {
        // Use ErrorHandler for consistent error messages
        const apiError = ErrorHandler.handleApiError(error, 'Barcode Lookup');

        // Build user-friendly message with context
        let errorTitle = apiError.category === 'network' ? 'Connection Error' :
          apiError.category === 'resource' ? 'Item Not Found' :
            apiError.category === 'validation' ? 'Invalid Barcode' : 'Error';

        let errorMessage = apiError.message;
        if (apiError.detail && apiError.detail !== apiError.message) {
          errorMessage += `\n\n${apiError.detail}`;
        }
        if (apiError.context?.barcode) {
          errorMessage += `\n\nBarcode: ${apiError.context.barcode}`;
        }

        updateScannerState({ scanFeedback: `Error: ${errorTitle}` });
        // Error logged via error handler
        ErrorHandler.logError('Barcode Lookup', error, {
          barcode,
          code: apiError.code,
          category: apiError.category,
          statusCode: apiError.statusCode,
          message: apiError.message,
        });

        // Build fix buttons based on error type
        const fixButtons: any[] = [
          { text: 'Cancel', style: 'cancel' }
        ];

        // Add context-specific fix buttons
        if (apiError.category === 'network') {
          fixButtons.push(
            {
              text: '🔌 Retry Connection',
              onPress: () => {
                updateScannerState({ scanFeedback: 'Checking backend...' });
                // Add delay to prevent rapid retries
                setTimeout(() => {
                  lookupItem(barcode).catch(() => {
                    // Error already handled in lookupItem
                  });
                }, 2000); // 2 second delay
              }
            },
            {
              text: '📡 Check Network',
              onPress: () => {
                Alert.alert('Network Check', 'Please ensure:\n\n• Device is connected to WiFi/Network\n• Backend server is running\n• Firewall allows connections');
              }
            }
          );
        } else if (apiError.category === 'resource' || apiError.category === 'database') {
          fixButtons.push(
            {
              text: '🔄 Try Again',
              onPress: () => {
                updateScannerState({ scanFeedback: 'Retrying...' });
                // Add delay to prevent rapid retries
                setTimeout(() => {
                  lookupItem(barcode).catch(() => {
                    // Error already handled in lookupItem
                  });
                }, 2000); // 2 second delay
              }
            },
            {
              text: '🔍 Search by Name',
              onPress: () => {
                updateScannerState({ showScanner: false });
                updateScannerState({ scanFeedback: 'Use search box above' });
              }
            },
            {
              text: '➕ Report Unknown Item',
              onPress: () => handleReportUnknownItem(barcode)
            }
          );
        } else if (apiError.category === 'validation') {
          fixButtons.push(
            {
              text: '✏️ Enter Manually',
              onPress: () => {
                updateScannerState({ showScanner: false });
                Alert.prompt(
                  'Enter Barcode',
                  'Please enter the barcode manually',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'OK',
                      onPress: (manualBarcode?: string) => {
                        if (manualBarcode && manualBarcode.trim()) {
                          lookupItem(manualBarcode.trim());
                        }
                      }
                    }
                  ],
                  'plain-text',
                  barcode
                );
              }
            },
            {
              text: '🔍 Search Instead',
              onPress: () => {
                updateScannerState({ showScanner: false });
                updateScannerState({ scanFeedback: 'Use search box above' });
              }
            }
          );
        } else {
          // Generic fix buttons
          fixButtons.push(
            {
              text: '🔄 Retry',
              onPress: () => {
                updateScannerState({ scanFeedback: 'Retrying...' });
                // Add delay to prevent rapid retries
                setTimeout(() => {
                  lookupItem(barcode).catch(() => {
                    // Error already handled in lookupItem
                  });
                }, 2000); // 2 second delay
              }
            },
            {
              text: '🔍 Search by Name',
              onPress: () => {
                updateScannerState({ showScanner: false });
              }
            }
          );
        }

        // Enhanced error alert with fix buttons
        Alert.alert(
          errorTitle,
          errorMessage + '\n\nChoose an action:',
          fixButtons
        );
      } finally {
        setIsLoadingItem(false);
        // Clear feedback after 3 seconds
        setTimeout(() => updateScannerState({ scanFeedback: '' }), 3000);
      }
    };



    const handleReportUnknownItem = (barcode: string) => {
      updateUiState({ unknownItemData: { barcode, description: '' } });
      updateUiState({ showUnknownItemModal: true });
    };

    const submitUnknownItem = async () => {
      if (!uiState.unknownItemData.description.trim()) {
        Alert.alert('Error', 'Please enter a description');
        return;
      }

      try {
        await api.post('/unknown-items', {
          barcode: uiState.unknownItemData.barcode,
          description: uiState.unknownItemData.description,
          session_id: sessionId,
          reported_by: 'staff'
        });
        Alert.alert('Success', 'Unknown item reported successfully');
        updateUiState({ showUnknownItemModal: false });
        updateUiState({ unknownItemData: { barcode: '', description: '' } });
      } catch {
        Alert.alert('Error', 'Failed to report unknown item');
      }
    };



    const handleSaveCount = handleSubmit(async (data) => {
      if (!itemState.currentItem) {
        Alert.alert('Error', 'No item selected');
        return;
      }

      const mrpInputValue = data.mrp.trim();
      let parsedMrp: number | null = null;
      if (mrpInputValue.length > 0) {
        const numericMrp = parseFloat(mrpInputValue);
        if (Number.isNaN(numericMrp)) {
          Alert.alert('Invalid MRP', 'Please enter a valid number for MRP');
          return;
        }
        if (numericMrp < 0) {
          Alert.alert('Invalid MRP', 'MRP cannot be negative');
          return;
        }
        parsedMrp = numericMrp;
      }

      // Parse damage quantities
      const returnableQty = data.returnableDamageQty.trim() ? parseFloat(data.returnableDamageQty) : 0;
      const nonReturnableQty = data.nonReturnableDamageQty.trim() ? parseFloat(data.nonReturnableDamageQty) : 0;
      const physicalQty = parseFloat(data.countedQty);

      // Variance calculation: (Physical + Returnable Damage) - Stock
      const totalCounted = physicalQty + returnableQty;
      const stockQty = itemState.currentItem.stock_qty ?? itemState.currentItem.quantity ?? 0;
      const variance = totalCounted - stockQty;

      if (variance !== 0 && !itemState.selectedReason) {
        updateUiState({ showReasonModal: true });
        return;
      }

      if (workflowState.expectedSerialCount > 0 && activeSerialEntries.length < workflowState.expectedSerialCount) {
        const remaining = workflowState.expectedSerialCount - activeSerialEntries.length;
        Alert.alert(
          'Serial Numbers Needed',
          `Capture ${workflowState.expectedSerialCount} serial number${workflowState.expectedSerialCount > 1 ? 's' : ''} to match the counted quantity. ${remaining} serial number${remaining > 1 ? 's are' : ' is'} still missing.`
        );
        return;
      }

      const serialPayload = activeSerialEntries.map((entry, index) => ({
        label: entry.label || `Serial #${index + 1}`,
        value: normalizeSerialValue(entry.value),
        captured_at: new Date().toISOString(),
      }));

      if (workflowState.expectedSerialCount > 0 && serialPayload.length > workflowState.expectedSerialCount) {
        Alert.alert(
          'Serial Count Mismatch',
          'The number of serial numbers exceeds the counted quantity. Adjust the quantity or remove extra serial entries before saving.'
        );
        return;
      }

      if (serialPayload.length > 0 && serialPhotoShortfall > 0) {
        const remaining = serialPhotoShortfall;
        Alert.alert(
          'Serial Photos Needed',
          `Capture ${remaining} more serial photo proof${remaining > 1 ? 's' : ''} to match the recorded serial numbers.`
        );
        return;
      }

      const matchedVariant = itemState.selectedVariant ?? (parsedMrp !== null
        ? itemState.mrpVariantOptions.find((variant) => Math.abs(variant.value - parsedMrp!) < MRP_MATCH_TOLERANCE)
        : null);

      const shouldSendMrp = parsedMrp !== null && hasMrpChanged;
      const mrpSource = shouldSendMrp
        ? matchedVariant?.source ?? 'manual_entry'
        : undefined;

      const photoPayload = photoState.photoProofs.map((photo) => ({
        id: photo.id,
        type: photo.type,
        base64: photo.base64,
        captured_at: photo.capturedAt,
      }));

      try {
        updateUiState({ saving: true });

        const payload: any = {
          session_id: sessionId,
          item_code: itemState.currentItem.item_code,
          counted_qty: physicalQty,
          damaged_qty: returnableQty,
          non_returnable_damaged_qty: nonReturnableQty,
          variance_reason: itemState.selectedReason || null,
          variance_note: itemState.varianceNote || null,
          remark: itemState.remark || null,
          item_condition: itemState.itemCondition || undefined,
          serial_numbers: serialPayload.length ? serialPayload : undefined,
          // Warehouse location fields (replacing session-based tracking)
          floor_no: itemState.floorNo.trim() || null,
          rack_no: itemState.rackNo.trim() || null,
          mark_location: itemState.markLocation.trim() || null,
          // Additional optional fields
          sr_no: itemState.srNo.trim() || null,
          manufacturing_date: itemState.manufacturingDate.trim() || null,
        };

        if (photoPayload.length > 0) {
          payload.photo_proofs = photoPayload;
        }

        if (shouldSendMrp && parsedMrp !== null) {
          payload.mrp_counted = parsedMrp;
          payload.mrp_source = mrpSource;
          payload.variant_id = matchedVariant?.id;
          payload.variant_barcode = matchedVariant?.barcode;
        }

        const countLine = await handleErrorWithRecovery(
          () => createCountLine(payload),
          {
            context: 'Save Count',
            recovery: { maxRetries: 3 },
            showAlert: true,
          }
        );

        // Mark item as verified
        try {
          await ItemVerificationAPI.verifyItem(itemState.currentItem.item_code || '', {
            verified: true,
            verified_qty: physicalQty,
            damaged_qty: returnableQty,
            non_returnable_damaged_qty: nonReturnableQty,
            item_condition: itemState.itemCondition,
            notes: itemState.varianceNote || itemState.remark || undefined,
            floor: itemState.floorNo.trim() || undefined,
            rack: itemState.rackNo.trim() || undefined,
            session_id: sessionId as string,
            count_line_id: countLine?.id
          });
        } catch {
          // Verification tracking failed (non-critical)
          // Don't block the save if verification fails
        }

        // Track analytics
        AnalyticsService.trackCount(itemState.currentItem.item_code || '', physicalQty).catch(() => { });

        Alert.alert('Success', 'Count saved successfully!');
        resetForm();
      } catch {
        // Error handled by handleErrorWithRecovery
        // Error logged via error handler
      } finally {
        updateUiState({ saving: false });
      }
    });

    // Voice search functionality
    const handleVoiceSearch = React.useCallback(async () => {
      if (searchState.isListening) {
        // Stop listening
        updateSearchState({ isListening: false });
        updateScannerState({ scanFeedback: '' });
        return;
      }

      // Start listening
      updateSearchState({ isListening: true });
      updateScannerState({ scanFeedback: '🎤 Listening... Speak item name or code' });
      if (Platform.OS === 'ios') {
        Alert.prompt(
          'Voice Search',
          'Enter item name or code (Voice input coming soon)',
          [
            {
              text: 'Cancel', style: 'cancel', onPress: () => {
                updateSearchState({ isListening: false });
                updateScannerState({ scanFeedback: '' });
              }
            },
            {
              text: 'Search', onPress: (text?: string) => {
                if (text && text.trim()) {
                  updateScannerState({ manualItemName: text.trim() });
                  handleSearch(text.trim());
                }
                updateSearchState({ isListening: false });
                updateScannerState({ scanFeedback: '' });
              }
            }
          ],
          'plain-text'
        );
        return;
      }

      Alert.alert(
        'Voice Search',
        'Voice search is currently supported on iOS only; use the search box instead.',
        [
          {
            text: 'OK',
            onPress: () => {
              updateSearchState({ isListening: false });
              updateScannerState({ scanFeedback: '' });
            },
          },
        ]
      );
    }, [searchState.isListening, updateSearchState, updateScannerState, handleSearch]);

    // Add quantity to existing count line
    const handleAddQuantity = React.useCallback(async () => {
      if (!workflowState.existingCountLine || !workflowState.additionalQty) {
        return;
      }

      const addQty = parseFloat(workflowState.additionalQty);
      if (isNaN(addQty) || addQty <= 0) {
        Alert.alert('Invalid Quantity', 'Please enter a valid positive number');
        return;
      }

      try {
        updateUiState({ saving: true });
        const newTotalQty = (workflowState.existingCountLine.counted_qty || 0) + addQty;

        await addQuantityToCountLine(workflowState.existingCountLine.id, addQty);

        Alert.alert(
          'Success',
          `Added ${addQty} to existing count\n\nNew Total: ${newTotalQty} ${itemState.currentItem?.uom_name || ''}`,
          [{
            text: 'OK', onPress: () => {
              updateWorkflowState({ showAddQuantityModal: false });
              resetForm();
            }
          }]
        );
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to add quantity');
      } finally {
        updateUiState({ saving: false });
      }
    }, [workflowState.existingCountLine, workflowState.additionalQty, itemState.currentItem]);

    const resetForm = () => {
      // Reset form values
      reset({
        countedQty: '',
        returnableDamageQty: '',
        nonReturnableDamageQty: '',
        mrp: '',
        remark: '',
        varianceNote: '',
      });

      // Reset item state
      updateItemState({
        currentItem: null,
        countedQty: '',
        countedMrp: '',
        selectedReason: '',
        varianceNote: '',
        remark: '',
        floorNo: '',
        rackNo: '',
        damageQty: '',
        markLocation: '',
        srNo: '',
        manufacturingDate: '',
        itemCondition: 'good',
        conditionManuallySet: false,
        selectedVariant: null,
        returnableDamageQty: '',
        nonReturnableDamageQty: ''
      });

      // Reset UI state
      updateUiState({

        scanFeedback: '',
        manualBarcode: '',
        manualItemName: '',
        showOptionalFields: false,
        selectedPhotoType: 'ITEM'
      });

      // Reset search state
      updateSearchState({
        searchResults: [],
        showSearchResults: false
      });

      // Reset workflow state
      updateWorkflowState({
        serialCaptureEnabled: false,
        serialInputs: []
      });

      // Reset scanner state
      updateScannerState({
        serialScanTargetId: null
      });

      // Reset photo state
      updatePhotoState({
        photoProofs: []
      });
      // Reset duplicate scan handling
      updateWorkflowState({
        existingCountLine: null,
        showAddQuantityModal: false,
        additionalQty: ''
      });
    };

    const handleLogout = async () => {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
                router.replace('/login');
              } catch (error) {
                Alert.alert('Error', 'Failed to logout. Please try again.');
              }
            }
          }
        ]
      );
    };

    const handleRefreshStock = async () => {
      if (!itemState.currentItem) return;

      updateUiState({ refreshingStock: true });
      try {
        const result = await refreshItemStock(itemState.currentItem.item_code || '');
        if (result.success && result.item) {
          const previousMrp = itemState.currentItem?.mrp;
          const updatedItem = {
            ...itemState.currentItem,
            ...result.item,
          };

          // Update current item with latest stock from ERP
          updateItemState({ currentItem: updatedItem });

          // Calculate new MRP
          const recommendedMrp = getDefaultMrpForItem(updatedItem);
          const trimmedPrev = (itemState.countedMrp ?? '').trim();
          let newMrp = itemState.countedMrp;

          if (!trimmedPrev) {
            newMrp = recommendedMrp;
          } else {
            const prevValue = parseFloat(trimmedPrev);
            if (
              Number.isNaN(prevValue) ||
              (previousMrp !== undefined && previousMrp !== null && prevValue === Number(previousMrp))
            ) {
              newMrp = recommendedMrp;
            }
          }

          updateItemState({ countedMrp: newMrp });
          updateScannerState({ scanFeedback: `Stock refreshed: ${result.item.stock_qty}` });

          // Show success message
          Alert.alert(
            'Stock Refreshed',
            `Current ERP Stock: ${result.item.stock_qty}\n${result.message}`,
            [{ text: 'OK' }]
          );
        }
      } catch (error: any) {
        // Error logged via error handler
        const errorMsg = error.response?.data?.detail?.message || error.message || 'Failed to refresh stock';
        Alert.alert('Error', errorMsg);
      } finally {
        updateUiState({ refreshingStock: false });
      }
    };

    if (!isWeb && !permission) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Requesting camera permission...</Text>
        </View>
      );
    }

    if (!isWeb && permission && !permission.granted) {
      return (
        <View style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={64} color="#94A3B8" />
            <Text style={styles.permissionText}>Camera permission is required to scan barcodes</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <LinearGradient
          colors={[PremiumTheme.colors.background, PremiumTheme.colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          <StatusBar style="light" />


          {/* Session Start Modal */}
          <Modal
            visible={!uiState.sessionActive}
            animationType="slide"
            transparent={true}
            onRequestClose={() => { }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Start Session</Text>
                <Text style={styles.modalSubtitle}>Enter location details to begin</Text>

                <Text style={styles.modalLabel}>Floor Number</Text>
                <TextInput
                  style={styles.input}
                  value={itemState.floorNo}
                  onChangeText={(text) => updateItemState({ floorNo: text })}
                  placeholder="e.g. 1, 2, G"
                  placeholderTextColor="#666"
                />

                <Text style={styles.modalLabel}>Rack Number</Text>
                <TextInput
                  style={styles.input}
                  value={itemState.rackNo}
                  onChangeText={(text) => updateItemState({ rackNo: text })}
                  placeholder="e.g. A1, B2"
                  placeholderTextColor="#666"
                />

                <TouchableOpacity
                  style={[styles.confirmButton, !itemState.floorNo && { opacity: 0.5 }]}
                  onPress={() => {
                    if (itemState.floorNo) {
                      updateUiState({ sessionActive: true });
                    } else {
                      Alert.alert('Required', 'Please enter Floor number');
                    }
                  }}
                  disabled={!itemState.floorNo}
                >
                  <Text style={styles.confirmButtonText}>Start Scanning</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <BlurView intensity={20} tint="dark" style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Scan Items</Text>
              {user && (
                <Text style={styles.headerSubtitle}>{user.full_name || user.username}</Text>
              )}
            </View>
            <View style={styles.headerActions}>
              {/* Power Saving Indicator */}
              <PowerSavingIndicator powerState={powerState} compact />
              <TouchableOpacity
                onPress={() => updateWorkflowState({ autoIncrementEnabled: !workflowState.autoIncrementEnabled })}
                style={styles.toggleButton}
              >
                <Ionicons
                  name={workflowState.autoIncrementEnabled ? "add-circle" : "add-circle-outline"}
                  size={24}
                  color={workflowState.autoIncrementEnabled ? "#3B82F6" : "#94A3B8"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/staff/history?sessionId=${sessionId}`)}
                style={styles.historyButton}
              >
                <Ionicons name="list" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleLogout}
                style={styles.logoutButton}
              >
                <Ionicons name="log-out-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* Auto-Increment Status Banner */}
          {workflowState.autoIncrementEnabled && (
            <View style={styles.autoIncrementBanner}>
              <Ionicons name="information-circle" size={16} color="#3B82F6" />
              <Text style={styles.autoIncrementText}>
                Auto-Increment ON - Re-scanning items will add to count
              </Text>
            </View>
          )}

          <ScrollView style={styles.content}>
            {!itemState.currentItem ? (
              <View key="no-item">
                {/* Scan Option */}
                {isWeb && (
                  <View style={styles.webNotice}>
                    <Ionicons name="desktop-outline" size={20} color="#FFB74D" />
                    <Text style={styles.webNoticeText}>
                      Camera scanning is not available on web. Use manual entry below.
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.scanButton, isWeb && styles.scanButtonDisabled]}
                  onPress={() => handleStartScanning('item')}
                  disabled={isWeb}
                >
                  <Ionicons name="scan" size={48} color="#fff" />
                  <Text style={styles.scanButtonText}>Scan Barcode</Text>
                </TouchableOpacity>

                <View style={styles.orDivider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.orText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Manual Entry Section - Using ItemSearch Component */}
                <ItemSearch
                  manualBarcode={scannerState.manualBarcode}
                  manualItemName={scannerState.manualItemName}
                  searchResults={searchState.searchResults}
                  isSearching={searchState.isSearching}
                  isListening={searchState.isListening}
                  showSearchResults={searchState.showSearchResults}
                  onBarcodeChange={(barcode) => updateScannerState({ manualBarcode: barcode })}
                  onItemNameChange={(name) => updateScannerState({ manualItemName: name })}
                  onBarcodeSubmit={() => {
                    if (scannerState.manualBarcode.trim()) {
                      lookupItem(scannerState.manualBarcode.trim());
                    }
                  }}
                  onItemNameSubmit={() => {
                    if (scannerState.manualItemName.trim().length >= 3) {
                      handleSearch(scannerState.manualItemName.trim());
                    }
                  }}
                  onSearch={handleSearch}
                  onVoiceSearch={handleVoiceSearch}
                  onSelectItem={selectItemFromSearch}
                  onActivityReset={resetActivityTimer}
                />
              </View>
            ) : (
              <View key="has-item">
                {/* Item Display - Using ItemDisplay Component */}
                <ItemDisplay
                  item={itemState.currentItem}
                  refreshingStock={uiState.refreshingStock}
                  onRefreshStock={handleRefreshStock}
                />

                {/* Quantity Input Form - Using QuantityInputForm Component */}
                <QuantityInputForm
                  control={control}
                  errors={errors}
                  setValue={setValue}
                  mrpVariants={itemState.mrpVariantOptions}
                  parsedMrpValue={uiState.parsedMrpValue}
                  systemMrp={itemState.currentItem?.mrp ? toNumericMrp(itemState.currentItem.mrp) : null}
                  mrpDifference={mrpDifference}
                  mrpChangePercent={mrpChangePercent}
                  onActivityReset={resetActivityTimer}
                  onItemConditionChange={(condition) => updateItemState({ itemCondition: condition })}
                  onVariantSelect={(variant) => {
                    setValue('mrp', formatMrpValue(variant.value));
                    updateItemState({ countedMrp: formatMrpValue(variant.value), selectedVariant: variant });
                  }}
                  currentItemCondition={itemState.itemCondition}
                />

                {/* Warehouse Location Section (replacing session-based tracking) */}
                <View style={styles.locationSection}>
                    <Text style={styles.sectionTitle}>Warehouse Location</Text>
                    <View style={styles.locationGrid}>
                      <View style={styles.locationInputGroup}>
                        <Text style={styles.fieldLabel}>Floor No</Text>
                        <TextInput
                          style={styles.locationInput}
                          placeholder="e.g., 1, 2, G"
                          placeholderTextColor="#94A3B8"
                          value={itemState.floorNo}
                          onChangeText={(text) => {
                            resetActivityTimer();
                            updateItemState({ floorNo: text });
                          }}
                          autoCapitalize="characters"
                        />
                      </View>
                      {/* Rack field hidden as per requirements */}
                      {/* <View style={styles.locationInputGroup}>
                    <Text style={styles.fieldLabel}>Rack No</Text>
                    <TextInput
                      style={styles.locationInput}
                      placeholder="e.g., A1, B2"
                      placeholderTextColor="#94A3B8"
                      value={itemState.rackNo}
                      onChangeText={(text) => {
                        resetActivityTimer();
                        updateItemState({ rackNo: text });
                      }}
                      autoCapitalize="characters"
                    />
                  </View> */}
                      <View style={styles.locationInputGroup}>
                        <Text style={styles.fieldLabel}>Mark/Label</Text>
                        <TextInput
                          style={styles.locationInput}
                          placeholder="e.g., Top, Middle"
                          placeholderTextColor="#94A3B8"
                          value={itemState.markLocation}
                          onChangeText={(text) => {
                            resetActivityTimer();
                            updateItemState({ markLocation: text });
                          }}
                          autoCapitalize="words"
                        />
                      </View>
                    </View>
                  </View>

                {/* Optional Additional Fields Section */}
                <View style={styles.optionalFieldsSection}>
                    <TouchableOpacity
                      style={styles.optionalFieldsToggle}
                      onPress={() => {
                        resetActivityTimer();
                        updateUiState({ showOptionalFields: !uiState.showOptionalFields });
                      }}
                    >
                      <Text style={styles.optionalFieldsToggleText}>Optional Fields</Text>
                      <Ionicons
                        name={uiState.showOptionalFields ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#3B82F6"
                      />
                    </TouchableOpacity>

                    {uiState.showOptionalFields && (
                      <View style={styles.optionalFieldsContent}>
                        <View style={styles.optionalFieldRow}>
                          <View style={styles.optionalFieldGroup}>
                            <Text style={styles.fieldLabel}>SR No</Text>
                            <TextInput
                              style={styles.optionalInput}
                              placeholder="Serial/Reference No"
                              placeholderTextColor="#94A3B8"
                              value={itemState.srNo}
                              onChangeText={(text) => {
                                resetActivityTimer();
                                updateItemState({ srNo: text });
                              }}
                              autoCapitalize="characters"
                            />
                          </View>
                        </View>

                        <View style={styles.optionalFieldRow}>
                          <View style={styles.optionalFieldGroup}>
                            <Text style={styles.fieldLabel}>Manufacturing Date</Text>
                            <TouchableOpacity
                              style={styles.datePickerButton}
                              onPress={() => {
                                resetActivityTimer();
                                setShowManufacturingDatePicker(true);
                              }}
                            >
                              <Ionicons name="calendar" size={18} color="#666" />
                              <Text style={styles.datePickerButtonText}>
                                {itemState.manufacturingDate || 'Select Date'}
                              </Text>
                            </TouchableOpacity>
                            {itemState.manufacturingDate && (
                              <TouchableOpacity
                                style={styles.clearDateButton}
                                onPress={() => {
                                  resetActivityTimer();
                                  updateItemState({ manufacturingDate: '' });
                                }}
                              >
                                <Ionicons name="close-circle" size={18} color="#94A3B8" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* Display read-only Category, Type, Group from current item */}
                        {(itemState.currentItem.category || itemState.currentItem.item_type || itemState.currentItem.item_group) && (
                          <View style={styles.readOnlyInfoSection}>
                            <Text style={styles.readOnlyInfoTitle}>Item Information</Text>
                            {itemState.currentItem.category && (
                              <View style={styles.readOnlyInfoRow}>
                                <Text style={styles.readOnlyInfoLabel}>Category:</Text>
                                <Text style={styles.readOnlyInfoValue}>
                                  {itemState.currentItem.category}
                                  {itemState.currentItem.subcategory && ` / ${itemState.currentItem.subcategory}`}
                                </Text>
                              </View>
                            )}
                            {itemState.currentItem.item_type && (
                              <View style={styles.readOnlyInfoRow}>
                                <Text style={styles.readOnlyInfoLabel}>Type:</Text>
                                <Text style={styles.readOnlyInfoValue}>{itemState.currentItem.item_type}</Text>
                              </View>
                            )}
                            {itemState.currentItem.item_group && (
                              <View style={styles.readOnlyInfoRow}>
                                <Text style={styles.readOnlyInfoLabel}>Group:</Text>
                                <Text style={styles.readOnlyInfoValue}>{itemState.currentItem.item_group}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                </View>

                {/* Damage Quantity Section */}
                <View style={styles.damageSection}>
                    <View style={styles.damageHeader}>
                      <Text style={styles.subSectionTitle}>Damage Quantity</Text>
                      <View style={styles.damageToggleRow}>
                        <Text style={styles.damageToggleLabel}>Enable</Text>
                        <Switch
                          value={workflowState.damageQtyEnabled}
                          onValueChange={(value) => {
                            resetActivityTimer();
                            updateWorkflowState({ damageQtyEnabled: value });
                            if (!value) {
                              updateItemState({ damageQty: '' });
                            }
                          }}
                          trackColor={{ false: '#555', true: '#EF4444' }}
                          thumbColor={workflowState.damageQtyEnabled ? '#ffebee' : '#f4f3f4'}
                        />
                      </View>
                    </View>
                    {workflowState.damageQtyEnabled && (
                      <View style={styles.damageInputContainer}>
                        <Text style={styles.fieldLabel}>Damaged Quantity</Text>
                        <TextInput
                          style={styles.damageInput}
                          placeholder="Enter damaged quantity"
                          placeholderTextColor="#94A3B8"
                          value={itemState.damageQty}
                          onChangeText={(text) => {
                            resetActivityTimer();
                            updateItemState({ damageQty: text });
                          }}
                          keyboardType="numeric"
                        />
                        <Text style={styles.damageHelperText}>
                          Track items that are damaged or defective
                        </Text>
                      </View>
                    )}
                </View>

                {/* Serial Number Entry - Using SerialNumberEntry Component */}
                <SerialNumberEntry
                    serialInputs={workflowState.serialInputs}
                    requiredSerialCount={workflowState.requiredSerialCount}
                    serialCaptureEnabled={workflowState.serialCaptureEnabled}
                    serialInputTarget={workflowState.serialInputTarget}
                    expectedSerialCount={workflowState.expectedSerialCount}
                    scannerMode={uiState.scannerMode}
                    serialScanTargetId={scannerState.serialScanTargetId}
                    showScanner={uiState.showScanner}
                    continuousScanMode={uiState.continuousScanMode}
                    serialRequirementMessage={serialRequirementMessage || ''}
                    missingSerialCount={missingSerialCount}
                    extraSerialCount={extraSerialCount}
                    onToggleSerialCapture={handleToggleSerialCapture}
                    onSerialValueChange={updateSerialValue}
                    onScanSerialSlot={handleScanSerialSlot}
                    onRemoveSerial={handleRemoveSerial}
                    onScanNextSerial={handleScanNextSerial}
                    onAddSerial={addSerialInput}
                    onActivityReset={resetActivityTimer}
                />

                <View style={styles.conditionSection}>
                    <Text style={styles.subSectionTitle}>Item Condition</Text>
                    <Text style={styles.conditionHelper}>Helps supervisors prioritise follow-up actions.</Text>
                    <View style={styles.conditionChips}>
                      {ITEM_CONDITION_OPTIONS.map((option) => {
                        const isActive = itemState.itemCondition === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[styles.conditionChip, isActive && styles.conditionChipActive]}
                            onPress={() => {
                              updateItemState({
                                itemCondition: option.value,
                                conditionManuallySet: true
                              });
                            }}
                          >
                            <Text style={[styles.conditionChipText, isActive && styles.conditionChipTextActive]}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                </View>

                {/* Photo Capture - Using PhotoCapture Component */}
                <PhotoCapture
                    photos={photoState.photoProofs}
                    selectedPhotoType={photoState.selectedPhotoType}
                    showPhotoCapture={photoState.showPhotoCapture}
                    photoCaptureLoading={photoState.photoCaptureLoading}
                    photoCameraType={photoState.photoCameraType}
                    isWeb={isWeb}
                    serialPhotosRequired={serialPhotosRequired}
                    serialPhotoShortfall={serialPhotoShortfall}
                    photoCameraRef={photoCameraRef}
                    onPhotoTypeChange={(type) => updatePhotoState({ selectedPhotoType: type })}
                    onOpenPhotoCapture={handleOpenPhotoCapture}
                    onClosePhotoCapture={handleClosePhotoCapture}
                    onCapturePhoto={handleCapturePhoto}
                    onFlipCamera={handleFlipPhotoCamera}
                    onRemovePhoto={handleRemovePhoto}
                />

                {itemState.countedQty && (
                    <View style={styles.varianceBox}>
                      <Text style={styles.varianceLabel}>Variance:</Text>
                      <Text style={[styles.varianceValue, (parseFloat(itemState.countedQty) - (itemState.currentItem?.stock_qty || 0)) !== 0 && styles.varianceNonZero]}>
                        {(parseFloat(itemState.countedQty) - (itemState.currentItem?.stock_qty || 0)).toFixed(2)}
                      </Text>
                    </View>
                )}

                <TextInput
                    style={styles.remarkInput}
                    placeholder="Optional remark"
                    placeholderTextColor="#94A3B8"
                    value={itemState.remark}
                    onChangeText={(text) => updateItemState({ remark: text })}
                    multiline
                />

                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveButton, uiState.saving && styles.buttonDisabled]}
                      onPress={handleSaveCount}
                      disabled={uiState.saving}
                    >
                      <Text style={styles.saveButtonText}>{uiState.saving ? 'Saving...' : 'Save Count'}</Text>
                    </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Barcode Scanner - Using BarcodeScanner Component */}
          <BarcodeScanner
            visible={uiState.showScanner}
            scannerMode={uiState.scannerMode}
            continuousScanMode={uiState.continuousScanMode}
            isLoadingItem={isLoadingItem}
            scanFeedback={uiState.scanFeedback || scannerState.scanFeedback}
            serialLabel={activeSerialLabel || undefined}
            expectedSerialCount={workflowState.expectedSerialCount}
            completedSerialCount={completedSerialCount}
            isWeb={isWeb}
            onBarcodeScanned={handleBarCodeScanned}
            onClose={() => {
              updateUiState({ showScanner: false, scannerMode: 'item' });
              updateScannerState({ serialScanTargetId: null });
            }}
            onToggleContinuousMode={() => updateUiState({ continuousScanMode: !uiState.continuousScanMode })}
          />

          {
            !isWeb && (
              <Modal visible={photoState.showPhotoCapture} animationType="slide">
                <View style={styles.photoModalContainer}>
                  <PhotoCamera
                    ref={photoCameraRef}
                    style={styles.photoCamera}
                    facing={photoState.photoCameraType}
                    ratio="16:9"
                  />
                  <View style={styles.photoModalOverlay}>
                    <View style={styles.photoModalTopBar}>
                      <TouchableOpacity style={styles.photoModalButton} onPress={handleClosePhotoCapture}>
                        <Ionicons name="close" size={28} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.photoModalButton} onPress={handleFlipPhotoCamera}>
                        <Ionicons name="camera-reverse-outline" size={24} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.photoShutterBar}>
                      <TouchableOpacity
                        style={styles.photoShutterButton}
                        onPress={handleCapturePhoto}
                        disabled={photoState.photoCaptureLoading}
                      >
                        {photoState.photoCaptureLoading ? (
                          <ActivityIndicator size="small" color="#1E293B" />
                        ) : (
                          <Ionicons name="radio-button-on" size={64} color="#1E293B" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )
          }

          {/* Variance Reason Modal */}
          <Modal visible={uiState.showReasonModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Variance Reason Required</Text>
                <Text style={styles.modalSubtitle}>Please select a reason for the variance</Text>

                {itemState.varianceReasons?.map((reason: any) => (
                  <TouchableOpacity
                    key={reason.code}
                    style={[styles.reasonOption, itemState.selectedReason === reason.code && styles.reasonSelected]}
                    onPress={() => updateItemState({ selectedReason: reason.code })}
                  >
                    <Text style={styles.reasonText}>{reason.label}</Text>
                  </TouchableOpacity>
                ))}

                {itemState.selectedReason === 'other' && (
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Enter reason"
                    placeholderTextColor="#94A3B8"
                    value={itemState.varianceNote}
                    onChangeText={(text) => updateItemState({ varianceNote: text })}
                    multiline
                  />
                )}

                <TouchableOpacity
                  style={[styles.confirmButton, !itemState.selectedReason && styles.buttonDisabled]}
                  onPress={() => {
                    if (itemState.selectedReason) {
                      updateUiState({ showReasonModal: false });
                      handleSaveCount();
                    }
                  }}
                  disabled={!itemState.selectedReason}
                >
                  <Text style={styles.confirmButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Unknown Item Report Modal */}
          <Modal visible={uiState.showUnknownItemModal} transparent animationType="fade">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalOverlay}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => updateUiState({ showUnknownItemModal: false })}
              >
                <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Ionicons name="alert-circle-outline" size={48} color="#FF9800" />
                      <Text style={styles.modalTitle}>Report Unknown Item</Text>
                    </View>

                    <View style={styles.unknownItemInfo}>
                      <Text style={styles.modalLabel}>Barcode:</Text>
                      <Text style={styles.unknownBarcode}>{uiState.unknownItemData.barcode}</Text>
                    </View>

                    <Text style={styles.modalLabel}>Description / Notes:</Text>
                    <TextInput
                      style={[styles.noteInput, styles.unknownItemInput]}
                      placeholder="Enter item description, brand, size, etc."
                      placeholderTextColor="#666"
                      value={uiState.unknownItemData.description}
                      onChangeText={(text) => updateUiState({ unknownItemData: { ...uiState.unknownItemData, description: text } })}
                      multiline
                      numberOfLines={4}
                      autoFocus
                    />

                    <Text style={styles.helpText}>
                      This item will be reported to the supervisor for review and manual entry into the system.
                    </Text>

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => {
                          updateUiState({
                            showUnknownItemModal: false,
                            unknownItemData: { barcode: '', description: '' }
                          });
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.modalSubmitButton]}
                        onPress={submitUnknownItem}
                      >
                        <Text style={styles.modalSubmitButtonText}>Report Item</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Modal>

          {/* Add Quantity Modal */}
          <Modal visible={workflowState.showAddQuantityModal} transparent animationType="slide">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalOverlay}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => updateWorkflowState({ showAddQuantityModal: false })}
              >
                <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Ionicons name="add-circle-outline" size={48} color="#3B82F6" />
                      <Text style={styles.modalTitle}>Add Quantity</Text>
                    </View>

                    {itemState.currentItem && workflowState.existingCountLine && (
                      <View style={styles.addQtyInfo}>
                        <Text style={styles.addQtyItemName}>{itemState.currentItem.name}</Text>
                        <Text style={styles.addQtyItemCode}>{itemState.currentItem.item_code}</Text>

                        <View style={styles.addQtyCurrentContainer}>
                          <Text style={styles.addQtyLabel}>Current Count:</Text>
                          <Text style={styles.addQtyValue}>
                            {workflowState.existingCountLine.counted_qty} {itemState.currentItem.uom_name || ''}
                          </Text>
                        </View>

                        <View style={styles.addQtyInputContainer}>
                          <Text style={styles.addQtyLabel}>Add Quantity:</Text>
                          <TextInput
                            style={styles.addQtyInput}
                            placeholder="Enter quantity to add"
                            placeholderTextColor="#94A3B8"
                            value={workflowState.additionalQty}
                            onChangeText={(text) => updateWorkflowState({ additionalQty: text })}
                            keyboardType="numeric"
                            autoFocus
                          />
                        </View>

                        {workflowState.additionalQty && !isNaN(parseFloat(workflowState.additionalQty)) && (
                          <View style={styles.addQtyNewTotal}>
                            <Text style={styles.addQtyLabel}>New Total:</Text>
                            <Text style={styles.addQtyTotalValue}>
                              {(workflowState.existingCountLine.counted_qty + parseFloat(workflowState.additionalQty)).toFixed(2)} {itemState.currentItem.uom_name || ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <View style={styles.modalButtons}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => {
                          updateWorkflowState({ showAddQuantityModal: false, additionalQty: '' });
                          resetForm();
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.modalButton,
                          styles.modalSubmitButton,
                          (!workflowState.additionalQty || isNaN(parseFloat(workflowState.additionalQty)) || parseFloat(workflowState.additionalQty) <= 0) && styles.buttonDisabled
                        ]}
                        onPress={handleAddQuantity}
                        disabled={!workflowState.additionalQty || isNaN(parseFloat(workflowState.additionalQty)) || parseFloat(workflowState.additionalQty) <= 0 || uiState.saving}
                      >
                        {uiState.saving ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.modalSubmitButtonText}>Add Quantity</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Modal>

          {/* Manufacturing Date Picker Modal */}
          {
            showManufacturingDatePicker && Platform.OS !== 'web' && (
              <Modal visible={showManufacturingDatePicker} transparent animationType="fade">
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowManufacturingDatePicker(false)}
                >
                  <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.datePickerModal}>
                      <Text style={styles.datePickerTitle}>Manufacturing Date</Text>
                      <View style={styles.datePickerContainer}>
                        <TextInput
                          style={styles.dateInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#94A3B8"
                          value={itemState.manufacturingDate}
                          onChangeText={(text) => {
                            resetActivityTimer();
                            updateItemState({ manufacturingDate: text });
                          }}
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={styles.modalButtons}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalCancelButton]}
                          onPress={() => setShowManufacturingDatePicker(false)}
                        >
                          <Text style={styles.modalCancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.modalSubmitButton]}
                          onPress={() => {
                            resetActivityTimer();
                            setShowManufacturingDatePicker(false);
                          }}
                        >
                          <Text style={styles.modalSubmitButtonText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            )}
          </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0F172A',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
      backgroundColor: '#1E1E1E',
      borderBottomWidth: 1,
      borderBottomColor: '#2C2C2C',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#fff',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    toggleButton: {
      padding: 8,
    },
    historyButton: {
      padding: 8,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
    },
    headerSubtitle: {
      fontSize: 12,
      color: '#94A3B8',
      marginTop: 2,
    },
    logoutButton: {
      padding: 8,
    },
    datePickerButton: {
      backgroundColor: '#1E293B',
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: '#334155',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    datePickerButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    clearDateButton: {
      position: 'absolute',
      right: 12,
      top: 38,
    },
    readOnlyInfoSection: {
      backgroundColor: '#1E293B',
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: '#334155',
    },
    autoIncrementBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(76, 175, 80, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(76, 175, 80, 0.35)',
      borderRadius: 8,
      padding: 12,
      margin: 16,
    },
    autoIncrementText: {
      color: '#3B82F6',
      fontSize: 14,
      flex: 1,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    input: {
      backgroundColor: '#1E293B',
      borderRadius: 8,
      padding: 12,
      color: '#fff',
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#334155',
      marginBottom: 16,
    },
    text: {
      color: '#fff',
      fontSize: 16,
    },
    scanButton: {
      backgroundColor: '#3B82F6',
      borderRadius: 24,
      padding: 48,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 10,
    },
    scanButtonDisabled: {
      backgroundColor: '#2C2C2C',
      shadowOpacity: 0,
    },
    scanButtonText: {
      color: '#000',
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    webNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: 'rgba(255, 183, 77, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255, 183, 77, 0.35)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    webNoticeText: {
      color: '#FFB74D',
      fontSize: 13,
      flex: 1,
    },
    orDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 32,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#334155',
    },
    orText: {
      color: '#94A3B8',
      marginHorizontal: 16,
      fontSize: 16,
    },
    searchContainer: {
      marginBottom: 16,
    },
    manualEntryContainer: {
      marginTop: 8,
    },
    manualEntryTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    inputLabel: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    manualInput: {
      backgroundColor: '#1E293B',
      color: '#fff',
      padding: 14,
      borderRadius: 8,
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#334155',
      marginBottom: 8,
    },
    inputDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 12,
    },
    searchButton: {
      backgroundColor: '#3B82F6',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
      marginTop: 4,
    },
    searchButtonDisabled: {
      backgroundColor: '#334155',
      opacity: 0.5,
    },
    searchButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    searchingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    searchingText: {
      color: '#94A3B8',
      fontSize: 14,
      marginLeft: 8,
    },
    searchLabel: {
      fontSize: 16,
      color: '#fff',
      marginBottom: 12,
      fontWeight: 'bold',
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#252525',
      borderRadius: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: '#334155',
      height: 60,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      color: '#fff',
      fontSize: 18,
      fontWeight: '500',
    },
    searchResultsContainer: {
      backgroundColor: '#1E293B',
      borderRadius: 12,
      marginTop: 8,
      maxHeight: 400,
      borderWidth: 1,
      borderColor: '#3B82F6',
      padding: 12,
    },
    searchResultsScrollView: {
      maxHeight: 350,
    },
    searchResultsTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#3B82F6',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#334155',
    },
    searchResultsList: {
      padding: 8,
    },
    searchResultItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 14,
      backgroundColor: '#1E293B',
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#334155',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 3,
    },
    searchResultItemLast: {
      borderBottomWidth: 0,
    },
    searchResultContent: {
      flex: 1,
    },
    searchResultLeft: {
      flex: 1,
    },
    searchResultName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 4,
    },
    searchResultMeta: {
      flexDirection: 'row',
      gap: 8,
    },
    searchResultCode: {
      fontSize: 12,
      color: '#94A3B8',
    },
    searchResultBarcode: {
      fontSize: 12,
      color: '#94A3B8',
      marginTop: 2,
    },
    searchResultStock: {
      fontSize: 13,
      color: '#3B82F6',
      marginTop: 4,
      fontWeight: '600',
    },
    searchResultRight: {
      alignItems: 'flex-end',
      marginLeft: 12,
    },
    searchResultStockLabel: {
      fontSize: 11,
      color: '#94A3B8',
    },
    noResultsContainer: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    noResultsText: {
      fontSize: 16,
      color: '#94A3B8',
      marginTop: 12,
      marginBottom: 4,
    },
    noResultsHint: {
      fontSize: 14,
      color: '#666',
    },
    searchTips: {
      backgroundColor: '#1a2a1a',
      borderRadius: 12,
      padding: 16,
      marginTop: 16,
      borderWidth: 1,
      borderColor: '#2a4a2a',
    },
    searchTipsTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#3B82F6',
      marginBottom: 8,
    },
    searchTip: {
      fontSize: 13,
      color: '#94A3B8',
      marginBottom: 4,
      lineHeight: 18,
    },
    itemCard: {
      backgroundColor: '#1E1E1E',
      borderRadius: 24,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: 'rgba(0, 230, 118, 0.3)',
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    itemName: {
      fontSize: 28,
      fontWeight: '800',
      color: '#fff',
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    itemCode: {
      fontSize: 14,
      color: '#94A3B8',
      marginBottom: 4,
    },
    itemBarcode: {
      fontSize: 14,
      color: '#94A3B8',
      marginBottom: 4,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 4,
    },
    locationText: {
      fontSize: 14,
      color: '#3B82F6',
      marginLeft: 6,
      fontWeight: '600',
    },
    itemCategory: {
      fontSize: 13,
      color: '#94A3B8',
      marginTop: 4,
      marginBottom: 12,
    },
    uomText: {
      fontSize: 12,
      color: '#94A3B8',
      marginTop: 4,
    },
    verificationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1a3a1a',
      padding: 8,
      borderRadius: 8,
      marginTop: 8,
      marginBottom: 12,
    },
    verificationText: {
      fontSize: 12,
      color: '#3B82F6',
      marginLeft: 6,
      fontWeight: '600',
    },
    verificationTime: {
      fontSize: 11,
      color: '#94A3B8',
      fontWeight: '400',
    },
    qtyRow: {
      flexDirection: 'row',
      gap: 16,
    },
    qtyBox: {
      flex: 1,
      backgroundColor: '#1E293B',
      borderRadius: 12,
      padding: 12,
    },
    qtyLabel: {
      fontSize: 12,
      color: '#94A3B8',
      marginBottom: 4,
    },
    qtyValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#3B82F6',
    },
    qtyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    refreshButton: {
      padding: 4,
      borderRadius: 4,
      backgroundColor: '#1E293B',
    },
    refreshButtonDisabled: {
      opacity: 0.5,
    },
    countingSection: {
      marginTop: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 16,
    },
    countInput: {
      backgroundColor: '#252525',
      borderRadius: 16,
      padding: 20,
      color: '#fff',
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#334155',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 2,
    },
    fieldLabel: {
      color: '#bbb',
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
      marginTop: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    mrpInput: {
      fontSize: 22,
      fontWeight: '700',
    },
    mrpChangeBox: {
      backgroundColor: '#1E293B',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#334155',
    },
    mrpChangeLabel: {
      color: '#94A3B8',
      fontSize: 14,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    mrpChangeValue: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    mrpChangeNotice: {
      color: '#ffb74d',
      fontSize: 12,
      textAlign: 'center',
      marginTop: 8,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    mrpVariantsContainer: {
      backgroundColor: '#1f1f1f',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: '#334155',
      marginBottom: 16,
    },
    mrpVariantsLabel: {
      color: '#94A3B8',
      fontSize: 13,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    mrpVariantsChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mrpVariantChip: {
      borderWidth: 1,
      borderColor: '#3B82F6',
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    mrpVariantChipActive: {
      backgroundColor: '#3B82F6',
    },
    mrpVariantChipText: {
      color: '#3B82F6',
      fontSize: 13,
      fontWeight: '600',
    },
    mrpVariantChipTextActive: {
      color: '#1E293B',
    },
    mrpVariantChipMeta: {
      color: '#9ccc9c',
      fontSize: 11,
      marginTop: 4,
      letterSpacing: 0.2,
    },
    mrpVariantChipMetaActive: {
      color: '#0d4d1a',
    },
    mrpIncrease: {
      color: '#3B82F6',
    },
    mrpDecrease: {
      color: '#EF4444',
    },
    mrpNeutral: {
      color: '#fff',
    },

    subSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
    serialSection: {
      marginTop: 8,
      marginBottom: 16,
      backgroundColor: '#1f1f1f',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#334155',
      gap: 12,
    },
    serialHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    serialToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    serialToggleLabel: {
      color: '#bbb',
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    serialRequirementText: {
      color: '#94A3B8',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    serialHelperText: {
      color: '#ffb74d',
      fontSize: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    serialErrorText: {
      color: '#ff5252',
      fontSize: 12,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    serialInputsContainer: {
      gap: 12,
    },
    serialInputRow: {
      flexDirection: 'column',
      gap: 10,
      backgroundColor: '#1E293B',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: '#334155',
    },
    serialInputRowActive: {
      borderColor: '#3B82F6',
      backgroundColor: '#233323',
    },
    serialInputHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    serialInputActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    serialActionButton: {
      padding: 8,
      borderRadius: 18,
      backgroundColor: 'rgba(76, 175, 80, 0.12)',
    },
    serialInputLabel: {
      color: '#bbb',
      fontSize: 13,
      fontWeight: '600',
      minWidth: 90,
    },
    serialTextInput: {
      flex: 1,
      backgroundColor: '#1E293B',
      color: '#fff',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#334155',
      fontSize: 14,
    },
    removeSerialButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 82, 82, 0.1)',
    },
    serialControlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    scanSerialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(76, 175, 80, 0.15)',
      borderWidth: 1,
      borderColor: '#3B82F6',
    },
    scanSerialButtonText: {
      color: '#3B82F6',
      fontSize: 14,
      fontWeight: '600',
    },
    addSerialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      borderWidth: 1,
      borderColor: '#3B82F6',
    },
    addSerialButtonText: {
      color: '#3B82F6',
      fontSize: 14,
      fontWeight: '600',
    },
    serialOverlayBadge: {
      marginLeft: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: 'rgba(76, 175, 80, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(76, 175, 80, 0.35)',
    },
    serialOverlayText: {
      color: '#3B82F6',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    photoSection: {
      marginBottom: 16,
      backgroundColor: '#1f1f1f',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#334155',
      gap: 12,
    },
    photoSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    photoCountLabel: {
      color: '#94A3B8',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    photoHelper: {
      color: '#777',
      fontSize: 13,
      marginBottom: 4,
    },
    photoWebNotice: {
      color: '#FFB74D',
      fontSize: 12,
      marginBottom: 8,
    },
    photoSerialWarning: {
      color: '#ff5252',
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    photoTypePills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    photoTypePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(76, 175, 80, 0.08)',
    },
    photoTypePillActive: {
      backgroundColor: '#3B82F6',
    },
    photoTypeIcon: {
      marginTop: 1,
    },
    photoTypeText: {
      color: '#3B82F6',
      fontSize: 13,
      fontWeight: '600',
    },
    photoTypeTextActive: {
      color: '#1E293B',
    },
    photoControls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    photoCaptureButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#3B82F6',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
    },
    photoCaptureButtonDisabled: {
      backgroundColor: '#3a3a3a',
      opacity: 0.6,
    },
    photoCaptureButtonText: {
      color: '#1E293B',
      fontSize: 14,
      fontWeight: '600',
    },
    photoPreviewList: {
      marginTop: 8,
    },
    photoPreviewItem: {
      width: 120,
      height: 120,
      borderRadius: 12,
      overflow: 'hidden',
      marginRight: 12,
      borderWidth: 1,
      borderColor: '#334155',
    },
    photoPreviewImage: {
      width: '100%',
      height: '100%',
    },
    photoPreviewMeta: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    photoPreviewLabel: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    photoRemoveButton: {
      padding: 4,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 82, 82, 0.85)',
    },
    photoEmptyText: {
      color: '#666',
      fontSize: 13,
    },
    photoModalContainer: {
      flex: 1,
      backgroundColor: '#000',
    },
    photoCamera: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    photoModalOverlay: {
      flex: 1,
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 16,
    },
    photoModalTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    photoModalButton: {
      backgroundColor: 'rgba(26, 26, 26, 0.85)',
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    photoModalButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '600',
    },
    photoShutterBar: {
      alignItems: 'center',
    },
    photoShutterButton: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: 4,
      borderColor: '#fff',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoShutterInner: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#fff',
    },
    conditionSection: {
      marginBottom: 16,
      backgroundColor: '#1f1f1f',
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: '#334155',
      gap: 12,
    },
    conditionHelper: {
      color: '#94A3B8',
      fontSize: 13,
    },
    conditionChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    conditionChip: {
      borderWidth: 1,
      borderColor: '#555',
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 14,
      backgroundColor: '#1E293B',
    },
    conditionChipActive: {
      borderColor: '#3B82F6',
      backgroundColor: '#3B82F6',
    },
    conditionChipText: {
      color: '#bbb',
      fontSize: 13,
      fontWeight: '600',
    },
    conditionChipTextActive: {
      color: '#1E293B',
    },

    varianceBox: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#1E293B',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      gap: 8,
    },
    varianceLabel: {
      fontSize: 16,
      color: '#94A3B8',
    },
    varianceValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#3B82F6',
    },
    varianceNonZero: {
      color: '#EF4444',
    },
    remarkInput: {
      backgroundColor: '#1E293B',
      borderRadius: 12,
      padding: 16,
      color: '#fff',
      fontSize: 16,
      minHeight: 80,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#334155',
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: '#2C2C2C',
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#334155',
    },
    cancelButtonText: {
      color: '#EF4444',
      fontSize: 16,
      fontWeight: 'bold',
    },
    saveButton: {
      flex: 2,
      backgroundColor: '#3B82F6',
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    saveButtonText: {
      color: '#000',
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    scannerContainer: {
      flex: 1,
      backgroundColor: '#000',
    },
    scannerOverlay: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scannerTopBar: {
      paddingTop: 60,
      paddingHorizontal: 24,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    closeScannerButton: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 24,
      padding: 12,
    },
    continuousModeButton: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    continuousModeButtonActive: {
      backgroundColor: 'rgba(76, 175, 80, 0.15)',
      borderColor: 'rgba(76, 175, 80, 0.45)',
    },
    continuousModeText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    continuousModeActive: {
      color: '#3B82F6',
    },
    scanFeedbackBanner: {
      position: 'absolute',
      top: 120,
      left: 24,
      right: 24,
      backgroundColor: 'rgba(76, 175, 80, 0.9)',
      padding: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      zIndex: 10,
    },
    scanFeedbackLoading: {
      backgroundColor: 'rgba(33, 150, 243, 0.9)',
    },
    scanFeedbackText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
      flex: 1,
    },
    serialOverlayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    scannerFrame: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scannerCorner: {
      position: 'absolute',
      width: 50,
      height: 50,
      borderColor: '#3B82F6',
    },
    cornerTopLeft: {
      top: '30%',
      left: '15%',
      borderTopWidth: 4,
      borderLeftWidth: 4,
    },
    cornerTopRight: {
      top: '30%',
      right: '15%',
      borderTopWidth: 4,
      borderRightWidth: 4,
    },
    cornerBottomLeft: {
      bottom: '30%',
      left: '15%',
      borderBottomWidth: 4,
      borderLeftWidth: 4,
    },
    cornerBottomRight: {
      bottom: '30%',
      right: '15%',
      borderBottomWidth: 4,
      borderRightWidth: 4,
    },
    scannerText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: 16,
      borderRadius: 8,
    },
    scannerInstructionContainer: {
      position: 'absolute',
      bottom: 100,
      left: 24,
      right: 24,
    },
    scannerSubtext: {
      color: '#94A3B8',
      fontSize: 14,
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: 8,
      borderRadius: 8,
      marginTop: 8,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    permissionText: {
      color: '#fff',
      fontSize: 16,
      textAlign: 'center',
      marginTop: 24,
      marginBottom: 24,
    },
    permissionButton: {
      backgroundColor: '#3B82F6',
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    permissionButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    reasonOption: {
      backgroundColor: '#1E293B',
      borderRadius: 12,
      padding: 16,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: '#334155',
    },
    reasonSelected: {
      borderColor: '#3B82F6',
      backgroundColor: '#1a3a1a',
    },
    reasonText: {
      color: '#fff',
      fontSize: 16,
    },
    noteInput: {
      backgroundColor: '#1E293B',
      borderRadius: 12,
      padding: 16,
      color: '#fff',
      fontSize: 16,
      minHeight: 80,
      marginTop: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#334155',
    },
    confirmButton: {
      backgroundColor: '#3B82F6',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 16,
    },
    confirmButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    modalHeader: {
      alignItems: 'center',
      marginBottom: 20,
    },
    unknownItemInfo: {
      backgroundColor: '#1E293B',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#94A3B8',
      marginBottom: 8,
    },
    unknownBarcode: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#3B82F6',
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: '#1E293B',
      borderRadius: 16,
      padding: 24,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 14,
      color: '#94A3B8',
      marginBottom: 24,
    },
    voiceButton: {
      backgroundColor: '#3B82F6',
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      marginLeft: 8,
    },
    itemInfoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    itemInfoItem: {
      backgroundColor: '#1E293B',
      borderRadius: 8,
      padding: 12,
      flex: 1,
      minWidth: '45%',
    },
    itemInfoText: {
      color: '#fff',
      fontSize: 14,
    },
    quickCountContainer: {
      marginBottom: 16,
    },
    quickCountLabel: {
      color: '#94A3B8',
      fontSize: 14,
      marginBottom: 8,
    },
    quickCountButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    quickCountButton: {
      backgroundColor: '#252525',
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      minWidth: 64,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#334155',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    quickCountButtonText: {
      color: '#3B82F6',
      fontSize: 16,
      fontWeight: '600',
    },
    locationSection: {
      marginBottom: 16,
    },
    locationGrid: {
      gap: 12,
    },
    locationInputGroup: {
      gap: 8,
    },
    locationInput: {
      backgroundColor: '#1E293B',
      borderRadius: 8,
      padding: 12,
      color: '#fff',
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#334155',
    },
    optionalFieldsSection: {
      backgroundColor: '#1E293B',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#334155',
    },
    optionalFieldsToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    optionalFieldsToggleText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#3B82F6',
    },
    optionalFieldsContent: {
      marginTop: 16,
      gap: 16,
    },
    optionalFieldRow: {
      gap: 12,
    },
    optionalFieldGroup: {
      gap: 8,
    },
    optionalInput: {
      backgroundColor: '#1E293B',
      borderRadius: 8,
      padding: 12,
      color: '#fff',
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#334155',
    },
    readOnlyInfoTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 12,
    },
    readOnlyInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    readOnlyInfoLabel: {
      color: '#94A3B8',
      fontSize: 14,
    },
    readOnlyInfoValue: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
    unknownItemInput: {
      height: 100,
      textAlignVertical: 'top',
      paddingTop: 12,
    },
    helpText: {
      fontSize: 13,
      color: '#94A3B8',
      fontStyle: 'italic',
      marginTop: 8,
      marginBottom: 16,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    modalButton: {
      flex: 1,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    modalSubmitButton: {
      backgroundColor: '#3B82F6',
    },
    modalSubmitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    modalCancelButton: {
      backgroundColor: '#3a3a3a',
    },
    modalCancelButtonText: {
      color: '#fff',
      fontSize: 16,
    },
    addQtyInfo: {
      backgroundColor: '#1E293B',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    addQtyItemName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 4,
    },
    addQtyItemCode: {
      fontSize: 14,
      color: '#94A3B8',
      marginBottom: 12,
    },
    addQtyCurrentContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    addQtyLabel: {
      fontSize: 14,
      color: '#94A3B8',
    },
    addQtyValue: {
      fontSize: 16,
      color: '#fff',
      fontWeight: 'bold',
    },
    addQtyInputContainer: {
      marginVertical: 12,
    },
    addQtyInput: {
      backgroundColor: '#1E293B',
      borderRadius: 8,
      padding: 12,
      color: '#fff',
      fontSize: 18,
      textAlign: 'center',
      borderWidth: 2,
      borderColor: '#3B82F6',
      marginTop: 8,
    },
    addQtyNewTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: '#1a3a1a',
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
    },
    addQtyTotalValue: {
      fontSize: 18,
      color: '#3B82F6',
      fontWeight: 'bold',
    },
    datePickerModal: {
      backgroundColor: '#1E293B',
      borderRadius: 16,
      padding: 24,
      marginHorizontal: 24,
    },
    datePickerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 16,
      textAlign: 'center',
    },
    datePickerContainer: {
      backgroundColor: '#1E293B',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    dateInput: {
      backgroundColor: '#1E293B',
      borderRadius: 8,
      padding: 12,
      color: '#fff',
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#334155',
    },
    damageSection: {
      marginTop: 16,
      padding: 16,
      backgroundColor: '#1E293B',
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#EF4444',
    },
    damageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    damageToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    damageToggleLabel: {
      fontSize: 14,
      color: '#94A3B8',
    },
    damageInputContainer: {
      marginTop: 12,
    },
    damageInput: {
      backgroundColor: '#1E293B',
      borderRadius: 8,
      padding: 12,
      color: '#fff',
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#EF4444',
      marginTop: 8,
    },
    damageHelperText: {
      fontSize: 12,
      color: '#94A3B8',
      marginTop: 6,
      fontStyle: 'italic',
    },
  });

}
