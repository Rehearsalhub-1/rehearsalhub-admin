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
  Image,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { EmptyState } from '../components/ui';
import { api } from '../services/api';
import MasterEditSongModal from '../components/MasterEditSongModal';
import { MasterSong } from '../components/MasterSongDetailModal';
import { useAuth } from '../context/AuthContext';
import { customAlert } from '../context/AlertContext';
import { useMasterLibrary } from '../hooks/useMasterLibrary';
import ReorderCategoriesModal from './programSongs/ReorderCategoriesModal';
import ImportToMasterModal from '../components/ImportToMasterModal';

const FlashListAny = FlashList as any;

export default function MasterLibraryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { adminUser } = useAuth();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const {
    masterSongs,
    masterLoading,
    loadingMore,
    refreshing,
    refetch,
    loadMore,
    upsertMasterSong,
    removeMasterSong,
  } = useMasterLibrary('master', debouncedSearch);

  // Status Tab Filters
  const [masterStatusTab, setMasterStatusTab] = useState<'all' | 'active' | 'history' | 'hidden'>('all');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');

  // Edit Modal State (Direct 1-tap workspace)
  const [editModalSong, setEditModalSong] = useState<MasterSong | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);

  // Reorder Collections State
  const [reorderModalVisible, setReorderModalVisible] = useState(false);
  const [reorderCollectionsList, setReorderCollectionsList] = useState<string[]>([]);
  const [isSavingCollectionsOrder, setIsSavingCollectionsOrder] = useState(false);
  const [savedCollectionOrder, setSavedCollectionOrder] = useState<string[]>([]);

  useEffect(() => {
    api.settings.get('master_collections_order')
      .then(res => {
        const order = res?.data?.order || res?.data?.value?.order;
        if (Array.isArray(order) && order.length > 0) {
          setSavedCollectionOrder(order);
        }
      })
      .catch(() => {});
  }, []);

  // Compute metrics
  const masterStats = useMemo(() => {
    const total = masterSongs.length;
    const active = masterSongs.filter(s => !s.isHistory && !s.isHidden).length;
    const history = masterSongs.filter(s => Boolean(s.isHistory)).length;
    const hidden = masterSongs.filter(s => Boolean(s.isHidden)).length;
    return { total, active, history, hidden };
  }, [masterSongs]);

  // Distinct Collections for horizontal filter chips
  const masterCollectionsList = useMemo(() => {
    const set = new Set<string>();
    masterSongs.forEach(s => {
      if (Array.isArray(s.categories) && s.categories.length > 0) {
        s.categories.forEach(c => { if (c?.trim()) set.add(c.trim()); });
      }
      const coll = (s as any).program || (s as any).programName || s.category;
      if (coll?.trim()) set.add(coll.trim());
    });
    const allList = Array.from(set);
    if (savedCollectionOrder && savedCollectionOrder.length > 0) {
      const orderMap = new Map<string, number>();
      savedCollectionOrder.forEach((name, i) => orderMap.set(name.toLowerCase(), i));
      return allList.sort((a, b) => {
        const idxA = orderMap.has(a.toLowerCase()) ? orderMap.get(a.toLowerCase())! : 9999;
        const idxB = orderMap.has(b.toLowerCase()) ? orderMap.get(b.toLowerCase())! : 9999;
        if (idxA !== idxB) return idxA - idxB;
        return a.localeCompare(b);
      });
    }
    return allList.sort();
  }, [masterSongs, savedCollectionOrder]);

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    masterSongs.forEach(s => {
      const songColl = ((s as any).program || (s as any).programName || s.category || '').trim();
      const songCats = Array.isArray(s.categories) && s.categories.length > 0 ? s.categories : (songColl ? [songColl] : []);
      songCats.forEach(c => {
        if (c) counts[c] = (counts[c] || 0) + 1;
      });
    });
    return counts;
  }, [masterSongs]);

  const handleOpenReorderModal = () => {
    setReorderCollectionsList([...masterCollectionsList]);
    setReorderModalVisible(true);
  };

  const handleMoveCollection = (index: number, direction: 'up' | 'down') => {
    const list = [...reorderCollectionsList];
    if (direction === 'up' && index > 0) {
      [list[index - 1], list[index]] = [list[index], list[index - 1]];
    } else if (direction === 'down' && index < list.length - 1) {
      [list[index + 1], list[index]] = [list[index], list[index + 1]];
    }
    setReorderCollectionsList(list);
  };

  const handleResetCollectionReorder = () => {
    const list = [...masterCollectionsList].sort();
    setReorderCollectionsList(list);
  };

  const handleSaveCollectionOrder = async () => {
    setIsSavingCollectionsOrder(true);
    try {
      await api.settings.update('master_collections_order', { order: reorderCollectionsList });
      setSavedCollectionOrder(reorderCollectionsList);
      setReorderModalVisible(false);
      customAlert('Collections Reordered', 'Collection order saved successfully.');
    } catch (e: any) {
      customAlert('Error', e?.message || 'Failed to save collection order.');
    } finally {
      setIsSavingCollectionsOrder(false);
    }
  };

  // Filtered master songs
  const filteredMasterSongs = useMemo(() => {
    return masterSongs.filter(song => {
      if (masterStatusTab === 'active' && (song.isHistory || song.isHidden)) return false;
      if (masterStatusTab === 'history' && !song.isHistory) return false;
      if (masterStatusTab === 'hidden' && !song.isHidden) return false;

      if (selectedCollection !== 'all') {
        const songColl = ((song as any).program || (song as any).programName || song.category || '').toLowerCase();
        const songCats = Array.isArray(song.categories) ? song.categories.map(c => (c || '').toLowerCase()) : [];
        const target = selectedCollection.toLowerCase();
        if (songColl !== target && !songCats.includes(target)) {
          return false;
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (song.title || '').toLowerCase().includes(q);
        const matchesSinger = (song.leadSinger || '').toLowerCase().includes(q);
        const matchesWriter = (song.writer || song.publishedByName || '').toLowerCase().includes(q);
        const matchesKey = (song.key || '').toLowerCase().includes(q);
        const matchesConductor = (song.conductor || '').toLowerCase().includes(q);
        const matchesColl = ((song as any).program || (song as any).programName || song.category || '').toLowerCase().includes(q);
        const matchesCats = Array.isArray(song.categories) && song.categories.some(c => (c || '').toLowerCase().includes(q));
        if (!matchesTitle && !matchesSinger && !matchesWriter && !matchesKey && !matchesConductor && !matchesColl && !matchesCats) {
          return false;
        }
      }

      return true;
    });
  }, [masterSongs, masterStatusTab, selectedCollection, search]);

  // Actions
  function handleOpenCreateModal() {
    setEditModalSong(null);
    setEditModalVisible(true);
  }

  function handleOpenSong(song: MasterSong) {
    setEditModalSong(song);
    setEditModalVisible(true);
  }

  async function handleMasterSongSaved(savedMaster: MasterSong) {
    upsertMasterSong(savedMaster);
    setEditModalVisible(false);
  }

  function handleMasterSongDeleted(songId: string) {
    removeMasterSong(songId);
    setEditModalVisible(false);
    api.songs.delete(songId).catch(() => {});
  }

  // Action Menu
  const handleOpenActionMenu = () => {
    customAlert('All Ministered', 'Select an option', [
      { text: 'Add Song', onPress: handleOpenCreateModal },
      { text: 'Import from Rehearsals', onPress: () => setImportModalVisible(true) },
      { text: 'Reorder Collections', onPress: handleOpenReorderModal },
      { text: 'Refresh', onPress: refetch },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!adminUser?.isHQAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBackBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.navTitleText}>All Ministered</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.centerRestricted}>
          <View style={styles.restrictedIconBox}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#7c3aed" />
          </View>
          <Text style={styles.restrictedTitle}>HQ Restricted</Text>
          <Text style={styles.restrictedSub}>
            Reserved for central Loveworld Singers HQ administrators.
          </Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.goBackBtnText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── 1. HIGH-END SLIM NAVIGATION BAR ────────────────────────────── */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBackBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.navTitleCenter}>
          <Text style={styles.navTitleText} numberOfLines={1}>All Ministered</Text>
          <Text style={styles.navMetaSub} numberOfLines={1}>
            {masterStats.total} Songs
          </Text>
        </View>

        <View style={styles.navRightRow}>
          <TouchableOpacity
            style={styles.addBtnNav}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.addBtnNavText}>Song</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleOpenActionMenu} style={styles.navActionBtn} activeOpacity={0.75}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. STREAMLINED 2-ROW FILTER BAR ────────────────────────────── */}
      <View style={styles.filterSection}>
        {/* Row 1: Search + Status Segment */}
        <View style={styles.searchAndFilterRow}>
          <View style={styles.searchBarWrap}>
            <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search title, singer, key..."
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

          <View style={styles.segmentContainer}>
            {([
              { id: 'all' as const, label: 'All', count: masterStats.total },
              { id: 'active' as const, label: 'Active', count: masterStats.active },
              { id: 'history' as const, label: 'History', count: masterStats.history },
              { id: 'hidden' as const, label: 'Hidden', count: masterStats.hidden },
            ]).map(f => {
              const active = masterStatusTab === f.id;
              return (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.segmentTab, active && styles.segmentTabActive]}
                  onPress={() => setMasterStatusTab(f.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.segmentTabText, active && styles.segmentTabTextActive]}>
                    {f.label} ({f.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Row 2: Horizontal Collection Chips */}
        {masterCollectionsList.length > 0 && (
          <View style={styles.categoryBarWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryBarScroll}>
              <TouchableOpacity
                style={[styles.catChip, selectedCollection === 'all' && styles.catChipActive]}
                onPress={() => setSelectedCollection('all')}
                activeOpacity={0.75}
              >
                <Text style={[styles.catChipText, selectedCollection === 'all' && styles.catChipTextActive]}>
                  All ({masterSongs.length})
                </Text>
              </TouchableOpacity>

              {masterCollectionsList.map(coll => {
                const isSelected = selectedCollection.toLowerCase() === coll.toLowerCase();
                const count = collectionCounts[coll] || 0;
                return (
                  <TouchableOpacity
                    key={coll}
                    style={[styles.catChip, isSelected && styles.catChipActive]}
                    onPress={() => setSelectedCollection(isSelected ? 'all' : coll)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                      {coll} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.reorderChipBtn}
                onPress={handleOpenReorderModal}
                activeOpacity={0.75}
              >
                <Ionicons name="swap-vertical" size={13} color="#7c3aed" style={{ marginRight: 3 }} />
                <Text style={styles.reorderChipText}>Reorder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── 3. SPACIOUS, TOUCH-FRIENDLY TRACKLIST ───────────────────────── */}
      <FlashListAny
        data={filteredMasterSongs}
        keyExtractor={(item: MasterSong) => item.id}
        estimatedItemSize={68}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 20 }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor={Colors.accent} colors={[Colors.accent]} />
        }
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#7c3aed" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          masterLoading ? (
            <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
          ) : (
            <EmptyState
              icon="musical-notes-outline"
              title={search ? 'No Matching Songs' : 'Catalog is Empty'}
              description={search ? `No songs found for "${search}".` : 'Tap "+ Song" above to create your first master song.'}
              actionLabel="+ Add Song"
              onAction={handleOpenCreateModal}
            />
          )
        }
        renderItem={({ item, index }: { item: MasterSong; index: number }) => {
          const hasStems = Boolean(
            item.audioUrls?.soprano ||
            item.audioUrls?.alto ||
            item.audioUrls?.tenor ||
            item.audioUrls?.bass
          );
          const hasAudio = hasStems || Boolean(item.audioUrl || item.audioFile);
          const metaParts = [
            item.leadSinger || item.writer || null,
            item.key ? `Key ${item.key}` : null,
            item.tempo ? `${item.tempo} BPM` : null,
            item.program || (item as any).programName || item.category || null,
          ].filter(Boolean);

          return (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => handleOpenSong(item)}
              style={[
                styles.trackCard,
                item.isHidden && styles.trackCardHidden,
              ]}
            >
              {/* Left: Thumbnail Artwork or Index Box */}
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.artworkThumb} resizeMode="cover" />
              ) : (
                <View style={styles.trackIndexBox}>
                  <Text style={styles.trackIndexNum}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                </View>
              )}

              {/* Center: Title & Musical Metadata */}
              <View style={styles.trackInfoCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.trackTitleText} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.isHQOnly && (
                    <View style={styles.hqPillSmall}>
                      <Text style={styles.hqPillSmallText}>HQ</Text>
                    </View>
                  )}
                  {item.isHidden && (
                    <View style={styles.hiddenPillSmall}>
                      <Text style={styles.hiddenPillSmallText}>Hidden</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.trackMetaText} numberOfLines={1}>
                  {metaParts.length > 0 ? metaParts.join(' • ') : 'Master Ministry Arrangement'}
                </Text>
              </View>

              {/* Right: Audio / Stems Indicator & Chevron */}
              <View style={styles.trackRightCol}>
                {hasStems ? (
                  <View style={styles.stemsBadgeSmall}>
                    <Ionicons name="layers" size={13} color="#7c3aed" />
                  </View>
                ) : hasAudio ? (
                  <View style={styles.audioBadgeSmall}>
                    <Ionicons name="musical-note" size={13} color="#059669" />
                  </View>
                ) : null}

                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── 4. ALL-IN-ONE DIRECT EDIT / WORKSPACE MODAL ────────────────── */}
      <MasterEditSongModal
        visible={editModalVisible}
        song={editModalSong}
        mode={editModalSong ? 'edit' : 'create'}
        onClose={() => {
          setEditModalVisible(false);
          setEditModalSong(null);
        }}
        onSaved={handleMasterSongSaved}
        onDelete={handleMasterSongDeleted}
      />

      {/* ── 5. REORDER MASTER COLLECTIONS MODAL ────────────────────────── */}
      <ReorderCategoriesModal
        visible={reorderModalVisible}
        onClose={() => setReorderModalVisible(false)}
        categoriesList={reorderCollectionsList}
        categoryCounts={collectionCounts}
        onMoveCategory={handleMoveCollection}
        onReset={handleResetCollectionReorder}
        onSave={handleSaveCollectionOrder}
        isSaving={isSavingCollectionsOrder}
      />

      {/* ── 6. IMPORT FROM PROGRAM MODAL ──────────────────────────────── */}
      <ImportToMasterModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImportSuccess={(newSongs) => {
          if (Array.isArray(newSongs)) {
            newSongs.forEach(s => upsertMasterSong(s));
          }
          refetch();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  center: {
    paddingVertical: 60,
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

  /* Navigation Bar */
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navBackBtn: { padding: 6, borderRadius: 10, backgroundColor: '#f8fafc' },
  navTitleCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 12 },
  navTitleText: { fontSize: 16, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  navMetaSub: { fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 1 },
  navRightRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addBtnNav: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 10,
    paddingVertical: 5.5,
    borderRadius: 8,
  },
  addBtnNavText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  navActionBtn: { padding: 6, borderRadius: 10, backgroundColor: '#f8fafc' },

  /* Streamlined Filter Section */
  filterSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    height: 34,
  },
  searchBarInput: { flex: 1, fontSize: 12, color: '#0f172a', padding: 0 },

  segmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
    height: 34,
  },
  segmentTab: {
    paddingHorizontal: 7,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  segmentTabText: { fontSize: 10.5, fontWeight: '600', color: '#64748b' },
  segmentTabTextActive: { color: '#7c3aed', fontWeight: '700' },

  categoryBarWrap: {
    marginTop: 2,
  },
  categoryBarScroll: {
    gap: 6,
    alignItems: 'center',
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catChipActive: {
    backgroundColor: '#f5f3ff',
    borderColor: '#c4b5fd',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  catChipTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  reorderChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  reorderChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },

  /* Tracklist List & Cards */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  trackCardHidden: {
    opacity: 0.6,
    backgroundColor: '#f8fafc',
  },
  trackIndexBox: {
    width: 28,
    marginRight: 10,
    alignItems: 'center',
  },
  trackIndexNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  artworkThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    marginRight: 12,
  },
  trackInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  trackTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  trackMetaText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  hqPillSmall: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hqPillSmallText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4f46e5',
  },
  hiddenPillSmall: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hiddenPillSmallText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  trackRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stemsBadgeSmall: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBadgeSmall: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
