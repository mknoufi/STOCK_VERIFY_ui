import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SupervisorLayout } from '@/components/layout/SupervisorLayout';

export default function SessionDetailsScreen() {
    const { id } = useLocalSearchParams();

    return (
        <SupervisorLayout title="Session Details" showBack>
            <View style={styles.container}>
                <Text style={styles.text}>Session ID: {id}</Text>
                <Text style={styles.subtext}>Details coming soon...</Text>
            </View>
        </SupervisorLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtext: {
        fontSize: 16,
        color: '#94A3B8',
    },
});
