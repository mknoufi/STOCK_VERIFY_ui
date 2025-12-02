
// cspell:words pricetag barcodes prioritise
import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, Modal, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView as ExpoCameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { createCountLine, refreshItemStock, searchItems, addQuantityToCountLine, getSession, getItemByBarcode, bulkCloseSessions } from '@/services/api';
import { StatusBar } from 'expo-status-bar';
import { handleErrorWithRecovery } from '@/services/errorRecovery';
import { StaffLayout } from "@/components/layout/StaffLayout";
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AnalyticsService } from '@/services/enhancedFeatures';
import { SearchResult } from '@/services/enhancedSearchService';

import { ItemVerificationAPI } from '@/services/itemVerificationApi';
import { useAuthStore } from '@/store/authStore';
import { PremiumTheme } from '../../theme/designSystem';


import {
  ItemSearch,
  ItemDisplay,
  QuantityInputForm,
  BarcodeScanner,
  SerialNumberEntry,
  PhotoCapture,
  CameraView,
} from '@/components/scan';
import { useScanState } from '@/hooks/scan/useScanState';
import { usePhotoState } from '@/hooks/scan/usePhotoState';
import { useItemState } from '@/hooks/scan/useItemState';
import { useWorkflowState } from '@/hooks/scan/useWorkflowState';
import { useForm, Controller } from 'react-hook-form';
import { styles } from '@/styles/scanStyles';
import {
  Item,
  ScannerMode,
  PhotoProofType,
  ScanFormData,
  CreateCountLinePayload,
  ApiErrorResponse
} from '@/types/scan';
import {
  normalizeSerialValue,
  getDefaultMrpForItem,
} from '@/utils/scanUtils';

const MRP_MATCH_TOLERANCE = 0.01;

