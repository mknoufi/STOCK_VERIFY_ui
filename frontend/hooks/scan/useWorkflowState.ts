/**
 * useWorkflowState Hook
 * Manages workflow state (steps, serial inputs, etc.)
 */
import { useState, useCallback } from 'react';
import { WorkflowState, SerialInput } from '@/types/scan';

const initialState: WorkflowState = {
  step: 'scan',
  expectedSerialCount: 0,
  showSerialEntry: false,
  showPhotoCapture: false,
  autoIncrementEnabled: false,
  serialCaptureEnabled: false,
  damageQtyEnabled: false,
  serialInputs: [],
  requiredSerialCount: 0,
  serialInputTarget: 0,
  existingCountLine: null,
  showAddQuantityModal: false,
  additionalQty: '',
};

export const useWorkflowState = () => {
  const [workflowState, setWorkflowState] = useState<WorkflowState>(initialState);

  const updateWorkflowState = useCallback((updates: Partial<WorkflowState>) => {
    setWorkflowState((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetWorkflowState = useCallback(() => {
    setWorkflowState(initialState);
  }, []);

  const addSerialInput = useCallback((input: SerialInput) => {
    setWorkflowState((prev) => ({
      ...prev,
      serialInputs: [...prev.serialInputs, input],
    }));
  }, []);

  const removeSerialInput = useCallback((id: string) => {
    setWorkflowState((prev) => ({
      ...prev,
      serialInputs: prev.serialInputs.filter((input) => input.id !== id),
    }));
  }, []);

  const updateSerialInput = useCallback((id: string, updates: Partial<SerialInput>) => {
    setWorkflowState((prev) => ({
      ...prev,
      serialInputs: prev.serialInputs.map((input) =>
        input.id === id ? { ...input, ...updates } : input
      ),
    }));
  }, []);

  return {
    workflowState,
    updateWorkflowState,
    resetWorkflowState,
    addSerialInput,
    removeSerialInput,
    updateSerialInput,
  };
};
