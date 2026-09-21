import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import { EmptyState, Badge } from '../../components/ui';
import { customAlert } from '../../context/AlertContext';
import { CloneModalProps, PraiseSong, MasterSong } from './types';
import { cloneModalStyles } from './cloneModalStyles';

export default function CloneFromMasterModal({
  visible,
  programId,
  existingIds,
  onClose,
  onCloned,
}: CloneModalProps) {
  const insets = useSafeAreaInsets();
  const [songs, setSongs] = useState<MasterSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [cloningId, setCloningId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setLoading(true);
      setSongs([]);
      api.songs.getMasterSongs()
        .then(res => {
          setSongs(Array.isArray(res?.data) ? res.data : []);
        })
        .catch(() => {
          setSongs([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [visible]);

  const filteredSongs = useMemo(() => {
    const existing = new Set(existingIds);
    let list = songs.filter(s => !existing.has(s.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.writer || '').toLowerCase().includes(q) ||
        (s.leadSinger || '').toLowerCase().includes(q) ||
        (s.key || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [songs, existingIds, search]);

  async function handleClone(masterSong: MasterSong) {
    setCloningId(masterSong.id);
    try {
      const clonedSong: PraiseSong = {
        id: `song-${Date.now()}`,
        title: masterSong.title || 'Untitled',
        category: masterSong.category || 'Standard',
        categories: masterSong.category ? [masterSong.category] : ['Standard'],
        writer: masterSong.writer || '',
        leadSinger: masterSong.leadSinger || '',
        key: masterSong.key || '',
        tempo: masterSong.tempo || '',
        lyrics: masterSong.lyrics || '',
        solfas: masterSong.solfa || '',
        audioFile: masterSong.audioFile || '',
        audioUrls: masterSong.audioUrls || {},
        status: 'unheard',
        isHeard: false,
        heard: false,
        isActive: false,
      };

      const result = await api.songs.create({
        ...clonedSong,
        programId,
        praiseNightId: programId,
      });
      if (!result?.success) {
        throw new Error('Failed to save cloned song.');
      }

      // Clone existing history from masterSong if available
      try {
        const histRes = await api.songs.getSongHistory(masterSong.id);
        const pastEntries = Array.isArray(histRes?.data) ? histRes.data : [];
        const newTargetId = result.data?.id || clonedSong.id;
        for (const entry of pastEntries) {
          await api.songs.createSongHistory({
            songId: newTargetId,
            type: entry.type || 'details',
            title: entry.title || entry.description || 'Historical Record',
            description: entry.description || entry.notes || entry.title || '',
            old_value: entry.old_value || entry.oldValue || '',
            new_value: entry.new_value || entry.newValue || '',
          }).catch(() => {});
        }
      } catch {}

      onCloned(result.data || clonedSong);
      onClose();
    } catch (e: any) {
      customAlert('Error', e.message || 'Failed to clone song.');
    } finally {
      setCloningId(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cloneModalStyles.overlay}>
        <View
          style={[
            cloneModalStyles.sheetCard,
            {
              marginTop: Math.max(insets.top + 16, 54),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={cloneModalStyles.dragHandle} />

          <View style={cloneModalStyles.header}>
            <TouchableOpacity onPress={onClose} style={cloneModalStyles.headerActionBtn}>
              <Text style={cloneModalStyles.cancelText}>Done</Text>
            </TouchableOpacity>

            <View style={cloneModalStyles.headerCenter}>
              <Text style={cloneModalStyles.headerTitle}>Clone from All Ministered</Text>
            </View>

            <View style={{ width: 48 }} />
          </View>

          {/* Search bar */}
          <View style={cloneModalStyles.searchWrap}>
            <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={cloneModalStyles.searchInput}
              placeholder="Search all ministered songs..."
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

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <ActivityIndicator color={Colors.accent} size="large" />
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 12, fontWeight: '500' }}>
                Loading all ministered songs...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredSongs}
              keyExtractor={i => i.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  icon="search-outline"
                  title="No Songs Found"
                  description="All available songs may already be in this setlist."
                />
              }
              renderItem={({ item }) => (
                <View style={cloneModalStyles.cloneSongRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={cloneModalStyles.cloneSongTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      {item.leadSinger ? <Text style={cloneModalStyles.cloneSongMeta}>🎤 {item.leadSinger}</Text> : null}
                      {item.writer ? <Text style={cloneModalStyles.cloneSongMeta}>• {item.writer}</Text> : null}
                      {item.key ? <Badge label={item.key} variant="key" size="sm" /> : null}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={cloneModalStyles.cloneAddBtn}
                    onPress={() => handleClone(item)}
                    disabled={cloningId === item.id}
                    activeOpacity={0.8}
                  >
                    {cloningId === item.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
                        <Text style={cloneModalStyles.cloneAddBtnText}>Add</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
