import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';

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

export default function MasterLibraryScreen({ navigation }: any) {
  const [songs, setSongs] = useState<MasterSong[]>([]);
  const [filtered, setFiltered] = useState<MasterSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function fetchSongs() {
    try {
      const result = await apiClient.get<{ success: boolean; data: MasterSong[] }>('/songs/master');
      const data = Array.isArray(result.data) ? result.data : [];
      setSongs(data);
      setFiltered(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchSongs(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q ? songs.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.writer?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q)
      ) : songs
    );
  }, [search, songs]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${songs.length} master songs...`}
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSongs(); }} tintColor={Colors.accent} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.7}>
            <View style={styles.row}>
              <Text style={styles.title} numberOfLines={1}>{item.title || 'Untitled'}</Text>
              {item.audioFile ? (
                <View style={styles.audioBadge}>
                  <Ionicons name="musical-notes" size={12} color={Colors.accentBright} />
                </View>
              ) : null}
            </View>
            <Text style={styles.meta}>
              {item.writer || '—'}
              {item.key ? ` · ${item.key}` : ''}
              {item.tempo ? ` · ${item.tempo}` : ''}
            </Text>
            {item.category ? (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{item.category}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="library-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyText}>No songs found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    height: 42,
    gap: 8,
  },
  search: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 20 },
  card: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  audioBadge: { backgroundColor: Colors.accentSubtle, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  meta: { color: Colors.textMuted, fontSize: 12, marginBottom: 6 },
  catBadge: { backgroundColor: Colors.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  catBadgeText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
});
