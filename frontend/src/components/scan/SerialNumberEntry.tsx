/**
 * SerialNumberEntry Component
 * Handles serial number input, validation, and management
 */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SerialInput } from '@/types/scan';


interface SerialNumberEntryProps {
  serialInputs: SerialInput[];
  requiredSerialCount: number;
  serialCaptureEnabled: boolean;
  serialInputTarget: number;
  expectedSerialCount: number;
  scannerMode: 'item' | 'serial';
  serialScanTargetId: string | null;
  showScanner: boolean;
  continuousScanMode: boolean;
  serialRequirementMessage: string;
  missingSerialCount: number;
  extraSerialCount: number;
  onToggleSerialCapture: (value: boolean) => void;
  onSerialValueChange: (id: string, value: string) => void;
  onScanSerialSlot: (id: string) => void;
  onRemoveSerial: (id: string) => void;
  onScanNextSerial: () => void;
  onAddSerial: () => void;
  onActivityReset?: () => void;
}

export const SerialNumberEntry: React.FC<SerialNumberEntryProps> = ({
  serialInputs,
  requiredSerialCount,
  serialCaptureEnabled,
  serialInputTarget,
  expectedSerialCount,
  scannerMode,
  serialScanTargetId,
  showScanner,
  continuousScanMode,
  serialRequirementMessage,
  missingSerialCount,
  extraSerialCount,
  onToggleSerialCapture,
  onSerialValueChange,
  onScanSerialSlot,
  onRemoveSerial,
  onScanNextSerial,
  onAddSerial,
  onActivityReset,
}) => {
  const handleSerialChange = (id: string, text: string) => {
    onActivityReset?.();
    onSerialValueChange(id, text);
  };

  const handleRemove = (id: string) => {
    onActivityReset?.();
    if (requiredSerialCount > 0 && serialInputs.length <= requiredSerialCount) {
      Alert.alert(
        'Cannot Remove',
        `At least ${requiredSerialCount} serial number${requiredSerialCount > 1 ? 's are' : ' is'} required.`
      );
      return;
    }
    onRemoveSerial(id);
  };



  return (
    <View style={styles.serialSection}>
      <View style={styles.serialHeader}>
        <Text style={styles.subSectionTitle}>Serial Numbers</Text>
        {requiredSerialCount === 0 && (
          <View style={styles.serialToggleRow}>
            <Text style={styles.serialToggleLabel}>Capture</Text>
            <Switch
              value={serialCaptureEnabled}
              onValueChange={onToggleSerialCapture}
              trackColor={{ false: '#555', true: '#3B82F6' }}
              thumbColor={serialCaptureEnabled ? '#e8f5e9' : '#f4f3f4'}
            />
          </View>
        )}
      </View>
      <Text style={styles.serialRequirementText}>{serialRequirementMessage}</Text>
      {missingSerialCount > 0 && (
        <Text style={styles.serialHelperText}>
          {missingSerialCount} more serial number{missingSerialCount > 1 ? 's' : ''} needed to match the counted quantity.
        </Text>
      )}
      {extraSerialCount > 0 && (
        <Text style={styles.serialErrorText}>
          Remove {extraSerialCount} extra serial number{extraSerialCount > 1 ? 's' : ''} to match the counted quantity.
        </Text>
      )}

      {(serialCaptureEnabled || requiredSerialCount > 0) && (
        <View style={styles.serialInputsContainer}>
          {serialInputs.map((entry, index) => {
            const isActiveSerialSlot =
              showScanner && scannerMode === 'serial' && serialScanTargetId === entry.id;
            const serialLabel = entry.label || `Serial #${index + 1}`;

            return (
              <View
                key={entry.id}
                style={[styles.serialInputRow, isActiveSerialSlot && styles.serialInputRowActive]}
              >
                <View style={styles.serialInputHeader}>
                  <Text style={styles.serialInputLabel}>{serialLabel}</Text>
                  <View style={styles.serialInputActions}>
                    <TouchableOpacity
                      style={styles.serialActionButton}
                      onPress={() => onScanSerialSlot(entry.id ?? '')}
                    >
                      <Ionicons name="scan-outline" size={18} color="#3B82F6" />
                    </TouchableOpacity>
                    {(requiredSerialCount === 0 || serialInputs.length > requiredSerialCount) && (
                      <TouchableOpacity
                        style={styles.removeSerialButton}
                        onPress={() => handleRemove(entry.id ?? '')}
                      >
                        <Ionicons name="trash" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <TextInput
                  style={styles.serialTextInput}
                  placeholder="Scan or enter serial number"
                  placeholderTextColor="#94A3B8"
                  value={entry.value}
                  onChangeText={(text) => handleSerialChange(entry.id ?? '', text)}
                  autoCapitalize="characters"
                />
              </View>
            );
          })}
          <View style={styles.serialControlsRow}>
            <TouchableOpacity style={styles.scanSerialButton} onPress={onScanNextSerial}>
              <Ionicons name="scan-outline" size={18} color="#3B82F6" />
              <Text style={styles.scanSerialButtonText}>Scan Next</Text>
            </TouchableOpacity>
            {serialInputs.length < serialInputTarget && (
              <TouchableOpacity style={styles.addSerialButton} onPress={onAddSerial}>
                <Ionicons name="add-circle-outline" size={18} color="#3B82F6" />
                <Text style={styles.addSerialButtonText}>Add Serial</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  serialSection: {
    marginBottom: 16,
  },
  serialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  serialToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serialToggleLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  serialRequirementText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
  },
  serialHelperText: {
    fontSize: 12,
    color: '#FFB74D',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  serialErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 8,
    fontWeight: '600',
  },
  serialInputsContainer: {
    marginTop: 12,
  },
  serialInputRow: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  serialInputRowActive: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: '#1a3a1a',
  },
  serialInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serialInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  serialInputActions: {
    flexDirection: 'row',
    gap: 8,
  },
  serialActionButton: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 8,
  },
  removeSerialButton: {
    backgroundColor: '#3a1a1a',
    borderRadius: 8,
    padding: 8,
  },
  serialTextInput: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  serialControlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  scanSerialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 14,
  },
  scanSerialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addSerialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  addSerialButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
});
