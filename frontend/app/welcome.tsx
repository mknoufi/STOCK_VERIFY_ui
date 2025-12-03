import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../src/hooks/useTheme';
import EnhancedButton from '../src/components/forms/EnhancedButton';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors, spacing, typography, borderRadius } = useTheme();

  return (
    <LinearGradient colors={['#0F172A', '#1E293B', '#334155']} style={styles.gradient}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="cube-outline" size={96} color="#3B82F6" />
          <Text style={styles.title}>Stock Verify</Text>
          <Text style={styles.version}>v2.1</Text>
          <Text style={styles.subtitle}>Inventory Management System</Text>
          <Text style={styles.description}>
            Streamline your stock counting and verification process with real-time sync and offline
            support
          </Text>
        </View>

        <View style={styles.actions}>
          <EnhancedButton
            title="Sign In"
            onPress={() => router.push('/login')}
            icon="log-in-outline"
            iconPosition="left"
            style={styles.primaryButton}
          />

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/staff/home')}
          >
            <Ionicons name="flash-outline" size={20} color="#3B82F6" />
            <Text style={styles.secondaryButtonText}>Quick Start</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
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
    gap: 12,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
  },
  version: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 16,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
    paddingBottom: 32,
  },
  primaryButton: {
    marginBottom: 0,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  secondaryButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 16,
  },
});
