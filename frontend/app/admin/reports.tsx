import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AdminReports() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Admin Reports</Text>
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
});
