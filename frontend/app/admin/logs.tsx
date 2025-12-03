import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function AdminLogs() {
  const { service } = useLocalSearchParams();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Admin Logs</Text>
      {service && <Text style={styles.subtext}>Service: {service}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  text: {
    color: '#fff',
    fontSize: 20,
  },
  subtext: {
    color: '#aaa',
    fontSize: 16,
    marginTop: 10,
  },
});
