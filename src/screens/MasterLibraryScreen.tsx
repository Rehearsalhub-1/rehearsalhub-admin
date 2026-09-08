import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
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

// ── Realistic Web Admin Catalog Mock ─────────────────────────────────────────
export const INITIAL_MASTER_CATALOG: MasterSong[] = [
  {
    id: 'master-01',
    title: 'King of Kings (You Reign)',
    writer: 'Loveworld Singers',
    publishedByName: 'Loveworld Singers',
    leadSinger: 'Pastor Ruth',
    category: 'Worship',
    key: 'D',
    tempo: '112',
    conductor: 'Bro Wisdom',
    leadKeyboardist: 'Bro Daniel',
    leadGuitarist: 'Bro Samuel',
    bassGuitarist: 'Bro Wisdom',
    drummer: 'Bro David',
    audioFile: 'https://cdn.example.com/audio/king-of-kings.mp3',
    audioUrls: {
      full: 'https://cdn.example.com/audio/king-of-kings.mp3',
      soprano: 'https://cdn.example.com/audio/king-of-kings-soprano.mp3',
      alto: 'https://cdn.example.com/audio/king-of-kings-alto.mp3',
      tenor: 'https://cdn.example.com/audio/king-of-kings-tenor.mp3',
      bass: 'https://cdn.example.com/audio/king-of-kings-bass.mp3',
    },
    lyrics: `Verse 1:
You sit upon the throne of grace
Surrounded by unending praise
Your majesty fills all the earth
None can match Your holy worth

Chorus:
King of Kings, You reign forever
Lord of all, Your kingdom never ends
With one voice, we lift Your glory
King of Kings, You reign!`,
    solfas: `Verse 1:
s : d : m | r : - : d | l : - : s |
m : s : d' | t : - : l | s : - : - |`,
    history: 'First ministered at Praise Night 18 by Pastor Ruth with the full presidential choir.',
    isHQOnly: false,
    isHidden: false,
    isHistory: false,
  },
  {
    id: 'master-02',
    title: 'Glorious God and King',
    writer: 'LW Singers',
    publishedByName: 'Loveworld Music Ministries',
    leadSinger: 'Pastor Ruth',
    category: 'Worship',
    key: 'Eb',
    tempo: '88',
    conductor: 'Bro Wisdom',
    leadKeyboardist: 'Bro Enoch',
    drummer: 'Bro Victor',
    audioFile: 'https://cdn.example.com/audio/glorious-god.mp3',
    audioUrls: {
      full: 'https://cdn.example.com/audio/glorious-god.mp3',
      soprano: 'https://cdn.example.com/audio/glorious-god-soprano.mp3',
      tenor: 'https://cdn.example.com/audio/glorious-god-tenor.mp3',
    },
    lyrics: `Chorus:
Glorious God and King
Unto You we sing
Righteous in all Your ways
Worthy of all our praise!`,
    solfas: `d : m : s | l : s : f | m : - : r | d : - : - |`,
    history: 'Composed for the Global Day of Prayer special thanksgiving session.',
    isHQOnly: true,
    isHidden: false,
    isHistory: false,
  },
  {
    id: 'master-03',
    title: 'Lord of All Creation',
    writer: 'Eli-J & LW Singers',
    publishedByName: 'Eli-J',
    leadSinger: 'Eli-J',
    category: 'Praise',
    key: 'G',
    tempo: '128',
    conductor: 'Sis Blessing',
    leadKeyboardist: 'Bro Enoch',
    drummer: 'Bro Victor',
    audioFile: 'https://cdn.example.com/audio/lord-of-creation.mp3',
    audioUrls: {
      full: 'https://cdn.example.com/audio/lord-of-creation.mp3',
      soprano: 'https://cdn.example.com/audio/lord-of-creation-soprano.mp3',
      alto: 'https://cdn.example.com/audio/lord-of-creation-alto.mp3',
      tenor: 'https://cdn.example.com/audio/lord-of-creation-tenor.mp3',
      bass: 'https://cdn.example.com/audio/lord-of-creation-bass.mp3',
    },
    lyrics: `Verse 1:
Lord of all creation, Ruler of the stars
We proclaim Your greatness, how wonderful You are!

Chorus:
Shout for joy! Give Him all the glory!
He has done mighty things for us!`,
    solfas: `d : m : s | f : m : r | d : - : - |`,
    history: 'High tempo opening praise song recorded live at the Loveworld Convocation Arena.',
    isHQOnly: false,
    isHidden: false,
    isHistory: false,
  },
  {
    id: 'master-04',
    title: 'Victory in His Name',
    writer: 'LW Singers',
    publishedByName: 'Cliff M',
    leadSinger: 'Cliff M',
    category: 'Praise',
    key: 'A',
    tempo: '130',
    conductor: 'Sis Grace',
    drummer: 'Bro David',
    audioFile: 'https://cdn.example.com/audio/victory-name.mp3',
    audioUrls: {
      full: 'https://cdn.example.com/audio/victory-name.mp3',
      tenor: 'https://cdn.example.com/audio/victory-name-tenor.mp3',
    },
    lyrics: `We have the victory! In Jesus' name we triumph!
No weapon formed against us shall ever prosper!`,
    isHQOnly: false,
    isHidden: false,
    isHistory: false,
  },
  {
    id: 'master-05',
    title: 'Holy Are You Lord',
    writer: 'Maya',
    publishedByName: 'Maya',
    leadSinger: 'Maya',
    category: 'Worship',
    key: 'D',
    tempo: '72',
    conductor: 'Bro Wisdom',
    audioFile: 'https://cdn.example.com/audio/holy-are-you.mp3',
    audioUrls: {
      full: 'https://cdn.example.com/audio/holy-are-you.mp3',
      soprano: 'https://cdn.example.com/audio/holy-are-you-soprano.mp3',
      alto: 'https://cdn.example.com/audio/holy-are-you-alto.mp3',
    },
    lyrics: `Holy, holy, holy are You Lord God Almighty
The whole earth is filled with Your glory`,
    isHQOnly: false,
    isHidden: false,
    isHistory: false,
  },
  {
    id: 'master-06',
    title: 'Exalted Above All',
    writer: 'LW Singers',
    publishedByName: 'Loveworld Music Ministries',
    leadSinger: 'Sophia',
    category: 'Anthem',
    key: 'Bb',
    tempo: '96',
    conductor: 'Bro Wisdom',
    audioFile: 'https://cdn.example.com/audio/exalted-above.mp3',
    lyrics: `Exalted above all gods, You are exalted above the heavens!`,
    isHQOnly: true,
    isHidden: false,
    isHistory: false,
  },
  {
    id: 'master-07',
    title: 'Hallelujah to the Lamb',
    writer: 'Loveworld Singers',
    publishedByName: 'Loveworld Singers',
    leadSinger: 'Sophia',
    category: 'Hymn',
    key: 'C',
    tempo: '74',
    conductor: 'Sis Grace',
    lyrics: `Hallelujah to the Lamb upon the throne,
Forever and ever, Amen!`,
    isHQOnly: false,
    isHidden: false,
    isHistory: true,
  },
  {
    id: 'master-08',
    title: 'Mighty God, Awesome Wonder',
    writer: 'Maya',
    publishedByName: 'Maya',
    leadSinger: 'Maya',
    category: 'Thanksgiving',
    key: 'E',
    tempo: '95',
    conductor: 'Bro Wisdom',
    lyrics: `Mighty God, awesome wonder, we bow before Your throne!`,
    isHQOnly: false,
    isHidden: true,
    isHistory: false,
  },
];

