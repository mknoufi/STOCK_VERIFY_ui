/**
 * LocationInput Component
 * Input fields for warehouse location (Floor, Rack, Mark/Label)
 */
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

interface LocationInputProps {
  floorNo: string;
  rackNo?: string;
  markLocation: string;
  onFloorChange: (floorNo: string) => void;
  onRackChange?: (rackNo: string) => void;
  onMarkLocationChange: (markLocation: string) => void;
  showRack?: boolean;
  onActivityReset?: () => void;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  floorNo,
  rackNo = '',
  markLocation,
  onFloorChange,
  onRackChange,
  onMarkLocationChange,
  showRack = false,
  onActivityReset,
}) => {
  const handleFloorChange = (text: string) => {
    onActivityReset?.();
    onFloorChange(text);
  };

  const handleRackChange = (text: string) => {
    onActivityReset?.();
    onRackChange?.(text);
  };

  const handleMarkLocationChange = (text: string) => {
    onActivityReset?.();
    onMarkLocationChange(text);
  };

  return (
    <View style={styles.locationSection}>
      <Text style={styles.sectionTitle}>Warehouse Location</Text>
      <View style={styles.locationGrid}>
        <View style={styles.locationInputGroup}>
          <Text style={styles.fieldLabel}>Floor No</Text>
          <TextInput
            style={styles.locationInput}
            placeholder="e.g., 1, 2, G"
            placeholderTextColor="#94A3B8"
            value={floorNo}
            onChangeText={handleFloorChange}
            autoCapitalize="characters"
          />
        </View>

        {showRack && onRackChange && (
          <View style={styles.locationInputGroup}>
            <Text style={styles.fieldLabel}>Rack No</Text>
            <TextInput
              style={styles.locationInput}
              placeholder="e.g., A1, B2"
              placeholderTextColor="#94A3B8"
              value={rackNo}
              onChangeText={handleRackChange}
              autoCapitalize="characters"
            />
          </View>
        )}

        <View style={styles.locationInputGroup}>
          <Text style={styles.fieldLabel}>Mark/Label</Text>
          <TextInput
            style={styles.locationInput}
            placeholder="e.g., Top, Middle"
            placeholderTextColor="#94A3B8"
            value={markLocation}
            onChangeText={handleMarkLocationChange}
            autoCapitalize="words"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  locationSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  locationGrid: {
    gap: 12,
  },
  locationInputGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
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
});

