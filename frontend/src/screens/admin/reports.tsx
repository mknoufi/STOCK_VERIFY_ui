import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { usePermissions } from '../../hooks/usePermissions';
import { getAvailableReports, generateReport } from '../../services/api';

const isWeb = Platform.OS === 'web';

interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
}

export default function ReportsScreen() {
  const router = useRouter();
  const { hasRole } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (!hasRole('admin')) {
      Alert.alert('Access Denied', 'Admin access required', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      return;
    }
    loadReports();
  }, [hasRole, router]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await getAvailableReports();
      if (response.success && response.data) {
        setReports(response.data.reports || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (reportId: string) => {
    try {
      setGenerating(reportId);
      const response = await generateReport(reportId, 'json');
      if (response.success) {
        Alert.alert(
          'Success',
          `Report '${reportId}' generation started. Check back in a few moments.`
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'users':
        return 'people';
      case 'system':
        return 'server';
      case 'sync':
        return 'sync';
      case 'logs':
        return 'document-text';
      case 'audit':
        return 'shield-checkmark';
      default:
        return 'document';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'users':
        return '#4CAF50';
      case 'system':
        return '#007AFF';
      case 'sync':
        return '#FF9800';
      case 'logs':
        return '#9C27B0';
      case 'audit':
        return '#f44336';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isWeb && styles.headerWeb]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Ionicons name="document-text" size={28} color="#fff" style={styles.titleIcon} />
          <Text style={styles.title}>Reports</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>
          Generate and download system reports. Reports are generated in the background and can be
          downloaded when ready.
        </Text>

        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No reports available</Text>
          </View>
        ) : (
          <View style={styles.reportsList}>
            {reports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <View
                    style={[
                      styles.reportIconContainer,
                      { backgroundColor: `${getCategoryColor(report.category)}20` },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(report.category) as any}
                      size={24}
                      color={getCategoryColor(report.category)}
                    />
                  </View>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportName}>{report.name}</Text>
                    <Text style={styles.reportDescription}>{report.description}</Text>
                    <View style={styles.reportCategory}>
                      <Text
                        style={[
                          styles.reportCategoryText,
                          { color: getCategoryColor(report.category) },
                        ]}
                      >
                        {report.category.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.generateButton,
                    generating === report.id && styles.generateButtonDisabled,
                  ]}
                  onPress={() => handleGenerateReport(report.id)}
                  disabled={generating === report.id}
                >
                  {generating === report.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="download" size={18} color="#fff" />
                      <Text style={styles.generateButtonText}>Generate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'web' ? 20 : 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    ...(Platform.OS === 'web'
      ? {
          position: 'sticky' as const,
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }
      : {}),
  } as any,
  headerWeb: {
    paddingHorizontal: isWeb ? 32 : 16,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  reportsList: {
    gap: 16,
  },
  reportCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }),
  },
  reportHeader: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  reportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
    lineHeight: 20,
  },
  reportCategory: {
    alignSelf: 'flex-start',
  },
  reportCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
