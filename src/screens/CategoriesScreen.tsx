import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import { useWebSocket } from '../hooks/useWebSocket';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';
import ZoneHeader from '../components/ZoneHeader';
import { customAlert } from '../context/AlertContext';

interface Category {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

const PRESET_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function CategoriesScreen({ navigation }: any) {
  const { isChurchMode } = useZoneContext();
  const { adminUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const [songs, setSongs] = useState<any[]>([]);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

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

  async function fetchSongs() {
    try {
      const res = await api.songs.getMasterSongs();
      setSongs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchCategories();
    fetchSongs();
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
    if (!name.trim()) { customAlert('Error', 'Name is required'); return; }
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
      customAlert('Error', e.message);
    }
  }

  async function handleDelete(id: string) {
    customAlert('Delete', 'Delete this category?', [
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

  if (isChurchMode && !adminUser?.isHQAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Categories & Tags" showZonePicker={false} />
        <View style={styles.centerNotice}>
          <View style={styles.noticeIconWrap}>
            <Ionicons name="pricetags-outline" size={44} color="#059669" />
          </View>
          <Text style={styles.noticeTitle}>Central Taxonomy</Text>
          <Text style={styles.noticeSub}>
            Rehearsal song categories and tags are defined centrally at the Zonal & HQ Admin level to maintain consistent taxonomy across programs.
          </Text>
          <TouchableOpacity
            style={styles.noticeBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.noticeBackBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Categories & Tags" showZonePicker={false} />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader
        title="Categories & Tags"
        showZonePicker={false}
        rightElement={
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.addBtnText}>New</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.topBar}>
        <Text style={styles.count}>{categories.length} classifications configured</Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCategories();
              fetchSongs();
            }}
            tintColor={Colors.accent}
          />
        }
        renderItem={({ item }) => {
          const isExpanded = expandedCatId === item.id;
          const matchingSongs = songs.filter(
            s => (s.category || '').trim().toLowerCase() === item.name.trim().toLowerCase()
          );

          return (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardHeader}
                onPress={() => setExpandedCatId(isExpanded ? null : item.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.dot, { backgroundColor: item.color || '#7c3aed' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.catName}>{item.name}</Text>
                  <Text style={styles.songCount}>{matchingSongs.length} songs</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item.id)}>
                    <Text style={styles.delBtnText}>Delete</Text>
                  </TouchableOpacity>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#94a3b8"
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.expandedSongList}>
                  {matchingSongs.length === 0 ? (
                    <Text style={styles.emptyCategoryText}>No songs tagged under "{item.name}" yet.</Text>
                  ) : (
                    matchingSongs.map((s, idx) => (
                      <View key={s.id || idx} style={styles.songRow}>
                        <Ionicons name="musical-note" size={14} color={item.color || Colors.accent} style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.songTitle} numberOfLines={1}>{s.title || 'Untitled'}</Text>
                          <Text style={styles.songMeta}>
                            {s.key ? `Key: ${s.key}` : ''}
                            {s.tempo ? ` · ${s.tempo} BPM` : ''}
                            {s.leadSinger ? ` · Lead: ${s.leadSinger}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior='padding'
          style={{ flex: 1 }}
        >
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
        </KeyboardAvoidingView>
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
    backgroundColor: '#ffffff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#64748b', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  catName: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  songCount: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ddd6fe' },
  editBtnText: { color: '#7c3aed', fontSize: 12, fontWeight: '700' },
  delBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  delBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  expandedSongList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  emptyCategoryText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  songTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  songMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
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
  centerNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#ffffff',
  },
  noticeIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  noticeSub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  noticeBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  noticeBackBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
