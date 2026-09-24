import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform, Share, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { useZoneContext } from '../../context/ZoneContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { customAlert } from '../../context/AlertContext';
import { MediaItem, MediaType, CategoryFilter } from './types';
import { getYouTubeId, getYouTubeThumbnail, formatFileSize, inferMediaType } from './mediaLibraryUtils';

interface UseMediaLibraryStateProps {
  stopCurrentAudio: () => Promise<void>;
  closeAudioPlayer: () => Promise<void>;
  handleTogglePlay: (item: MediaItem) => Promise<void>;
  activeAudioItemId?: string | null;
  onAudioItemUpdated?: (updated: Partial<MediaItem>) => void;
}

export function useMediaLibraryState({
  stopCurrentAudio,
  closeAudioPlayer,
  handleTogglePlay,
  activeAudioItemId,
  onAudioItemUpdated,
}: UseMediaLibraryStateProps) {
  const { activeZone } = useZoneContext();
  const { adminUser } = useAuth();

  // Media list & loading
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Selection
  const [activeTab, setActiveTab] = useState<CategoryFilter>('all'), [searchQuery, setSearchQuery] = useState('');
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false), [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState<boolean>(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentName: string }>({ current: 0, total: 0, currentName: '' });

  // Viewers
  const [activeVideoItem, setActiveVideoItem] = useState<MediaItem | null>(null);
  const [activeImageItem, setActiveImageItem] = useState<MediaItem | null>(null);

  // Add & Rename Modals
  const [modalVisible, setModalVisible] = useState(false), [inputSource, setInputSource] = useState<'device' | 'url'>('device');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; type: string; size?: number } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Array<{ uri: string; name: string; type: string; size?: number }>>([]);
  const [bulkUploadProgress, setBulkUploadProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [formTitle, setFormTitle] = useState(''), [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<MediaType>('audio'), [formNotes, setFormNotes] = useState(''), [saving, setSaving] = useState(false);
  const [renamingItem, setRenamingItem] = useState<MediaItem | null>(null), [renameTitle, setRenameTitle] = useState('');
  const [renameCategory, setRenameCategory] = useState<MediaType>('audio'), [renameNotes, setRenameNotes] = useState(''), [renaming, setRenaming] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
        toastTimer.current = null;
      }
    };
  }, []);

  // ── Load Media ─────────────────────────────────────────────────────────────
  const loadMedia = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await api.media.getAll(activeZone?.id);
      const items = Array.isArray(res?.data) ? res.data : [];
      if (items.length > 0) {
        const mapped: MediaItem[] = items.map((item: any) => {
          let resolvedName = (item.name || item.title || '').trim();
          if (!resolvedName || /^[a-z0-9_-]{15,35}$/i.test(resolvedName)) {
            const d = item.uploadedAt || item.createdAt ? new Date(item.uploadedAt || item.createdAt) : null;
            const dateStr = d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            resolvedName = `Rehearsal Audio ${dateStr}`.trim();
          }
          return {
            id: item.id || `media_${Math.random()}`,
            name: resolvedName,
            url: item.url || item.videoUrl || '',
            videoUrl: item.videoUrl,
            type: item.type || (item.url?.match(/\.(mp3|wav|m4a|aac)$/i) ? 'audio' : item.url?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? 'image' : 'document'),
            size: item.size,
            thumbnail: item.thumbnail || (item.url ? getYouTubeThumbnail(item.url) : null),
            description: item.description,
            uploadedAt: item.uploadedAt || item.createdAt,
            folder: item.folder,
            views: item.views,
            forHq: item.forHq ?? true,
            zoneId: item.zoneId,
          };
        });
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
      const matchTab = activeTab === 'all' || item.type === activeTab;
      const matchQuery = !q || item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  };

  // ── Bulk Download & Export Handlers ───────────────────────────────────────
  const handleBulkDownload = async () => {
    const targetItems = selectedIds.size > 0 ? mediaList.filter((i) => selectedIds.has(i.id)) : filteredItems;
    if (targetItems.length === 0) {
      customAlert('No Files', 'No media files available to download.');
      return;
    }
    setBulkDownloading(true);
    setBulkProgress({ current: 0, total: targetItems.length, currentName: 'Initializing...' });

    if (Platform.OS === 'web') {
      try {
        for (let i = 0; i < targetItems.length; i++) {
          const item = targetItems[i];
          setBulkProgress({ current: i + 1, total: targetItems.length, currentName: item.name });
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
              window.open(url, '_blank');
            }
          }
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

    try {
      const manifestRows = targetItems.map((item, idx) => `${idx + 1}. ${item.name} (${item.type.toUpperCase()})\nLink: ${item.url || item.videoUrl || 'N/A'}`);
      const manifestContent = `🎵 Loveworld Singers RehearsalHub - Media Download Pack (${targetItems.length} Files)\n\n` + manifestRows.join('\n\n') + '\n\nGenerated for manual re-upload & backup.';
      setBulkProgress({ current: targetItems.length, total: targetItems.length, currentName: 'Ready' });
      await Share.share({ title: `Bulk Media Download Pack (${targetItems.length} Files)`, message: manifestContent });
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
    const targetItems = selectedIds.size > 0 ? mediaList.filter((i) => selectedIds.has(i.id)) : filteredItems;
    if (targetItems.length === 0) return;
    const headers = ['File_Name', 'Category', 'File_Size', 'Direct_Download_URL', 'Zone', 'Uploaded_Date'];
    const rows = targetItems.map((i) => [
      `"${(i.name || '').replace(/"/g, '""')}"`, i.type, `"${i.size || ''}"`,
      `"${i.url || i.videoUrl || ''}"`, i.forHq ? 'Global HQ' : i.zoneId || 'Local', i.uploadedAt || '',
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
    Share.share({ title: 'Media Library CSV Export', message: csvContent });
  };

  // ── Open Media Handler ───────────────────────────────────────────────────
  const handleOpenMedia = async (item: MediaItem) => {
    if (isSelectMode) { handleToggleSelect(item.id); return; }
    const url = item.url || item.videoUrl;
    if (!url) return;
    if (item.type === 'audio') { handleTogglePlay(item); return; }
    if (item.type === 'image' || url.match(/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i)) { setActiveImageItem(item); return; }
    if (item.type === 'video') {
      if (url.match(/\.(mp4|mov|m4v|webm|mkv)(\?.*)?$/i)) { await stopCurrentAudio(); setActiveVideoItem(item); return; }
      try {
        await WebBrowser.openBrowserAsync(url, {
          toolbarColor: '#7c3aed', controlsColor: '#ffffff', presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });
      } catch { Linking.openURL(url).catch(() => {}); }
      return;
    }
    if (item.type === 'document') {
      try {
        await WebBrowser.openBrowserAsync(url, {
          toolbarColor: '#7c3aed', controlsColor: '#ffffff', presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        });
      } catch { Linking.openURL(url).catch(() => {}); }
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
    if (!renameTitle.trim()) { customAlert('Name Required', 'Please enter a valid name for this media file.'); return; }
    setRenaming(true);
    try {
      const updatedData = { name: renameTitle.trim(), type: renameCategory, description: renameNotes.trim() || undefined };
      await api.media.update(renamingItem.id, updatedData);
      setMediaList((prev) => prev.map((m) => (m.id === renamingItem.id ? { ...m, ...updatedData } : m)));
      if (activeAudioItemId === renamingItem.id && onAudioItemUpdated) onAudioItemUpdated(updatedData);
      setRenamingItem(null);
      showToast('File renamed successfully!');
    } catch (err: any) {
      customAlert('Rename Error', err?.message || 'Could not rename file.');
    } finally { setRenaming(false); }
  };

  // ── Share Link ─────────────────────────────────────────────────────────────
  const handleShare = async (item: MediaItem) => {
    const url = item.url || item.videoUrl;
    if (!url) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try { await navigator.clipboard.writeText(url); showToast('Link copied to clipboard!'); return; } catch {}
    }
    try { await Share.share({ title: item.name, message: `${item.name}\n${url}`, url }); } catch {}
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (item: MediaItem) => {
    customAlert('Remove Media Asset', `Are you sure you want to remove "${item.name}" from the library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          if (activeAudioItemId === item.id) await closeAudioPlayer();
          if (activeImageItem?.id === item.id) setActiveImageItem(null);
          try { await api.media.delete(item.id); } catch {}
          setMediaList((prev) => prev.filter((m) => m.id !== item.id));
          showToast('Asset removed from library');
        },
      },
    ]);
  };

  // ── Pick File from Device ──────────────────────────────────────────────────
  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*', 'application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const picked = res.assets.map(f => ({
        uri: f.uri,
        name: f.name,
        type: f.mimeType ?? 'application/octet-stream',
        size: f.size,
      }));
      setSelectedFiles(picked);
      const file = picked[0];
      setSelectedFile(file);
      if (picked.length === 1 && !formTitle.trim()) {
        const cleanName = file.name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]/g, ' ');
        setFormTitle(cleanName);
      }
      if (file.type) setFormCategory(inferMediaType(file.type));
    } catch (e: any) { customAlert('Notice', e?.message || 'Could not pick file(s) from device.'); }
  };

  const handleRemoveSelectedFile = (idx: number) => {
    setSelectedFiles(prev => {
      const next = prev.filter((_, i) => i !== idx);
      setSelectedFile(next[0] || null);
      return next;
    });
  };

  // ── Save New Media Asset ───────────────────────────────────────────────────
  const resetForm = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setBulkUploadProgress(null);
    setFormTitle('');
    setFormUrl('');
    setFormNotes('');
    setFormCategory('audio');
    setInputSource('device');
  };

  const handleSaveAsset = async () => {
    if (inputSource === 'device' && (!selectedFiles.length && !selectedFile)) {
      customAlert('Select Files', 'Please choose file(s) from your device to upload.');
      return;
    }
    if (inputSource === 'url' && !formUrl.trim()) {
      customAlert('Link Required', 'Please enter a valid web or video link.');
      return;
    }

    const targetZoneId = (activeZone?.id && activeZone.id !== 'all' && activeZone.id !== 'global') ? activeZone.id : 'zone-001';

    // ── Bulk Upload Handler ──────────────────────────────────────────────────
    if (inputSource === 'device' && selectedFiles.length > 1) {
      setSaving(true);
      const total = selectedFiles.length;
      const createdAssets: MediaItem[] = [];
      let successCount = 0;

      try {
        for (let i = 0; i < total; i++) {
          const file = selectedFiles[i];
          const cleanTitle = file.name.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[-_]/g, ' ');
          setBulkUploadProgress({ current: i + 1, total, currentName: file.name });

          try {
            const uploadRes = await api.media.upload(
              { uri: file.uri, name: file.name, type: file.type },
              'rehearsals', targetZoneId
            );
            const finalUrl = uploadRes.data?.url || (uploadRes as any).url || file.uri;
            if (!finalUrl || finalUrl === file.uri) throw new Error('R2 upload failed.');

            const detectedCat = inferMediaType(file.type);
            const ytId = getYouTubeId(finalUrl);
            const thumbnail = ytId ? getYouTubeThumbnail(finalUrl) : null;
            const detectedType = ytId ? 'video' : detectedCat;
            const sizeLabel = file.size ? formatFileSize(file.size) : 'File';

            const newAsset: MediaItem = {
              id: `media_${Date.now()}_${i}`,
              name: cleanTitle,
              url: finalUrl,
              videoUrl: detectedType === 'video' ? finalUrl : undefined,
              type: detectedType,
              size: sizeLabel,
              thumbnail: thumbnail || (detectedType === 'image' ? finalUrl : null),
              description: formNotes.trim() || undefined,
              uploadedAt: new Date().toISOString(),
              forHq: true,
              zoneId: targetZoneId,
            };

            const createRes = await api.media.create({
              title: newAsset.name,
              name: newAsset.name,
              url: newAsset.url,
              type: newAsset.type,
              folder: 'rehearsals',
              description: newAsset.description,
              zoneId: targetZoneId,
              organizationId: targetZoneId,
            });

            if (createRes?.data?.id) {
              newAsset.id = createRes.data.id;
            }
            createdAssets.push(newAsset);
            successCount++;
          } catch (fileErr) {
            console.warn(`Failed to upload ${file.name}:`, fileErr);
          }
        }

        if (createdAssets.length > 0) {
          setMediaList(prev => [...createdAssets, ...prev]);
          setModalVisible(false);
          resetForm();
          showToast(`Successfully uploaded ${successCount} of ${total} files!`);
        } else {
          throw new Error('All file uploads failed. Please check connection and try again.');
        }
      } catch (e: any) {
        customAlert('Upload Error', e?.message || 'Bulk upload encountered errors.');
      } finally {
        setSaving(false);
        setBulkUploadProgress(null);
      }
      return;
    }

    // ── Single Upload Handler ────────────────────────────────────────────────
    if (!formTitle.trim()) { customAlert('Title Required', 'Please enter a name for this media item.'); return; }
    setSaving(true);
    try {
      let finalUrl = formUrl.trim();
      let detectedType = formCategory;
      const sizeLabel = selectedFile?.size ? formatFileSize(selectedFile.size) : 'Online Stream';

      if (inputSource === 'device' && selectedFile) {
        try {
          const uploadRes = await api.media.upload(
            { uri: selectedFile.uri, name: formTitle.trim() || selectedFile.name, type: selectedFile.type },
            'rehearsals', targetZoneId
          );
          finalUrl = uploadRes.data?.url || (uploadRes as any).url || selectedFile.uri;
          if (!finalUrl || finalUrl === selectedFile.uri) throw new Error('Cloudflare R2 did not return a media URL.');
        } catch (error: any) { throw new Error(error?.message || 'Media upload failed. Please try again.'); }
      }

      const ytId = getYouTubeId(finalUrl);
      const thumbnail = ytId ? getYouTubeThumbnail(finalUrl) : null;
      if (ytId) detectedType = 'video';

      const newAsset: MediaItem = {
        id: `media_${Date.now()}`, name: formTitle.trim(), url: finalUrl, videoUrl: detectedType === 'video' ? finalUrl : undefined,
        type: detectedType, size: sizeLabel, thumbnail: thumbnail || (detectedType === 'image' ? finalUrl : null),
        description: formNotes.trim() || undefined, uploadedAt: new Date().toISOString(), forHq: true, zoneId: targetZoneId,
      };

      const createRes = await api.media.create({
        title: newAsset.name, name: newAsset.name, url: newAsset.url, type: newAsset.type,
        folder: 'rehearsals', description: newAsset.description, zoneId: targetZoneId, organizationId: targetZoneId,
      });
      if (!createRes?.data?.id) throw new Error((createRes as any)?.error || 'Server did not confirm media creation. Please try again.');
      newAsset.id = createRes.data.id;

      setMediaList((prev) => [newAsset, ...prev]);
      setModalVisible(false);
      resetForm();
      showToast('Media added to library!');
    } catch (e: any) {
      customAlert('Save Notice', e?.message || 'Could not add media item.');
    } finally { setSaving(false); }
  };

  return {
    adminUser,
    mediaList, loading, loadError, refreshing, loadMedia, onRefresh,
    activeTab, setActiveTab, searchQuery, setSearchQuery, filteredItems, counts,
    isSelectMode, setIsSelectMode, selectedIds, setSelectedIds, handleToggleSelect, handleSelectAll,
    bulkDownloading, bulkProgress, handleBulkDownload, handleExportCSV,
    activeVideoItem, setActiveVideoItem, activeImageItem, setActiveImageItem,
    modalVisible, setModalVisible, inputSource, setInputSource, selectedFile, setSelectedFile,
    selectedFiles, setSelectedFiles, handleRemoveSelectedFile, bulkUploadProgress,
    formTitle, setFormTitle, formUrl, setFormUrl, formCategory, setFormCategory, formNotes, setFormNotes,
    saving, handlePickDocument, handleSaveAsset, resetForm,
    renamingItem, setRenamingItem, renameTitle, setRenameTitle, renameCategory, setRenameCategory,
    renameNotes, setRenameNotes, renaming, handleOpenRename, handleSaveRename,
    handleOpenMedia, handleShare, handleDelete, toastMsg, showToast,
  };
}
