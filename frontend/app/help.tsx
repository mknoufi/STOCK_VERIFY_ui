/**
 * Help Screen - App documentation and help
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard, ScreenContainer } from "@/components/ui";
import { useThemeContext } from "@/theme/ThemeContext";

interface HelpSection {
  title: string;
  icon: string;
  items: HelpItem[];
}

interface HelpItem {
  question: string;
  answer: string;
  icon?: string;
}

const helpSections: HelpSection[] = [
  {
    title: "Getting Started",
    icon: "rocket",
    items: [
      {
        question: "How do I login?",
        answer:
          'Enter your username and password. If you enabled "Remember Me", your username will be saved for next time.',
        icon: "log-in",
      },
      {
        question: "What are the user roles?",
        answer:
          "Staff: Can scan items and create count sessions. Supervisor: Can approve counts, view reports, and configure settings.",
        icon: "people",
      },
      {
        question: "How do I scan a barcode?",
        answer:
          "Navigate to the Scan screen, tap the barcode scanner icon, and point your camera at the barcode. You can also manually enter the barcode.",
        icon: "barcode",
      },
    ],
  },
  {
    title: "Stock Counting",
    icon: "cube",
    items: [
      {
        question: "How do I create a counting session?",
        answer:
          'Go to Home screen, tap "New Session", select a warehouse, and start scanning items.',
        icon: "add-circle",
      },
      {
        question: "How do I enter quantity?",
        answer:
          'After scanning an item, tap the quantity field and enter the counted quantity. Tap "Save" to record.',
        icon: "calculator",
      },
      {
        question: "What if an item is not found?",
        answer:
          'Tap "Item Not Found" button and enter the item details manually. It will be reported for review.',
        icon: "alert-circle",
      },
      {
        question: "How do I refresh stock from ERP?",
        answer:
          'Tap the refresh icon next to "ERP Stock" on the scan screen to fetch the latest stock quantity.',
        icon: "refresh",
      },
    ],
  },
  {
    title: "Supervisor Features",
    icon: "shield-checkmark",
    items: [
      {
        question: "How do I approve count lines?",
        answer:
          'Go to Dashboard, select a session, review count lines, and tap "Approve" for each line.',
        icon: "checkmark-circle",
      },
      {
        question: "How do I configure database mapping?",
        answer:
          "Go to Settings > Database Mapping, enter connection details, select tables and columns, and save the mapping.",
        icon: "settings",
      },
      {
        question: "How do I view activity logs?",
        answer:
          "Go to Dashboard > Activity Logs to view all user activities and system events.",
        icon: "list",
      },
    ],
  },
  {
    title: "Troubleshooting",
    icon: "bug",
    items: [
      {
        question: "Cannot connect to server",
        answer:
          "Check your internet connection and ensure the backend server is running. Verify the backend URL in settings.",
        icon: "wifi",
      },
      {
        question: "Barcode not found",
        answer:
          "Check if the item exists in ERP. Verify database mapping configuration if you're a supervisor.",
        icon: "search",
      },
      {
        question: "Sync not working",
        answer:
          "Check ERP connection settings. Ensure SQL Server is accessible and credentials are correct.",
        icon: "sync",
      },
      {
        question: "App crashes or freezes",
        answer:
          "Close and restart the app. If problem persists, clear app cache or reinstall.",
        icon: "warning",
      },
    ],
  },
];

export default function HelpScreen() {
  const { theme } = useThemeContext();
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(
    new Set(),
  );

  const toggleItem = (sectionIndex: number, itemIndex: number) => {
    const key = `${sectionIndex}-${itemIndex}`;
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <ScreenContainer
      backgroundType="pattern"
      header={{
        title: "Help & Documentation",
        showBackButton: true,
        showLogoutButton: false,
      }}
      contentMode="scroll"
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {helpSections.map((section, sectionIndex) => (
          <GlassCard key={sectionIndex} variant="medium" style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={section.icon as any}
                size={22}
                color={theme.colors.accent}
              />
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {section.title}
              </Text>
            </View>

            {section.items.map((item, itemIndex) => {
              const key = `${sectionIndex}-${itemIndex}`;
              const isExpanded = expandedItems.has(key);

              return (
                <View key={itemIndex} style={styles.itemContainer}>
                  <TouchableOpacity
                    style={styles.questionContainer}
                    onPress={() => toggleItem(sectionIndex, itemIndex)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.questionContent}>
                      {item.icon && (
                        <Ionicons
                          name={item.icon as any}
                          size={18}
                          color={theme.colors.textSecondary}
                          style={styles.itemIcon}
                        />
                      )}
                      <Text
                        style={[styles.question, { color: theme.colors.text }]}
                      >
                        {item.question}
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View
                      style={[
                        styles.answerContainer,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.answer,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {item.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </GlassCard>
        ))}

        <GlassCard variant="medium" style={styles.contactSection}>
          <Ionicons name="mail" size={32} color={theme.colors.accent} />
          <Text style={[styles.contactTitle, { color: theme.colors.text }]}
          >
            Need More Help?
          </Text>
          <Text
            style={[styles.contactText, { color: theme.colors.textSecondary }]}
          >
            Contact your system administrator or IT support team for additional
            assistance.
          </Text>
        </GlassCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  itemContainer: {
    marginBottom: 12,
  },
  questionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  questionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemIcon: {
    marginRight: 4,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  answerContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  answer: {
    fontSize: 15,
    lineHeight: 22,
  },
  contactSection: {
    margin: 16,
    alignItems: "center",
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
