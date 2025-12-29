/**
 * Appearance Settings Screen for Staff
 *
 * Allows staff users to customize theme, patterns, and layout arrangements
 */

import React from "react";
import { AppearanceSettings } from "../../src/components/ui";
import { ScreenContainer } from "../../src/components/ui/ScreenContainer";

export default function StaffAppearanceScreen() {
  return (
    <ScreenContainer
      backgroundType="aurora"
      auroraVariant="primary"
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
