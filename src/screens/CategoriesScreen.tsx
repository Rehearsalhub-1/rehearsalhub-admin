import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert, Modal, TextInput
} from 'react-native';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import { useWebSocket } from '../hooks/useWebSocket';

interface Category {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

const PRESET_COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

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
      const result = await apiClient.get<{ success: boolean; data: Category[] }>('/categories');
      setCategories(Array.isArray(result.data) ? result.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchCategories(); }, []);

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
        await apiClient.patch(`/categories/${editing.id}`, { name: name.trim(), color });
        setCategories(prev => prev.map(c => c.id === editing.id ? { ...c, name: name.trim(), color } : c));
      } else {
        const res = await apiClient.post<{ success: boolean; data?: { id: string } }>('/categories', {
          name: name.trim(), color, isActive: true,
        });
        const newId = res.data?.id || String(Date.now());
        setCategories(prev => [...prev, { id: newId, name: name.trim(), color, isActive: true }]);
      }
      setModalVisible(false);
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete', 'Delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await apiClient.delete(`/categories/${id}`);
          setCategories(prev => prev.filter(c => c.id !== id));
        },
      },
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.accent} /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Text style={styles.count}>{categories.length} categories</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCategories(); }} tintColor={Colors.accent} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.dot, { backgroundColor: item.color || Colors.accent }]} />
            <Text style={styles.catName}>{item.name}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.delBtn}>
                <Text style={styles.delBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Category' : 'Add Category'}</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Category name"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Color</Text>
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
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  count: { color: Colors.textMuted, fontSize: 13 },
  addBtn: { backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 20 },
  card: {
    backgroundColor: Colors.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  catName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '500', flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: Colors.accentSubtle, borderWidth: 1, borderColor: Colors.accentDim },
  editBtnText: { color: Colors.accentBright, fontSize: 12, fontWeight: '600' },
  delBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: Colors.danger + '22', borderWidth: 1, borderColor: Colors.danger },
  delBtnText: { color: Colors.danger, fontSize: 12, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: Colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.inputBackground, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: Colors.textPrimary, fontSize: 15 },
  colorRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: Colors.accent, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
