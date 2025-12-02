import axios from 'axios';
import apiClient from './httpClient';

export interface Note {
  id?: string;
  tenantId?: string;
  userId?: string;
  createdAt?: string;
  tags?: string[];
  body: string;
}

export async function listNotes(params?: { q?: string; page?: number; pageSize?: number }) {
  const res = await apiClient.get('/api/notes', { params });
  return res.data;
}

export async function createNote(note: Note) {
  const res = await apiClient.post('/api/notes', note);
  return res.data;
}

export async function updateNote(id: string, note: Partial<Note>) {
  const res = await apiClient.put(`/api/notes/${id}`, note);
  return res.data;
}

export async function deleteNote(id: string) {
  const res = await apiClient.delete(`/api/notes/${id}`);
  return res.data;
}
