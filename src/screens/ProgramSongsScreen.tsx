import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';

// Pure helper — exported for property-based testing
export function addSong(songIds: string[], newId: string): string[] {
  if (songIds.includes(newId)) return songIds;
  return [...songIds, newId];
}

// Pure helper — exported for property-based testing
export function removeSong(songIds: string[], removeId: string): string[] {
  return songIds.filter(id => id !== removeId);
}

interface PraiseSong {
  id: string;
  title?: string;
  key?: string;
  isActive?: boolean;
  isHeard?: boolean;
  heard?: boolean;
  status?: string;
}

interface MasterSong {
  id: string;
  title?: string;
  writer?: string;
  key?: string;
  category?: string;
}

interface Program {
  id: string;
  name?: string;
  status?: string;
  category?: string;
  songIds?: string[];
}

export default function ProgramSongsScreen({ route, navigation }: any) {
  const program: Program = route.params?.program || {};

  const [programSongs, setProgramSongs] = useState<PraiseSong[]>([]);
  const [masterSongs, setMasterSongs] = useState<MasterSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: PraiseSong[] }>(
        `/songs/praise-night?praiseNightId=${encodeURIComponent(program.id)}`
      );
      setProgramSongs(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error('[ProgramSongs] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [program.id]);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);

  async function openAddModal() {
    setSearchQuery('');
    setAddModalVisible(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: MasterSong[] }>('/songs/master');
      setMasterSongs(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error('[ProgramSongs] master fetch error:', e);
    }
  }

  async function handleAddSong(songId: string) {
    const currentIds = programSongs.map(s => s.id);
    const nextIds = addSong(currentIds, songId);
    try {
      await apiClient.patch(`/programs/${program.id}`, { songIds: nextIds });
      setAddModalVisible(false);
      fetchSongs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add song.');
    }
  }

  async function handleRemoveSong(songId: string, title: string) {
    Alert.alert('Remove Song', `Remove "${title}" from this program?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const currentIds = programSongs.map(s => s.id);
        const nextIds = removeSong(currentIds, songId);
        try {
          await apiClient.patch(`/programs/${program.id}`, { songIds: nextIds });
          fetchSongs();
        } catch (e: any) {
          Alert.alert('Error', e.message || 'Failed to remove song.');
        }
      }},
    ]);
  }

  async function handleToggleHeard(song: PraiseSong) {
    const isCurrentlyHeard = song.isHeard ?? song.heard ?? song.status === 'heard';
    const next = !isCurrentlyHeard;
    setTogglingId(song.id);
    // Optimistic update
    setProgramSongs(prev => prev.map(s => s.id === song.id ? { ...s, isHeard: next, heard: next } : s));
    try {
      await apiClient.patch(`/songs/praise-night/${song.id}`, { isHeard: next });
    } catch (e: any) {
      // Revert on failure
      setProgramSongs(prev => prev.map(s => s.id === song.id ? { ...s, isHeard: isCurrentlyHeard, heard: isCurrentlyHeard } : s));
      Alert.alert('Error', e.message || 'Failed to update song status.');
    } finally {
      setTogglingId(null);
    }
  }

  const isOngoing = (program.status || program.category || '') === 'ongoing';
  const filteredMaster = masterSongs.filter(s => {
    const q = searchQuery.toLowerCase();
    return !q || (s.title || '').toLowerCase().includes(q) || (s.writer || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Program Songs" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{program.name || 'Program Songs'}</Text>
          <Text style={styles.headerSub}>{programSongs.length} songs</Text>
        </View>
        {isOngoing && (
          <TouchableOpacity
            style={styles.liveBtn}
            onPress={() => navigation.navigate('LiveConductor', { program })}
            activeOpacity={0.85}
          >
            <Ionicons name="radio" size={14} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.liveBtnText}>Go Live</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={programSongs}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSongs(); }} tintColor={Colors.accent} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="musical-notes-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No songs in this program yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isHeard = item.isHeard ?? item.heard ?? item.status === 'heard';
          return (
            <View style={styles.songCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                {item.key ? <Text style={styles.songMeta}>Key: {item.key}</Text> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {togglingId === item.id ? (
                  <ActivityIndicator size="small" color={Colors.accent} />
                ) : (
                  <Switch
                    value={isHeard}
                    onValueChange={() => handleToggleHeard(item)}
                    trackColor={{ false: Colors.border, true: Colors.success }}
                    thumbColor="#fff"
                  />
                )}
                <TouchableOpacity onPress={() => handleRemoveSong(item.id, item.title || 'this song')} style={styles.removeBtn}>
                  <Ionicons name="remove-circle-outline" size={22} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Add Song FAB */}
      <TouchableOpacity
        style={{ position: 'absolute', bottom: 28, right: 20, zIndex: 100, width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.accent, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}
        onPress={openAddModal}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Add Song Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: Colors.textPrimary, fontSize: 17, fontWeight: '800' }}>Add Song</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBackground, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: 12, paddingHorizontal: 12, height: 42, gap: 8, marginBottom: 12 }}>
              <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
              <TextInput style={{ flex: 1, color: Colors.textPrimary, fontSize: 13 }} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search master songs..." placeholderTextColor={Colors.textMuted} autoCapitalize="none" />
            </View>
            <FlatList
              data={filteredMaster}
              keyExtractor={i => i.id}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 }}
                  onPress={() => handleAddSong(item.id)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: Colors.textPrimary, fontSize: 14, fontWeight: '700' }}>{item.title || 'Untitled'}</Text>
                    {item.writer ? <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }}>{item.writer}</Text> : null}
                  </View>
                  {item.key ? <Text style={{ color: Colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{item.key}</Text> : null}
                  <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: 'center', paddingVertical: 24 }}>No songs found</Text>}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  headerSub: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  liveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  liveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  songCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  songTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  songMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  removeBtn: { padding: 4 },
});
