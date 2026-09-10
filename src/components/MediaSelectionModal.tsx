import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';
import { EmptyState } from './ui';
import { useZoneContext } from '../context/ZoneContext';

export interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: 'audio' | 'document' | 'video' | 'image';
  size?: number;
  uploadedAt?: string;
  folder?: string;
}

interface MediaSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (url: string, file?: MediaFile) => void;
  allowedType?: 'audio' | 'image' | 'video' | 'document' | 'all';
  title?: string;
}

export function inferMediaType(mimeType: string): 'audio' | 'video' | 'image' | 'document' {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaSelectionModal({
  visible,
  onClose,
  onSelect,
  allowedType = 'all',
  title = 'Pick from Media Library',
}: MediaSelectionModalProps) {
  const insets = useSafeAreaInsets();
  const { activeZone } = useZoneContext();

  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>(allowedType);

  // Audio Playback Preview State
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [audioLoadingUrl, setAudioLoadingUrl] = useState<string | null>(null);
  const soundRef = React.useRef<AudioPlayer | null>(null);

  // Image Preview Modal State
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const stopAudio = useCallback(async () => {
    if (soundRef.current) {
      try {
        soundRef.current.pause();
        soundRef.current.remove();
      } catch {}
      soundRef.current = null;
    }
    setPlayingUrl(null);
    setAudioLoadingUrl(null);
  }, []);

  const handleClose = useCallback(() => {
    stopAudio();
    onClose();
  }, [stopAudio, onClose]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const handleToggleAudioPlay = async (url: string) => {
    if (playingUrl === url) {
      await stopAudio();
      return;
    }
    await stopAudio();
    setAudioLoadingUrl(url);
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
      const player = createAudioPlayer({ uri: url });
      (player as any).addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          setPlayingUrl(null);
        }
      });
      player.play();
      soundRef.current = player;
      setPlayingUrl(url);
    } catch (err: any) {
      Alert.alert('Playback Error', 'Could not play audio preview: ' + (err?.message || 'Unsupported format'));
      setPlayingUrl(null);
    } finally {
      setAudioLoadingUrl(null);
    }
  };

  const handleOpenVideo = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open video preview: ' + url));
  };

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.media.getAll(activeZone?.id);
      setMediaList(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setMediaList([]);
    } finally {
      setLoading(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setSelectedType(allowedType);
      fetchMedia();
    } else {
      stopAudio();
    }
  }, [visible, allowedType, fetchMedia, stopAudio]);

  const filtered = useMemo(() => {
    return mediaList.filter(item => {
      const matchesType =
        selectedType === 'all' || item.type === selectedType;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.folder || '').toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [mediaList, selectedType, search]);

  async function handleUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedType === 'audio' ? 'audio/*' : allowedType === 'image' ? 'image/*' : '*/*',
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
      const newMediaRes = await api.media.create({
        name: file.name,
        url: fileUrl,
        type: inferMediaType(file.mimeType ?? ''),
        zoneId: activeZone?.id,
      });

      const newMedia: MediaFile = newMediaRes?.data || {
        id: String(Date.now()),
        name: file.name,
        url: fileUrl,
        type: inferMediaType(file.mimeType ?? ''),
      };

      stopAudio();
      onSelect(fileUrl, newMedia);
      onClose();
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Could not upload file.');
    } finally {
      setUploading(false);
    }
  }

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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={pickerStyles.overlay}>
        <View
          style={[
            pickerStyles.sheetCard,
            {
              marginTop: Math.max(insets.top + 20, 56),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Top Drag Pill */}
          <View style={pickerStyles.dragHandle} />

          {/* Modal Header */}
          <View style={pickerStyles.header}>
            <TouchableOpacity onPress={handleClose} style={pickerStyles.headerActionBtn}>
              <Text style={pickerStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <View style={pickerStyles.headerCenter}>
              <Text style={pickerStyles.headerTitle}>{title}</Text>
            </View>

            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading}
              style={pickerStyles.uploadBtn}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#7c3aed" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={15} color="#7c3aed" style={{ marginRight: 3 }} />
                  <Text style={pickerStyles.uploadBtnText}>Upload</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={pickerStyles.searchWrap}>
            <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={pickerStyles.searchInput}
              placeholder="Search media files by name..."
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

          {/* Type Filter Chips (if allowedType is 'all') */}
          {allowedType === 'all' && (
            <View style={pickerStyles.typeChipsRow}>
              {(['all', 'audio', 'image', 'video', 'document'] as const).map(t => {
                const active = selectedType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[pickerStyles.typeChip, active && pickerStyles.typeChipActive]}
                    onPress={() => setSelectedType(t)}
                  >
                    <Text style={[pickerStyles.typeChipText, active && pickerStyles.typeChipTextActive]}>
                      {t.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <ActivityIndicator color={Colors.accent} size="large" />
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 12, fontWeight: '500' }}>
                Loading media assets...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={i => i.id || i.url}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 8 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  icon="folder-open-outline"
                  title="No Media Found"
                  description="Upload a new file using the button above or try a different search."
                />
              }
              renderItem={({ item }) => {
                const isPlaying = playingUrl === item.url;
                const isLoadingAudio = audioLoadingUrl === item.url;

                return (
                  <View style={pickerStyles.mediaRow}>
                    {/* Thumbnail or Icon */}
                    {item.type === 'image' && item.url ? (
                      <TouchableOpacity
                        onPress={() => setPreviewImage({ url: item.url, name: item.name })}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: item.url }} style={pickerStyles.mediaThumb} />
                        <View style={pickerStyles.thumbZoomIcon}>
                          <Ionicons name="expand" size={10} color="#ffffff" />
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={[pickerStyles.mediaIconWrap, isPlaying && pickerStyles.mediaIconWrapPlaying]}>
                        <Ionicons
                          name={isPlaying ? 'volume-high' : getMediaIcon(item.type)}
                          size={18}
                          color={isPlaying ? '#10b981' : '#7c3aed'}
                        />
                      </View>
                    )}

                    {/* Metadata & Tap to Select */}
                    <TouchableOpacity
                      style={{ flex: 1, marginRight: 8, justifyContent: 'center' }}
                      onPress={() => {
                        stopAudio();
                        onSelect(item.url, item);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={pickerStyles.mediaName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={[pickerStyles.mediaTypeBadge, isPlaying && { color: '#047857', backgroundColor: '#ecfdf5' }]}>
                          {isPlaying ? 'PLAYING PREVIEW' : item.type.toUpperCase()}
                        </Text>
                        {item.size ? (
                          <Text style={pickerStyles.mediaSize}>{formatFileSize(item.size)}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    {/* Quick Preview Actions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {/* Audio: Play / Pause Preview */}
                      {item.type === 'audio' ? (
                        <TouchableOpacity
                          style={[pickerStyles.previewBtn, isPlaying && pickerStyles.previewBtnPlaying]}
                          onPress={() => handleToggleAudioPlay(item.url)}
                          disabled={isLoadingAudio}
                          activeOpacity={0.8}
                        >
                          {isLoadingAudio ? (
                            <ActivityIndicator size="small" color="#7c3aed" />
                          ) : (
                            <Ionicons
                              name={isPlaying ? 'pause' : 'play'}
                              size={15}
                              color={isPlaying ? '#ffffff' : '#7c3aed'}
                            />
                          )}
                        </TouchableOpacity>
                      ) : null}

                      {/* Image: Full Image Preview */}
                      {item.type === 'image' ? (
                        <TouchableOpacity
                          style={pickerStyles.previewBtn}
                          onPress={() => setPreviewImage({ url: item.url, name: item.name })}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="eye-outline" size={15} color="#7c3aed" />
                        </TouchableOpacity>
                      ) : null}

                      {/* Video: Open Video Preview */}
                      {item.type === 'video' ? (
                        <TouchableOpacity
                          style={pickerStyles.previewBtn}
                          onPress={() => handleOpenVideo(item.url)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="play-circle-outline" size={16} color="#7c3aed" />
                        </TouchableOpacity>
                      ) : null}

                      {/* Select Pill */}
                      <TouchableOpacity
                        style={pickerStyles.selectPill}
                        onPress={() => {
                          stopAudio();
                          onSelect(item.url, item);
                          onClose();
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={pickerStyles.selectPillText}>Select</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>

      {/* Full-Screen Image Preview Lightbox */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={pickerStyles.imagePreviewOverlay}>
          <View style={[pickerStyles.imagePreviewHeader, { paddingTop: Math.max(insets.top + 10, 36) }]}>
            <Text style={pickerStyles.imagePreviewTitle} numberOfLines={1}>
              {previewImage?.name || 'Image Preview'}
            </Text>
            <TouchableOpacity
              style={pickerStyles.imagePreviewCloseBtn}
              onPress={() => setPreviewImage(null)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={pickerStyles.imagePreviewBody}>
            {previewImage?.url ? (
              <Image
                source={{ uri: previewImage.url }}
                style={pickerStyles.imagePreviewContent}
                resizeMode="contain"
              />
            ) : null}
          </View>

          <View style={[pickerStyles.imagePreviewFooter, { paddingBottom: Math.max(insets.bottom + 10, 24) }]}>
            <TouchableOpacity
              style={pickerStyles.imagePreviewSelectBtn}
              onPress={() => {
                if (previewImage?.url) {
                  stopAudio();
                  onSelect(previewImage.url);
                  setPreviewImage(null);
                  onClose();
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={pickerStyles.imagePreviewSelectText}>Select This Artwork</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  cancelText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f5f3ff',
    borderRadius: 8,
  },
  uploadBtnText: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '700',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  typeChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  typeChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  typeChipActive: {
    backgroundColor: '#7c3aed',
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  typeChipTextActive: {
    color: '#ffffff',
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 1,
  },
  mediaIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mediaName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  mediaTypeBadge: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7c3aed',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mediaSize: {
    fontSize: 11,
    color: '#94a3b8',
  },
  selectPill: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  mediaThumb: {
    width: 38,
    height: 38,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#e2e8f0',
  },
  thumbZoomIcon: {
    position: 'absolute',
    bottom: 2,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 4,
    padding: 2,
  },
  mediaIconWrapPlaying: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
  },
  previewBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBtnPlaying: {
    backgroundColor: '#10b981',
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'space-between',
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  imagePreviewTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 12,
  },
  imagePreviewCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  imagePreviewContent: {
    width: '100%',
    height: '100%',
  },
  imagePreviewFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  imagePreviewSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 14,
  },
  imagePreviewSelectText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
