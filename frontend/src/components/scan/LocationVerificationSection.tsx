import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PremiumInput } from "@/components/premium/PremiumInput";
import { modernColors } from "@/styles/modernDesignSystem";
import { DEFAULT_FLOOR_OPTIONS } from "@/config/location";

export type LocationVerificationSectionProps = {
  floorNo?: string | null;
  rackNo?: string | null;
  onSelectFloor: (floor: string) => void;
  onChangeRack: (rack: string) => void;
  onClearRecentRacks?: () => void;
  username: string;
  dateTimeText?: string;
  floorOptions?: string[];
  recentRacks?: string[];
};

export const LocationVerificationSection: React.FC<LocationVerificationSectionProps> = ({
  floorNo,
  rackNo,
  onSelectFloor,
  onChangeRack,
  onClearRecentRacks,
  username,
  dateTimeText,
  floorOptions,
  recentRacks,
}) => {
    const nowText = dateTimeText || new Date().toLocaleString();
    const OPTIONS = (floorOptions && floorOptions.length ? floorOptions : DEFAULT_FLOOR_OPTIONS);
    const typedRack = (rackNo || "").trim();
    const rackSuggestions = (recentRacks || [])
      .filter((r) => typedRack && r.toLowerCase().includes(typedRack.toLowerCase()) && r.toLowerCase() !== typedRack.toLowerCase())
      .slice(0, 5);

    return (
      <View style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: modernColors.primary[500],
            }}
          >
            <Ionicons name="location" size={14} color="#fff" />
          </View>
          <Text style={{ fontWeight: "600", fontSize: 16, color: modernColors.text.primary }}>Location & Verification</Text>
          <Text style={{ marginLeft: 8, color: modernColors.text.tertiary, fontSize: 12 }}>Optional</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          {/* Floor chips */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: modernColors.text.secondary, marginBottom: 6 }}>Floor</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {OPTIONS.map((opt) => {
                const active = floorNo === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: active ? modernColors.primary[500] : modernColors.background.elevated,
                    }}
                    onPress={() => onSelectFloor(opt)}
                    accessibilityLabel={`Select floor ${opt}`}
                    testID={`chip-floor-${opt.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    <Text style={{ color: active ? "#fff" : modernColors.text.primary, fontWeight: "600" }}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Rack input */}
          <View style={{ flex: 1 }}>
            <PremiumInput
              label="Rack"
              value={rackNo || ""}
              onChangeText={(text) => onChangeRack(text)}
              placeholder="Enter rack"
              leftIcon="layers-outline"
              testID="input-rack"
            />

            {rackSuggestions.length > 0 && (
              <View
                style={{
                  marginTop: 6,
                  borderWidth: 1,
                  borderColor: modernColors.border.light,
                  borderRadius: 10,
                  backgroundColor: modernColors.background.elevated,
                }}
              >
                {rackSuggestions.map((sugg) => (
                  <TouchableOpacity
                    key={`sugg-${sugg}`}
                    style={{ paddingHorizontal: 10, paddingVertical: 8 }}
                    onPress={() => onChangeRack(sugg)}
                    accessibilityLabel={`Use suggestion ${sugg}`}
                    testID={`suggest-rack-${sugg.replace(/\s+/g, "-").toLowerCase()}`}
                  >
                    <Text style={{ color: modernColors.text.primary }}>{sugg}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!!recentRacks && recentRacks.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ color: modernColors.text.secondary }}>Recent Racks</Text>
                  {onClearRecentRacks && (
                    <TouchableOpacity onPress={onClearRecentRacks} accessibilityLabel="Clear recent racks" testID="btn-clear-recent-racks">
                      <Text style={{ color: modernColors.primary[400], fontWeight: "600" }}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {recentRacks.map((r) => (
                    <TouchableOpacity
                      key={`rack-${r}`}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: modernColors.background.elevated,
                        borderWidth: 1,
                        borderColor: modernColors.border.light,
                      }}
                      onPress={() => onChangeRack(r)}
                      accessibilityLabel={`Use recent rack ${r}`}
                      testID={`chip-rack-${r.replace(/\s+/g, "-").toLowerCase()}`}
                    >
                      <Text style={{ color: modernColors.text.primary, fontWeight: "600" }}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Verified by & Date/Time */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: modernColors.text.secondary, marginBottom: 6 }}>Verified By</Text>
            <View
              style={{
                height: 44,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: modernColors.border.light,
                backgroundColor: modernColors.background.elevated,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="person" size={16} color={modernColors.text.tertiary} />
              <Text numberOfLines={1} style={{ color: modernColors.text.primary }}>{username}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: modernColors.text.secondary, marginBottom: 6 }}>Date & Time</Text>
            <View
              style={{
                height: 44,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: modernColors.border.light,
                backgroundColor: modernColors.background.elevated,
                paddingHorizontal: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Ionicons name="time" size={16} color={modernColors.text.tertiary} />
              <Text numberOfLines={1} style={{ color: modernColors.text.primary }}>{nowText}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };
