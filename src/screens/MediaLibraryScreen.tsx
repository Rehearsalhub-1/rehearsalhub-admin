import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Share,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { customAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';

// ── Types ────────────────────────────────────────────────────────────────────

export type MediaType = 'audio' | 'video' | 'image' | 'document';

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  videoUrl?: string;
  type: MediaType;
  size?: number | string;
  thumbnail?: string | null;
  description?: string;
  uploadedAt?: string;
  folder?: string;
  views?: number;
  forHq?: boolean;
  zoneId?: string;
}

export type CategoryFilter = 'all' | 'audio' | 'video' | 'image' | 'document';

export function inferMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}

export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function formatFileSize(size?: number | string): string {
  if (!size) return '';
  if (typeof size === 'string') return size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recently';
  }
}

const CATEGORY_TABS: { id: CategoryFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'All', icon: 'albums-outline' },
  { id: 'audio', label: 'Audio Stems', icon: 'musical-notes-outline' },
  { id: 'video', label: 'Videos', icon: 'videocam-outline' },
  { id: 'image', label: 'Photos & Images', icon: 'image-outline' },
  { id: 'document', label: 'Scores & Sheets', icon: 'document-text-outline' },
];

function InAppVideoViewer({ item }: { item: MediaItem }) {
  const videoSource = item.url || item.videoUrl || '';
  const player = useVideoPlayer(videoSource, p => {
    p.play();
  });

  return (
    <VideoView
      style={styles.nativeVideo}
      player={player}
      nativeControls={true}
      contentFit="contain"
    />
  );
}

