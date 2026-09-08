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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── HIGH-END EXECUTIVE HEADER (Mirroring MasterLibraryHeader.tsx) ────── */}
      <View style={styles.execHeaderCard}>
        <View style={styles.execHeaderTop}>
          <View style={styles.execBrandRow}>
            <View style={styles.execIconBox}>
              <Ionicons name="library" size={20} color="#ffffff" />
            </View>
            <View>
              <View style={styles.execTitleRow}>
                <Text style={styles.execTitle}>All Ministered</Text>
                <View style={styles.statsPillPurple}>
                  <Ionicons name="musical-note" size={11} color="#7c3aed" style={{ marginRight: 2 }} />
                  <Text style={styles.statsPillPurpleText}>{masterStats.total} Songs</Text>
                </View>
                {masterStats.history > 0 && (
                  <View style={styles.statsPillAmber}>
                    <Ionicons name="time" size={10} color="#b45309" style={{ marginRight: 2 }} />
                    <Text style={styles.statsPillAmberText}>{masterStats.history} History</Text>
                  </View>
                )}
                {masterStats.hqOnly > 0 && (
                  <View style={styles.statsPillIndigo}>
                    <Ionicons name="lock-closed" size={10} color="#4338ca" style={{ marginRight: 2 }} />
                    <Text style={styles.statsPillIndigoText}>{masterStats.hqOnly} HQ Only</Text>
                  </View>
                )}
              </View>
              <Text style={styles.execSub}>Global repertoire of all ministered songs.</Text>
            </View>
          </View>

          {/* New Song Button */}
          <TouchableOpacity
            style={styles.addSongBtn}
            onPress={() => {
              if (activeDomainTab === 'master') {
                handleOpenCreateModal();
              } else {
                setEditingZoneSong(null);
                setShowZoneForm(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.addSongBtnText}>+ Song</Text>
          </TouchableOpacity>
        </View>

        {/* Master vs Zonal Switcher */}
        <View style={styles.domainTabsRow}>
          <TouchableOpacity
            style={[styles.domainTab, activeDomainTab === 'master' && styles.domainTabActive]}
            onPress={() => setActiveDomainTab('master')}
            activeOpacity={0.8}
          >
            <Text style={[styles.domainTabText, activeDomainTab === 'master' && styles.domainTabTextActive]}>
              Master Catalog ({masterStats.total})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.domainTab, activeDomainTab === 'zone' && styles.domainTabActive]}
            onPress={() => setActiveDomainTab('zone')}
            activeOpacity={0.8}
          >
            <Text style={[styles.domainTabText, activeDomainTab === 'zone' && styles.domainTabTextActive]}>
              Zonal Repertoire ({zoneSongs.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MASTER CATALOG CONTROLS (Only on Master Tab) ─────────────────────── */}
      {activeDomainTab === 'master' && (
        <View style={styles.filterSection}>
          {/* Status Tabs: Active | History | Hidden | All */}
          <View style={styles.statusTabsRow}>
            {[
              { id: 'active', label: 'Active', count: masterStats.active },
              { id: 'history', label: 'History', count: masterStats.history },
              { id: 'hidden', label: 'Hidden', count: masterStats.hidden },
              { id: 'all', label: 'All', count: masterStats.total },
            ].map(t => {
              const isActive = masterStatusTab === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.statusTabBtn, isActive && styles.statusTabBtnActive]}
                  onPress={() => setMasterStatusTab(t.id as any)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusTabBtnText, isActive && styles.statusTabBtnTextActive]}>
                    {t.label} ({t.count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Search Row + Sort Toggle */}
          <View style={styles.searchRow}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${filteredMasterSongs.length} songs, singer, writer...`}
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
              style={styles.sortBtn}
              onPress={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              activeOpacity={0.8}
            >
              <Ionicons
                name={sortOrder === 'asc' ? 'arrow-down' : 'arrow-up'}
                size={14}
                color="#7c3aed"
                style={{ marginRight: 2 }}
              />
              <Text style={styles.sortBtnText}>{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</Text>
            </TouchableOpacity>
          </View>

          {/* Lead Singer Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.singerChipsScroll}
          >
            <TouchableOpacity
              style={[styles.singerChip, selectedLeadSinger === 'all' && styles.singerChipActive]}
              onPress={() => setSelectedLeadSinger('all')}
              activeOpacity={0.8}
            >
              <Text style={[styles.singerChipText, selectedLeadSinger === 'all' && styles.singerChipTextActive]}>
                All Singers
              </Text>
            </TouchableOpacity>

            {leadSingersList.map(singer => {
              const isSelected = selectedLeadSinger.toLowerCase() === singer.toLowerCase();
              return (
                <TouchableOpacity
                  key={singer}
                  style={[styles.singerChip, isSelected && styles.singerChipActive]}
                  onPress={() => setSelectedLeadSinger(isSelected ? 'all' : singer)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.singerChipText, isSelected && styles.singerChipTextActive]}>
                    {singer}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── ZONAL SEARCH BAR (Only on Zonal Tab) ────────────────────────────── */}
      {activeDomainTab === 'zone' && (
        <View style={styles.zonalSearchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${zoneSongs.length} regional songs...`}
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
        </View>
      )}

      {/* ── MASTER CATALOG SONG FEED ────────────────────────────────────────── */}
      {activeDomainTab === 'master' ? (
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
                  search || selectedLeadSinger !== 'all' || masterStatusTab !== 'active'
                    ? 'No songs match your current filter settings.'
                    : 'The master catalog has no registered songs yet.'
                }
                actionLabel="+ Add Master Song"
                onAction={handleOpenCreateModal}
              />
            )
          }
          renderItem={({ item, index }) => {
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
                  styles.songCard,
                  item.isHidden && styles.songCardHidden,
                ]}
              >
                {/* Index / Order Box */}
                <View style={styles.indexBox}>
                  <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
                </View>

                {/* Main Song Info */}
                <View style={styles.songMainCol}>
                  <View style={styles.songTitleRow}>
                    <Text style={styles.songTitleText} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {isHq && (
                      <View style={styles.hqBadge}>
                        <Text style={styles.hqBadgeText}>HQ ONLY</Text>
                      </View>
                    )}
                    {item.isHidden && (
                      <View style={styles.hiddenBadge}>
                        <Text style={styles.hiddenBadgeText}>HIDDEN</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.songWriterText} numberOfLines={1}>
                    {item.leadSinger ? `Lead: ${item.leadSinger}` : ''}
                    {item.leadSinger && (item.writer || item.publishedByName) ? ' • ' : ''}
                    {item.writer || item.publishedByName ? `✍️ ${item.writer || item.publishedByName}` : ''}
                  </Text>

                  {/* Metadata Chips Row */}
                  <View style={styles.tagsRow}>
                    {item.key ? (
                      <View style={styles.keyTag}>
                        <Text style={styles.keyTagText}>{item.key}</Text>
                      </View>
                    ) : null}

                    {item.tempo ? (
                      <Text style={styles.tempoText}>{item.tempo} BPM</Text>
                    ) : null}

                    {item.category ? (
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{item.category}</Text>
                      </View>
                    ) : null}

                    {/* Stems Indicators */}
                    {hasStems && (
                      <View style={styles.stemsIndicator}>
                        <Ionicons name="layers" size={10} color="#7c3aed" style={{ marginRight: 2 }} />
                        <Text style={styles.stemsIndicatorText}>Stems</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Quick Action Icons */}
                <View style={styles.actionCol}>
                  {/* Edit */}
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleOpenEditModal(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Ionicons name="pencil" size={15} color="#7c3aed" />
                  </TouchableOpacity>

                  {/* Toggle Hide */}
                  <TouchableOpacity
                    style={styles.actionIconBtn}
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

                  {/* Delete */}
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleDeleteMasterSong(item)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={14} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        /* ── ZONAL REGIONAL SONG FEED ────────────────────────────────────────── */
        <FlatList
          data={filteredZoneSongs}
          keyExtractor={i => i.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 30 }
          ]}
          refreshControl={
            <RefreshControl
              refreshing={zoneSongsLoading}
              onRefresh={fetchZoneSongs}
              tintColor="#7c3aed"
              colors={['#7c3aed']}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            zoneSongsLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color="#7c3aed" size="large" />
              </View>
            ) : (
              <EmptyState
                icon="musical-notes-outline"
                title="No Regional Zone Songs"
                description="Songs customized specifically for your local zone will appear here."
                actionLabel="Add Zonal Song"
                onAction={() => {
                  setEditingZoneSong(null);
                  setShowZoneForm(true);
                }}
              />
            )
          }
          renderItem={({ item }) => (
            <GradientCard variant="surface" style={styles.zonalCard}>
              <View style={styles.zonalRow}>
                <View style={styles.zonalInfo}>
                  <Text style={styles.songTitleText} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.tagsRow}>
                    {item.key ? <Badge label={`Key: ${item.key}`} variant="key" size="sm" /> : null}
                    {item.tempo ? <Badge label={`${item.tempo} BPM`} variant="tempo" size="sm" /> : null}
                  </View>
                </View>

                <View style={styles.actionCol}>
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => {
                      setEditingZoneSong(item);
                      setShowZoneForm(true);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#64748b" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleDeleteZoneSong(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </View>
            </GradientCard>
          )}
        />
      )}

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
  execHeaderCard: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  execHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  execBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  execIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  execTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  execTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  execSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 1,
  },
  statsPillPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  statsPillPurpleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7c3aed',
  },
  statsPillAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  statsPillAmberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  statsPillIndigo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  statsPillIndigoText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4338ca',
  },
  addSongBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 9,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  addSongBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  domainTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 2.5,
  },
  domainTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  domainTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  domainTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  domainTabTextActive: {
    fontWeight: '800',
    color: '#0f172a',
  },
  filterSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  zonalSearchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  statusTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusTabBtnActive: {
    backgroundColor: '#f5f3ff',
    borderColor: '#7c3aed',
  },
  statusTabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  statusTabBtnTextActive: {
    color: '#7c3aed',
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 9,
    height: 36,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  singerChipsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  singerChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  singerChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  singerChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  singerChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 7,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  songCardHidden: {
    opacity: 0.6,
    backgroundColor: '#f8fafc',
  },
  indexBox: {
    width: 24,
    marginRight: 8,
  },
  indexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  songMainCol: {
    flex: 1,
    minWidth: 0,
  },
  songTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  songTitleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  hqBadge: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  hqBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#7c3aed',
  },
  hiddenBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  hiddenBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#94a3b8',
  },
  songWriterText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1.5,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  keyTag: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  keyTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#4338ca',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  tempoText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  categoryPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  categoryPillText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#475569',
  },
  stemsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  stemsIndicatorText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#7c3aed',
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 6,
  },
  zonalCard: {
    borderRadius: 14,
  },
  zonalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zonalInfo: {
    flex: 1,
    marginRight: 10,
  },
});
