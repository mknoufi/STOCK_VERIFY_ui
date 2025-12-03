import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/httpClient';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'down';
    mongodb: {
        status: string;
        is_running: boolean;
    };
    sql_server?: {
        status: string;
        is_running: boolean;
    };
}

export const SystemStatus: React.FC = () => {
    const [status, setStatus] = useState<HealthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    const checkHealth = async () => {
        try {
            setLoading(true);
            const response = await api.get('/health');
            setStatus(response.data);
        } catch {
            setStatus({
                status: 'down',
                mongodb: { status: 'unknown', is_running: false },
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkHealth();
        // Poll every 30 seconds
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (isHealthy: boolean) => (isHealthy ? '#10B981' : '#EF4444');
    const getStatusIcon = (isHealthy: boolean) => (isHealthy ? 'checkmark-circle' : 'alert-circle');

    if (!status) return null;

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.header}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
            >
                <View style={styles.statusIndicator}>
                    <View style={[styles.dot, { backgroundColor: getStatusColor(status.status === 'healthy') }]} />
                    <Text style={styles.statusText}>
                        System: {status.status.toUpperCase()}
                    </Text>
                </View>
                {loading && <ActivityIndicator size="small" color="#94A3B8" style={styles.loader} />}
            </TouchableOpacity>

            {expanded && (
                <View style={styles.details}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>MongoDB</Text>
                        <Ionicons
                            name={getStatusIcon(status.mongodb.is_running)}
                            size={16}
                            color={getStatusColor(status.mongodb.is_running)}
                        />
                    </View>
                    {status.sql_server && (
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>SQL Server</Text>
                            <Ionicons
                                name={getStatusIcon(status.sql_server.is_running)}
                                size={16}
                                color={getStatusColor(status.sql_server.is_running)}
                            />
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
        alignSelf: 'center',
        marginTop: 16,
        minWidth: 160,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        color: '#F1F5F9',
        fontSize: 12,
        fontWeight: '600',
    },
    loader: {
        marginLeft: 8,
    },
    details: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#334155',
        gap: 4,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    detailLabel: {
        color: '#94A3B8',
        fontSize: 11,
    },
});
