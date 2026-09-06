import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import { useWebSocket } from '../hooks/useWebSocket';

interface Category {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

const PRESET_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  async function fetchCategories() {
    try {
      const result = await api.categories.getAll();
      setCategories(Array.isArray(result.data) ? result.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  // Live updates via WebSocket
  useWebSocket('categories', 'all', () => { fetchCategories(); }, true);

  function openAdd() {
    setEditing(null);
    setName('');
    setColor(PRESET_COLORS[0]);
    setModalVisible(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setName(cat.name);
    setColor(cat.color || PRESET_COLORS[0]);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      if (editing) {
        await api.categories.update(editing.id, { name: name.trim(), color });
        setCategories(prev => prev.map(c => c.id === editing.id ? { ...c, name: name.trim(), color } : c));
      } else {
        const res = await api.categories.create({
          name: name.trim(), color, isActive: true,
        });
        const newId = res.data?.id || String(Date.now());
        setCategories(prev => [...prev, { id: newId, name: name.trim(), color, isActive: true }]);
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete', 'Delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await api.categories.delete(id);
          setCategories(prev => prev.filter(c => c.id !== id));
        },
      },
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.count}>{categories.length} categories configured</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.addBtnText}>New Category</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCategories(); }} tintColor={Colors.accent} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.dot, { backgroundColor: item.color || '#7c3aed' }]} />
            <Text style={styles.catName}>{item.name}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item.id)}>
                <Text style={styles.delBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Category' : 'New Category'}</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Praise, Worship, Hymns"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Color Badge</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  count: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  addBtn: { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  catName: { color: '#0f172a', fontSize: 14, fontWeight: '700', flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  editBtnText: { color: '#7c3aed', fontSize: 12, fontWeight: '700' },
  delBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  delBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  modalTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginBottom: 16 },
  label: { color: '#475569', fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: '#0f172a', fontSize: 14 },
  colorRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: '#0f172a' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { color: '#334155', fontSize: 14, fontWeight: '700' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