export default function MediaLibraryScreen() {
  const { activeZone } = useZoneContext();
  const { adminUser } = useAuth();

  if (!adminUser?.isHQAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Media Assets" showBack={false} />
        <View style={styles.accessNotice}>
          <Ionicons name="lock-closed-outline" size={42} color="#94a3b8" />
          <Text style={styles.emptyTitle}>HQ-managed media</Text>
          <Text style={styles.accessNoticeText}>Media Assets are managed by Headquarters and delivered to the mobile app.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Media list & loading
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Select & Bulk Actions State
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk Download Progress State
  const [bulkDownloading, setBulkDownloading] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentName: string }>({
    current: 0,
    total: 0,
    currentName: '',
  });

  // In-App Audio Player State
  const [activeAudioItem, setActiveAudioItem] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [playbackPos, setPlaybackPos] = useState<number>(0);
  const [playbackDur, setPlaybackDur] = useState<number>(0);
  const [showFullPlayerModal, setShowFullPlayerModal] = useState<boolean>(false);
  const soundRef = useRef<AudioPlayer | null>(null);

  // In-App Video Player State
  const [activeVideoItem, setActiveVideoItem] = useState<MediaItem | null>(null);

  // In-App Image Lightbox State
  const [activeImageItem, setActiveImageItem] = useState<MediaItem | null>(null);

  // Add Media Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [inputSource, setInputSource] = useState<'device' | 'url'>('device');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; type: string; size?: number } | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<MediaType>('audio');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Rename Modal State
  const [renamingItem, setRenamingItem] = useState<MediaItem | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameCategory, setRenameCategory] = useState<MediaType>('audio');
  const [renameNotes, setRenameNotes] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  }, []);

  // ── Audio Cleanup ──────────────────────────────────────────────────────────

  const stopCurrentAudio = useCallback(async () => {
    if (soundRef.current) {
      try {
        soundRef.current.pause();
        soundRef.current.remove();
      } catch {}
      soundRef.current = null;
    }
    setIsPlaying(false);
    setIsBuffering(false);
    setPlaybackPos(0);
    setPlaybackDur(0);
  }, []);

  const closeAudioPlayer = useCallback(async () => {
    await stopCurrentAudio();
    setActiveAudioItem(null);
    setShowFullPlayerModal(false);
  }, [stopCurrentAudio]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [stopCurrentAudio]);

  // ── Load Media ─────────────────────────────────────────────────────────────

  const loadMedia = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api.media.getAll(activeZone?.id);
      const items = Array.isArray(res?.data) ? res.data : [];
      if (items.length > 0) {
        const mapped: MediaItem[] = items.map((item: any) => ({
          id: item.id || `media_${Math.random()}`,
          name: item.name || item.title || 'Untitled Asset',
          url: item.url || item.videoUrl || '',
          videoUrl: item.videoUrl,
          type:
            item.type ||
            (item.url?.match(/\.(mp3|wav|m4a|aac)$/i)
              ? 'audio'
              : item.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i)
              ? 'image'
              : 'document'),
          size: item.size,
          thumbnail: item.thumbnail || (item.url ? getYouTubeThumbnail(item.url) : null),
          description: item.description,
          uploadedAt: item.uploadedAt || item.createdAt,
          folder: item.folder,
          views: item.views,
          forHq: item.forHq ?? true,
          zoneId: item.zoneId,
        }));
        setMediaList(mapped);
      } else {
        setMediaList([]);
      }
    } catch (error: any) {
      setMediaList([]);
      setLoadError(error?.message || 'Unable to load media assets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    loadMedia();
  }, [loadMedia]);

  const onRefresh = () => {
    setRefreshing(true);
    stopCurrentAudio();
    loadMedia();
  };

  // ── Filtered List ──────────────────────────────────────────────────────────

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return mediaList.filter((item) => {
      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'audio' && item.type === 'audio') ||
        (activeTab === 'video' && item.type === 'video') ||
        (activeTab === 'image' && item.type === 'image') ||
        (activeTab === 'document' && item.type === 'document');

      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      return matchTab && matchQuery;
    });
  }, [mediaList, activeTab, searchQuery]);

  const counts = useMemo(() => ({
    all: mediaList.length,
    audio: mediaList.filter((m) => m.type === 'audio').length,
    video: mediaList.filter((m) => m.type === 'video').length,
    image: mediaList.filter((m) => m.type === 'image').length,
    document: mediaList.filter((m) => m.type === 'document').length,
  }), [mediaList]);

  // ── Multi-Select Logic ─────────────────────────────────────────────────────

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  // ── Bulk Download & Export Handlers ───────────────────────────────────────

  const handleBulkDownload = async () => {
    const targetItems = selectedIds.size > 0
      ? mediaList.filter((i) => selectedIds.has(i.id))
      : filteredItems;

    if (targetItems.length === 0) {
      customAlert('No Files', 'No media files available to download.');
      return;
    }

    setBulkDownloading(true);
    setBulkProgress({ current: 0, total: targetItems.length, currentName: 'Initializing...' });

    // Web Platform: Sequential Blob Download with clean names
    if (Platform.OS === 'web') {
      try {
        for (let i = 0; i < targetItems.length; i++) {
          const item = targetItems[i];
          setBulkProgress({
            current: i + 1,
            total: targetItems.length,
            currentName: item.name,
          });

          const url = item.url || item.videoUrl;
          if (url && typeof document !== 'undefined') {
            try {
              const res = await fetch(url);
              const blob = await res.blob();
              const objectUrl = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = objectUrl;
              const ext = url.split('?')[0].split('.').pop() || (item.type === 'audio' ? 'mp3' : 'pdf');
              link.download = `${item.name}.${ext}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(objectUrl);
            } catch {
              // Fallback to opening direct link
              window.open(url, '_blank');
            }
          }
          // Micro delay to prevent browser popup block
          await new Promise((r) => setTimeout(r, 450));
        }
        showToast(`Downloaded ${targetItems.length} files successfully!`);
      } catch (err: any) {
        customAlert('Download Error', err?.message || 'Could not complete bulk download.');
      } finally {
        setBulkDownloading(false);
        setIsSelectMode(false);
        setSelectedIds(new Set());
      }
      return;
    }

    // Native Mobile Platform: Generate Manifest and Share Batch
    try {
      const manifestRows = targetItems.map((item, idx) => {
        return `${idx + 1}. ${item.name} (${item.type.toUpperCase()})\nLink: ${item.url || item.videoUrl || 'N/A'}`;
      });

      const manifestContent = `🎵 Loveworld Singers RehearsalHub - Media Download Pack (${targetItems.length} Files)\n\n` +
        manifestRows.join('\n\n') +
        `\n\nGenerated for manual re-upload & backup.`;

      setBulkProgress({ current: targetItems.length, total: targetItems.length, currentName: 'Ready' });
      await Share.share({
        title: `Bulk Media Download Pack (${targetItems.length} Files)`,
        message: manifestContent,
      });
      showToast(`Exported ${targetItems.length} download links!`);
    } catch (e: any) {
      customAlert('Export Notice', e?.message || 'Unable to export download pack.');
    } finally {
      setBulkDownloading(false);
      setIsSelectMode(false);
      setSelectedIds(new Set());
    }
  };

  const handleExportCSV = () => {
    const targetItems = selectedIds.size > 0
      ? mediaList.filter((i) => selectedIds.has(i.id))
      : filteredItems;

    if (targetItems.length === 0) return;

    const headers = ['File_Name', 'Category', 'File_Size', 'Direct_Download_URL', 'Zone', 'Uploaded_Date'];
    const rows = targetItems.map((i) => [
      `"${(i.name || '').replace(/"/g, '""')}"`,
      i.type,
      `"${i.size || ''}"`,
      `"${i.url || i.videoUrl || ''}"`,
      i.forHq ? 'Global HQ' : i.zoneId || 'Local',
      i.uploadedAt || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `rehearsal_media_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV manifest downloaded!');
      return;
    }

    Share.share({
      title: 'Media Library CSV Export',
      message: csvContent,
    });
  };

  // ── Audio Playback ─────────────────────────────────────────────────────────

  const handleTogglePlay = async (item: MediaItem) => {
    if (activeAudioItem?.id === item.id) {
      if (isPlaying) {
        if (soundRef.current) {
          try {
            soundRef.current.pause();
          } catch {}
        }
        setIsPlaying(false);
      } else {
        if (soundRef.current) {
          try {
            if (soundRef.current.currentTime >= soundRef.current.duration && soundRef.current.duration > 0) {
              await soundRef.current.seekTo(0);
            }
            soundRef.current.play();
            setIsPlaying(true);
          } catch {}
        }
      }
      return;
    }

    await stopCurrentAudio();
    if (!item.url) {
      customAlert('No Audio Stream', 'This media track does not have an audio stream URL.');
      return;
    }

    setActiveAudioItem(item);
    setIsBuffering(true);
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });

      const player = createAudioPlayer({ uri: item.url }, { updateInterval: 250 });
      (player as any).addListener('playbackStatusUpdate', (status: any) => {
        setPlaybackPos((status.currentTime || 0) * 1000);
        setPlaybackDur((status.duration || 0) * 1000);
        setIsPlaying(status.playing);
        setIsBuffering(status.isBuffering);
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlaybackPos(0);
        }
      });

      player.play();
      soundRef.current = player;
      setIsPlaying(true);
    } catch (err: any) {
      customAlert('Playback Notice', 'Could not stream audio: ' + (err?.message || 'Unsupported format'));
      setActiveAudioItem(null);
    } finally {
      setIsBuffering(false);
    }
  };

  const handleSeekRelative = async (offsetMillis: number) => {
    if (!soundRef.current) return;
    try {
      const newPosMs = Math.max(0, Math.min(playbackDur, playbackPos + offsetMillis));
      await soundRef.current.seekTo(newPosMs / 1000);
      setPlaybackPos(newPosMs);
    } catch {}
  };

  // ── In-App Media Viewer ───────────────────────────────────────────────────

  const handleOpenMedia = async (item: MediaItem) => {
    if (isSelectMode) {
      handleToggleSelect(item.id);
      return;
    }

    const url = item.url || item.videoUrl;
    if (!url) return;

    if (item.type === 'audio') {
      handleTogglePlay(item);
      return;
    }

    if (item.type === 'image' || url.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) {
      setActiveImageItem(item);
      return;
    }

    if (item.type === 'video') {
      if (url.match(/\.(mp4|mov|m4v|webm|mkv)(\?.*)?$/i)) {
        await stopCurrentAudio();
        setActiveVideoItem(item);
        return;
      }

      try {
        await WebBrowser.openBrowserAsync(url, {
          toolbarColor: '#7c3aed',
          controlsColor: '#ffffff',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });
        return;
      } catch {
        Linking.openURL(url).catch(() => {});
        return;
      }
    }

    if (item.type === 'document') {
      try {
        await WebBrowser.openBrowserAsync(url, {
          toolbarColor: '#7c3aed',
          controlsColor: '#ffffff',
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });
        return;
      } catch {
        Linking.openURL(url).catch(() => {});
        return;
      }
    }
  };

  // ── Rename Existing Asset ──────────────────────────────────────────────────

  const handleOpenRename = (item: MediaItem) => {
    setRenamingItem(item);
    setRenameTitle(item.name);
    setRenameCategory(item.type);
    setRenameNotes(item.description || '');
  };

  const handleSaveRename = async () => {
    if (!renamingItem) return;
    if (!renameTitle.trim()) {
      customAlert('Name Required', 'Please enter a valid name for this media file.');
      return;
    }

    setRenaming(true);
    try {
      const updatedData = {
        name: renameTitle.trim(),
        type: renameCategory,
        description: renameNotes.trim() || undefined,
      };

      await api.media.update(renamingItem.id, updatedData);

      setMediaList((prev) =>
        prev.map((m) => (m.id === renamingItem.id ? { ...m, ...updatedData } : m))
      );

      if (activeAudioItem?.id === renamingItem.id) {
        setActiveAudioItem((prev) => (prev ? { ...prev, ...updatedData } : null));
      }

      setRenamingItem(null);
      showToast('File renamed successfully!');
    } catch (err: any) {
      customAlert('Rename Error', err?.message || 'Could not rename file.');
    } finally {
      setRenaming(false);
    }
  };

  // ── Share Link ─────────────────────────────────────────────────────────────

  const handleShare = async (item: MediaItem) => {
    const url = item.url || item.videoUrl;
    if (!url) return;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard!');
        return;
      } catch {}
    }

    try {
      await Share.share({
        title: item.name,
        message: `${item.name}\n${url}`,
        url: url,
      });
    } catch {}
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = (item: MediaItem) => {
    customAlert(
      'Remove Media Asset',
      `Are you sure you want to remove "${item.name}" from the library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (activeAudioItem?.id === item.id) {
              await closeAudioPlayer();
            }
            if (activeImageItem?.id === item.id) {
              setActiveImageItem(null);
            }
            try {
              await api.media.delete(item.id);
            } catch {}
            setMediaList((prev) => prev.filter((m) => m.id !== item.id));
            showToast('Asset removed from library');
          },
        },
      ]
    );
  };

  // ── Pick File from Device ──────────────────────────────────────────────────

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*', 'application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets?.length) return;
      const file = res.assets[0];
      setSelectedFile({
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
        size: file.size,
      });

      if (!formTitle.trim()) {
        const cleanName = file.name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]/g, ' ');
        setFormTitle(cleanName);
      }

      if (file.mimeType) {
        setFormCategory(inferMediaType(file.mimeType));
      }
    } catch (e: any) {
      customAlert('Notice', e?.message || 'Could not pick file from device.');
    }
  };

  // ── Save New Media Asset ───────────────────────────────────────────────────

  const handleSaveAsset = async () => {
    if (!formTitle.trim()) {
      customAlert('Title Required', 'Please enter a name for this media item.');
      return;
    }

    if (inputSource === 'device' && !selectedFile) {
      customAlert('Select a File', 'Please choose a file from your device to upload.');
      return;
    }

    if (inputSource === 'url' && !formUrl.trim()) {
      customAlert('Link Required', 'Please enter a valid web or video link.');
      return;
    }

    setSaving(true);
    try {
      let finalUrl = formUrl.trim();
      let detectedType = formCategory;
      const sizeLabel = selectedFile?.size ? formatFileSize(selectedFile.size) : 'Online Stream';

      if (inputSource === 'device' && selectedFile) {
        try {
          const uploadRes = await api.media.upload(
            {
              uri: selectedFile.uri,
              name: selectedFile.name,
              type: selectedFile.type,
            },
            'rehearsals'
          );
          finalUrl = uploadRes.data?.url || (uploadRes as any).url || selectedFile.uri;
          if (!finalUrl || finalUrl === selectedFile.uri) {
            throw new Error('Cloudflare R2 did not return a media URL.');
          }
        } catch (error: any) {
          throw new Error(error?.message || 'Media upload failed. Please try again.');
        }
      }

      const ytId = getYouTubeId(finalUrl);
      const thumbnail = ytId ? getYouTubeThumbnail(finalUrl) : null;
      if (ytId) {
        detectedType = 'video';
      }

      const newAsset: MediaItem = {
        id: `media_${Date.now()}`,
        name: formTitle.trim(),
        url: finalUrl,
        videoUrl: detectedType === 'video' ? finalUrl : undefined,
        type: detectedType,
        size: sizeLabel,
        thumbnail: thumbnail || (detectedType === 'image' ? finalUrl : null),
        description: formNotes.trim() || undefined,
        uploadedAt: new Date().toISOString(),
        forHq: true,
        zoneId: activeZone?.id,
      };

      try {
        await api.media.create({
          name: newAsset.name,
          url: newAsset.url,
          type: newAsset.type,
          description: newAsset.description,
          zoneId: activeZone?.id,
        });
      } catch {}

      setMediaList((prev) => [newAsset, ...prev]);
      setModalVisible(false);
      resetForm();
      showToast('Media added to library!');
    } catch (e: any) {
      customAlert('Save Notice', e?.message || 'Could not add media item.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFormTitle('');
    setFormUrl('');
    setFormNotes('');
    setFormCategory('audio');
    setInputSource('device');
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ── Render Item ────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: MediaItem }) => {
    const isCurrentActive = activeAudioItem?.id === item.id;
    const isCurrentPlaying = isCurrentActive && isPlaying;
    const isAudio = item.type === 'audio';
    const isVideo = item.type === 'video';
    const isImage = item.type === 'image';
    const isDoc = item.type === 'document';
    const isSelected = selectedIds.has(item.id);

    const categoryLabel = isAudio
      ? 'Audio Stem'
      : isVideo
      ? 'Rehearsal Video'
      : isImage
      ? 'Photo & Image'
      : 'Sheet Music';

    return (
      <View
        style={[
          styles.card,
          isCurrentActive && styles.cardActiveAudio,
          isSelected && styles.cardSelected,
        ]}
      >
        <View style={styles.cardMainRow}>
          {/* Checkbox in Select Mode */}
          {isSelectMode ? (
            <TouchableOpacity
              style={styles.checkboxTouch}
              onPress={() => handleToggleSelect(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? '#7c3aed' : '#94a3b8'}
              />
            </TouchableOpacity>
          ) : null}

          {/* Leading Icon / Thumbnail */}
          {isVideo && item.thumbnail ? (
            <TouchableOpacity
              style={styles.mediaThumbBox}
              activeOpacity={0.85}
              onPress={() => handleOpenMedia(item)}
            >
              <Image source={{ uri: item.thumbnail }} style={styles.mediaThumb} />
              <View style={styles.playOverlay}>
                <Ionicons name="play" size={16} color="#ffffff" style={{ marginLeft: 2 }} />
              </View>
            </TouchableOpacity>
          ) : isImage && (item.thumbnail || item.url) ? (
            <TouchableOpacity
              style={styles.mediaThumbBox}
              activeOpacity={0.85}
              onPress={() => handleOpenMedia(item)}
            >
              <Image source={{ uri: item.thumbnail || item.url }} style={styles.mediaThumb} />
            </TouchableOpacity>
          ) : loadError ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="cloud-offline-outline" size={32} color="#dc2626" />
              </View>
              <Text style={styles.emptyTitle}>Media could not be loaded</Text>
              <Text style={styles.emptySubText}>{loadError}</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={loadMedia} activeOpacity={0.8}>
                <Ionicons name="refresh" size={18} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.emptyBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.iconBadge,
                isAudio && styles.iconAudio,
                isVideo && styles.iconVideo,
                isImage && styles.iconImage,
                isDoc && styles.iconDoc,
              ]}
              onPress={() => handleOpenMedia(item)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  isAudio
                    ? 'musical-note'
                    : isVideo
                    ? 'videocam'
                    : isImage
                    ? 'image'
                    : 'document-text'
                }
                size={22}
                color={
                  isAudio
                    ? '#7c3aed'
                    : isVideo
                    ? '#2563eb'
                    : isImage
                    ? '#db2777'
                    : '#059669'
                }
              />
            </TouchableOpacity>
          )}

          {/* Details */}
          <TouchableOpacity
            style={styles.cardInfo}
            activeOpacity={0.75}
            onPress={() => handleOpenMedia(item)}
          >
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.name}
            </Text>

            <View style={styles.metaRow}>
              <Text
                style={[
                  styles.categoryPillText,
                  isImage && { color: '#db2777' },
                  isDoc && { color: '#059669' },
                  isVideo && { color: '#2563eb' },
                ]}
              >
                {categoryLabel}
              </Text>
              {item.size ? (
                <>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.metaSubText}>{formatFileSize(item.size)}</Text>
                </>
              ) : null}
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaSubText}>{formatDate(item.uploadedAt)}</Text>
            </View>

            {item.description ? (
              <Text style={styles.itemDesc} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </TouchableOpacity>

          {/* Primary Action Button (Hidden when select mode is on for fast checking) */}
          {!isSelectMode ? (
            isAudio ? (
              <TouchableOpacity
                style={[styles.primaryActionBtn, isCurrentPlaying && styles.primaryActionBtnActive]}
                onPress={() => handleTogglePlay(item)}
                activeOpacity={0.8}
              >
                {isCurrentActive && isBuffering ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons
                    name={isCurrentPlaying ? 'pause' : 'play'}
                    size={16}
                    color="#ffffff"
                    style={!isCurrentPlaying ? { marginLeft: 2 } : undefined}
                  />
                )}
                <Text style={styles.primaryActionText}>
                  {isCurrentPlaying ? 'Pause' : 'Play'}
                </Text>
              </TouchableOpacity>
            ) : isImage ? (
              <TouchableOpacity
                style={[styles.viewActionBtn, { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }]}
                onPress={() => handleOpenMedia(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="eye-outline" size={15} color="#db2777" style={{ marginRight: 4 }} />
                <Text style={[styles.viewActionText, { color: '#db2777' }]}>Photo</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.viewActionBtn}
                onPress={() => handleOpenMedia(item)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isVideo ? 'play-outline' : 'document-outline'}
                  size={15}
                  color="#7c3aed"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.viewActionText}>
                  {isVideo ? 'Watch' : 'Score'}
                </Text>
              </TouchableOpacity>
            )
          ) : null}
        </View>

        {/* Bottom Utility Row */}
        <View style={styles.cardBottomRow}>
          <Text style={styles.zoneTag}>
            {item.forHq ? '⭐ Global HQ Catalog' : '📍 Local Repertoire'}
          </Text>

          <View style={styles.utilityBtns}>
            {/* Rename Button */}
            <TouchableOpacity
              style={styles.utilBtn}
              onPress={() => handleOpenRename(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={14} color="#7c3aed" />
              <Text style={[styles.utilBtnText, { color: '#7c3aed' }]}>Rename</Text>
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity
              style={styles.utilBtn}
              onPress={() => handleShare(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="share-outline" size={15} color="#64748b" />
              <Text style={styles.utilBtnText}>Share</Text>
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={styles.utilBtn}
              onPress={() => handleDelete(item)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={15} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Executive Clean Header */}
      <ZoneHeader
        title="Media Library"
        subtitle={
          isSelectMode
            ? `${selectedIds.size} of ${filteredItems.length} selected`
            : `${filteredItems.length} practice files available`
        }
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Select Mode Toggle */}
            <TouchableOpacity
              style={[styles.headerToolBtn, isSelectMode && styles.headerToolBtnActive]}
              onPress={() => {
                setIsSelectMode(!isSelectMode);
                if (isSelectMode) setSelectedIds(new Set());
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSelectMode ? 'checkmark-done' : 'checkbox-outline'}
                size={16}
                color={isSelectMode ? '#ffffff' : '#7c3aed'}
              />
              <Text style={[styles.headerToolBtnText, isSelectMode && styles.headerToolBtnTextActive]}>
                {isSelectMode ? 'Done' : 'Select'}
              </Text>
            </TouchableOpacity>

            {/* Add Media Button */}
            {!isSelectMode ? (
              <TouchableOpacity
                style={styles.headerAddBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 2 }} />
                <Text style={styles.headerAddBtnText}>Add</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      {/* Select Mode Sub-Toolbar */}
      {isSelectMode ? (
        <View style={styles.selectToolbar}>
          <TouchableOpacity
            style={styles.selectToolTextBtn}
            onPress={handleSelectAll}
            activeOpacity={0.75}
          >
            <Ionicons
              name={selectedIds.size === filteredItems.length ? 'close-circle-outline' : 'checkbox-outline'}
              size={15}
              color="#7c3aed"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.selectToolText}>
              {selectedIds.size === filteredItems.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Simple Category Tabs */}
      <View style={styles.tabsStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {CATEGORY_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            const count = counts[tab.id];
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, isSelected && styles.tabChipSelected]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isSelected ? '#ffffff' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabChipText, isSelected && styles.tabChipTextSelected]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabBadge, isSelected && styles.tabBadgeSelected]}>
                  <Text style={[styles.tabBadgeNum, isSelected && styles.tabBadgeNumSelected]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#7c3aed" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stems, photos, videos, scores..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Toast Feedback */}
      {toastMsg ? (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      ) : null}

      {/* Media Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          isSelectMode ? { paddingBottom: 130 } : activeAudioItem ? { paddingBottom: 110 } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
            colors={['#7c3aed']}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={styles.emptySubText}>Loading rehearsal media...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="musical-notes-outline" size={32} color="#7c3aed" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Results Found' : 'No Media Uploaded Yet'}
              </Text>
              <Text style={styles.emptySubText}>
                {searchQuery
                  ? 'Try searching for a different name or change category filters.'
                  : 'Tap "Add" to upload audio stems, photos, videos, or sheet music.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.emptyBtnText}>Add First Media</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* ── 1. Floating Bottom Bar in Select Mode ───────────────────────── */}
      {isSelectMode ? (
        <View style={styles.floatingSelectBar}>
          <View style={styles.floatingSelectBarLeft}>
            <Text style={styles.selectBarCount}>
              {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'Select Files'}
            </Text>
            <Text style={styles.selectBarSub}>
              {selectedIds.size > 0 ? 'Ready for bulk download' : 'Tap items to select'}
            </Text>
          </View>

          <View style={styles.floatingSelectBarRight}>
            <TouchableOpacity
              style={styles.exportCsvBtn}
              onPress={handleExportCSV}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={15} color="#7c3aed" style={{ marginRight: 4 }} />
              <Text style={styles.exportCsvText}>CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bulkDownloadBtn,
                selectedIds.size === 0 && styles.bulkDownloadBtnDisabled,
              ]}
              onPress={handleBulkDownload}
              disabled={selectedIds.size === 0}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-download" size={16} color="#ffffff" style={{ marginRight: 5 }} />
              <Text style={styles.bulkDownloadText}>
                {selectedIds.size > 0 ? `Download (${selectedIds.size})` : 'Download'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* ── 2. Floating In-App Audio Mini-Player Bar ─────────────────────── */}
      {!isSelectMode && activeAudioItem ? (
        <TouchableOpacity
          style={styles.floatingMiniPlayer}
          activeOpacity={0.92}
          onPress={() => setShowFullPlayerModal(true)}
        >
          {/* Top Progress Bar */}
          <View style={styles.miniProgressTrack}>
            <View
              style={[
                styles.miniProgressFill,
                {
                  width:
                    playbackDur > 0
                      ? `${Math.min(100, (playbackPos / playbackDur) * 100)}%`
                      : '0%',
                },
              ]}
            />
          </View>

          <View style={styles.miniPlayerContent}>
            <View style={styles.miniThumb}>
              <Ionicons name="musical-note" size={18} color="#7c3aed" />
            </View>

            <View style={styles.miniDetails}>
              <Text style={styles.miniTitle} numberOfLines={1}>
                {activeAudioItem.name}
              </Text>
              <Text style={styles.miniTime}>
                {formatTime(playbackPos)} / {formatTime(playbackDur || 0)}
              </Text>
            </View>

            <View style={styles.miniControls}>
              <TouchableOpacity
                style={styles.miniSkipBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleSeekRelative(-10000);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="play-back" size={17} color="#475569" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.miniPlayBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleTogglePlay(activeAudioItem);
                }}
              >
                {isBuffering ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={16}
                    color="#ffffff"
                    style={!isPlaying ? { marginLeft: 2 } : undefined}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.miniSkipBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  handleSeekRelative(10000);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="play-forward" size={17} color="#475569" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.miniCloseBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  closeAudioPlayer();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      ) : null}

      {/* ── 3. Bulk Download Progress Modal ──────────────────────────────── */}
      <Modal
        visible={bulkDownloading}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {}}
      >
        <View style={styles.progressBackdrop}>
          <View style={styles.progressCard}>
            <View style={styles.progressIconCircle}>
              <Ionicons name="cloud-download" size={32} color="#7c3aed" />
            </View>
            <Text style={styles.progressTitle}>Bulk Downloading Media</Text>
            <Text style={styles.progressSubtitle}>
              Downloading {bulkProgress.current} of {bulkProgress.total} files...
            </Text>

            <Text style={styles.progressCurrentFile} numberOfLines={1}>
              {bulkProgress.currentName}
            </Text>

            {/* Progress Track */}
            <View style={styles.modalProgressTrack}>
              <View
                style={[
                  styles.modalProgressFill,
                  {
                    width:
                      bulkProgress.total > 0
                        ? `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%`
                        : '10%',
                  },
                ]}
              />
            </View>

            <Text style={styles.progressPercentText}>
              {bulkProgress.total > 0
                ? `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}% Completed`
                : 'Starting...'}
            </Text>
            <Text style={styles.progressHint}>
              Please keep the app open while files are being saved.
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── 5. Full In-App Audio Player Modal ────────────────────────────── */}
      <Modal
        visible={showFullPlayerModal && !!activeAudioItem}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFullPlayerModal(false)}
      >
        <View style={styles.fullPlayerOverlay}>
          <View style={styles.fullPlayerSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.fullPlayerHeader}>
              <TouchableOpacity
                onPress={() => setShowFullPlayerModal(false)}
                style={styles.closeCircleBtn}
              >
                <Ionicons name="chevron-down" size={22} color="#475569" />
              </TouchableOpacity>
              <Text style={styles.fullPlayerHeaderTitle}>AudioLab In-App Player</Text>
              <TouchableOpacity
                onPress={() => activeAudioItem && handleShare(activeAudioItem)}
                style={styles.closeCircleBtn}
              >
                <Ionicons name="share-outline" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {activeAudioItem ? (
              <View style={styles.fullPlayerBody}>
                <View style={styles.fullPlayerArt}>
                  <Ionicons name="musical-notes" size={54} color="#7c3aed" />
                </View>

                <Text style={styles.fullPlayerTitle} numberOfLines={2}>
                  {activeAudioItem.name}
                </Text>
                <Text style={styles.fullPlayerSubtitle}>
                  {activeAudioItem.forHq ? '⭐ Global HQ Stem' : '📍 Zonal Repertoire Stem'}
                </Text>

                {/* Scrubber Progress */}
                <View style={styles.scrubberContainer}>
                  <View style={styles.scrubberTrack}>
                    <View
                      style={[
                        styles.scrubberFill,
                        {
                          width:
                            playbackDur > 0
                              ? `${Math.min(100, (playbackPos / playbackDur) * 100)}%`
                              : '0%',
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.scrubberTimeRow}>
                    <Text style={styles.scrubberTimeText}>{formatTime(playbackPos)}</Text>
                    <Text style={styles.scrubberTimeText}>{formatTime(playbackDur)}</Text>
                  </View>
                </View>

                {/* Controls */}
                <View style={styles.fullControlsRow}>
                  <TouchableOpacity
                    style={styles.controlSecBtn}
                    onPress={() => handleSeekRelative(-10000)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="play-back" size={24} color="#475569" />
                    <Text style={styles.secBtnLabel}>-10s</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlPrimaryPlayBtn}
                    onPress={() => handleTogglePlay(activeAudioItem)}
                    activeOpacity={0.85}
                  >
                    {isBuffering ? (
                      <ActivityIndicator size="large" color="#ffffff" />
                    ) : (
                      <Ionicons
                        name={isPlaying ? 'pause' : 'play'}
                        size={32}
                        color="#ffffff"
                        style={!isPlaying ? { marginLeft: 3 } : undefined}
                      />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlSecBtn}
                    onPress={() => handleSeekRelative(10000)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="play-forward" size={24} color="#475569" />
                    <Text style={styles.secBtnLabel}>+10s</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ── 6. In-App Video Player Modal ─────────────────────────────────── */}
      <Modal
        visible={!!activeVideoItem}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActiveVideoItem(null)}
      >
        <View style={styles.videoPlayerBackdrop}>
          <SafeAreaView style={styles.videoPlayerSafeArea}>
            <View style={styles.videoPlayerHeader}>
              <Text style={styles.videoPlayerTitle} numberOfLines={1}>
                {activeVideoItem?.name || 'Rehearsal Video'}
              </Text>
              <TouchableOpacity
                onPress={() => setActiveVideoItem(null)}
                style={styles.videoCloseBtn}
              >
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.videoWrapper}>
              {activeVideoItem?.url ? (
                <InAppVideoViewer item={activeVideoItem} />
              ) : null}
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── 7. In-App Image Lightbox Modal ───────────────────────────────── */}
      <Modal
        visible={!!activeImageItem}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setActiveImageItem(null)}
      >
        <View style={styles.imageLightboxBackdrop}>
          <SafeAreaView style={styles.lightboxSafeArea}>
            <View style={styles.lightboxHeader}>
              <Text style={styles.lightboxTitle} numberOfLines={1}>
                {activeImageItem?.name || 'Rehearsal Photo'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => activeImageItem && handleShare(activeImageItem)}
                  style={styles.lightboxActionBtn}
                >
                  <Ionicons name="share-outline" size={20} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveImageItem(null)}
                  style={styles.lightboxActionBtn}
                >
                  <Ionicons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.lightboxImageContainer}>
              {activeImageItem?.url ? (
                <Image
                  source={{ uri: activeImageItem.url }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>

            {activeImageItem?.description ? (
              <View style={styles.lightboxFooter}>
                <Text style={styles.lightboxDesc}>{activeImageItem.description}</Text>
              </View>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── 8. Rename Asset Modal ────────────────────────────────────────── */}
      <Modal
        visible={!!renamingItem}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!renaming) setRenamingItem(null);
        }}
      >
        <KeyboardAvoidingView
          behavior='padding'
          style={{ flex: 1 }}
        >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Rename Media File</Text>
                <Text style={styles.sheetSub}>Update file title, category and notes</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!renaming) setRenamingItem(null);
                }}
                disabled={renaming}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title Field */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>File Name / Title *</Text>
                <TextInput
                  style={styles.inputBox}
                  placeholder="Enter clean file name..."
                  placeholderTextColor="#94a3b8"
                  value={renameTitle}
                  onChangeText={setRenameTitle}
                />
              </View>

              {/* Category Field */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {[
                    { id: 'audio', label: 'Audio Stem', icon: 'musical-note' },
                    { id: 'image', label: 'Photo / Image', icon: 'image' },
                    { id: 'video', label: 'Video', icon: 'videocam' },
                    { id: 'document', label: 'Sheet Music', icon: 'document-text' },
                  ].map((cat) => {
                    const isSelected = renameCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catBtn, isSelected && styles.catBtnSelected]}
                        onPress={() => setRenameCategory(cat.id as MediaType)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={14}
                          color={isSelected ? '#ffffff' : '#475569'}
                          style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.catBtnText, isSelected && styles.catBtnTextSelected]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Notes Field */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Rehearsal Notes</Text>
                <TextInput
                  style={[styles.inputBox, styles.notesBox]}
                  placeholder="Optional notes or singer directions..."
                  placeholderTextColor="#94a3b8"
                  value={renameNotes}
                  onChangeText={setRenameNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={() => setRenamingItem(null)}
                disabled={renaming}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetSaveBtn, renaming && styles.sheetSaveBtnDisabled]}
                onPress={handleSaveRename}
                disabled={renaming}
                activeOpacity={0.85}
              >
                {renaming ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.sheetSaveText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.sheetSaveText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 9. Add Media Modal ───────────────────────────────────────────── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (!saving) setModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          behavior='padding'
          style={{ flex: 1 }}
        >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Add to Media Library</Text>
                <Text style={styles.sheetSub}>Upload stems, photos, videos, or scores</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!saving) setModalVisible(false);
                }}
                disabled={saving}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Simple 2-Way Source Selector */}
              <View style={styles.sourceSelector}>
                <TouchableOpacity
                  style={[styles.sourceBtn, inputSource === 'device' && styles.sourceBtnActive]}
                  onPress={() => setInputSource('device')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="folder-outline"
                    size={16}
                    color={inputSource === 'device' ? '#7c3aed' : '#64748b'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.sourceBtnText, inputSource === 'device' && styles.sourceBtnTextActive]}>
                    Choose File from Phone
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sourceBtn, inputSource === 'url' && styles.sourceBtnActive]}
                  onPress={() => setInputSource('url')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="link-outline"
                    size={16}
                    color={inputSource === 'url' ? '#7c3aed' : '#64748b'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.sourceBtnText, inputSource === 'url' && styles.sourceBtnTextActive]}>
                    Web or YouTube Link
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Source Option 1: File from Device */}
              {inputSource === 'device' ? (
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Selected File</Text>
                  {selectedFile ? (
                    <View style={styles.fileSelectedBox}>
                      <Ionicons name="document-text" size={22} color="#7c3aed" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fileSelectedName} numberOfLines={1}>
                          {selectedFile.name}
                        </Text>
                        <Text style={styles.fileSelectedSize}>
                          {selectedFile.size ? formatFileSize(selectedFile.size) : 'Ready'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.changeFileBtn}
                        onPress={handlePickDocument}
                        disabled={saving}
                      >
                        <Text style={styles.changeFileText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickFileCard}
                      onPress={handlePickDocument}
                      activeOpacity={0.78}
                      disabled={saving}
                    >
                      <Ionicons name="cloud-upload-outline" size={28} color="#7c3aed" />
                      <Text style={styles.pickFileTitle}>Tap to Select File</Text>
                      <Text style={styles.pickFileSub}>Audio Stems, Photos, PDF Scores, or Videos</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                /* Source Option 2: Link */
                <View style={styles.formField}>
                  <Text style={styles.fieldLabel}>Media Link or YouTube URL *</Text>
                  <TextInput
                    style={styles.inputBox}
                    placeholder="https://youtube.com/watch?v=... or direct link"
                    placeholderTextColor="#94a3b8"
                    value={formUrl}
                    onChangeText={setFormUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {getYouTubeId(formUrl) ? (
                    <Text style={styles.ytTag}>✓ YouTube video recognized</Text>
                  ) : null}
                </View>
              )}

              {/* Title Field with Renaming Guidance */}
              <View style={styles.formField}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <Text style={styles.fieldLabel}>File Name / Display Title *</Text>
                  <Text style={{ fontSize: 11, color: '#7c3aed', fontWeight: '700' }}>Rename freely</Text>
                </View>
                <TextInput
                  style={styles.inputBox}
                  placeholder="e.g. Grace & Peace - Soprano Lead Stem"
                  placeholderTextColor="#94a3b8"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />
                <Text style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                  You can rename this file as desired before uploading.
                </Text>
              </View>

              {/* Category Options */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {[
                    { id: 'audio', label: 'Audio Stem', icon: 'musical-note' },
                    { id: 'image', label: 'Photo / Image', icon: 'image' },
                    { id: 'video', label: 'Video', icon: 'videocam' },
                    { id: 'document', label: 'Sheet Music', icon: 'document-text' },
                  ].map((cat) => {
                    const isSelected = formCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catBtn, isSelected && styles.catBtnSelected]}
                        onPress={() => setFormCategory(cat.id as MediaType)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={14}
                          color={isSelected ? '#ffffff' : '#475569'}
                          style={{ marginRight: 5 }}
                        />
                        <Text style={[styles.catBtnText, isSelected && styles.catBtnTextSelected]}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Optional Notes */}
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Rehearsal Notes (Optional)</Text>
                <TextInput
                  style={[styles.inputBox, styles.notesBox]}
                  placeholder="e.g. Practice key modulation at the second verse..."
                  placeholderTextColor="#94a3b8"
                  value={formNotes}
                  onChangeText={setFormNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetSaveBtn, saving && styles.sheetSaveBtnDisabled]}
                onPress={handleSaveAsset}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.sheetSaveText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.sheetSaveText}>Save Media</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  accessNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  accessNoticeText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
  },
  headerToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ede9fe',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  headerToolBtnActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  headerToolBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  headerToolBtnTextActive: {
    color: '#ffffff',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  headerAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  selectToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ede9fe',
  },
  selectToolTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  selectToolText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  tabsStrip: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabChipSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
  },
  tabBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabBadgeNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  tabBadgeNumSelected: {
    color: '#ffffff',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ede9fe',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    paddingVertical: 0,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#6d28d9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 8,
    elevation: 3,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 10,
  },

  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardActiveAudio: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },
  cardSelected: {
    borderColor: '#7c3aed',
    borderWidth: 1.5,
    backgroundColor: '#f5f3ff',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxTouch: {
    marginRight: 8,
    padding: 2,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconAudio: {
    backgroundColor: '#f5f3ff',
  },
  iconVideo: {
    backgroundColor: '#eff6ff',
  },
  iconImage: {
    backgroundColor: '#fdf2f8',
  },
  iconDoc: {
    backgroundColor: '#ecfdf5',
  },
  mediaThumbBox: {
    width: 54,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
    backgroundColor: '#e2e8f0',
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 19,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  metaDot: {
    fontSize: 11,
    color: '#cbd5e1',
    marginHorizontal: 4,
  },
  metaSubText: {
    fontSize: 11,
    color: '#64748b',
  },
  itemDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  primaryActionBtnActive: {
    backgroundColor: '#5b21b6',
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  viewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ede9fe',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  zoneTag: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  utilityBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  utilBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  utilBtnText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },

  // Floating Select Bar
  floatingSelectBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 14,
    right: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 9,
  },
  floatingSelectBarLeft: {
    flex: 1,
  },
  selectBarCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  selectBarSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  floatingSelectBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportCsvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  exportCsvText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  bulkDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  bulkDownloadBtnDisabled: {
    opacity: 0.5,
  },
  bulkDownloadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Floating Mini Player
  floatingMiniPlayer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 14,
    right: 14,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  miniProgressTrack: {
    height: 3,
    backgroundColor: '#ede9fe',
    width: '100%',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
  },
  miniPlayerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  miniThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  miniDetails: {
    flex: 1,
    marginRight: 8,
  },
  miniTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  miniTime: {
    fontSize: 11,
    color: '#7c3aed',
    fontWeight: '600',
    marginTop: 2,
  },
  miniControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniSkipBtn: {
    padding: 4,
  },
  miniPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCloseBtn: {
    padding: 4,
    marginLeft: 4,
  },

  // Progress Card Modal
  progressBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  progressCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  progressIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
  },
  progressCurrentFile: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
    maxWidth: '90%',
    marginBottom: 14,
  },
  modalProgressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#ede9fe',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 4,
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  progressHint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // Full Audio Player Modal
  fullPlayerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  fullPlayerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 24,
  },
  fullPlayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  fullPlayerHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  closeCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPlayerBody: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  fullPlayerArt: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f5f3ff',
    borderWidth: 2,
    borderColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  fullPlayerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 4,
  },
  fullPlayerSubtitle: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '600',
    marginBottom: 20,
  },
  scrubberContainer: {
    width: '100%',
    marginBottom: 20,
  },
  scrubberTrack: {
    height: 6,
    backgroundColor: '#ede9fe',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scrubberFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 3,
  },
  scrubberTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  scrubberTimeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  fullControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  controlSecBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  secBtnLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 2,
  },
  controlPrimaryPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Video Player Modal
  videoPlayerBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoPlayerSafeArea: {
    flex: 1,
  },
  videoPlayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  videoPlayerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  videoCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nativeVideo: {
    width: '100%',
    height: '100%',
  },

  // Image Lightbox Modal
  imageLightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  lightboxSafeArea: {
    flex: 1,
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  lightboxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  lightboxActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  lightboxDesc: {
    fontSize: 12,
    color: '#e2e8f0',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Modal Common
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  sheetSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  sourceSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  sourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  sourceBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  sourceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  sourceBtnTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  formField: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  inputBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#1e293b',
  },
  notesBox: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  ytTag: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  pickFileCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#7c3aed',
    borderRadius: 12,
    backgroundColor: '#faf5ff',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickFileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7c3aed',
    marginTop: 6,
  },
  pickFileSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  fileSelectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 10,
    padding: 10,
  },
  fileSelectedName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  fileSelectedSize: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  changeFileBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  changeFileText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 9,
    borderRadius: 8,
  },
  catBtnSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  catBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  catBtnTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  sheetCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sheetCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  sheetSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  sheetSaveBtnDisabled: {
    opacity: 0.6,
  },
  sheetSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export { MediaLibraryScreen, MediaLibraryScreen as MediaScreen };
