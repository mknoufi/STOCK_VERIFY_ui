import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import EnhancedButton from '../src/components/forms/EnhancedButton';

export default function WelcomeScreen() {
  const router = useRouter();
  
  // Animation values
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const descriptionOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(40);
  const buttonsOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    // Orchestrated animations
    // Logo entrance
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoRotation.value = withSpring(0, { damping: 15, stiffness: 80 });
    
    // Title
    titleTranslateY.value = withDelay(200, withSpring(0, { damping: 15 }));
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    
    // Subtitle
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    
    // Description
    descriptionOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    
    // Buttons
    buttonsTranslateY.value = withDelay(800, withSpring(0, { damping: 15 }));
    buttonsOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    
    // Continuous pulse animation for logo glow
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` },
    ],
    opacity: logoOpacity.value,
  }));

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
    opacity: titleOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const descriptionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: descriptionOpacity.value,
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: buttonsTranslateY.value }],
    opacity: buttonsOpacity.value,
  }));

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#0F172A']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar style="light" />
      
      {/* Decorative elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
      <View style={styles.decorativeCircle3} />
      
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Animated Logo */}
          <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
            <Animated.View style={[styles.logoGlow, pulseAnimatedStyle]} />
            <LinearGradient
              colors={['#3B82F6', '#2563EB', '#1D4ED8']}
              style={styles.logoContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="cube-outline" size={64} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
          
          <Animated.Text style={[styles.title, titleAnimatedStyle]}>
            Stock Verify
          </Animated.Text>
          
          <Animated.View style={subtitleAnimatedStyle}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v2.1</Text>
            </View>
          </Animated.View>
          
          <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
            Inventory Management System
          </Animated.Text>
          
          <Animated.Text style={[styles.description, descriptionAnimatedStyle]}>
            Streamline your stock counting and verification process with real-time sync and offline support
          </Animated.Text>
          
          {/* Feature highlights */}
          <Animated.View style={[styles.features, descriptionAnimatedStyle]}>
            <View style={styles.featureItem}>
              <Ionicons name="cloud-done-outline" size={20} color="#10B981" />
              <Text style={styles.featureText}>Real-time Sync</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="wifi-outline" size={20} color="#10B981" />
              <Text style={styles.featureText}>Offline Support</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
              <Text style={styles.featureText}>Secure</Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.actions, buttonsAnimatedStyle]}>
          <EnhancedButton
            title="Sign In"
            onPress={() => router.push('/login')}
            icon="log-in-outline"
            iconPosition="left"
            style={styles.primaryButton}
          />
          
          <BlurView intensity={20} tint="dark" style={styles.secondaryButtonBlur}>
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => router.push('/staff/home')}
            >
              <Ionicons name="flash-outline" size={20} color="#3B82F6" />
              <Text style={styles.secondaryButtonText}>Quick Start</Text>
              <Ionicons name="arrow-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: '40%',
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  logoWrapper: {
    marginBottom: 8,
  },
  logoGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 40,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    fontSize: 44,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  versionBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  versionText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 8,
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 24,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  featureText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  actions: {
    gap: 12,
    paddingBottom: 32,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    marginBottom: 0,
  },
  secondaryButtonBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 16,
  },
});
