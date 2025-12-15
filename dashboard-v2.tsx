import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, SafeAreaView, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { AuroraBackground } from '@/components/ui/AuroraBackground';
import { StatsCard } from '@/components/ui/StatsCard';
import { SpeedDialMenu } from '@/components/ui/SpeedDialMenu';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { ActivityFeedItem } from '@/components/ui/ActivityFeedItem';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { getSessions } from '@/services/api';
import { Session } from '@/types';

const { width } = Dimensions.get('window');

export default function SupervisorDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalItems: 0,
    highRisk: 0,
    completionRate: 0,
  });

  const loadData = async () => {
    try {
      // API Fix: getSessions returns { items: [], pagination: {} }
      const response = await getSessions({ page: 1, limit: 10 });

      if (response && response.items) {
        setSessions(response.items);

        // Calculate stats from real data
        const total = response.items.length;
        const items = response.items.reduce((acc: number, s: Session) => acc + (s.total_items || 0), 0);
        const risk = response.items.filter((s: Session) => s.status === 'flagged').length;

        setStats({
          totalSessions: total,
          totalItems: items,
          highRisk: risk,
          completionRate: 0.85, // Mocked for demo
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadData();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const menuActions = [
    { icon: 'eye' as const, label: 'Watchtower', onPress: () => console.log('Watchtower') },
    { icon: 'refresh' as const, label: 'Update MRP', onPress: () => console.log('Update MRP') },
    { icon: 'filter' as const, label: 'Filter', onPress: () => console.log('Filter') },
    { icon: 'bar-chart' as const, label: 'Analytics', onPress: () => console.log('Analytics') },
    { icon: 'layers' as const, label: 'Bulk Ops', onPress: () => console.log('Bulk Ops') },
  ];

  return (
    <View style={styles.container}>
      <AuroraBackground intensity="low" />
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.title}>Supervisor</Text>
          </View>
          <View style={styles.liveContainer}>
            <LiveIndicator />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        >
          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.sectionTitle}>Daily Goals</Text>
              <Text style={styles.progressSubtitle}>85% of sessions completed</Text>
            </View>
            <ProgressRing progress={stats.completionRate} size={60} strokeWidth={6} color="#10B981" />
          </View>

          {/* Stats Grid */}
          <View style={styles.grid}>
            <View style={styles.row}>
              <StatsCard
                title="Active Sessions"
                value={stats.totalSessions}
                icon="people"
                color="#4F46E5"
                trend="up"
                trendValue="+12%"
                delay={100}
                style={styles.card}
              />
              <StatsCard
                title="Items Scanned"
                value={stats.totalItems}
                icon="barcode"
                color="#10B981"
                trend="up"
                trendValue="+5%"
                delay={200}
                style={styles.card}
              />
            </View>
            <View style={styles.row}>
              <StatsCard
                title="High Risk"
                value={stats.highRisk}
                icon="alert-circle"
                color="#EF4444"
                trend="down"
                trendValue="-2%"
                delay={300}
                style={styles.card}
              />
              <StatsCard
                title="Efficiency"
                value="94%"
                icon="flash"
                color="#F59E0B"
                trend="neutral"
                trendValue="0%"
                delay={400}
                style={styles.card}
              />
            </View>
          </View>

          {/* Activity Feed */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Recent Activity</Text>
            {sessions.slice(0, 3).map((session, index) => (
              <ActivityFeedItem
                key={session.id || index}
                title={`Session #${session.id?.slice(-4) || '0000'}`}
                subtitle={`User: ${session.user_id || 'Unknown'}`}
                time="Just now"
                status={session.status === 'completed' ? 'success' : 'warning'}
                index={index}
              />
            ))}
          </View>
        </ScrollView>

        <SpeedDialMenu actions={menuActions} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Manrope_500Medium',
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  liveText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  progressSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20,
    borderRadius: 20,
  },
  progressInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  grid: {
    gap: 16,
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  card: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 16,
  },
});
