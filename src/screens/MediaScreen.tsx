import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { GradientCard, Badge, SearchFilterBar, EmptyState } from '../components/ui';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: 'audio' | 'document' | 'video' | 'image';
  size?: number;
  uploadedAt?: string;
  folder?: string;
  views?: number;
}

const MEDIA_FILTERS = [
  { label: 'All Files', value: 'all' },
  { label: 'Audio Tracks', value: 'audio' },
  { label: 'Videos', value: 'video' },
  { label: 'Documents', value: 'document' },
];

export function inferMediaType(mimeType: string): 'audio' | 'video' | 'image' | 'document' {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}

export default function MediaScreen() {
  const { activeZone } = useZoneContext();

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await api.media.getAll(activeZone?.id);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchMedia();
  };

  const filtered = useMemo(() => {
    return mediaList.filter(item => {
      const matchType = filter === 'all' || item.type === filter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.folder && item.folder.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [mediaList, filter, search]);

  function getMediaIcon(type: string): keyof typeof Ionicons.glyphMap {
    switch (type) {
      case 'audio':
        return 'musical-notes-outline';
      case 'document':
        return 'document-text-outline';
      case 'video':
        return 'videocam-outline';
      case 'image':
        return 'image-outline';
      default:
        return 'folder-outline';
    }
  }

  const openMedia = async (item: MediaItem) => {
    if (!item.url) return;
    await Linking.openURL(item.url).catch(() => {
      Alert.alert('Error', 'Unable to open file URL.');
    });
  };

  async function handleUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setUploading(true);

      const uploadData = await api.media.upload(
        {
          uri: file.uri,
          name: file.name,
          type: file.mimeType ?? 'application/octet-stream',
        },
        'rehearsals'
      );

      const fileUrl = uploadData.data?.url || (uploadData as any).url || '';
      await api.media.create({
        name: file.name,
        url: fileUrl,
        type: inferMediaType(file.mimeType ?? ''),
        zoneId: activeZone?.id,
      });

      Alert.alert('Uploaded', `"${file.name}" uploaded to Cloudflare R2.`);
      fetchMedia();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Could not upload file.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader
        title="Media Assets Library"
        rightElement={
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={handleUpload}
            disabled={uploading}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={15} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.uploadBtnText}>Upload</Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      {/* Filter and Search Section */}
      <View style={styles.topSection}>

        <SearchFilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          placeholder="Search files by name or folder..."
          filterOptions={MEDIA_FILTERS}
          activeFilter={filter}
          onFilterChange={setFilter}
        />
      </View>

      {/* Media Files List */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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
              icon="cloud-upload-outline"
              title={search ? 'No Matching Files' : 'No Media Assets'}
              description={
                search
                  ? 'Try a different search keyword.'
                  : 'Upload audio stems, rehearsal scores, or choir practice recordings directly to Cloudflare R2.'
              }
              actionLabel="Upload Media File"
              onAction={handleUpload}
            />
          )
        }
        renderItem={({ item }) => (
          <GradientCard variant="surface" style={styles.mediaCard} onPress={() => openMedia(item)}>
            <View style={styles.mediaRow}>
              <View style={styles.iconBox}>
                <Ionicons name={getMediaIcon(item.type)} size={20} color={Colors.accent} />
              </View>

              <View style={styles.mediaDetails}>
                <Text style={styles.mediaName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.metaRow}>
                  <Badge label={item.type.toUpperCase()} variant="key" size="sm" />
                  {item.folder ? <Text style={styles.folderText}>📁 {item.folder}</Text> : null}
                </View>
              </View>

              <TouchableOpacity style={styles.openBtn} onPress={() => openMedia(item)}>
                <Ionicons name="open-outline" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </GradientCard>
        )}
      />
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
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  screenSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  mediaCard: {
    borderRadius: 16,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mediaDetails: {
    flex: 1,
  },
  mediaName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  folderText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  openBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
