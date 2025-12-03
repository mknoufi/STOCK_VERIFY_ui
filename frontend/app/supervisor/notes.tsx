import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { listNotes, createNote, deleteNote, Note } from '../../src/services/api/notesApi';
import { flags } from '../../src/constants/flags';
import { PullToRefresh } from '../../src/components/PullToRefresh';
import { StatusBar } from 'expo-status-bar';

export default function NotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [newNote, setNewNote] = React.useState('');

  const loadNotes = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNotes(query ? { q: query } : undefined);
      setNotes(data.items || data || []);
    } catch {
      // Errors handled globally
    } finally {
      setLoading(false);
    }
  }, [query]);

  React.useEffect(() => {
    if (!flags.enableNotes) {
      // If disabled, navigate back to dashboard
      router.replace('/supervisor/dashboard');
      return;
    }
    loadNotes();
  }, [loadNotes, router]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadNotes();
    } finally {
      setRefreshing(false);
    }
  }, [loadNotes]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    await createNote({ body: newNote.trim() });
    setNewNote('');
    await loadNotes();
  };

  const removeNote = async (id?: string) => {
    if (!id) return;
    await deleteNote(id);
    await loadNotes();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notes</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#888" />
        <TextInput
          placeholder="Search notes..."
          placeholderTextColor="#888"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={loadNotes}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.addRow}>
        <TextInput
          placeholder="Write a new note..."
          placeholderTextColor="#888"
          value={newNote}
          onChangeText={setNewNote}
          style={styles.addInput}
        />
        <TouchableOpacity onPress={addNote} style={styles.addButton}>
          <Ionicons name="add-circle-outline" size={24} color="#00E676" />
        </TouchableOpacity>
      </View>

      <PullToRefresh refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.list}>
          {notes.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={64} color="#888" />
              <Text style={styles.emptyText}>{loading ? 'Loading...' : 'No notes yet'}</Text>
            </View>
          )}
          {notes.map((n: Note) => (
            <View key={n.id || Math.random().toString(36)} style={styles.card}>
              <Text style={styles.cardBody}>{n.body}</Text>
              <View style={styles.cardRow}>
                <Text style={styles.cardMeta}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</Text>
                <TouchableOpacity onPress={() => removeNote(n.id)}>
                  <Ionicons name="trash-outline" size={20} color="#FF5252" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </PullToRefresh>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 60, backgroundColor: '#2a2a2a' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  iconButton: { padding: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#333' },
  searchInput: { flex: 1, color: '#fff' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16 },
  addInput: { flex: 1, color: '#fff', borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6 },
  addButton: { padding: 6 },
  list: { padding: 16 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyText: { color: '#888' },
  card: { backgroundColor: '#222', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#333', marginBottom: 12 },
  cardBody: { color: '#fff' },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  cardMeta: { color: '#888', fontSize: 12 },
});
