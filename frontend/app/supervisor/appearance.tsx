/**
 * Appearance Settings Screen
 *
 * Allows users to customize theme, patterns, and layout arrangements
 */

import React from "react";
import { AppearanceSettings } from "../../src/components/ui";
import { ScreenContainer } from "../../src/components/ui/ScreenContainer";

export default function AppearanceScreen() {
  return (
    <ScreenContainer
      backgroundType="pattern"
      header={{
        title: "Appearance",
        showBackButton: true,
        showLogoutButton: false,
        showUsername: false,
      }}
      contentMode="scroll"
    >
      <AppearanceSettings
        showTitle={false}
        scrollable={false}
        compact={false}
      />
    </ScreenContainer>
  );
}
