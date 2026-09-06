import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ZoneSongFormModal, { ZoneSong } from './ZoneSongFormModal';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { GradientCard, Badge, SearchFilterBar, EmptyState } from '../components/ui';

interface MasterSong {
  id: string;
  title: string;
  writer: string;
  category: string;
  key: string;
  tempo: string;
  audioFile: string;
  publishedByName: string;
}

const TABS = [
  { label: 'Master Repertoire', value: 'master' },
  { label: 'Zonal Repertoire', value: 'zone' },
];

export default function MasterLibraryScreen({ navigation }: any) {
  const [songs, setSongs] = useState<MasterSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const { activeZone } = useZoneContext();
  const [activeTab, setActiveTab] = useState<'master' | 'zone'>('master');
  const [zoneSongs, setZoneSongs] = useState<ZoneSong[]>([]);
  const [zoneSongsLoading, setZoneSongsLoading] = useState(false);
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZoneSong, setEditingZoneSong] = useState<ZoneSong | null>(null);

  async function fetchSongs() {
    try {
      const result = await api.songs.getMasterSongs();
      const data = Array.isArray(result.data) ? result.data : [];
      setSongs(data);
    } catch (e) {
      console.error('[MasterLibrary] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchZoneSongs() {
    setZoneSongsLoading(true);
    try {
      const result = await api.songs.getZoneSongs(activeZone?.id);
      setZoneSongs(Array.isArray(result.data) ? result.data : []);
    } catch (e) {
      console.error('[ZoneSongs] fetch error:', e);
    } finally {
      setZoneSongsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'zone') fetchZoneSongs();
  }, [activeTab, activeZone?.id]);

  useEffect(() => {
    fetchSongs();
  }, []);

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

  const filteredMaster = useMemo(() => {
    if (!search.trim()) return songs;
    const q = search.toLowerCase();
    return songs.filter(
      s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.writer || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
    );
  }, [search, songs]);

  const filteredZone = useMemo(() => {
    if (!search.trim()) return zoneSongs;
    const q = search.toLowerCase();
    return zoneSongs.filter(
      s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.key || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
    );
  }, [search, zoneSongs]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Controls */}
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <Text style={styles.screenHeading}>
            {activeTab === 'master' ? 'All Ministered Songs' : 'Local Zone Repertoire'}
          </Text>

          {activeTab === 'zone' && (
            <TouchableOpacity
              style={styles.addZoneBtn}
              onPress={() => {
                setEditingZoneSong(null);
                setShowZoneForm(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.addZoneText}>Add Song</Text>
            </TouchableOpacity>
          )}
        </View>

        <SearchFilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          placeholder={`Search ${activeTab === 'master' ? songs.length : zoneSongs.length} songs...`}
          filterOptions={[
            { label: `Master (${songs.length})`, value: 'master' },
            { label: `Zonal (${zoneSongs.length})`, value: 'zone' },
          ]}
          activeFilter={activeTab}
          onFilterChange={(v: any) => setActiveTab(v)}
        />
      </View>

      {/* Content Feed */}
      {activeTab === 'master' ? (
        <FlatList
          data={filteredMaster}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchSongs();
              }}
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
                title="No Songs Found"
                description="Try a different search query."
              />
            )
          }
          renderItem={({ item }) => (
            <GradientCard variant="surface" style={styles.songCard}>
              <View style={styles.songRow}>
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {item.title || 'Untitled Song'}
                  </Text>
                  <Text style={styles.songWriter} numberOfLines={1}>
                    {item.writer ? `✍️ ${item.writer}` : 'Loveworld Singers Repertoire'}
                  </Text>

                  <View style={styles.tagsRow}>
                    {item.key ? <Badge label={`Key: ${item.key}`} variant="key" size="sm" /> : null}
                    {item.tempo ? <Badge label={`${item.tempo} BPM`} variant="tempo" size="sm" /> : null}
                    {item.category ? (
                      <View style={styles.catChip}>
                        <Text style={styles.catChipText}>{item.category}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {item.audioFile ? (
                  <View style={styles.audioBadge}>
                    <Ionicons name="musical-notes" size={16} color={Colors.accentBright} />
                  </View>
                ) : null}
              </View>
            </GradientCard>
          )}
        />
      ) : (
        <FlatList
          data={filteredZone}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={zoneSongsLoading}
              onRefresh={fetchZoneSongs}
              tintColor={Colors.accentBright}
              colors={[Colors.accentBright]}
            />
          }
          ListEmptyComponent={
            zoneSongsLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={Colors.accentBright} size="large" />
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
            <GradientCard variant="surface" style={styles.songCard}>
              <View style={styles.songRow}>
                <View style={styles.songInfo}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={styles.tagsRow}>
                    {item.key ? <Badge label={`Key: ${item.key}`} variant="key" size="sm" /> : null}
                    {item.tempo ? <Badge label={`${item.tempo} BPM`} variant="tempo" size="sm" /> : null}
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => {
                      setEditingZoneSong(item);
                      setShowZoneForm(true);
                    }}
                  >
                    <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => handleDeleteZoneSong(item)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </View>
            </GradientCard>
          )}
        />
      )}

      {/* Zone Song Modal */}
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
    backgroundColor: Colors.background,
  },
  center: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  addZoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addZoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  songCard: {
    borderRadius: 16,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  songInfo: {
    flex: 1,
    marginRight: 10,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 3,
  },
  songWriter: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  catChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  audioBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
});
