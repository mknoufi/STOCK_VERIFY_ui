import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { colors, spacing, radius, gradients } from "@/theme/unified";
import { useAuthStore } from "@/store/authStore";
import { getRouteForRole, type UserRole } from "@/utils/roleNavigation";

// Safe Animated View for Web
const SafeAnimatedView = ({ children, style, entering, ...props }: any) => {
  if (Platform.OS === "web") {
    return (
      <View style={style} {...props}>
        {children}
      </View>
    );
  }
  return (
    <Animated.View style={style} entering={entering} {...props}>
      {children}
    </Animated.View>
  );
};

const GlassSurface = ({
  children,
  style,
  intensity = 20,
  tint = "light",
}: {
  children: React.ReactNode;
  style?: any;
  intensity?: number;
  tint?: "light" | "dark" | "default";
}) => {
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          },
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurView>
  );
};

const FeatureCard = ({
  icon,
  title,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  delay: number;
}) => (
  <SafeAnimatedView
    entering={FadeInDown.delay(delay).springify()}
    style={styles.featureWrapper}
  >
    <GlassSurface intensity={20} tint="light" style={styles.featureCard}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={24} color={colors.primary[400]} />
      </View>
      <Text style={styles.featureText}>{title}</Text>
    </GlassSurface>
  </SafeAnimatedView>
);

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 1024; // Simple desktop check

  // Redirect if user is already logged in
  React.useEffect(() => {
    if (!isLoading && user) {
      __DEV__ &&
        console.log("🔄 [WELCOME] User already logged in, redirecting:", {
          role: user.role,
        });
      const target = getRouteForRole(user.role as UserRole);
      router.replace(target as any);
    }
  }, [user, isLoading, router]);

  const handlePress = (route: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[colors.neutral[950], colors.neutral[900], colors.neutral[950]]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Background Elements */}
      <View style={styles.decorativeCircle1} pointerEvents="none" />
      <View style={styles.decorativeCircle2} pointerEvents="none" />

      <View
        style={[
          styles.content,
          {
            maxWidth: isDesktop ? 600 : "100%",
            paddingTop: Platform.OS === "ios" ? insets.top + 20 : 40,
            paddingBottom: insets.bottom + 20,
          },
        ]}
      >
        {/* Header Section */}
        <SafeAnimatedView
          entering={FadeInUp.duration(1000).springify()}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={gradients.primary}
              style={[styles.logoBackground, { padding: 3, borderRadius: 999 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderRadius: 999,
                  justifyContent: "center",
                  alignItems: "center",
                  width: "100%",
                  height: "100%",
                }}
              >
                <Image
                  source={require("../assets/images/logo.png")}
                  style={{ width: 70, height: 70 }}
                  resizeMode="contain"
                />
              </View>
            </LinearGradient>
            <View style={[styles.logoGlow, { borderRadius: 999 }]} />
          </View>

          <Text style={styles.title}>Lavanya Mart</Text>
          <Text style={styles.subtitle}>Stock Verification System</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v2.5 Enterprise</Text>
          </View>
        </SafeAnimatedView>

        {/* Features Grid */}
        <View style={styles.featuresContainer}>
          <FeatureCard
            icon="barcode-outline"
            title="Smart Scanning"
            delay={400}
          />
          <FeatureCard icon="sync-outline" title="Live Sync" delay={600} />
          <FeatureCard
            icon="shield-checkmark-outline"
            title="Verified"
            delay={800}
          />
        </View>

        {/* Action Buttons */}
        <SafeAnimatedView
          entering={FadeInDown.delay(1000).springify()}
          style={styles.actions}
        >
          <TouchableOpacity
            onPress={() => handlePress("/login")}
            activeOpacity={0.9}
            style={styles.buttonShadow}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handlePress("/register")}
            activeOpacity={0.7}
            style={styles.registerButtonWrapper}
          >
            <GlassSurface
              intensity={10}
              tint="light"
              style={styles.registerButton}
            >
              <Text style={styles.registerButtonText}>Create Account</Text>
            </GlassSurface>
          </TouchableOpacity>
        </SafeAnimatedView>

        {/* Footer */}
        <SafeAnimatedView
          entering={FadeInDown.delay(1200)}
          style={styles.footer}
        >
          <Text style={styles.footerText}>© 2024 Lavanya E-Mart</Text>
          <Text style={styles.footerSubtext}>Powered by Stock Verify</Text>
        </SafeAnimatedView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center", // Center content horizontally
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    zIndex: 1,
    width: "100%",
  },
  decorativeCircle1: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: radius.full,
    backgroundColor: colors.primary[400],
    opacity: 0.05,
    transform: [{ scale: 1.5 }],
  },
  decorativeCircle2: {
    position: "absolute",
    bottom: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: radius.full,
    backgroundColor: colors.success[500],
    opacity: 0.05,
    transform: [{ scale: 1.5 }],
  },
  header: {
    alignItems: "center",
    marginTop: 40,
  },
  logoContainer: {
    marginBottom: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: radius.xl,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary[400],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 2,
  },
  logoGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: radius.xl,
    backgroundColor: colors.primary[400],
    opacity: 0.2,
    transform: [{ scale: 1.1 }],
    zIndex: 1,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 4,
    textAlign: "center",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: colors.neutral[400],
    marginBottom: spacing.lg,
    textAlign: "center",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  versionBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: `${colors.primary[400]}26`, // 15% opacity
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: `${colors.primary[400]}4D`, // 30% opacity
  },
  versionText: {
    color: colors.primary[400],
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  featuresContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: spacing.xl,
  },
  featureWrapper: {
    flex: 1,
  },
  featureCard: {
    padding: 16,
    borderRadius: 24,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    overflow: "hidden",
    height: 110,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: `${colors.primary[400]}1A`, // 10% opacity
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  featureText: {
    color: colors.neutral[400],
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  actions: {
    gap: 16,
    marginTop: spacing.xl,
  },
  buttonShadow: {
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButton: {
    height: 64,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  registerButtonWrapper: {
    borderRadius: 18,
    overflow: "hidden",
  },
  registerButton: {
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    color: colors.neutral[500],
    fontSize: 12,
    fontWeight: "600",
  },
  footerSubtext: {
    color: colors.neutral[600],
    fontSize: 10,
    marginTop: spacing.xs,
  },
});
