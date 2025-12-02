import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ExportService } from '../../services/exportService';
import { getSessions } from '../../services/api';
import { useAutoLogout } from '../../hooks/useAutoLogout';
import { LogoutButton } from '../../components/LogoutButton';

export default function ExportReports() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [exportType, setExportType] = React.useState<string | null>(null);
  const { resetTimer } = useAutoLogout(true);

  const handleInteraction = () => {
    resetTimer();
  };

  const exportAllSessions = async () => {
    try {
      setLoading(true);
      setExportType('sessions');

      console.log('📊 [Export] Fetching all sessions for export...');
      const result = await getSessions(1, 10000); // Get all sessions
      const sessions = result.items || [];

      if (sessions.length === 0) {
        Alert.alert('No Data', 'No sessions available to export');
        return;
      }

      console.log('✅ [Export] Exporting', sessions.length, 'sessions');
      await ExportService.exportSessions(sessions);

      Alert.alert(
        'Export Successful',
        `Exported ${sessions.length} sessions to Excel file`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ [Export] Session export failed:', error);
      Alert.alert(
        'Export Failed',
        error.message || 'Failed to export sessions. Please try again.'
      );
    } finally {
      setLoading(false);
      setExportType(null);
    }
  };

  const exportSessionDetails = async () => {
    try {
      setLoading(true);
      setExportType('details');

      Alert.alert(
        'Export Session Details',
        'This will export detailed count lines for all sessions. Continue?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => { setLoading(false); setExportType(null); } },
          {
            text: 'Export',
            onPress: async () => {
              try {
                console.log('📊 [Export] Fetching all sessions with details...');
                const result = await getSessions(1, 10000);
                const sessions = result.items || [];

                if (sessions.length === 0) {
                  Alert.alert('No Data', 'No sessions available to export');
                  return;
                }

                // Export with detailed count lines
                console.log('✅ [Export] Exporting detailed data for', sessions.length, 'sessions');
                await ExportService.exportSessionsWithDetails(sessions);

                Alert.alert(
                  'Export Successful',
                  `Exported detailed data for ${sessions.length} sessions`,
                  [{ text: 'OK' }]
                );
              } catch (error: any) {
                console.error('❌ [Export] Details export failed:', error);
                Alert.alert('Export Failed', error.message || 'Failed to export details');
              } finally {
                setLoading(false);
                setExportType(null);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ [Export] Error:', error);
      setLoading(false);
      setExportType(null);
    }
  };

  const exportVarianceReport = async () => {
    try {
      setLoading(true);
      setExportType('variance');

      console.log('📊 [Export] Generating variance report...');
      const result = await getSessions(1, 10000);
      const sessions = result.items || [];

      if (sessions.length === 0) {
        Alert.alert('No Data', 'No sessions available to export');
        return;
      }

      // Filter sessions with variance
      const varianceSessions = sessions.filter((s: any) =>
        Math.abs(s.total_variance || 0) > 0
      );

      if (varianceSessions.length === 0) {
        Alert.alert('No Variance', 'No sessions with variance found');
        return;
      }

      console.log('✅ [Export] Exporting variance report for', varianceSessions.length, 'sessions');
      await ExportService.exportVarianceReport(varianceSessions);

      Alert.alert(
        'Export Successful',
        `Exported variance report for ${varianceSessions.length} sessions`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ [Export] Variance report failed:', error);
      Alert.alert('Export Failed', error.message || 'Failed to export variance report');
    } finally {
      setLoading(false);
      setExportType(null);
    }
  };

  const exportSummaryReport = async () => {
    try {
      setLoading(true);
      setExportType('summary');

      console.log('📊 [Export] Generating summary report...');
      const result = await getSessions(1, 10000);
      const sessions = result.items || [];

      if (sessions.length === 0) {
        Alert.alert('No Data', 'No sessions available to export');
        return;
      }

      console.log('✅ [Export] Exporting summary report for', sessions.length, 'sessions');
      await ExportService.exportSummaryReport(sessions);

      Alert.alert(
        'Export Successful',
        `Exported summary report with ${sessions.length} sessions`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ [Export] Summary report failed:', error);
      Alert.alert('Export Failed', error.message || 'Failed to export summary report');
    } finally {
      setLoading(false);
      setExportType(null);
    }
  };

  const renderExportCard = (
    title: string,
    description: string,
    icon: string,
    color: string,
    onPress: () => void,
    type: string
  ) => {
    const isLoading = loading && exportType === type;

    return (
      <TouchableOpacity
        style={[styles.exportCard, { borderLeftColor: color }]}
        onPress={onPress}
        disabled={loading}
        onPressIn={handleInteraction}
      >
        <View style={styles.exportCardIcon}>
          <Ionicons name={icon as any} size={40} color={color} />
        </View>
        <View style={styles.exportCardContent}>
          <Text style={styles.exportCardTitle}>{title}</Text>
          <Text style={styles.exportCardDescription}>{description}</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Ionicons name="chevron-forward" size={24} color="#888" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Export Reports</Text>
            <Text style={styles.subtitle}>Generate and download reports</Text>
          </View>
        </View>
        <LogoutButton variant="icon" size="large" showText={false} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Available Reports</Text>

          {renderExportCard(
            'All Sessions',
            'Export complete list of all stock count sessions with basic details',
            'documents-outline',
            '#00E676',
            exportAllSessions,
            'sessions'
          )}

          {renderExportCard(
            'Session Details',
            'Export detailed count lines for all sessions including item-level data',
            'list-outline',
            '#2196F3',
            exportSessionDetails,
            'details'
          )}

          {renderExportCard(
            'Variance Report',
            'Export only sessions with stock variance for analysis',
            'analytics-outline',
            '#FF5252',
            exportVarianceReport,
            'variance'
          )}

          {renderExportCard(
            'Summary Report',
            'Export aggregated statistics and summary across all sessions',
            'stats-chart-outline',
            '#FFC107',
            exportSummaryReport,
            'summary'
          )}
        </View>

        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={24} color="#888" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Export Information</Text>
            <Text style={styles.infoText}>• Reports are generated in Excel format (.xlsx)</Text>
            <Text style={styles.infoText}>• Files are saved to your device&apos;s Downloads folder</Text>
            <Text style={styles.infoText}>• Large exports may take a few moments to generate</Text>
            <Text style={styles.infoText}>• Check your file manager after export completes</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  exportCardIcon: {
    marginRight: 16,
  },
  exportCardContent: {
    flex: 1,
  },
  exportCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  exportCardDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
    lineHeight: 18,
  },
});