export default function ScanScreen() {
  const { sessionId: rawSessionId } = useLocalSearchParams();
  const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;
  const router = useRouter();
  const { logout } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const isWeb = Platform.OS === 'web';

  // Power-saving hook with scan-optimized configuration (stub implementation)
  const resetActivityTimer = React.useCallback(() => {
    // Stub: Activity timer reset (power saving feature)
  }, []);


  // Use extracted hooks for state management
  const { scannerState, updateScannerState } = useScanState();
  const { photoState, updatePhotoState } = usePhotoState();

  const photoCameraRef = React.useRef<ExpoCameraView | null>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeb, scannerState.showScanner, photoState.showPhotoCapture]);
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



  // Consolidated search state
  const [searchState, setSearchState] = React.useState({
    allItems: [] as Item[],
    searchResults: [] as Item[],
    showSearchResults: false,
    isSearching: false,
    isListening: false,
    voiceSearchText: '',
  });

  // Use extracted hooks for state management
  const { itemState, updateItemState } = useItemState();

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
    showSearchResults: false,
    isSearching: false,
    selectedPhotoType: 'ITEM' as PhotoProofType,
  });

  // Confirmation Modal State
  const [confirmationModalVisible, setConfirmationModalVisible] = React.useState(false);
  const [pendingSaveData, setPendingSaveData] = React.useState<CreateCountLinePayload | null>(null);

  // Use extracted hook for workflow state
  const { workflowState, updateWorkflowState, addSerialInput } = useWorkflowState();

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

  const [showManufacturingDatePicker, setShowManufacturingDatePicker] = React.useState(false);

  React.useEffect(() => {
    if (sessionId) {
      getSession(sessionId).then((session) => {
        if (session && session.warehouse) {
          const parts = session.warehouse.split(' - ');
          if (parts.length >= 2) {
            updateItemState({
              floorNo: parts[0],
              rackNo: parts[1]
            });
          } else {
            updateItemState({ floorNo: session.warehouse });
          }
          updateUiState({ sessionActive: true });
        }
      }).catch(err => console.error("Failed to load session", err));
    }
  }, [sessionId]);

  const prepareItemForCounting = React.useCallback((item: Item) => {
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

    updateItemState({
      markLocation: '',
      srNo: '',
      manufacturingDate: ''
    });
    updateUiState({ showOptionalFields: false });
  }, []);

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
      itemState.currentItem?.mrp === undefined ||
      itemState.currentItem?.mrp === null ||
      Number(itemState.currentItem.mrp) === 0
    ) {
      return null;
    }
    return (mrpDifference / Number(itemState.currentItem.mrp)) * 100;
  }, [mrpDifference, itemState.currentItem]);

  const hasMrpChanged = React.useMemo(() => {
    return mrpDifference !== null && Math.abs(mrpDifference) > 0;
  }, [mrpDifference]);

  const lookupItem = async (barcode: string) => {
    if (!barcode) return;

    // Check rate limit
    if (registerScanAndCheckRateLimit(barcode, Date.now())) {
      Alert.alert('Slow Down', 'You are scanning too fast. Please wait a moment.');
      return;
    }

    updateUiState({ isSearching: true, scanFeedback: 'Searching...' });

    try {
      const item = await getItemByBarcode(barcode);
      if (item) {
        updateScannerState({ scanFeedback: 'Item Found!' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        prepareItemForCounting(item);
      } else {
        updateScannerState({ scanFeedback: 'Item not found' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        updateUiState({
          showUnknownItemModal: true,
          unknownItemData: { barcode, description: '' }
        });
      }
    } catch {
      updateScannerState({ scanFeedback: 'Error looking up item' });
      Alert.alert('Error', 'Failed to lookup item');
    } finally {
      updateUiState({ isSearching: false });
    }
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (uiState.isSearching || uiState.saving) return;

    // Handle serial number scanning
    if (scannerState.serialScanTargetId) {
      handleScanSerialSlot(scannerState.serialScanTargetId, data);
      return;
    }

    // Handle normal item scanning
    if (uiState.continuousScanMode) {
      // In continuous mode, just add to list or process
      // For now, standard lookup
      lookupItem(data);
    } else {
      updateUiState({ showScanner: false });
      lookupItem(data);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    updateUiState({ isSearching: true });
    try {
      const results = await searchItems(query);
      updateUiState({
        searchResults: results,
        showSearchResults: true
      });
    } catch {
      Alert.alert('Error', 'Search failed');
    } finally {
      updateUiState({ isSearching: false });
    }
  };

  const selectItemFromSearch = (item: SearchResult) => {
    // Convert SearchResult to Item
    const fullItem: Item = {
      id: item.item_code,
      name: item.item_name,
      item_code: item.item_code,
      barcode: item.barcode,
      mrp: item.mrp,
      stock_qty: item.stock_qty,
      category: item.category,
      subcategory: item.subcategory,
      uom_name: item.uom_name || 'PCS',
      item_group: (item as any).item_group || 'General',
      location: item.warehouse
    };
    prepareItemForCounting(fullItem);
    updateUiState({
      showSearchResults: false,
      manualItemName: '',
      manualBarcode: ''
    });
  };

  const handleStartScanning = (mode: ScannerMode) => {
    updateUiState({
      showScanner: true,
      scannerMode: mode
    });
  };

  const handleScanSerialSlot = (id: string, value?: string) => {
    if (value !== undefined) {
      // Update value
      updateWorkflowState({
        serialInputs: workflowState.serialInputs.map(input =>
          input.id === id ? { ...input, value, isValid: true } : input
        )
      });
      updateScannerState({ serialScanTargetId: null });
      if (!uiState.continuousScanMode) {
        updateUiState({ showScanner: false });
      }
    } else {
      // Start scanning for this slot
      updateScannerState({ serialScanTargetId: id });
      updateUiState({
        showScanner: true,
        scannerMode: 'serial',
        scanFeedback: ''
      });
    }
  };

  const handleToggleSerialCapture = (enabled: boolean) => {
    updateWorkflowState({ serialCaptureEnabled: enabled });
    if (enabled && workflowState.serialInputs.length === 0) {
      // Add initial empty slot
      addSerialInput({
        id: Date.now().toString(),
        label: 'Serial 1',
        value: '',
        timestamp: Date.now(),
        isValid: true
      });
    }
  };

  const updateSerialValue = (id: string, value: string) => {
    updateWorkflowState({
      serialInputs: workflowState.serialInputs.map(input =>
        input.id === id ? { ...input, value } : input
      )
    });
  };

  const handleRemoveSerial = (id: string, _value?: string) => {
    updateWorkflowState({
      serialInputs: workflowState.serialInputs.filter(input => input.id !== id)
    });
  };

  const handleScanNextSerial = () => {
    // Find first empty slot or add new one
    const emptySlot = workflowState.serialInputs.find(s => !s.value);
    if (emptySlot) {
      updateScannerState({ serialScanTargetId: emptySlot.id });
      updateUiState({
        showScanner: true,
        scannerMode: 'serial'
      });
    } else {
      // Add new slot and scan
      const newId = Date.now().toString();
      addSerialInput({
        id: newId,
        label: `Serial ${workflowState.serialInputs.length + 1}`,
        value: '',
        timestamp: Date.now(),
        isValid: true
      });
      updateScannerState({ serialScanTargetId: newId });
      updateUiState({
        showScanner: true,
        scannerMode: 'serial'
      });
    }
  };

  const handleOpenPhotoCapture = (type: PhotoProofType) => {
    updatePhotoState({
      selectedPhotoType: type,
      showPhotoCapture: true
    });
  };

  const handleClosePhotoCapture = () => {
    updatePhotoState({ showPhotoCapture: false });
  };

  const handleCapturePhoto = async () => {
    if (!photoCameraRef.current && !isWeb) return;

    updatePhotoState({ photoCaptureLoading: true });
    try {
      let base64 = '';
      if (isWeb) {
        // Web fallback or mock
        base64 = 'mock_base64_image_data';
      } else if (photoCameraRef.current) {
        const photo = await photoCameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
          skipProcessing: true
        });
        base64 = photo?.base64 || '';
      }

      if (base64) {
        updatePhotoState({
          photoProofs: [
            ...photoState.photoProofs,
            {
              id: Date.now().toString(),
              type: photoState.selectedPhotoType,
              uri: `data:image/jpeg;base64,${base64}`,
              base64: base64,
              capturedAt: new Date().toISOString(),
              timestamp: new Date().toISOString()
            }
          ]
        });
        handleClosePhotoCapture();
      }
    } catch {
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      updatePhotoState({ photoCaptureLoading: false });
    }
  };

  const handleFlipPhotoCamera = () => {
    updatePhotoState({
      photoCameraType: photoState.photoCameraType === 'back' ? 'front' : 'back'
    });
  };

  const handleRemovePhoto = (id: string) => {
    updatePhotoState({
      photoProofs: photoState.photoProofs.filter(p => p.id !== id)
    });
  };

  const submitUnknownItem = async () => {
    // Stub implementation
    Alert.alert('Report Submitted', 'Thank you for reporting this item.');
    updateUiState({ showUnknownItemModal: false });
  };

  const handleSaveCount = handleSubmit(async (data) => {
    if (!sessionId) {
      Alert.alert('Error', 'Session ID is missing');
      return;
    }
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
      value: normalizeSerialValue(entry.value || ''),
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

    const payload: CreateCountLinePayload = {
      session_id: sessionId,
      item_code: itemState.currentItem.item_code || '',
      counted_qty: physicalQty,
      damaged_qty: returnableQty,
      non_returnable_damaged_qty: nonReturnableQty,
      variance_reason: itemState.selectedReason || null,
      variance_note: itemState.varianceNote || null,
      remark: data.remark || null,
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

    // Set pending data and show confirmation modal
    setPendingSaveData(payload);
    setConfirmationModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });

  const handleConfirmSave = async (action: 'next' | 'finish') => {
    if (!pendingSaveData) return;

    try {
      updateUiState({ saving: true });
      const countLine = await handleErrorWithRecovery(
        () => createCountLine(pendingSaveData),
        {
          context: 'Save Count',
          recovery: { maxRetries: 3 },
          showAlert: true,
        }
      );

      // Mark item as verified
      try {
        if (!itemState.currentItem?.item_code) {
          throw new Error('Item code is missing');
        }
        await ItemVerificationAPI.verifyItem(itemState.currentItem.item_code, {
          verified: true,
          verified_qty: pendingSaveData.counted_qty,
          damaged_qty: pendingSaveData.damaged_qty,
          non_returnable_damaged_qty: pendingSaveData.non_returnable_damaged_qty,
          item_condition: pendingSaveData.item_condition,
          notes: pendingSaveData.variance_note || pendingSaveData.remark || undefined,
          floor: pendingSaveData.floor_no || undefined,
          rack: pendingSaveData.rack_no || undefined,
          session_id: sessionId,
          count_line_id: countLine?.id
        });
      } catch {
        // Verification tracking failed (non-critical)
      }

      // Track analytics
      if (itemState.currentItem?.item_code) {
        AnalyticsService.trackCount(itemState.currentItem.item_code, pendingSaveData.counted_qty).catch(() => { });
      }

      setConfirmationModalVisible(false);
      setPendingSaveData(null);

      if (action === 'finish') {
        // Close Session Logic
        Alert.alert(
          'Close Area',
          'Are you sure you want to close this area/rack?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Close',
              style: 'destructive',
              onPress: async () => {
                try {
                  if (sessionId) {
                    await bulkCloseSessions([sessionId as string]);
                    Alert.alert('Success', 'Area closed successfully');
                    router.replace('/staff/home');
                  } else {
                    Alert.alert('Error', 'Session ID is missing');
                  }
                } catch {
                  Alert.alert('Error', 'Failed to close session');
                }
              }
            }
          ]
        );
      } else {
        // Next Item Logic
        Alert.alert('Success', 'Count saved successfully!');
        resetForm();
      }

    } catch {
      // Error handled by handleErrorWithRecovery
    } finally {
      updateUiState({ saving: false });
    }
  };

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

      if (workflowState.existingCountLine?.id) {
        await addQuantityToCountLine(workflowState.existingCountLine.id, addQty);
      }

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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add quantity';
      Alert.alert('Error', errorMessage);
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
      selectedPhotoType: 'ITEM',
    });

    // Reset photo state
    updatePhotoState({ showPhotoCapture: false });

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
            } catch {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleMrpVariantSelect = (variant: any) => {
    if (variant && variant.mrp) {
      updateItemState({ countedMrp: variant.mrp.toString() });
    }
  };

  const handleRefreshStock = async () => {
    if (!itemState.currentItem) return;

    updateUiState({ refreshingStock: true });
    try {
      if (!itemState.currentItem.item_code) {
        Alert.alert('Error', 'Item code is missing');
        return;
      }
      const result = await refreshItemStock(itemState.currentItem.item_code);
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
    } catch (error: unknown) {
      // Error logged via error handler
      const apiError = error as ApiErrorResponse;
      const detail = apiError?.response?.data?.detail;
      const errorMsg = (typeof detail === 'object' ? detail?.message : detail)
        || apiError?.message
        || 'Failed to refresh stock';
      Alert.alert('Error', errorMsg);
    } finally {
      updateUiState({ refreshingStock: false });
    }
  };

  if (!isWeb && !permission) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#00E676" size="large" />
        <Text style={[styles.text, { marginTop: 16, color: '#fff' }]}>Requesting camera permission...</Text>
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

  const headerActions: any[] = [
    {
      icon: workflowState.autoIncrementEnabled ? "add-circle" : "add-circle-outline",
      label: "Auto Increment",
      onPress: () => updateWorkflowState({ autoIncrementEnabled: !workflowState.autoIncrementEnabled }),
      color: workflowState.autoIncrementEnabled ? "#3B82F6" : "#94A3B8"
    },
    {
      icon: "list",
      label: "History",
      onPress: () => router.push(`/staff/history?sessionId=${sessionId}`)
    },
    {
      icon: "log-out-outline",
      label: "Logout",
      onPress: handleLogout
    }
  ];

  // Helper to get active serial entries
  const activeSerialLabel = scannerState.serialScanTargetId
    ? workflowState.serialInputs.find(s => s.id === scannerState.serialScanTargetId)?.label
    : undefined;

  const activeSerialEntries = workflowState.serialInputs.filter(s => s.value.trim().length > 0);
  const serialPhotoShortfall = workflowState.serialCaptureEnabled
    ? Math.max(0, activeSerialEntries.length - photoState.photoProofs.filter(p => p.type === 'SERIAL').length)
    : 0;

  return (
    <StaffLayout
      title="Scan Items"
      headerActions={headerActions}
      backgroundColor={PremiumTheme.colors.background}
      showUser={true}
    >
      <StatusBar style="light" />

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
          <View>
            {/* Web Notice */}
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
              searchResults={uiState.searchResults}
              isSearching={uiState.isSearching}
              isListening={searchState.isListening}
              showSearchResults={uiState.showSearchResults}
              onBarcodeChange={(barcode) => updateScannerState({ manualBarcode: barcode })}
              onItemNameChange={(name) => updateScannerState({ manualItemName: name })}
              onSearch={handleSearch}
              onBarcodeSubmit={() => {
                if (scannerState.manualBarcode) {
                  lookupItem(scannerState.manualBarcode);
                }
              }}
              onItemNameSubmit={() => {
                if (scannerState.manualItemName) {
                  handleSearch(scannerState.manualItemName);
                }
              }}
              onVoiceSearch={handleVoiceSearch}
              onScan={() => handleStartScanning('item')}
              onSearchResultSelect={selectItemFromSearch}
              onClearSearch={() => {
                updateUiState({
                  manualBarcode: '',
                  manualItemName: '',
                  searchResults: [],
                  showSearchResults: false
                });
              }}
            />
          </View>
        ) : (
          <View>
            <ItemDisplay
              item={itemState.currentItem}
              onRefreshStock={handleRefreshStock}
              refreshingStock={uiState.refreshingStock}
            />

            <QuantityInputForm
              control={control}
              errors={errors}
              setValue={setValue}
              mrpVariants={itemState.mrpVariantOptions || []}
              parsedMrpValue={uiState.parsedMrpValue}
              systemMrp={itemState.currentItem?.mrp ? Number(itemState.currentItem.mrp) : null}
              mrpDifference={mrpDifference}
              mrpChangePercent={mrpChangePercent}
              onActivityReset={resetActivityTimer}
              onItemConditionChange={(condition) => updateItemState({ itemCondition: condition })}
              onVariantSelect={handleMrpVariantSelect}
              currentItemCondition={itemState.itemCondition}
              workflowState={workflowState}
              updateWorkflowState={updateWorkflowState}

              markLocation={itemState.markLocation}
              onMarkLocationChange={(text) => updateItemState({ markLocation: text })}
              manufacturingDate={itemState.manufacturingDate}
              onManufacturingDateChange={(date) => updateItemState({ manufacturingDate: date })}
              remark={itemState.remark}
              onRemarkChange={(text) => updateItemState({ remark: text })}
              serialCaptureEnabled={workflowState.serialCaptureEnabled}
              onToggleSerialCapture={handleToggleSerialCapture}
            />



            <View style={styles.damageSection}>
              <Text style={styles.sectionTitle}>Damage / Returns</Text>
              <View style={styles.damageRow}>
                <View style={styles.damageItem}>
                  <Text style={styles.damageLabel}>Returnable</Text>
                  <Controller
                    control={control}
                    name="returnableDamageQty"
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        style={styles.damageInput}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#64748B"
                      />
                    )}
                  />
                </View>
                <View style={styles.damageItem}>
                  <Text style={styles.damageLabel}>Non-Returnable</Text>
                  <Controller
                    control={control}
                    name="nonReturnableDamageQty"
                    render={({ field: { onChange, value } }) => (
                      <TextInput
                        style={styles.damageInput}
                        value={value}
                        onChangeText={onChange}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#64748B"
                      />
                    )}
                  />
                </View>
              </View>
            </View>

            <SerialNumberEntry
              serialInputs={workflowState.serialInputs}
              requiredSerialCount={workflowState.requiredSerialCount}
              serialCaptureEnabled={workflowState.serialCaptureEnabled}
              serialInputTarget={workflowState.serialInputTarget}
              expectedSerialCount={workflowState.expectedSerialCount}
              scannerMode={scannerState.scannerMode}
              serialScanTargetId={scannerState.serialScanTargetId}
              showScanner={uiState.showScanner}
              continuousScanMode={uiState.continuousScanMode}
              serialRequirementMessage={workflowState.requiredSerialCount > 0 ? `Required: ${workflowState.requiredSerialCount}` : 'Optional'}
              missingSerialCount={Math.max(0, workflowState.requiredSerialCount - workflowState.serialInputs.length)}
              extraSerialCount={Math.max(0, workflowState.serialInputs.length - workflowState.requiredSerialCount)}
              onToggleSerialCapture={handleToggleSerialCapture}
              onSerialValueChange={updateSerialValue}
              onScanSerialSlot={handleScanSerialSlot}
              onRemoveSerial={handleRemoveSerial}
              onScanNextSerial={handleScanNextSerial}
              onAddSerial={() => addSerialInput({
                id: Date.now().toString(),
                label: `Serial ${workflowState.serialInputs.length + 1}`,
                value: '',
                timestamp: Date.now(),
                isValid: true
              })}
            />

            <View style={styles.conditionSection}>
              <Text style={styles.sectionTitle}>Item Condition</Text>
              <View style={styles.conditionOptions}>
                {(['good', 'damaged', 'expired', 'missing_parts'] as const).map((condition) => (
                  <TouchableOpacity
                    key={condition}
                    style={[
                      styles.conditionOption,
                      itemState.itemCondition === condition && styles.conditionOptionSelected
                    ]}
                    onPress={() => {
                      updateItemState({
                        itemCondition: condition,
                        conditionManuallySet: true
                      });
                    }}
                  >
                    <Text style={[
                      styles.conditionText,
                      itemState.itemCondition === condition && styles.conditionTextSelected
                    ]}>
                      {condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <PhotoCapture
              photos={photoState.photoProofs}
              selectedPhotoType={photoState.selectedPhotoType}
              showPhotoCapture={photoState.showPhotoCapture}
              photoCaptureLoading={photoState.photoCaptureLoading}
              photoCameraType={photoState.photoCameraType}
              isWeb={isWeb}
              serialPhotosRequired={workflowState.serialCaptureEnabled}
              serialPhotoShortfall={0}
              photoCameraRef={photoCameraRef}
              onPhotoTypeChange={(type) => updatePhotoState({ selectedPhotoType: type })}
              onOpenPhotoCapture={() => handleOpenPhotoCapture(photoState.selectedPhotoType)}
              onClosePhotoCapture={handleClosePhotoCapture}
              onCapturePhoto={handleCapturePhoto}
              onFlipCamera={handleFlipPhotoCamera}
              onRemovePhoto={handleRemovePhoto}
            />

            {itemState.countedQty && (
              <View style={styles.variancePreview}>
                <Text style={styles.varianceLabel}>Variance:</Text>
                <Text style={[
                  styles.varianceValue,
                  { color: (parseFloat(itemState.countedQty) - (itemState.currentItem.stock_qty || 0)) === 0 ? '#4CAF50' : '#FF5252' }
                ]}>
                  {parseFloat(itemState.countedQty) - (itemState.currentItem.stock_qty || 0)}
                </Text>
              </View>
            )}



            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  resetForm();
                  updateUiState({ showSearchResults: false });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton, uiState.saving && styles.disabledButton]}
                onPress={handleSaveCount}
                disabled={uiState.saving}
              >
                {uiState.saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Count</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <BarcodeScanner
        visible={uiState.showScanner}
        scannerMode={uiState.scannerMode}
        continuousScanMode={uiState.continuousScanMode}
        isLoadingItem={uiState.isSearching}
        scanFeedback={uiState.scanFeedback}
        serialLabel={activeSerialLabel}
        expectedSerialCount={workflowState.expectedSerialCount}
        completedSerialCount={workflowState.serialInputs.filter(s => s.value).length}
        isWeb={isWeb}
        onBarcodeScanned={(data) => handleBarCodeScanned({ type: 'barcode', data: data.data })}
        onClose={() => {
          updateUiState({ showScanner: false });
          updateScannerState({ serialScanTargetId: null });
        }}
        onToggleContinuousMode={() => updateUiState({ continuousScanMode: !uiState.continuousScanMode })}
      />

      {/* Photo Modal */}
      <Modal
        visible={photoState.showPhotoCapture}
        animationType="slide"
        onRequestClose={handleClosePhotoCapture}
      >
        <SafeAreaView style={styles.photoModalContainer}>
          <View style={styles.photoHeader}>
            <TouchableOpacity onPress={handleClosePhotoCapture} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.photoTitle}>Take Photo</Text>
            <TouchableOpacity onPress={handleFlipPhotoCamera} style={styles.flipButton}>
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {isWeb ? (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.text}>Camera not available on web</Text>
            </View>
          ) : (
            <CameraView
              ref={photoCameraRef}
              style={styles.camera}
              facing={photoState.photoCameraType}
            />
          )}

          <View style={styles.photoControls}>
            <TouchableOpacity
              style={[styles.captureButton, photoState.photoCaptureLoading && styles.disabledButton]}
              onPress={handleCapturePhoto}
              disabled={photoState.photoCaptureLoading}
            >
              {photoState.photoCaptureLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Variance Reason Modal */}
      <Modal
        visible={uiState.showReasonModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => updateUiState({ showReasonModal: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Variance Detected</Text>
            <Text style={styles.modalSubtitle}>Please select a reason for the variance</Text>

            <ScrollView style={styles.reasonList}>
              {itemState.varianceReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonOption,
                    itemState.selectedReason === reason.id && styles.reasonOptionSelected
                  ]}
                  onPress={() => updateItemState({ selectedReason: reason.id })}
                >
                  <Text style={[
                    styles.reasonText,
                    itemState.selectedReason === reason.id && styles.reasonTextSelected
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.varianceNoteInput}
              value={itemState.varianceNote}
              onChangeText={(text) => updateItemState({ varianceNote: text })}
              placeholder="Add a note (optional)"
              placeholderTextColor="#64748B"
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => updateUiState({ showReasonModal: false })}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, !itemState.selectedReason && styles.disabledButton]}
                onPress={() => {
                  updateUiState({ showReasonModal: false });
                  handleSaveCount();
                }}
                disabled={!itemState.selectedReason}
              >
                <Text style={styles.confirmButtonText}>Confirm & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Unknown Item Report Modal */}
      <Modal
        visible={uiState.showUnknownItemModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => updateUiState({ showUnknownItemModal: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Unknown Item</Text>
            <Text style={styles.modalSubtitle}>Barcode: {uiState.unknownItemData.barcode}</Text>

            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={uiState.unknownItemData.description}
              onChangeText={(text) => updateUiState({
                unknownItemData: { ...uiState.unknownItemData, description: text }
              })}
              placeholder="Describe the item (color, brand, type, etc.)"
              placeholderTextColor="#64748B"
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => updateUiState({ showUnknownItemModal: false })}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, !uiState.unknownItemData.description.trim() && styles.disabledButton]}
                onPress={submitUnknownItem}
                disabled={!uiState.unknownItemData.description.trim()}
              >
                <Text style={styles.confirmButtonText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Quantity Modal */}
      <Modal
        visible={workflowState.showAddQuantityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => updateWorkflowState({ showAddQuantityModal: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Quantity</Text>
            <Text style={styles.modalSubtitle}>
              Current Count: {workflowState.existingCountLine?.counted_qty} {itemState.currentItem?.uom_name || ''}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantity to Add</Text>
              <TextInput
                style={styles.input}
                value={workflowState.additionalQty}
                onChangeText={(text) => updateWorkflowState({ additionalQty: text })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#64748B"
                autoFocus
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => updateWorkflowState({ showAddQuantityModal: false })}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, uiState.saving && styles.disabledButton]}
                onPress={handleAddQuantity}
                disabled={uiState.saving}
              >
                {uiState.saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Add Quantity</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmationModalVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setConfirmationModalVisible(false)}
>
  <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
    <View style={styles.confirmationModalContent}>
      <Text style={styles.modalTitle}>Confirm Count</Text>
      <Text style={styles.modalSubtitle}>Review the details before saving</Text>

      <View style={styles.confirmationDetails}>
        <Text style={styles.detailText}>Item: {itemState.currentItem?.name || pendingSaveData?.item_code || 'Unknown'}</Text>
        {pendingSaveData?.damaged_qty ? <Text style={styles.detailText}>Returnable Damage: {pendingSaveData.damaged_qty}</Text> : null}
        {pendingSaveData?.non_returnable_damaged_qty ? <Text style={styles.detailText}>Non-Returnable Damage: {pendingSaveData.non_returnable_damaged_qty}</Text> : null}
        {pendingSaveData?.item_condition && pendingSaveData.item_condition !== 'good' ? <Text style={styles.detailText}>Condition: {pendingSaveData.item_condition}</Text> : null}
        {pendingSaveData?.remark ? <Text style={styles.detailText}>Remark: {pendingSaveData.remark}</Text> : null}
      </View>

      <View style={styles.modalButtonsColumn}>
        <TouchableOpacity
          style={[styles.modalButton, styles.confirmButton, { marginBottom: 10, width: '100%' }]}
          onPress={() => handleConfirmSave('next')}
        >
          <Text style={styles.confirmButtonText}>Confirm & Next Item</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.finishButton, { marginBottom: 10, width: '100%', backgroundColor: '#EF4444', borderColor: '#DC2626' }]}
          onPress={() => handleConfirmSave('finish')}
        >
          <Text style={styles.confirmButtonText}>Confirm & Finish Rack</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton, { width: '100%' }]}
          onPress={() => setConfirmationModalVisible(false)}
        >
          <Text style={styles.cancelButtonText}>Back to Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  </BlurView>
</Modal>

    </StaffLayout >
  );
}
