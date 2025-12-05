import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminLayout } from "../../src/components/layout/AdminLayout";
import { PremiumCard } from "../../src/components/premium/PremiumCard";
import { PremiumButton } from "../../src/components/premium/PremiumButton";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
} from "../../src/styles/modernDesignSystem";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "supervisor" | "staff";
  status: "active" | "inactive";
}

const MOCK_USERS: User[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    status: "active",
  },
  {
    id: "2",
    name: "Supervisor One",
    email: "supervisor1@example.com",
    role: "supervisor",
    status: "active",
  },
  {
    id: "3",
    name: "Staff Member",
    email: "staff1@example.com",
    role: "staff",
    status: "active",
  },
  {
    id: "4",
    name: "Inactive User",
    email: "inactive@example.com",
    role: "staff",
    status: "inactive",
  },
];

const UserItem = ({ item }: { item: User }) => (
  <PremiumCard variant="elevated" style={styles.userCard}>
    <View style={styles.userInfo}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
    </View>
    <View style={styles.actions}>
      <View
        style={[
          styles.roleBadge,
          {
            backgroundColor:
              item.role === "admin"
                ? `${modernColors.primary[500]}20`
                : item.role === "supervisor"
                  ? `${modernColors.secondary[500]}20`
                  : `${modernColors.neutral[500]}20`,
          },
        ]}
      >
        <Text
          style={[
            styles.roleText,
            {
              color:
                item.role === "admin"
                  ? modernColors.primary[500]
                  : item.role === "supervisor"
                    ? modernColors.secondary[500]
                    : modernColors.neutral[500],
            },
          ]}
        >
          {item.role.toUpperCase()}
        </Text>
      </View>
      <TouchableOpacity>
        <Ionicons
          name="ellipsis-vertical"
          size={20}
          color={modernColors.text.secondary}
        />
      </TouchableOpacity>
    </View>
  </PremiumCard>
);

export default function AdminPermissions() {
  return (
    <AdminLayout title="User Permissions" screenVariant="scrollable">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.subtitle}>Manage user roles and access</Text>
          <PremiumButton
            title="Add User"
            onPress={() => {}}
            variant="primary"
            size="small"
            icon="add"
          />
        </View>

        <FlatList
          data={MOCK_USERS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <UserItem item={item} />}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
        />
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: modernSpacing.screenPadding,
    paddingBottom: 100,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.lg,
  } as ViewStyle,
  subtitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  } as TextStyle,
  listContent: {
    gap: modernSpacing.md,
  } as ViewStyle,
  userCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: modernSpacing.md,
  } as ViewStyle,
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.md,
  } as ViewStyle,
  avatar: {
    width: 40,
    height: 40,
    borderRadius: modernBorderRadius.full,
    backgroundColor: modernColors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  avatarText: {
    ...modernTypography.h6,
    color: modernColors.primary[700],
  } as TextStyle,
  userName: {
    ...modernTypography.body.medium,
    fontWeight: "600",
    color: modernColors.text.primary,
  } as TextStyle,
  userEmail: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  } as TextStyle,
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.md,
  } as ViewStyle,
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: modernBorderRadius.full,
  } as ViewStyle,
  roleText: {
    ...modernTypography.label.small,
    fontWeight: "bold",
  } as TextStyle,
});
