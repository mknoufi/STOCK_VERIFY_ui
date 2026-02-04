import React from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeContext } from "../../theme/ThemeContext";
import { Input } from "../ui/Input";

export type SettingItem =
  | {
      type: "input";
      label: string;
      key: string;
      keyboardType?: "numeric" | "default";
      description?: string;
    }
  | {
      type: "switch";
      label: string;
      key: string;
      description?: string;
    };

export type SettingSection = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: SettingItem[];
};

interface SettingsFormProps {
  sections: SettingSection[];
  settings: any;
  onUpdate: (key: string, value: any) => void;
  loading?: boolean;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  sections,
  settings,
  onUpdate,
}) => {
  const { theme, isDark } = useThemeContext();

  const renderItem = (item: SettingItem) => {
    if (item.type === "switch") {
      return (
        <View key={item.key} style={styles.switchContainer}>
          <View style={styles.switchTextContainer}>
            <Text style={[styles.switchLabel, { color: theme.colors.text }]}>
              {item.label}
            </Text>
            {item.description && (
              <Text
                style={[
                  styles.switchDescription,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {item.description}
              </Text>
            )}
          </View>
          <Switch
            value={settings?.[item.key] || false}
            onValueChange={(value) => {
              if (!settings) return;
              onUpdate(item.key, value);
            }}
            trackColor={{ false: "#767577", true: theme.colors.accent }}
            thumbColor={settings?.[item.key] ? "#fff" : "#f4f3f4"}
            accessibilityLabel={item.label}
            accessibilityRole="switch"
            accessibilityState={{ checked: settings?.[item.key] || false }}
          />
        </View>
      );
    }

    return (
      <View key={item.key} style={styles.inputContainer}>
        <Input
          label={item.label}
          value={settings?.[item.key]?.toString() || ""}
          onChangeText={(text) => {
            if (!settings) return;
              item.keyboardType === "numeric" ? parseInt(text) || 0 : text;
            onUpdate(item.key, value);
          }}
          keyboardType={item.keyboardType || "default"}
          helperText={item.description}
          placeholder={item.label}
          variant="outlined"
        />
      </View>
    );
  };

  return (
    <View>
      {sections.map((section, index) => (
        <View
          key={index}
          style={[
            styles.section,
            { backgroundColor: isDark ? "rgba(30, 41, 59, 0.7)" : "#fff" },
          ]}
        >
          <View
            style={[
              styles.sectionHeader,
              { borderBottomColor: theme.colors.border },
            ]}
          >
            <Ionicons name={section.icon} size={24} color={theme.colors.accent} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {section.title}
            </Text>
          </View>
          {section.items.map((item) => renderItem(item))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    minHeight: 44,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  switchDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});