export default function MasterLibraryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { activeZone } = useZoneContext();
  const { adminUser } = useAuth();

  // Primary Tab: Master Repertoire vs Zonal Repertoire
  const [activeDomainTab, setActiveDomainTab] = useState<'master' | 'zone'>('master');

  // Master Tab Status Filters (Mirroring Web Admin MasterLibraryFilters.tsx)
  const [masterStatusTab, setMasterStatusTab] = useState<'active' | 'history' | 'hidden' | 'all'>('active');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedLeadSinger, setSelectedLeadSinger] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Master Songs State
  const [masterSongs, setMasterSongs] = useState<MasterSong[]>(INITIAL_MASTER_CATALOG);
  const [masterLoading, setMasterLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Zonal Songs State
  const [zoneSongs, setZoneSongs] = useState<ZoneSong[]>([]);
  const [zoneSongsLoading, setZoneSongsLoading] = useState(false);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZoneSong, setEditingZoneSong] = useState<ZoneSong | null>(null);

  // Detail Sheet & Edit Modal State
  const [selectedDetailSong, setSelectedDetailSong] = useState<MasterSong | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const [editModalSong, setEditModalSong] = useState<MasterSong | null>(null);
  const [editModalMode, setEditModalMode] = useState<'create' | 'edit'>('create');
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Fetch Master Songs
  const fetchMasterSongs = useCallback(async () => {
    try {
      const result = await api.songs.getMasterSongs();
      const data = Array.isArray(result?.data) && result.data.length > 0 ? result.data : null;
      if (data) {
        setMasterSongs(data);
      }
    } catch (e) {
      console.log('[MasterLibrary] API fetch note:', e);
    } finally {
      setMasterLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch Zonal Songs
  const fetchZoneSongs = useCallback(async () => {
    setZoneSongsLoading(true);
    try {
      const result = await api.songs.getZoneSongs(activeZone?.id || 'zone-001');
      setZoneSongs(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      console.log('[ZoneSongs] fetch note:', e);
    } finally {
      setZoneSongsLoading(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    fetchMasterSongs();
  }, [fetchMasterSongs]);

  useEffect(() => {
    if (activeDomainTab === 'zone') {
      fetchZoneSongs();
    }
  }, [activeDomainTab, fetchZoneSongs]);

  // Master Stats Calculations (Mirroring Web Admin Header)
  const masterStats = useMemo(() => {
    const total = masterSongs.length;
    const active = masterSongs.filter(s => !s.isHistory && !s.isHidden).length;
    const history = masterSongs.filter(s => Boolean(s.isHistory)).length;
    const hidden = masterSongs.filter(s => Boolean(s.isHidden)).length;
    const hqOnly = masterSongs.filter(s => Boolean(s.isHQOnly || s.isHqOnly)).length;
    return { total, active, history, hidden, hqOnly };
  }, [masterSongs]);

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
      // 1. Status Tab filter
      if (masterStatusTab === 'active' && (song.isHistory || song.isHidden)) return false;
      if (masterStatusTab === 'history' && !song.isHistory) return false;
      if (masterStatusTab === 'hidden' && !song.isHidden) return false;

      // 2. Lead Singer filter
      if (selectedLeadSinger !== 'all' && song.leadSinger?.toLowerCase() !== selectedLeadSinger.toLowerCase()) {
        return false;
      }

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = (song.title || '').toLowerCase().includes(q);
        const matchesSinger = (song.leadSinger || '').toLowerCase().includes(q);
        const matchesWriter = (song.writer || song.publishedByName || '').toLowerCase().includes(q);
        const matchesCategory = (song.category || '').toLowerCase().includes(q);
        const matchesKey = (song.key || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesSinger && !matchesWriter && !matchesCategory && !matchesKey) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const titleA = (a.title || '').toLowerCase();
      const titleB = (b.title || '').toLowerCase();
      return sortOrder === 'asc' ? titleA.localeCompare(titleB) : titleB.localeCompare(titleA);
    });
  }, [masterSongs, masterStatusTab, selectedLeadSinger, search, sortOrder]);

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
    setEditModalSong(null);
    setEditModalMode('create');
    setEditModalVisible(true);
  }

  function handleOpenEditModal(song: MasterSong) {
    setEditModalSong(song);
    setEditModalMode('edit');
    setEditModalVisible(true);
  }

  function handleSongSaved(savedSong: MasterSong, isNew: boolean) {
    if (isNew) {
      setMasterSongs(prev => [savedSong, ...prev]);
    } else {
      setMasterSongs(prev => prev.map(s => (s.id === savedSong.id ? { ...s, ...savedSong } : s)));
    }
    if (selectedDetailSong?.id === savedSong.id) {
      setSelectedDetailSong(savedSong);
    }
  }

  function handleToggleHideSong(song: MasterSong) {
    const nextHidden = !song.isHidden;
    setMasterSongs(prev =>
      prev.map(s => (s.id === song.id ? { ...s, isHidden: nextHidden } : s))
    );
  }

  function handleDeleteMasterSong(song: MasterSong) {
    Alert.alert('Delete Repertoire Track', `Are you sure you want to delete "${song.title}" from the catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setMasterSongs(prev => prev.filter(s => s.id !== song.id));
          api.songs.delete(song.id).catch(() => {});
        },
      },
    ]);
  }

  async function handleDeleteZoneSong(song: ZoneSong) {
    Alert.alert('Delete Zone Song', `Delete "${song.title}" from regional repertoire?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.songs.deleteSubgroupSong(song.id);
            setZoneSongs(prev => prev.filter(s => s.id !== song.id));
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to delete song.');
          }
        },
      },
    ]);
  }

  if (!adminUser?.isHQAdmin) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ZoneHeader title="All Ministered" showBack={true} />
        <View style={styles.centerRestricted}>
          <View style={styles.restrictedIconBox}>
            <Ionicons name="lock-closed" size={32} color="#7c3aed" />
          </View>
          <Text style={styles.restrictedTitle}>HQ Admin Access Only</Text>
          <Text style={styles.restrictedSub}>
            The Master "All Ministered" repertoire is managed exclusively by Loveworld Singers HQ Administrators.
          </Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={16} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.goBackBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
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

        <TouchableOpacity
          style={styles.cleanAddBtn}
          onPress={handleOpenCreateModal}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 3 }} />
          <Text style={styles.cleanAddBtnText}>+ Song</Text>
        </TouchableOpacity>
      </View>

      {/* ── CLEAN STATUS FILTER TABS ─────────────────────────────────────── */}
      <View style={styles.cleanTabsRow}>
        {[
          { id: 'all', label: 'All', count: masterStats.total },
          { id: 'active', label: 'Active', count: masterStats.active },
          { id: 'history', label: 'History', count: masterStats.history },
          { id: 'hidden', label: 'Hidden', count: masterStats.hidden },
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

      {/* ── CLEAN MASTER CATALOG SONG FEED ──────────────────────────────────── */}
      <FlatList
        data={filteredMasterSongs}
        keyExtractor={i => i.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 30 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchMasterSongs();
            }}
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
                search || masterStatusTab !== 'all'
                  ? 'No songs match your search or status filter.'
                  : 'The master catalog has no registered songs yet.'
              }
              actionLabel="+ Add Master Song"
              onAction={handleOpenCreateModal}
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
                  {item.category ? (
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText}>{item.category}</Text>
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
      />

      {/* ── CREATE / EDIT MASTER SONG MODAL ────────────────────────────────── */}
      <MasterEditSongModal
        visible={editModalVisible}
        song={editModalSong}
        mode={editModalMode}
        onClose={() => setEditModalVisible(false)}
        onSaved={handleSongSaved}
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
