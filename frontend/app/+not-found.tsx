import { Stack, useRouter } from "expo-router";
import { StyleSheet, View, Text, Platform } from "react-native";
import { GlassCard, ScreenContainer } from "@/components/ui";
import { PremiumButton } from "@/components/premium/PremiumButton";
import { useThemeContext } from "@/theme/ThemeContext";

export default function NotFoundScreen() {
  const router = useRouter();
  const { theme } = useThemeContext();

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <ScreenContainer
        backgroundType="aurora"
        auroraVariant="dark"
        auroraIntensity="medium"
        header={{
          title: "Oops!",
          showBackButton: true,
          showLogoutButton: false,
        }}
        contentMode="static"
      >
        <View style={styles.container}>
          <GlassCard variant="strong" elevation="lg" style={styles.card}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              This screen doesn&apos;t exist.
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              The route may have changed or been removed.
            </Text>

            <View style={styles.actions}>
              <PremiumButton
                title="Go to home"
                onPress={() => router.replace("/")}
                fullWidth
                icon="home-outline"
              />
            </View>
          </GlassCard>
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  actions: {
    marginTop: 16,
    ...(Platform.OS === "web" ? { alignSelf: "center", width: "100%" } : {}),
  },
});
