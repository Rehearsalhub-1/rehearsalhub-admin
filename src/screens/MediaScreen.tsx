import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: 'audio' | 'document' | 'video' | 'image';
  size?: number;
  uploadedAt?: string;
  folder?: string;
}

const MEDIA_FILTERS = ['all', 'audio', 'document', 'video'] as const;

export default function MediaScreen() {
  const { activeZone } = useZoneContext();

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<typeof MEDIA_FILTERS[number]>('all');
  const [search, setSearch] = useState('');

  const fetchMedia = useCallback(async () => {
    try {
      const zoneParam = activeZone ? `?zoneId=${activeZone.id}` : '';
      const res = await apiClient.get<{ success: boolean; data: MediaItem[] }>(`/media${zoneParam}`).catch(() => ({ data: [] }));
      setMediaList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('[Media] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetchMedia();
  }, [fetchMedia]);

  const filtered = mediaList.filter(item => {
    const matchType = filter === 'all' || item.type === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.folder && item.folder.toLowerCase().includes(q));
    return matchType && matchSearch;
  });

  function getMediaIcon(type: string): keyof typeof Ionicons.glyphMap {
    switch (type) {
      case 'audio': return 'musical-notes-outline';
      case 'document': return 'document-text-outline';
      case 'video': return 'videocam-outline';
      default: return 'folder-outline';
    }
  }

  const openMedia = async (item: MediaItem) => {
    if (!item.url) return;
    await Linking.openURL(item.url).catch(() => {});
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Media Library" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Media Library" />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {MEDIA_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search media files, guide tracks, score PDFs..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMedia(); }} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="cloud-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No media files in this section</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.mediaCard}>
            <View style={styles.iconWrap}>
              <Ionicons name={getMediaIcon(item.type)} size={20} color={Colors.accentBright} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mediaName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.mediaMeta}>
                {item.folder ? `${item.folder} · ` : ''}
                {item.type.toUpperCase()}
                {item.uploadedAt ? ` · ${new Date(item.uploadedAt).toLocaleDateString()}` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.playBtn} activeOpacity={0.75} onPress={() => openMedia(item)}>
              <Ionicons name={item.type === 'audio' ? 'play' : 'open-outline'} size={14} color={Colors.accentBright} />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 13 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
  },

  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  mediaMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
