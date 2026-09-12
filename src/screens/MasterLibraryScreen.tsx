import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ZoneSongFormModal, { ZoneSong } from '../components/ZoneSongFormModal';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { GradientCard, Badge, EmptyState } from '../components/ui';
import ZoneHeader from '../components/ZoneHeader';
import MasterSongDetailModal, { MasterSong } from '../components/MasterSongDetailModal';
import MasterEditSongModal from '../components/MasterEditSongModal';
import { useAuth } from '../context/AuthContext';
import { customAlert } from '../context/AlertContext';
import { useMasterLibrary } from '../hooks/useMasterLibrary';

export default function MasterLibraryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { activeZone } = useZoneContext();
  const { adminUser } = useAuth();

  // Primary Tab: Master Repertoire vs Zonal Repertoire
  const [activeDomainTab, setActiveDomainTab] = useState<'master' | 'zone'>('master');

  const {
    masterSongs, masterLoading, refreshing,
    zoneSongs, zoneSongsLoading,
    refetch, fetchZoneSongs,
    upsertMasterSong, removeMasterSong, toggleHideMasterSong, removeZoneSong,
  } = useMasterLibrary(activeDomainTab);

  // Master Tab Status Filters
  const [masterStatusTab, setMasterStatusTab] = useState<'active' | 'history' | 'hidden' | 'all'>('active');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedLeadSinger, setSelectedLeadSinger] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Zonal Songs UI State
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZoneSong, setEditingZoneSong] = useState<ZoneSong | null>(null);

  // Detail Sheet & Edit Modal State
  const [selectedDetailSong, setSelectedDetailSong] = useState<MasterSong | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalSong, setEditModalSong] = useState<MasterSong | null>(null);
  const [editingOriginalMaster, setEditingOriginalMaster] = useState<MasterSong | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [availablePrograms, setAvailablePrograms] = useState<{ id: string; name: string }[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    // Fetch canonical 46 Master Collections / Programs
    api.programs.getMasterPrograms().then(res => {
      const progs = Array.isArray(res?.data) ? res.data : [];
      setAvailablePrograms(progs.map(p => ({ id: p.id, name: p.name || p.title || 'Master Program' })));
    }).catch(() => {});

    api.categories.getAll().then(res => {
      const cats = Array.isArray(res?.data) ? res.data : [];
      if (cats.length > 0) {
        setAvailableCategories(cats.map(c => c.name || c.title || String(c)).filter(Boolean));
      }
    }).catch(() => {});
  }, []);

  // Master Stats Calculations
  const masterStats = useMemo(() => {
    const total = masterSongs.length;
    const active = masterSongs.filter(s => !s.isHistory && !s.isHidden).length;
    const history = masterSongs.filter(s => Boolean(s.isHistory)).length;
    const hidden = masterSongs.filter(s => Boolean(s.isHidden)).length;
    const hqOnly = masterSongs.filter(s => Boolean(s.isHQOnly || s.isHqOnly)).length;
    return { total, active, history, hidden, hqOnly };
  }, [masterSongs]);

  // Distinct Master Collections for Filter Bar
  const masterCollectionsList = useMemo(() => {
    const set = new Set<string>();
    availablePrograms.forEach(p => {
      if (p.name?.trim()) set.add(p.name.trim());
    });
    masterSongs.forEach(s => {
      const coll = (s as any).program || (s as any).programName || s.category;
      if (coll?.trim()) set.add(coll.trim());
    });
    return Array.from(set).sort();
  }, [availablePrograms, masterSongs]);

  // Distinct Lead Singers for Filter Bar
  const leadSingersList = useMemo(() => {
    const set = new Set<string>();
    masterSongs.forEach(s => {
      if (s.leadSinger?.trim()) set.add(s.leadSinger.trim());
    });
    return Array.from(set).sort();
  }, [masterSongs]);

  // Filtered Master Songs
  const filteredMasterSongs = useMemo(() => {
    return masterSongs.filter(song => {
      // Non-HQ admins cannot view hidden master songs
      if (!adminUser?.isHQAdmin && song.isHidden) return false;

      // 1. Status Tab filter
      if (masterStatusTab === 'active' && (song.isHistory || song.isHidden)) return false;
      if (masterStatusTab === 'history' && !song.isHistory) return false;
      if (masterStatusTab === 'hidden' && !song.isHidden) return false;

      // 2. Collection filter
      if (selectedCollection !== 'all') {
        const songColl = ((song as any).program || (song as any).programName || song.category || '').toLowerCase();
        if (songColl !== selectedCollection.toLowerCase()) {
          return false;
        }
      }

      // 3. Lead Singer filter
      if (selectedLeadSinger !== 'all' && song.leadSinger?.toLowerCase() !== selectedLeadSinger.toLowerCase()) {
        return false;
      }

      // 4. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (song.title || '').toLowerCase().includes(q);
        const matchesSinger = (song.leadSinger || '').toLowerCase().includes(q);
        const matchesWriter = (song.writer || song.publishedByName || '').toLowerCase().includes(q);
        const matchesCategory = (song.category || '').toLowerCase().includes(q);
        const matchesProgram = (((song as any).program || (song as any).programName) || '').toLowerCase().includes(q);
        const matchesKey = (song.key || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesSinger && !matchesWriter && !matchesCategory && !matchesProgram && !matchesKey) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
    });
  }, [masterSongs, masterStatusTab, selectedCollection, selectedLeadSinger, search, sortOrder]);

  // Filtered Zonal Songs
  const filteredZoneSongs = useMemo(() => {
    if (!search.trim()) return zoneSongs;
    const q = search.toLowerCase();
    return zoneSongs.filter(
      s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.key || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
    );
  }, [search, zoneSongs]);

  // Handlers for Master Songs
  function handleOpenCreateModal() {
    setEditingOriginalMaster(null);
    setEditModalSong(null);
    setEditModalVisible(true);
  }

  function handleOpenEditModal(song: MasterSong) {
    setEditingOriginalMaster(song);
    setEditModalSong(song);
    setEditModalVisible(true);
  }

  async function handleMasterSongSaved(savedMaster: MasterSong, isNew: boolean) {
    upsertMasterSong(savedMaster);
    if (selectedDetailSong?.id === savedMaster.id) setSelectedDetailSong(savedMaster);
    setEditModalVisible(false);
  }

  function handleMasterSongDeleted(songId: string) {
    removeMasterSong(songId);
    if (selectedDetailSong?.id === songId) { setSelectedDetailSong(null); setDetailModalVisible(false); }
    setEditModalVisible(false);
    api.songs.delete(songId).catch(() => {});
  }

  function handleToggleHideSong(song: MasterSong) {
    toggleHideMasterSong(song.id);
  }

  function handleDeleteMasterSong(song: MasterSong) {
    customAlert('Delete Repertoire Track', `Are you sure you want to delete "${song.title}" from the catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeMasterSong(song.id); api.songs.delete(song.id).catch(() => {}); } },
    ]);
  }

  async function handleDeleteZoneSong(song: ZoneSong) {
    customAlert('Delete Zone Song', `Delete "${song.title}" from regional repertoire?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.songs.deleteSubgroupSong(song.id);
            removeZoneSong(song.id);
          } catch (e: any) {
            customAlert('Error', e.message || 'Failed to delete song.');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ZoneHeader title="All Ministered" showBack={true} />

      {/* ── CLEAN TOP CONTROLS BAR (Search + +Song) ──────────────────────── */}
      <View style={styles.cleanControlBar}>
        <View style={styles.cleanSearchBox}>
          <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.cleanSearchInput}
            placeholder={`Search ${filteredMasterSongs.length} songs by title, singer, key...`}
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {adminUser?.isHQAdmin && (
          <TouchableOpacity
            style={styles.cleanAddBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.cleanAddBtnText}>+ Song</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── CLEAN STATUS FILTER TABS ─────────────────────────────────────── */}
      <View style={styles.cleanTabsRow}>
        {[
          { id: 'all', label: 'All', count: masterStats.total },
          { id: 'active', label: 'Active', count: masterStats.active },
          { id: 'history', label: 'History', count: masterStats.history },
          ...(adminUser?.isHQAdmin ? [{ id: 'hidden', label: 'Hidden', count: masterStats.hidden }] : []),
        ].map(t => {
          const isActive = masterStatusTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.cleanTabBtn, isActive && styles.cleanTabBtnActive]}
              onPress={() => setMasterStatusTab(t.id as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.cleanTabBtnText, isActive && styles.cleanTabBtnTextActive]}>
                {t.label} ({t.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── MASTER PROGRAM / COLLECTION FILTER PILLS ──────────────────────── */}
      <View style={styles.collectionFilterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.collectionFilterScroll}
        >
          <TouchableOpacity
            style={[styles.collectionPill, selectedCollection === 'all' && styles.collectionPillActive]}
            onPress={() => setSelectedCollection('all')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="albums-outline"
              size={12}
              color={selectedCollection === 'all' ? '#7c3aed' : '#64748b'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.collectionPillText, selectedCollection === 'all' && styles.collectionPillTextActive]}>
              All Collections ({masterSongs.length})
            </Text>
          </TouchableOpacity>
          {masterCollectionsList.map(coll => {
            const isSelected = selectedCollection.toLowerCase() === coll.toLowerCase();
            const count = masterSongs.filter(s => ((s as any).program || (s as any).programName || s.category || '').toLowerCase() === coll.toLowerCase()).length;
            return (
              <TouchableOpacity
                key={coll}
                style={[styles.collectionPill, isSelected && styles.collectionPillActive]}
                onPress={() => setSelectedCollection(isSelected ? 'all' : coll)}
                activeOpacity={0.8}
              >
                <Text style={[styles.collectionPillText, isSelected && styles.collectionPillTextActive]}>
                  {coll}{count > 0 ? ` (${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── CLEAN MASTER CATALOG SONG FEED ──────────────────────────────────── */}
      <FlashList
        data={filteredMasterSongs}
        keyExtractor={i => i.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 30 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetch}
            tintColor="#7c3aed"
            colors={['#7c3aed']}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          masterLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#7c3aed" size="large" />
            </View>
          ) : (
            <EmptyState
              icon="musical-notes-outline"
              title="No Songs Found"
              description={
                search || masterStatusTab !== 'all' || selectedCollection !== 'all'
                  ? 'No songs match your search or collection filter.'
                  : 'The master catalog has no registered songs yet.'
              }
              actionLabel={adminUser?.isHQAdmin ? "+ Add Master Song" : undefined}
              onAction={adminUser?.isHQAdmin ? handleOpenCreateModal : undefined}
            />
          )
        }
        renderItem={({ item }) => {
          const isHq = Boolean(item.isHQOnly || item.isHqOnly);
          const hasStems = Boolean(
            item.audioUrls?.soprano ||
            item.audioUrls?.alto ||
            item.audioUrls?.tenor ||
            item.audioUrls?.bass
          );

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setSelectedDetailSong(item);
                setDetailModalVisible(true);
              }}
              style={[
                styles.cleanCard,
                item.isHidden && styles.cleanCardHidden,
              ]}
            >
              {/* Card Header: Title & Key / Tempo */}
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.cardTitleText} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardSubtitleText} numberOfLines={1}>
                    {item.leadSinger ? `Lead: ${item.leadSinger}` : ''}
                    {item.leadSinger && (item.writer || item.publishedByName) ? ' • ' : ''}
                    {item.writer || item.publishedByName ? `Writer: ${item.writer || item.publishedByName}` : ''}
                  </Text>
                </View>

                <View style={styles.keyTempoGroup}>
                  {item.key ? (
                    <View style={styles.keyBadge}>
                      <Text style={styles.keyBadgeText}>Key: {item.key}</Text>
                    </View>
                  ) : null}
                  {item.tempo ? (
                    <View style={styles.tempoBadge}>
                      <Text style={styles.tempoBadgeText}>{item.tempo} BPM</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Card Footer: Tags & Action Icons */}
              <View style={styles.cardFooterRow}>
                <View style={styles.cardTagsRow}>
                  {(item.program || (item as any).programName || item.category) ? (
                    <View style={styles.categoryPill}>
                      <Ionicons name="albums-outline" size={10} color="#64748b" style={{ marginRight: 3 }} />
                      <Text style={styles.categoryPillText}>
                        {item.program || (item as any).programName || item.category}
                      </Text>
                    </View>
                  ) : null}

                  {hasStems && (
                    <View style={styles.stemsPill}>
                      <Ionicons name="layers-outline" size={11} color="#7c3aed" style={{ marginRight: 3 }} />
                      <Text style={styles.stemsPillText}>Stems</Text>
                    </View>
                  )}

                  {isHq && (
                    <View style={styles.hqPill}>
                      <Ionicons name="lock-closed" size={10} color="#4338ca" style={{ marginRight: 2 }} />
                      <Text style={styles.hqPillText}>HQ Only</Text>
                    </View>
                  )}

                  {item.isHidden && (
                    <View style={styles.hiddenPill}>
                      <Text style={styles.hiddenPillText}>Hidden</Text>
                    </View>
                  )}
                </View>

                {adminUser?.isHQAdmin ? (
                  <View style={styles.cardActionsGroup}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleOpenEditModal(item)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Ionicons name="pencil" size={15} color="#7c3aed" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleToggleHideSong(item)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Ionicons
                        name={item.isHidden ? 'eye-outline' : 'eye-off-outline'}
                        size={15}
                        color="#94a3b8"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleDeleteMasterSong(item)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={15} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.cardActionsGroup}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        setSelectedDetailSong(item);
                        setDetailModalVisible(true);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Ionicons name="eye-outline" size={16} color="#7c3aed" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── DETAIL INSPECTOR MODAL ─────────────────────────────────────────── */}
      <MasterSongDetailModal
        visible={detailModalVisible}
        song={selectedDetailSong}
        onClose={() => setDetailModalVisible(false)}
        onEdit={songToEdit => {
          setDetailModalVisible(false);
          handleOpenEditModal(songToEdit);
        }}
        canEdit={Boolean(adminUser?.isHQAdmin)}
      />

      {/* ── CREATE / EDIT MASTER SONG MODAL ────────────────────────────────── */}
      <MasterEditSongModal
        visible={editModalVisible}
        song={editModalSong}
        mode={editModalSong ? 'edit' : 'create'}
        onClose={() => {
          setEditModalVisible(false);
          setEditModalSong(null);
          setEditingOriginalMaster(null);
        }}
        onSaved={handleMasterSongSaved}
      />

      {/* ── ZONAL REGIONAL SONG FORM MODAL ─────────────────────────────────── */}
      {showZoneForm && (
        <ZoneSongFormModal
          visible={showZoneForm}
          onClose={() => {
            setShowZoneForm(false);
            setEditingZoneSong(null);
          }}
          onSaved={() => {
            setShowZoneForm(false);
            setEditingZoneSong(null);
            fetchZoneSongs();
          }}
          editSong={editingZoneSong}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerRestricted: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  restrictedIconBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  restrictedSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  goBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  goBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  cleanControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  cleanSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 42,
  },
  cleanSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  cleanAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cleanAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  cleanTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  cleanTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cleanTabBtnActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  cleanTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  cleanTabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 10,
  },
  cleanCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cleanCardHidden: {
    opacity: 0.6,
    backgroundColor: '#f8fafc',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  cardSubtitleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  keyTempoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  keyBadge: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  keyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7c3aed',
  },
  tempoBadge: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  tempoBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#475569',
  },
  collectionFilterContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  collectionFilterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  collectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  collectionPillActive: {
    backgroundColor: '#f5f3ff',
    borderColor: '#c4b5fd',
  },
  collectionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  collectionPillTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  stemsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stemsPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
  },
  hqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hqPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338ca',
  },
  hiddenPill: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hiddenPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
