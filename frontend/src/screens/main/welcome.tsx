import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInUp
} from 'react-native-reanimated';
import { colors, spacing, gradients, layout } from '../styles/globalStyles';
import { useAuthStore } from '../store/authStore';


const FeatureCard = ({ icon, title, delay }: { icon: keyof typeof Ionicons.glyphMap; title: string; delay: number }) => (
  <Animated.View
    entering={FadeInDown.delay(delay).springify()}
    style={styles.featureWrapper}
  >
    <BlurView intensity={20} tint="light" style={styles.featureCard}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={styles.featureText}>{title}</Text>
    </BlurView>
  </Animated.View>
);

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024; // Simple desktop check

  // Redirect if user is already logged in
  React.useEffect(() => {
    if (!isLoading && user) {
      __DEV__ && console.log('🔄 [WELCOME] User already logged in, redirecting:', { role: user.role });
      if (Platform.OS === 'web' && (user.role === 'supervisor' || user.role === 'admin')) {
        router.replace('/admin/metrics');
      } else if (user.role === 'supervisor' || user.role === 'admin') {
        router.replace('/supervisor/dashboard');
      } else {
        router.replace('/staff/home');
      }
    }
  }, [user, isLoading, router]);

  const handlePress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#121212', '#0A0A0A', '#000000']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Background Elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <View style={[styles.content, { maxWidth: isDesktop ? 600 : '100%' }]}>
        {/* Header Section */}
        <Animated.View entering={FadeInUp.duration(1000).springify()} style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={gradients.primary}
              style={styles.logoBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="cube-outline" size={64} color="#fff" />
            </LinearGradient>
            <View style={styles.logoGlow} />
          </View>

          <Text style={styles.title}>Lavanya E-Mart</Text>
          <Text style={styles.subtitle}>Stock Verification System</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v2.0 Premium</Text>
          </View>
        </Animated.View>

        {/* Features Grid */}
        <View style={styles.featuresContainer}>
          <FeatureCard icon="barcode-outline" title="Smart Scanning" delay={400} />
          <FeatureCard icon="sync-outline" title="Live Sync" delay={600} />
          <FeatureCard icon="stats-chart-outline" title="Analytics" delay={800} />
        </View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.actions}>
          <TouchableOpacity
            onPress={() => handlePress('/login')}
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
            onPress={() => handlePress('/register')}
            activeOpacity={0.7}
            style={styles.registerButtonWrapper}
          >
            <BlurView intensity={10} tint="light" style={styles.registerButton}>
              <Text style={styles.registerButtonText}>Create Account</Text>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeInDown.delay(1200)} style={styles.footer}>
          <Text style={styles.footerText}>© 2024 Lavanya E-Mart</Text>
          <Text style={styles.footerSubtext}>Powered by Stock Verify</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center', // Center content horizontally
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.lg,
    zIndex: 1,
    width: '100%',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary,
    opacity: 0.1,
    transform: [{ scale: 1.5 }],
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.secondary,
    opacity: 0.1,
    transform: [{ scale: 1.5 }],
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-5deg' }],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 40,
    backgroundColor: colors.primary,
    opacity: 0.3,
    transform: [{ scale: 1.2 }, { rotate: '-5deg' }],
    zIndex: 1,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  versionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: spacing.xl,
  },
  featureWrapper: {
    flex: 1,
  },
  featureCard: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    height: 110,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    gap: 16,
    marginTop: spacing.xl,
  },
  buttonShadow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButton: {
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  registerButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  footerSubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    marginTop: 4,
  },
});
