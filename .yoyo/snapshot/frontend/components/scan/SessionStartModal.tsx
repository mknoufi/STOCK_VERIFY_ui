/**
 * SessionStartModal Component
 * Modal for starting a scanning session with location details
 */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, StyleSheet } from 'react-native';

interface SessionStartModalProps {
  visible: boolean;
  floorNo: string;
  rackNo: string;
  onFloorChange: (floorNo: string) => void;
  onRackChange: (rackNo: string) => void;
  onStart: () => void;
}

export const SessionStartModal: React.FC<SessionStartModalProps> = ({
  visible,
  floorNo,
  rackNo,
  onFloorChange,
  onRackChange,
  onStart,
}) => {
  const handleStart = () => {
    if (floorNo.trim()) {
      onStart();
    } else {
      Alert.alert('Required', 'Please enter Floor number');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Start Session</Text>
          <Text style={styles.modalSubtitle}>Enter location details to begin</Text>

          <Text style={styles.modalLabel}>Floor Number</Text>
          <TextInput
            style={styles.input}
            value={floorNo}
            onChangeText={onFloorChange}
            placeholder="e.g. 1, 2, G"
            placeholderTextColor="#666"
          />

          <Text style={styles.modalLabel}>Rack Number</Text>
          <TextInput
            style={styles.input}
            value={rackNo}
            onChangeText={onRackChange}
            placeholder="e.g. A1, B2"
            placeholderTextColor="#666"
          />

          <TouchableOpacity
            style={[styles.confirmButton, !floorNo.trim() && styles.buttonDisabled]}
            onPress={handleStart}
            disabled={!floorNo.trim()}
          >
            <Text style={styles.confirmButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

