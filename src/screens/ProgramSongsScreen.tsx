import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';
import { GradientCard, Badge, SearchFilterBar, EmptyState } from '../components/ui';

export function addSong(songIds: string[], newId: string): string[] {
  if (songIds.includes(newId)) return songIds;
  return [...songIds, newId];
}

export function removeSong(songIds: string[], removeId: string): string[] {
  return songIds.filter(id => id !== removeId);
}

interface PraiseSong {
  id: string;
  title?: string;
  key?: string;
  tempo?: string;
  leadSinger?: string;
  conductor?: string;
  audioUrls?: Record<string, string>;
  customParts?: Record<string, string>;
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
  tempo?: string;
  category?: string;
  audioUrls?: Record<string, string>;
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
  const [masterSearchQuery, setMasterSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(false);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await api.songs.getPraiseNightSongs(program.id);
      setProgramSongs(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error('[ProgramSongs] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [program.id]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  async function openAddModal() {
    setMasterSearchQuery('');
    setAddModalVisible(true);
    setLoadingMaster(true);
    try {
      const res = await api.songs.getMasterSongs();
      setMasterSongs(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error('[ProgramSongs] master catalog error:', e);
    } finally {
      setLoadingMaster(false);
    }
  }

  async function handleAddSong(songId: string) {
    const currentIds = programSongs.map(s => s.id);
    const nextIds = addSong(currentIds, songId);
    try {
      await api.programs.updateSongIds(program.id, nextIds);
      setAddModalVisible(false);
      fetchSongs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add song to setlist.');
    }
  }

  async function handleRemoveSong(songId: string, title: string) {
    Alert.alert('Remove Song', `Remove "${title}" from this setlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const currentIds = programSongs.map(s => s.id);
          const nextIds = removeSong(currentIds, songId);
          try {
            await api.programs.updateSongIds(program.id, nextIds);
            fetchSongs();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to remove song.');
          }
        },
      },
    ]);
  }

  async function handleToggleHeard(song: PraiseSong) {
    const isCurrentlyHeard = song.isHeard ?? song.heard ?? song.status === 'heard';
    const next = !isCurrentlyHeard;
    setTogglingId(song.id);
    // Optimistic UI update
    setProgramSongs(prev =>
      prev.map(s => (s.id === song.id ? { ...s, isHeard: next, heard: next } : s))
    );
    try {
      await api.songs.toggleHeard(song.id, next);
    } catch (e: any) {
      // Revert on failure
      setProgramSongs(prev =>
        prev.map(s => (s.id === song.id ? { ...s, isHeard: isCurrentlyHeard, heard: isCurrentlyHeard } : s))
      );
      Alert.alert('Error', e.message || 'Failed to update song rehearsed status.');
    } finally {
      setTogglingId(null);
    }
  }

  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return programSongs;
    const q = searchQuery.toLowerCase();
    return programSongs.filter(
      s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.key || '').toLowerCase().includes(q) ||
        (s.leadSinger || '').toLowerCase().includes(q)
    );
  }, [programSongs, searchQuery]);

  const filteredMaster = useMemo(() => {
    const existingIds = new Set(programSongs.map(s => s.id));
    let list = masterSongs.filter(s => !existingIds.has(s.id));
    if (masterSearchQuery.trim()) {
      const q = masterSearchQuery.toLowerCase();
      list = list.filter(
        s => (s.title || '').toLowerCase().includes(q) || (s.writer || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [masterSongs, programSongs, masterSearchQuery]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {program.name || 'Setlist Queue'}
          </Text>
          <Text style={styles.headerSub}>{programSongs.length} Rehearsal Songs</Text>
        </View>

        <TouchableOpacity
          style={styles.liveConductorBtn}
          onPress={() => navigation.navigate('LiveConductor', { program })}
          activeOpacity={0.8}
        >
          <Ionicons name="radio" size={15} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.liveConductorBtnText}>Live Mode</Text>
        </TouchableOpacity>
      </View>

      {/* Setlist Controls & Add Button */}
      <View style={styles.controlBar}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder="Search setlist songs..."
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal} activeOpacity={0.8}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addBtnText}>Add Song</Text>
        </TouchableOpacity>
      </View>

      {/* Song Queue List */}
      <FlatList
        data={filteredSongs}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchSongs}
            tintColor={Colors.accentBright}
            colors={[Colors.accentBright]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.accentBright} size="large" />
            </View>
          ) : (
            <EmptyState
              icon="musical-notes-outline"
              title={searchQuery ? 'No matching songs' : 'Setlist is Empty'}
              description={
                searchQuery
                  ? 'Try a different search term.'
                  : 'Add songs from the All Ministered catalog to build your rehearsal lineup.'
              }
              actionLabel="Add From Master Catalog"
              onAction={openAddModal}
            />
          )
        }
        renderItem={({ item, index }) => {
          const isHeard = item.isHeard ?? item.heard ?? item.status === 'heard';
          const audioParts = item.audioUrls || item.customParts || {};
          const hasSoprano = Boolean(audioParts.soprano || audioParts.s);
          const hasAlto = Boolean(audioParts.alto || audioParts.a);
          const hasTenor = Boolean(audioParts.tenor || audioParts.t);
          const hasBass = Boolean(audioParts.bass || audioParts.b);

          return (
            <GradientCard variant="surface" style={styles.songCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.indexPill}>
                  <Text style={styles.indexText}>#{index + 1}</Text>
                </View>

                <View style={styles.titleColumn}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {item.title || 'Untitled Song'}
                  </Text>
                  {item.leadSinger ? (
                    <Text style={styles.leadSingerText} numberOfLines={1}>
                      Lead: {item.leadSinger}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={styles.trashBtn}
                  onPress={() => handleRemoveSong(item.id, item.title || 'this song')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#f87171" />
                </TouchableOpacity>
              </View>

              {/* Tags & Vocal Stem Badges */}
              <View style={styles.tagsRow}>
                {item.key ? <Badge label={`Key: ${item.key}`} variant="key" size="sm" /> : null}
                {item.tempo ? <Badge label={`${item.tempo} BPM`} variant="tempo" size="sm" /> : null}

                {/* Stems Availability indicators */}
                <View style={styles.stemGroup}>
                  <Text style={styles.stemGroupLabel}>Stems:</Text>
                  <View style={[styles.stemDot, hasSoprano && styles.stemDotActive]}>
                    <Text style={styles.stemDotText}>S</Text>
                  </View>
                  <View style={[styles.stemDot, hasAlto && styles.stemDotActive]}>
                    <Text style={styles.stemDotText}>A</Text>
                  </View>
                  <View style={[styles.stemDot, hasTenor && styles.stemDotActive]}>
                    <Text style={styles.stemDotText}>T</Text>
                  </View>
                  <View style={[styles.stemDot, hasBass && styles.stemDotActive]}>
                    <Text style={styles.stemDotText}>B</Text>
                  </View>
                </View>
              </View>

              {/* Bottom Rehearsed Status Bar */}
              <View style={styles.heardRow}>
                <View style={styles.heardLeft}>
                  <Ionicons
                    name={isHeard ? 'checkmark-circle' : 'time-outline'}
                    size={16}
                    color={isHeard ? '#34d399' : Colors.textMuted}
                  />
                  <Text style={[styles.heardLabel, isHeard && styles.heardLabelActive]}>
                    {isHeard ? 'Rehearsed / Prepared' : 'Pending Practice'}
                  </Text>
                </View>

                <Switch
                  value={Boolean(isHeard)}
                  onValueChange={() => handleToggleHeard(item)}
                  trackColor={{ false: '#e2e8f0', true: '#a7f3d0' }}
                  thumbColor={isHeard ? '#059669' : '#ffffff'}
                  disabled={togglingId === item.id}
                />
              </View>
            </GradientCard>
          );
        }}
      />

      {/* Add Song from Master Catalog Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add to Rehearsal Setlist</Text>
                <Text style={styles.modalSub}>Browse and select from the master song catalog</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16 }}>
              <SearchFilterBar
                searchQuery={masterSearchQuery}
                onSearchChange={setMasterSearchQuery}
                placeholder="Search master catalog by title or writer..."
              />
            </View>

            {loadingMaster ? (
              <View style={styles.center}>
                <ActivityIndicator color={Colors.accent} size="large" />
              </View>
            ) : (
              <FlatList
                data={filteredMaster}
                keyExtractor={i => i.id}
                contentContainerStyle={styles.masterList}
                ListEmptyComponent={
                  <EmptyState
                    icon="search-outline"
                    title="No Available Songs Found"
                    description="All songs might already be in this setlist or match your search filter."
                  />
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.masterItemCard}
                    onPress={() => handleAddSong(item.id)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.masterItemDetails}>
                      <Text style={styles.masterItemTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.masterItemMeta}>
                        {item.writer ? <Text style={styles.masterItemWriter}>✍️ {item.writer}</Text> : null}
                        {item.key ? <Badge label={item.key} variant="key" size="sm" /> : null}
                      </View>
                    </View>
                    <View style={styles.addIconPill}>
                      <Ionicons name="add" size={16} color="#ffffff" />
                      <Text style={styles.addIconText}>Add</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  liveConductorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  liveConductorBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  songCard: {
    borderRadius: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  indexPill: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  indexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7c3aed',
  },
  titleColumn: {
    flex: 1,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  leadSingerText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  trashBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  stemGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  stemGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginRight: 2,
  },
  stemDot: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stemDotActive: {
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  stemDotText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  heardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  heardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  heardLabelActive: {
    color: '#059669',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  masterList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  masterItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  masterItemDetails: {
    flex: 1,
    marginRight: 10,
  },
  masterItemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  masterItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  masterItemWriter: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  addIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 2,
  },
});
