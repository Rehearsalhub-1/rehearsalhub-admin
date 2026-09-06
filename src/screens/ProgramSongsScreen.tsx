import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Switch,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { api } from '../services/api';
import { GradientCard, Badge, SearchFilterBar, EmptyState } from '../components/ui';

export function addSong(songIds: string[], newId: string): string[] {
  if (songIds.includes(newId)) return songIds;
  return [...songIds, newId];
}

export function removeSong(songIds: string[], removeId: string): string[] {
  return songIds.filter(id => id !== removeId);
}

interface PraiseSong {
  id: string;
  title?: string;
  key?: string;
  tempo?: string;
  leadSinger?: string;
  conductor?: string;
  writer?: string;
  category?: string;
  categories?: string[];
  lyrics?: string;
  solfa?: string;
  solfas?: string;
  notation?: string;
  rehearsalCount?: number;
  imageUrl?: string;
  audioFile?: string;
  audioUrl?: string;
  audioUrls?: Record<string, string>;
  customParts?: Record<string, string> | string[];
  leadKeyboardist?: string;
  leadGuitarist?: string;
  drummer?: string;
  coordinatorComment?: string;
  coordinatorAudioUrl?: string;
  isActive?: boolean;
  isHeard?: boolean;
  heard?: boolean;
  status?: string;
  comments?: any[];
}

interface MasterSong {
  id: string;
  title?: string;
  writer?: string;
  key?: string;
  tempo?: string;
  category?: string;
  audioUrls?: Record<string, string>;
}

interface Program {
  id: string;
  name?: string;
  date?: string;
  location?: string;
  status?: string;
  category?: string;
  songIds?: string[];
}

const SONG_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// ────────────────────────────────────────────────────────────────────────────────
// Song Inspector Modal
// ────────────────────────────────────────────────────────────────────────────────

function SongInspectorModal({
  visible,
  song,
  onClose,
  onSave,
}: {
  visible: boolean;
  song: PraiseSong | null;
  onClose: () => void;
  onSave: (updated: PraiseSong) => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'audiolab' | 'lyrics' | 'notation' | 'notes'>('info');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingHeard, setTogglingHeard] = useState(false);

  const [form, setForm] = useState<{
    title: string;
    key: string;
    tempo: string;
    rehearsalCount: number;
    category: string;
    imageUrl: string;
    audioFile: string;
    leadSinger: string;
    writer: string;
    conductor: string;
    leadKeyboardist: string;
    leadGuitarist: string;
    drummer: string;
    lyrics: string;
    solfas: string;
    notation: string;
    coordinatorComment: string;
    coordinatorAudioUrl: string;
  }>({
    title: '',
    key: '',
    tempo: '',
    rehearsalCount: 0,
    category: '',
    imageUrl: '',
    audioFile: '',
    leadSinger: '',
    writer: '',
    conductor: '',
    leadKeyboardist: '',
    leadGuitarist: '',
    drummer: '',
    lyrics: '',
    solfas: '',
    notation: '',
    coordinatorComment: '',
    coordinatorAudioUrl: '',
  });

  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [customParts, setCustomParts] = useState<string[]>([]);
  const [showAddCustomPart, setShowAddCustomPart] = useState(false);
  const [newPartName, setNewPartName] = useState('');

  useEffect(() => {
    if (song) {
      const urls: Record<string, string> = { ...(song.audioUrls || {}) };
      if (typeof song.customParts === 'object' && !Array.isArray(song.customParts)) {
        Object.assign(urls, song.customParts);
      }

      let cParts: string[] = [];
      if (Array.isArray(song.customParts)) {
        cParts = [...song.customParts];
      } else if (song.customParts && typeof song.customParts === 'object') {
        cParts = Object.keys(song.customParts);
      }
      const standardKeys = ['soprano', 'alto', 'tenor', 'bass', 'full', 's', 'a', 't', 'b'];
      Object.keys(urls).forEach(k => {
        if (!standardKeys.includes(k.toLowerCase()) && !cParts.includes(k)) {
          cParts.push(k);
        }
      });

      let commentText = song.coordinatorComment || '';
      let commentAudio = song.coordinatorAudioUrl || '';
      if (!commentText && Array.isArray(song.comments) && song.comments.length > 0) {
        const latest = song.comments[song.comments.length - 1];
        commentText = latest?.text || latest?.content || '';
        commentAudio = latest?.audioUrl || '';
      }

      setForm({
        title: song.title || '',
        key: song.key || '',
        tempo: song.tempo || '',
        rehearsalCount: song.rehearsalCount ?? 0,
        category: song.category || '',
        imageUrl: song.imageUrl || '',
        audioFile: song.audioFile || song.audioUrl || '',
        leadSinger: song.leadSinger || '',
        writer: song.writer || '',
        conductor: song.conductor || '',
        leadKeyboardist: song.leadKeyboardist || '',
        leadGuitarist: song.leadGuitarist || '',
        drummer: song.drummer || '',
        lyrics: song.lyrics || '',
        solfas: song.solfas || song.solfa || '',
        notation: song.notation || '',
        coordinatorComment: commentText,
        coordinatorAudioUrl: commentAudio,
      });
      setAudioUrls(urls);
      setCustomParts(cParts);
      setShowAddCustomPart(false);
      setNewPartName('');
      setActiveTab('info');
      setEditMode(false);
    }
  }, [song]);

  if (!song) return null;
  const currentSong = song;

  const isHeard = Boolean(currentSong.isHeard ?? currentSong.heard ?? currentSong.status === 'heard');
  const hasSoprano = Boolean(audioUrls.soprano || audioUrls.s);
  const hasAlto = Boolean(audioUrls.alto || audioUrls.a);
  const hasTenor = Boolean(audioUrls.tenor || audioUrls.t);
  const hasBass = Boolean(audioUrls.bass || audioUrls.b);

  async function handleToggleHeard() {
    const next = !isHeard;
    setTogglingHeard(true);
    try {
      await api.songs.toggleHeard(currentSong.id, next);
      onSave({
        ...currentSong,
        isHeard: next,
        heard: next,
        status: next ? 'heard' : 'unheard',
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update rehearsal status.');
    } finally {
      setTogglingHeard(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title: form.title,
        category: form.category,
        key: form.key,
        tempo: form.tempo,
        rehearsalCount: Number(form.rehearsalCount) || 0,
        imageUrl: form.imageUrl,
        audioFile: form.audioFile,
        leadSinger: form.leadSinger,
        writer: form.writer,
        conductor: form.conductor,
        leadKeyboardist: form.leadKeyboardist,
        leadGuitarist: form.leadGuitarist,
        drummer: form.drummer,
        lyrics: form.lyrics,
        solfas: form.solfas,
        solfa: form.solfas,
        notation: form.notation,
        audioUrls: audioUrls,
        customParts: customParts,
        coordinatorComment: form.coordinatorComment,
        coordinatorAudioUrl: form.coordinatorAudioUrl,
        comments: form.coordinatorComment ? [{
          id: `comment-${Date.now()}`,
          text: form.coordinatorComment,
          audioUrl: form.coordinatorAudioUrl || '',
          date: new Date().toISOString(),
          author: 'Coordinator',
        }] : currentSong.comments,
      };

      await api.songs.update(currentSong.id, payload);
      const updated: PraiseSong = {
        ...currentSong,
        ...payload,
      };
      onSave(updated);
      setEditMode(false);
      Alert.alert('Saved', 'Song details updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  function handleOpenLink(url?: string) {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open URL: ' + url);
    });
  }

  function handleAddCustomPart() {
    const name = newPartName.trim();
    if (!name) return;
    if (['soprano', 'alto', 'tenor', 'bass'].includes(name.toLowerCase()) || customParts.some(p => p.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Part Exists', 'This part is already in the list.');
      return;
    }
    setCustomParts(prev => [...prev, name]);
    setAudioUrls(prev => ({ ...prev, [name]: '' }));
    setNewPartName('');
    setShowAddCustomPart(false);
  }

  function handleRemoveCustomPart(partName: string) {
    setCustomParts(prev => prev.filter(p => p !== partName));
    setAudioUrls(prev => {
      const next = { ...prev };
      delete next[partName];
      return next;
    });
  }

  const TABS: { id: 'info' | 'audiolab' | 'lyrics' | 'notation' | 'notes'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'info', label: 'Info & Band', icon: 'musical-note-outline' },
    { id: 'audiolab', label: 'Audio Lab', icon: 'layers-outline' },
    { id: 'lyrics', label: 'Lyrics', icon: 'document-text-outline' },
    { id: 'notation', label: 'Notation & Guide', icon: 'musical-notes-outline' },
    { id: 'notes', label: 'Coord Notes', icon: 'chatbox-ellipses-outline' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={inspector.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <SafeAreaView style={inspector.sheet}>
            {/* Executive Header */}
            <View style={inspector.header}>
              <TouchableOpacity onPress={onClose} style={inspector.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-down" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>

              <View style={inspector.headerCenterCol}>
                <Text style={inspector.headerTitle} numberOfLines={1}>{form.title || song.title || 'Song Inspector'}</Text>
                <Text style={inspector.headerSub} numberOfLines={1}>
                  {form.leadSinger ? `Lead: ${form.leadSinger}` : form.writer ? `Writer: ${form.writer}` : 'Rehearsal Setlist Track'}
                </Text>
              </View>

              {/* Heard Status Quick-Toggle Button */}
              <TouchableOpacity
                style={[inspector.heardPill, isHeard && inspector.heardPillActive]}
                onPress={handleToggleHeard}
                disabled={togglingHeard}
                activeOpacity={0.8}
              >
                {togglingHeard ? (
                  <ActivityIndicator size="small" color={isHeard ? '#059669' : '#64748b'} />
                ) : (
                  <>
                    <Ionicons
                      name={isHeard ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={isHeard ? '#059669' : '#64748b'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[inspector.heardPillText, isHeard && inspector.heardPillTextActive]}>
                      {isHeard ? 'Heard' : 'Unheard'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Edit / Save Button */}
              {editMode ? (
                <TouchableOpacity
                  style={inspector.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={inspector.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={inspector.editBtn} onPress={() => setEditMode(true)}>
                  <Ionicons name="pencil-outline" size={15} color={Colors.accent} />
                  <Text style={inspector.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Vocal Stem Indicator Bar */}
            <View style={inspector.stemBar}>
              <Text style={inspector.stemBarLabel}>Audio Stems:</Text>
              {[
                { label: 'S', active: hasSoprano },
                { label: 'A', active: hasAlto },
                { label: 'T', active: hasTenor },
                { label: 'B', active: hasBass },
              ].map(({ label, active }) => (
                <View key={label} style={[inspector.stemPill, active && inspector.stemPillActive]}>
                  <Text style={[inspector.stemPillText, active && inspector.stemPillTextActive]}>{label}</Text>
                </View>
              ))}
              {customParts.length > 0 && (
                <View style={[inspector.stemPill, inspector.stemPillFull]}>
                  <Text style={[inspector.stemPillText, { color: '#047857' }]}>+{customParts.length} Custom</Text>
                </View>
              )}
              {form.rehearsalCount > 0 ? (
                <View style={inspector.rehearsalCountBadge}>
                  <Text style={inspector.rehearsalCountText}>x{form.rehearsalCount} Reh</Text>
                </View>
              ) : null}
            </View>

            {/* 5-Tab Segmented Selector */}
            <View style={inspector.tabBarContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={inspector.tabBarScroll}
              >
                {TABS.map(tab => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[inspector.tabBtn, activeTab === tab.id && inspector.tabBtnActive]}
                    onPress={() => setActiveTab(tab.id)}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={14}
                      color={activeTab === tab.id ? Colors.accent : Colors.textMuted}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[inspector.tabBtnText, activeTab === tab.id && inspector.tabBtnTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Tab Body Content */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={inspector.content} keyboardShouldPersistTaps="handled">
              {/* TAB 1: INFO & BAND PERSONNEL */}
              {activeTab === 'info' && (
                <View style={inspector.tabSection}>
                  {/* Song Title & Category */}
                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>SONG TITLE</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.textInput}
                        value={form.title}
                        onChangeText={t => setForm(p => ({ ...p, title: t }))}
                        placeholder="Song Title..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    ) : (
                      <Text style={inspector.fieldValueBold}>{form.title || '—'}</Text>
                    )}
                  </View>

                  <View style={inspector.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={inspector.fieldLabel}>CATEGORY</Text>
                      {editMode ? (
                        <TextInput
                          style={inspector.textInput}
                          value={form.category}
                          onChangeText={t => setForm(p => ({ ...p, category: t }))}
                          placeholder="e.g. Praise, Worship..."
                          placeholderTextColor={Colors.textMuted}
                        />
                      ) : (
                        <View style={inspector.inlineBadge}>
                          <Text style={inspector.inlineBadgeText}>{form.category || 'General'}</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={inspector.fieldLabel}>REHEARSAL COUNT</Text>
                      {editMode ? (
                        <View style={inspector.stepperRow}>
                          <TouchableOpacity
                            style={inspector.stepperBtn}
                            onPress={() => setForm(p => ({ ...p, rehearsalCount: Math.max(0, p.rehearsalCount - 1) }))}
                          >
                            <Ionicons name="remove" size={16} color="#475569" />
                          </TouchableOpacity>
                          <Text style={inspector.stepperValue}>x{form.rehearsalCount}</Text>
                          <TouchableOpacity
                            style={inspector.stepperBtn}
                            onPress={() => setForm(p => ({ ...p, rehearsalCount: p.rehearsalCount + 1 }))}
                          >
                            <Ionicons name="add" size={16} color="#475569" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={inspector.fieldValue}>x{form.rehearsalCount} practiced</Text>
                      )}
                    </View>
                  </View>

                  {/* Musical Key & Tempo */}
                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>MUSICAL KEY</Text>
                    {editMode ? (
                      <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={inspector.keyChipScroll}>
                          {SONG_KEYS.map(k => (
                            <TouchableOpacity
                              key={k}
                              style={[inspector.keyChip, form.key === k && inspector.keyChipActive]}
                              onPress={() => setForm(p => ({ ...p, key: k }))}
                            >
                              <Text style={[inspector.keyChipText, form.key === k && inspector.keyChipTextActive]}>{k}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        <TextInput
                          style={[inspector.textInput, { marginTop: 6 }]}
                          value={form.key}
                          onChangeText={t => setForm(p => ({ ...p, key: t }))}
                          placeholder="Custom Key (e.g. F# / Gb)..."
                          placeholderTextColor={Colors.textMuted}
                        />
                      </>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={inspector.keyPill}>
                          <Text style={inspector.keyPillText}>{form.key || '—'}</Text>
                        </View>
                        {form.tempo ? (
                          <Text style={[inspector.fieldValue, { marginLeft: 12 }]}>Tempo: {form.tempo}</Text>
                        ) : null}
                      </View>
                    )}
                  </View>

                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>TEMPO (BPM)</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.textInput}
                        value={form.tempo}
                        onChangeText={t => setForm(p => ({ ...p, tempo: t }))}
                        placeholder="e.g. 72 BPM or 128..."
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="numbers-and-punctuation"
                      />
                    ) : (
                      <Text style={inspector.fieldValue}>{form.tempo || '—'}</Text>
                    )}
                  </View>

                  {/* Artwork Image */}
                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>SONG ARTWORK / COVER</Text>
                    <View style={inspector.artworkRow}>
                      {form.imageUrl ? (
                        <Image source={{ uri: form.imageUrl }} style={inspector.artworkPreview} resizeMode="cover" />
                      ) : (
                        <View style={inspector.artworkPlaceholder}>
                          <Ionicons name="image-outline" size={24} color="#94a3b8" />
                          <Text style={inspector.artworkPlaceholderText}>No Image</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        {editMode ? (
                          <TextInput
                            style={inspector.textInput}
                            value={form.imageUrl}
                            onChangeText={t => setForm(p => ({ ...p, imageUrl: t }))}
                            placeholder="Image URL (https://...)"
                            placeholderTextColor={Colors.textMuted}
                            autoCapitalize="none"
                          />
                        ) : (
                          <Text style={inspector.fieldSubText} numberOfLines={2}>
                            {form.imageUrl ? form.imageUrl : 'Used for album artwork on mobile apps.'}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Master Audio URL */}
                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>MASTER AUDIO FILE URL</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.textInput}
                        value={form.audioFile}
                        onChangeText={t => setForm(p => ({ ...p, audioFile: t }))}
                        placeholder="Master Audio URL (https://...)"
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="none"
                      />
                    ) : form.audioFile ? (
                      <TouchableOpacity
                        style={inspector.audioLinkBtn}
                        onPress={() => handleOpenLink(form.audioFile)}
                      >
                        <Ionicons name="play-circle" size={18} color="#7c3aed" style={{ marginRight: 6 }} />
                        <Text style={inspector.audioLinkBtnText} numberOfLines={1}>Test Master Audio</Text>
                        <Ionicons name="open-outline" size={14} color="#7c3aed" style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    ) : (
                      <Text style={inspector.fieldValueMuted}>No master audio file attached.</Text>
                    )}
                  </View>

                  {/* Section: Vocal Leadership */}
                  <View style={inspector.sectionDivider}>
                    <Text style={inspector.sectionDividerTitle}>Vocal Leadership</Text>
                  </View>

                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>LEAD SINGER</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.textInput}
                        value={form.leadSinger}
                        onChangeText={t => setForm(p => ({ ...p, leadSinger: t }))}
                        placeholder="Lead vocalist name..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    ) : (
                      <Text style={inspector.fieldValue}>{form.leadSinger || '—'}</Text>
                    )}
                  </View>

                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>SONG WRITER / COMPOSER</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.textInput}
                        value={form.writer}
                        onChangeText={t => setForm(p => ({ ...p, writer: t }))}
                        placeholder="Song writer..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    ) : (
                      <Text style={inspector.fieldValue}>{form.writer || '—'}</Text>
                    )}
                  </View>

                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>CONDUCTOR</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.textInput}
                        value={form.conductor}
                        onChangeText={t => setForm(p => ({ ...p, conductor: t }))}
                        placeholder="Choir conductor name..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    ) : (
                      <Text style={inspector.fieldValue}>{form.conductor || '—'}</Text>
                    )}
                  </View>

                  {/* Section: Band Rhythm Section */}
                  <View style={inspector.sectionDivider}>
                    <Text style={inspector.sectionDividerTitle}>Band Rhythm Section</Text>
                  </View>

                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>LEAD KEYBOARDIST</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.textInput}
                        value={form.leadKeyboardist}
                        onChangeText={t => setForm(p => ({ ...p, leadKeyboardist: t }))}
                        placeholder="Keyboardist name..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    ) : (
                      <Text style={inspector.fieldValue}>{form.leadKeyboardist || '—'}</Text>
                    )}
                  </View>

                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>BASS / LEAD GUITARIST</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.textInput}
                        value={form.leadGuitarist}
                        onChangeText={t => setForm(p => ({ ...p, leadGuitarist: t }))}
                        placeholder="Guitarist name..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    ) : (
                      <Text style={inspector.fieldValue}>{form.leadGuitarist || '—'}</Text>
                    )}
                  </View>

                  <View style={inspector.fieldGroup}>
                    <Text style={inspector.fieldLabel}>DRUMMER</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.textInput}
                        value={form.drummer}
                        onChangeText={t => setForm(p => ({ ...p, drummer: t }))}
                        placeholder="Drummer name..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    ) : (
                      <Text style={inspector.fieldValue}>{form.drummer || '—'}</Text>
                    )}
                  </View>
                </View>
              )}

              {/* TAB 2: AUDIO LAB & VOCAL STEMS */}
              {activeTab === 'audiolab' && (
                <View style={inspector.tabSection}>
                  <View style={inspector.audioLabIntroCard}>
                    <Ionicons name="disc" size={22} color="#7c3aed" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={inspector.audioLabIntroTitle}>Audio Stems & Multi-Tracks</Text>
                      <Text style={inspector.audioLabIntroSub}>
                        Configure separate tracks for vocal parts (S, A, T, B) and custom harmonies for practice playback.
                      </Text>
                    </View>
                  </View>

                  {/* Standard Vocal Stems */}
                  {[
                    { key: 'soprano', label: 'Soprano Stem', color: '#7c3aed', bg: '#f5f3ff' },
                    { key: 'alto', label: 'Alto Stem', color: '#2563eb', bg: '#eff6ff' },
                    { key: 'tenor', label: 'Tenor Stem', color: '#059669', bg: '#ecfdf5' },
                    { key: 'bass', label: 'Bass Stem', color: '#d97706', bg: '#fffbeb' },
                  ].map(stem => {
                    const url = audioUrls[stem.key] || '';
                    const hasUrl = Boolean(url.trim());
                    return (
                      <View key={stem.key} style={inspector.stemCard}>
                        <View style={inspector.stemCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[inspector.stemBadgeSmall, { backgroundColor: stem.bg, borderColor: stem.color }]}>
                              <Text style={[inspector.stemBadgeSmallText, { color: stem.color }]}>{stem.label.charAt(0)}</Text>
                            </View>
                            <Text style={inspector.stemCardTitle}>{stem.label}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[inspector.statusDot, hasUrl ? inspector.statusDotActive : inspector.statusDotEmpty]} />
                            <Text style={[inspector.statusDotText, hasUrl && inspector.statusDotTextActive]}>
                              {hasUrl ? 'Configured' : 'Empty'}
                            </Text>
                          </View>
                        </View>

                        {editMode ? (
                          <View style={{ marginTop: 8 }}>
                            <TextInput
                              style={inspector.textInput}
                              value={url}
                              onChangeText={t => setAudioUrls(p => ({ ...p, [stem.key]: t }))}
                              placeholder={`Enter ${stem.label} audio URL (https://...)`}
                              placeholderTextColor={Colors.textMuted}
                              autoCapitalize="none"
                            />
                            {hasUrl ? (
                              <View style={inspector.stemActionRow}>
                                <TouchableOpacity
                                  style={inspector.stemTestBtn}
                                  onPress={() => handleOpenLink(url)}
                                >
                                  <Ionicons name="play" size={13} color="#7c3aed" style={{ marginRight: 4 }} />
                                  <Text style={inspector.stemTestBtnText}>Test URL</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={inspector.stemClearBtn}
                                  onPress={() => setAudioUrls(p => ({ ...p, [stem.key]: '' }))}
                                >
                                  <Ionicons name="trash-outline" size={13} color="#ef4444" style={{ marginRight: 4 }} />
                                  <Text style={inspector.stemClearBtnText}>Clear</Text>
                                </TouchableOpacity>
                              </View>
                            ) : null}
                          </View>
                        ) : hasUrl ? (
                          <TouchableOpacity
                            style={inspector.audioLinkBtn}
                            onPress={() => handleOpenLink(url)}
                          >
                            <Ionicons name="play-circle" size={17} color={stem.color} style={{ marginRight: 6 }} />
                            <Text style={[inspector.audioLinkBtnText, { color: stem.color }]} numberOfLines={1}>
                              Play {stem.label} Track
                            </Text>
                            <Ionicons name="open-outline" size={14} color={stem.color} style={{ marginLeft: 6 }} />
                          </TouchableOpacity>
                        ) : (
                          <Text style={inspector.fieldValueMuted}>No audio URL set for this stem.</Text>
                        )}
                      </View>
                    );
                  })}

                  {/* Custom Parts Section */}
                  <View style={inspector.customPartsHeader}>
                    <Text style={inspector.sectionDividerTitle}>Custom Vocal Parts & Mixes</Text>
                    {editMode && !showAddCustomPart && (
                      <TouchableOpacity
                        style={inspector.addPartBtn}
                        onPress={() => setShowAddCustomPart(true)}
                      >
                        <Ionicons name="add" size={15} color="#7c3aed" style={{ marginRight: 2 }} />
                        <Text style={inspector.addPartBtnText}>Add Part</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Inline Add Custom Part Form */}
                  {showAddCustomPart && (
                    <View style={inspector.addPartBox}>
                      <Text style={inspector.fieldLabel}>NEW PART NAME</Text>
                      <TextInput
                        style={inspector.textInput}
                        value={newPartName}
                        onChangeText={setNewPartName}
                        placeholder="e.g. Lead 2, Choir, Tenor 2, Full Mix..."
                        placeholderTextColor={Colors.textMuted}
                        autoFocus
                      />
                      <View style={inspector.addPartBoxActions}>
                        <TouchableOpacity
                          style={inspector.addPartSubmitBtn}
                          onPress={handleAddCustomPart}
                        >
                          <Text style={inspector.addPartSubmitBtnText}>Add Part</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={inspector.addPartCancelBtn}
                          onPress={() => { setShowAddCustomPart(false); setNewPartName(''); }}
                        >
                          <Text style={inspector.addPartCancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Custom Parts List */}
                  {customParts.length === 0 && !showAddCustomPart ? (
                    <Text style={inspector.fieldValueMuted}>No custom vocal parts added yet.</Text>
                  ) : (
                    customParts.map(partName => {
                      const url = audioUrls[partName] || '';
                      const hasUrl = Boolean(url.trim());
                      return (
                        <View key={partName} style={inspector.stemCard}>
                          <View style={inspector.stemCardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <View style={[inspector.stemBadgeSmall, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
                                <Text style={[inspector.stemBadgeSmallText, { color: '#b45309' }]}>★</Text>
                              </View>
                              <Text style={inspector.stemCardTitle}>{partName}</Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={[inspector.statusDot, hasUrl ? inspector.statusDotActive : inspector.statusDotEmpty]} />
                                <Text style={[inspector.statusDotText, hasUrl && inspector.statusDotTextActive]}>
                                  {hasUrl ? 'Configured' : 'Empty'}
                                </Text>
                              </View>
                              {editMode ? (
                                <TouchableOpacity
                                  onPress={() => handleRemoveCustomPart(partName)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Ionicons name="close-circle" size={18} color="#ef4444" />
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>

                          {editMode ? (
                            <View style={{ marginTop: 8 }}>
                              <TextInput
                                style={inspector.textInput}
                                value={url}
                                onChangeText={t => setAudioUrls(p => ({ ...p, [partName]: t }))}
                                placeholder={`Enter ${partName} audio URL (https://...)`}
                                placeholderTextColor={Colors.textMuted}
                                autoCapitalize="none"
                              />
                              {hasUrl ? (
                                <View style={inspector.stemActionRow}>
                                  <TouchableOpacity
                                    style={inspector.stemTestBtn}
                                    onPress={() => handleOpenLink(url)}
                                  >
                                    <Ionicons name="play" size={13} color="#7c3aed" style={{ marginRight: 4 }} />
                                    <Text style={inspector.stemTestBtnText}>Test URL</Text>
                                  </TouchableOpacity>
                                </View>
                              ) : null}
                            </View>
                          ) : hasUrl ? (
                            <TouchableOpacity
                              style={inspector.audioLinkBtn}
                              onPress={() => handleOpenLink(url)}
                            >
                              <Ionicons name="play-circle" size={17} color="#7c3aed" style={{ marginRight: 6 }} />
                              <Text style={inspector.audioLinkBtnText} numberOfLines={1}>Play {partName} Track</Text>
                              <Ionicons name="open-outline" size={14} color="#7c3aed" style={{ marginLeft: 6 }} />
                            </TouchableOpacity>
                          ) : (
                            <Text style={inspector.fieldValueMuted}>No audio URL configured.</Text>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* TAB 3: LYRICS */}
              {activeTab === 'lyrics' && (
                <View style={inspector.tabSection}>
                  <Text style={inspector.contentLabel}>Song Lyrics</Text>
                  {editMode ? (
                    <TextInput
                      style={inspector.lyricsInput}
                      value={form.lyrics}
                      onChangeText={t => setForm(p => ({ ...p, lyrics: t }))}
                      placeholder="Enter song lyrics here..."
                      placeholderTextColor={Colors.textMuted}
                      multiline
                      textAlignVertical="top"
                    />
                  ) : (
                    <View style={inspector.lyricsCard}>
                      <Text style={inspector.lyricsText}>
                        {form.lyrics
                          ? form.lyrics.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').trim()
                          : 'No lyrics available for this song yet. Tap Edit to enter lyrics.'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* TAB 4: NOTATION & CONDUCTOR'S GUIDE */}
              {activeTab === 'notation' && (
                <View style={inspector.tabSection}>
                  {/* Conductor's Guide */}
                  <View style={inspector.fieldGroup}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={[inspector.sectionDot, { backgroundColor: '#10b981' }]} />
                      <Text style={inspector.contentLabel}>Conductor's Guide</Text>
                    </View>
                    <Text style={inspector.fieldSubText}>Dynamics, repeat cues, entries, and staging instructions.</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.lyricsInput}
                        value={form.solfas}
                        onChangeText={t => setForm(p => ({ ...p, solfas: t }))}
                        placeholder="Enter conductor guide instructions and cues..."
                        placeholderTextColor={Colors.textMuted}
                        multiline
                        textAlignVertical="top"
                      />
                    ) : (
                      <View style={inspector.guideCard}>
                        <Text style={inspector.lyricsText}>
                          {form.solfas
                            ? form.solfas.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').trim()
                            : "No conductor's guide notes recorded yet. Tap Edit to add cues."}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Tonic Solfa Notation */}
                  <View style={[inspector.fieldGroup, { marginTop: 16 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={[inspector.sectionDot, { backgroundColor: '#f59e0b' }]} />
                      <Text style={inspector.contentLabel}>Solfa Notation</Text>
                    </View>
                    <Text style={inspector.fieldSubText}>Tonic sol-fa pitch transcription (Do Re Mi Fa Sol La Ti Do).</Text>
                    {editMode ? (
                      <TextInput
                        style={[inspector.lyricsInput, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}
                        value={form.notation}
                        onChangeText={t => setForm(p => ({ ...p, notation: t }))}
                        placeholder="e.g. Do Re Mi Fa Sol La Ti Do..."
                        placeholderTextColor={Colors.textMuted}
                        multiline
                        textAlignVertical="top"
                      />
                    ) : (
                      <View style={inspector.notationCard}>
                        <Text style={inspector.notationText}>
                          {form.notation
                            ? form.notation.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').trim()
                            : 'No tonic solfa notation provided yet. Tap Edit to add solfas.'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* TAB 5: COORDINATOR NOTES & VOICE NOTE */}
              {activeTab === 'notes' && (
                <View style={inspector.tabSection}>
                  <View style={inspector.fieldGroup}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={[inspector.sectionDot, { backgroundColor: '#8b5cf6' }]} />
                      <Text style={inspector.contentLabel}>Rehearsal Instructions</Text>
                    </View>
                    <Text style={inspector.fieldSubText}>Notes, guidelines, and feedback from the Music Director or Pastor.</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.lyricsInput}
                        value={form.coordinatorComment}
                        onChangeText={t => setForm(p => ({ ...p, coordinatorComment: t }))}
                        placeholder="Add rehearsal directions or choir notes for this song..."
                        placeholderTextColor={Colors.textMuted}
                        multiline
                        textAlignVertical="top"
                      />
                    ) : (
                      <View style={inspector.commentCard}>
                        <Text style={inspector.commentText}>
                          {form.coordinatorComment
                            ? form.coordinatorComment.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').trim()
                            : 'No coordinator notes added yet. Tap Edit to add notes.'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Voice Note URL */}
                  <View style={[inspector.fieldGroup, { marginTop: 16 }]}>
                    <Text style={inspector.fieldLabel}>REHEARSAL VOICE NOTE / AUDIO LINK</Text>
                    {editMode ? (
                      <TextInput
                        style={inspector.textInput}
                        value={form.coordinatorAudioUrl}
                        onChangeText={t => setForm(p => ({ ...p, coordinatorAudioUrl: t }))}
                        placeholder="Voice note URL (https://...)"
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="none"
                      />
                    ) : form.coordinatorAudioUrl ? (
                      <TouchableOpacity
                        style={inspector.audioLinkBtn}
                        onPress={() => handleOpenLink(form.coordinatorAudioUrl)}
                      >
                        <Ionicons name="mic-circle" size={20} color="#8b5cf6" style={{ marginRight: 6 }} />
                        <Text style={[inspector.audioLinkBtnText, { color: '#8b5cf6' }]} numberOfLines={1}>
                          Listen to Coordinator Voice Note
                        </Text>
                        <Ionicons name="open-outline" size={14} color="#8b5cf6" style={{ marginLeft: 6 }} />
                      </TouchableOpacity>
                    ) : (
                      <Text style={inspector.fieldValueMuted}>No voice note audio link attached.</Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Add Song Modal (2-tab: Pick from Catalog | Create New)
// ────────────────────────────────────────────────────────────────────────────────

interface AddSongModalProps {
  visible: boolean;
  onClose: () => void;
  programId: string;
  existingIds: string[];
  onAdded: () => void;
  onCreated: () => void;
}

function AddSongModal({ visible, onClose, programId, existingIds, onAdded, onCreated }: AddSongModalProps) {
  const [activeTab, setActiveTab] = useState<'pick' | 'create'>('pick');

  // Pick from catalog
  const [masterSongs, setMasterSongs] = useState<MasterSong[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [masterSearch, setMasterSearch] = useState('');

  // Create new
  const [createForm, setCreateForm] = useState({
    title: '', key: '', tempo: '', leadSinger: '', conductor: '', writer: '', category: '', lyrics: '', solfa: '',
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (visible && activeTab === 'pick') {
      setMasterSearch('');
      setLoadingMaster(true);
      api.songs.getMasterSongs()
        .then(res => setMasterSongs(Array.isArray(res?.data) ? res.data : []))
        .catch(() => {})
        .finally(() => setLoadingMaster(false));
    }
  }, [visible, activeTab]);

  const filteredMaster = useMemo(() => {
    const existing = new Set(existingIds);
    let list = masterSongs.filter(s => !existing.has(s.id));
    if (masterSearch.trim()) {
      const q = masterSearch.toLowerCase();
      list = list.filter(s =>
        (s.title || '').toLowerCase().includes(q) || (s.writer || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [masterSongs, existingIds, masterSearch]);

  async function handlePickSong(songId: string) {
    const nextIds = addSong(existingIds, songId);
    try {
      await api.programs.updateSongIds(programId, nextIds);
      onAdded();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add song.');
    }
  }

  async function handleCreateSong() {
    if (!createForm.title.trim()) {
      setCreateError('Song title is required.');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.songs.create({
        ...createForm,
        programId,
        title: createForm.title.trim(),
      });
      const newId = res?.data?.id;
      if (newId) {
        const nextIds = addSong(existingIds, newId);
        await api.programs.updateSongIds(programId, nextIds);
      }
      onCreated();
      onClose();
      setCreateForm({ title: '', key: '', tempo: '', leadSinger: '', conductor: '', writer: '', category: '', lyrics: '', solfa: '' });
    } catch (e: any) {
      setCreateError(e.message || 'Failed to create song.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={addModal.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <SafeAreaView style={addModal.sheet}>
            {/* Header */}
            <View style={addModal.header}>
              <View>
                <Text style={addModal.title}>Add Song to Setlist</Text>
                <Text style={addModal.sub}>Pick from catalog or create a new song</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={addModal.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={addModal.tabRow}>
              <TouchableOpacity
                style={[addModal.tabPill, activeTab === 'pick' && addModal.tabPillActive]}
                onPress={() => setActiveTab('pick')}
              >
                <Ionicons name="search" size={14} color={activeTab === 'pick' ? '#fff' : Colors.textMuted} style={{ marginRight: 5 }} />
                <Text style={[addModal.tabPillText, activeTab === 'pick' && addModal.tabPillTextActive]}>
                  Pick from Catalog
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[addModal.tabPill, activeTab === 'create' && addModal.tabPillActive]}
                onPress={() => setActiveTab('create')}
              >
                <Ionicons name="add-circle-outline" size={14} color={activeTab === 'create' ? '#fff' : Colors.textMuted} style={{ marginRight: 5 }} />
                <Text style={[addModal.tabPillText, activeTab === 'create' && addModal.tabPillTextActive]}>
                  Create New Song
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'pick' ? (
              <View style={{ flex: 1 }}>
                <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                  <SearchFilterBar
                    searchQuery={masterSearch}
                    onSearchChange={setMasterSearch}
                    placeholder="Search catalog by title or writer..."
                  />
                </View>

                {loadingMaster ? (
                  <View style={addModal.center}>
                    <ActivityIndicator color={Colors.accent} size="large" />
                  </View>
                ) : (
                  <FlatList
                    data={filteredMaster}
                    keyExtractor={i => i.id}
                    contentContainerStyle={addModal.catalogList}
                    ListEmptyComponent={
                      <EmptyState
                        icon="search-outline"
                        title="No Available Songs"
                        description="All catalog songs may already be in this setlist, or try a different search."
                      />
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={addModal.catalogItem}
                        onPress={() => handlePickSong(item.id)}
                        activeOpacity={0.75}
                      >
                        <View style={addModal.catalogDetails}>
                          <Text style={addModal.catalogTitle} numberOfLines={1}>{item.title}</Text>
                          <View style={addModal.catalogMeta}>
                            {item.writer ? <Text style={addModal.catalogWriter}>✍️ {item.writer}</Text> : null}
                            {item.key ? <Badge label={item.key} variant="key" size="sm" /> : null}
                            {item.category ? <Badge label={item.category} size="sm" /> : null}
                          </View>
                        </View>
                        <View style={addModal.addPill}>
                          <Ionicons name="add" size={15} color="#ffffff" />
                          <Text style={addModal.addPillText}>Add</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={addModal.createForm} keyboardShouldPersistTaps="handled">
                {createError ? <Text style={addModal.errorText}>{createError}</Text> : null}

                <Text style={addModal.fieldLabel}>SONG TITLE *</Text>
                <TextInput
                  style={addModal.input}
                  placeholder="e.g. Hallelujah Chorus"
                  placeholderTextColor={Colors.textMuted}
                  value={createForm.title}
                  onChangeText={t => setCreateForm(p => ({ ...p, title: t }))}
                />

                <View style={addModal.row2}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={addModal.fieldLabel}>MUSICAL KEY</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {SONG_KEYS.map(k => (
                          <TouchableOpacity
                            key={k}
                            style={[addModal.keyChip, createForm.key === k && addModal.keyChipActive]}
                            onPress={() => setCreateForm(p => ({ ...p, key: p.key === k ? '' : k }))}
                          >
                            <Text style={[addModal.keyChipText, createForm.key === k && addModal.keyChipTextActive]}>{k}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={addModal.fieldLabel}>TEMPO (BPM)</Text>
                    <TextInput
                      style={addModal.input}
                      placeholder="e.g. 72"
                      placeholderTextColor={Colors.textMuted}
                      value={createForm.tempo}
                      onChangeText={t => setCreateForm(p => ({ ...p, tempo: t }))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={addModal.fieldLabel}>LEAD SINGER</Text>
                <TextInput
                  style={addModal.input}
                  placeholder="Lead vocalist name"
                  placeholderTextColor={Colors.textMuted}
                  value={createForm.leadSinger}
                  onChangeText={t => setCreateForm(p => ({ ...p, leadSinger: t }))}
                />

                <Text style={addModal.fieldLabel}>CONDUCTOR</Text>
                <TextInput
                  style={addModal.input}
                  placeholder="Conductor name"
                  placeholderTextColor={Colors.textMuted}
                  value={createForm.conductor}
                  onChangeText={t => setCreateForm(p => ({ ...p, conductor: t }))}
                />

                <Text style={addModal.fieldLabel}>SONG WRITER</Text>
                <TextInput
                  style={addModal.input}
                  placeholder="Composer / Writer"
                  placeholderTextColor={Colors.textMuted}
                  value={createForm.writer}
                  onChangeText={t => setCreateForm(p => ({ ...p, writer: t }))}
                />

                <Text style={addModal.fieldLabel}>CATEGORY</Text>
                <TextInput
                  style={addModal.input}
                  placeholder="e.g. Praise, Worship, Anthem"
                  placeholderTextColor={Colors.textMuted}
                  value={createForm.category}
                  onChangeText={t => setCreateForm(p => ({ ...p, category: t }))}
                />

                <Text style={addModal.fieldLabel}>LYRICS</Text>
                <TextInput
                  style={[addModal.input, addModal.textarea]}
                  placeholder="Enter song lyrics..."
                  placeholderTextColor={Colors.textMuted}
                  value={createForm.lyrics}
                  onChangeText={t => setCreateForm(p => ({ ...p, lyrics: t }))}
                  multiline
                  textAlignVertical="top"
                />

                <Text style={addModal.fieldLabel}>CONDUCTOR'S GUIDE / SOLFAS</Text>
                <TextInput
                  style={[addModal.input, addModal.textarea]}
                  placeholder="Enter solfa notation, tonic sol-fa, or conductor notes..."
                  placeholderTextColor={Colors.textMuted}
                  value={createForm.solfa}
                  onChangeText={t => setCreateForm(p => ({ ...p, solfa: t }))}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={addModal.createBtn}
                  onPress={handleCreateSong}
                  disabled={creating}
                  activeOpacity={0.8}
                >
                  {creating
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Ionicons name="checkmark-circle" size={17} color="#fff" style={{ marginRight: 7 }} />
                        <Text style={addModal.createBtnText}>Create Song & Add to Setlist</Text>
                      </>}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const STATUS_OPTIONS: { value: string; label: string; color: string; bg: string; border: string }[] = [
  { value: 'ongoing', label: '🟢 Ongoing', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  { value: 'pre-rehearsal', label: '🟡 Pre-Rehearsal', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  { value: 'archive', label: '📦 Archive', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  { value: 'draft', label: '📝 Draft', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
];

function formatDisplayDate(dateStr?: string) {
  if (!dateStr) return 'Date TBD';
  const parsed = new Date(dateStr);
  if (!parsed || isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────────────────────────

export default function ProgramSongsScreen({ route, navigation }: any) {
  const initialProgram: Program = route.params?.program || {};
  const [currentProgram, setCurrentProgram] = useState<Program>(initialProgram);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const [programSongs, setProgramSongs] = useState<PraiseSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'heard' | 'unheard'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Song Inspector
  const [inspectorSong, setInspectorSong] = useState<PraiseSong | null>(null);
  const [inspectorVisible, setInspectorVisible] = useState(false);

  const fetchSongs = useCallback(async () => {
    try {
      const res = await api.songs.getPraiseNightSongs(currentProgram.id);
      setProgramSongs(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error('[ProgramSongs] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentProgram.id]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  async function handleChangeProgramStatus(newStatus: string) {
    setShowStatusModal(false);
    if (!currentProgram?.id) return;
    const prevCat = currentProgram.status || currentProgram.category || 'archive';
    setCurrentProgram(prev => ({ ...prev, category: newStatus, status: newStatus }));
    try {
      await api.programs.update(currentProgram.id, { category: newStatus, status: newStatus });
    } catch (err: any) {
      setCurrentProgram(prev => ({ ...prev, category: prevCat, status: prevCat }));
      Alert.alert('Status Error', err.message || 'Could not update program status');
    }
  }

  async function handleRemoveSong(songId: string, title: string) {
    Alert.alert('Remove Song', `Remove "${title}" from this setlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const currentIds = programSongs.map(s => s.id);
          const nextIds = removeSong(currentIds, songId);
          try {
            await api.programs.updateSongIds(currentProgram.id, nextIds);
            fetchSongs();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to remove song.');
          }
        },
      },
    ]);
  }

  async function handleToggleSongActive(song: PraiseSong) {
    const nextActive = !song.isActive;
    setProgramSongs(prev =>
      prev.map(s => (s.id === song.id ? { ...s, isActive: nextActive } : s))
    );
    try {
      await api.songs.toggleActive(song.id, nextActive);
    } catch (e: any) {
      setProgramSongs(prev =>
        prev.map(s => (s.id === song.id ? { ...s, isActive: !nextActive } : s))
      );
      Alert.alert('Live Status Error', e.message || 'Failed to update live status.');
    }
  }

  async function handleToggleHeard(song: PraiseSong) {
    const isCurrentlyHeard = Boolean(song.isHeard ?? song.heard ?? song.status === 'heard');
    const next = !isCurrentlyHeard;
    setTogglingId(song.id);
    setProgramSongs(prev =>
      prev.map(s => (s.id === song.id ? { ...s, isHeard: next, heard: next, status: next ? 'heard' : 'unheard' } : s))
    );
    try {
      await api.songs.toggleHeard(song.id, next);
    } catch (e: any) {
      setProgramSongs(prev =>
        prev.map(s => (s.id === song.id ? { ...s, isHeard: isCurrentlyHeard, heard: isCurrentlyHeard, status: isCurrentlyHeard ? 'heard' : 'unheard' } : s))
      );
      Alert.alert('Error', e.message || 'Failed to update song status.');
    } finally {
      setTogglingId(null);
    }
  }

  function handleSongUpdated(updated: PraiseSong) {
    setProgramSongs(prev => prev.map(s => (s.id === updated.id ? { ...s, ...updated } : s)));
  }

  // Metrics for setlist
  const pageMetrics = useMemo(() => {
    const total = programSongs.length;
    const heard = programSongs.filter(s => s.isHeard || s.heard || s.status === 'heard').length;
    const activeLive = programSongs.filter(s => s.isActive).length;
    const progressPercent = total > 0 ? Math.round((heard / total) * 100) : 0;
    return { total, heard, unheard: total - heard, activeLive, progressPercent };
  }, [programSongs]);

  // Categories present in this setlist
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    programSongs.forEach(song => {
      if (song.category && song.category.trim()) {
        categories.add(song.category.trim());
      }
    });
    return Array.from(categories);
  }, [programSongs]);

  // Filtered songs
  const filteredSongs = useMemo(() => {
    return programSongs.filter(song => {
      // Status filter
      const isHeard = Boolean(song.isHeard ?? song.heard ?? song.status === 'heard');
      if (statusFilter === 'heard' && !isHeard) return false;
      if (statusFilter === 'unheard' && isHeard) return false;

      // Category filter
      if (selectedCategory && song.category?.trim() !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (song.title || '').toLowerCase().includes(q);
        const matchesSinger = (song.leadSinger || '').toLowerCase().includes(q);
        const matchesWriter = (song.writer || '').toLowerCase().includes(q);
        const matchesConductor = (song.conductor || '').toLowerCase().includes(q);
        const matchesKey = (song.key || '').toLowerCase().includes(q);
        const matchesTempo = (song.tempo || '').toLowerCase().includes(q);
        const matchesCat = (song.category || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesSinger && !matchesWriter && !matchesConductor && !matchesKey && !matchesTempo && !matchesCat) {
          return false;
        }
      }
      return true;
    });
  }, [programSongs, statusFilter, selectedCategory, searchQuery]);

  const existingIds = useMemo(() => programSongs.map(s => s.id), [programSongs]);
  const currentCat = currentProgram.category || currentProgram.status || 'archive';
  const currentStatusOpt = STATUS_OPTIONS.find(o => o.value === currentCat) || STATUS_OPTIONS[2];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Sleek Command Header */}
      <View style={styles.header}>
        {/* Row 1: Back Button, Title, Status Picker, and Live Badge */}
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleCol}>
            <View style={styles.titleAndStatusRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {currentProgram.name || 'Setlist Queue'}
              </Text>

              {/* Status Picker Pill */}
              <TouchableOpacity
                style={[
                  styles.statusDropdownPill,
                  { backgroundColor: currentStatusOpt.bg, borderColor: currentStatusOpt.border }
                ]}
                onPress={() => setShowStatusModal(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusDropdownText, { color: currentStatusOpt.color }]}>
                  {currentStatusOpt.label}
                </Text>
                <Ionicons name="chevron-down" size={11} color={currentStatusOpt.color} style={{ marginLeft: 3 }} />
              </TouchableOpacity>

              {/* Live Pulsing Badge */}
              {pageMetrics.activeLive > 0 && (
                <View style={styles.liveBadgePill}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveBadgeText}>{pageMetrics.activeLive} LIVE</Text>
                </View>
              )}
            </View>

            {/* Date & Location Subtitle */}
            <View style={styles.headerMetaRow}>
              <Ionicons name="calendar-outline" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
              <Text style={styles.headerMetaText}>{formatDisplayDate(currentProgram.date)}</Text>
              {currentProgram.location ? (
                <>
                  <Text style={styles.headerMetaDot}>•</Text>
                  <Ionicons name="location-outline" size={12} color="#94a3b8" style={{ marginRight: 3 }} />
                  <Text style={styles.headerMetaText} numberOfLines={1}>{currentProgram.location}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* Row 2: Metrics Pill & Top Action Buttons */}
        <View style={styles.headerActionsRow}>
          {/* Consolidated Metrics Pill */}
          <View style={styles.metricsPill}>
            <Text style={styles.metricsCountText}>
              {pageMetrics.heard}/{pageMetrics.total}
            </Text>
            <Text style={styles.metricsDivider}>•</Text>
            <Text style={styles.metricsPercentText}>
              {pageMetrics.progressPercent}%
            </Text>
            <View style={styles.metricsMiniBarTrack}>
              <View
                style={[
                  styles.metricsMiniBarFill,
                  { width: `${pageMetrics.progressPercent}%` }
                ]}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActionBtnsGroup}>
            <TouchableOpacity
              style={styles.addTrackBtn}
              onPress={() => setAddModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 3 }} />
              <Text style={styles.addTrackBtnText}>Add Track</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.liveConductorBtn}
              onPress={() => navigation.navigate('LiveConductor', { program: currentProgram })}
              activeOpacity={0.8}
            >
              <Ionicons name="radio" size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.liveConductorBtnText}>Live Mode</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 3: Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={15} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search title, singers, keys, tempo..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Row 4: 3-State Segmented Filter */}
        <View style={styles.segmentedFilterRow}>
          {(['all', 'heard', 'unheard'] as const).map(f => {
            const active = statusFilter === f;
            const count = f === 'all' ? pageMetrics.total : f === 'heard' ? pageMetrics.heard : pageMetrics.unheard;
            const label = f === 'all' ? `All (${count})` : f === 'heard' ? `Heard (${count})` : `Unheard (${count})`;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                onPress={() => setStatusFilter(f)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentBtnText,
                    active && (f === 'heard' ? styles.segmentBtnTextHeard : f === 'unheard' ? styles.segmentBtnTextUnheard : styles.segmentBtnTextActive),
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Row 5: Horizontal Category Pill Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillList}
        >
          <TouchableOpacity
            style={[styles.catPill, !selectedCategory && styles.catPillActive]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.8}
          >
            <Text style={[styles.catPillText, !selectedCategory && styles.catPillTextActive]}>
              All Categories
            </Text>
            <View style={[styles.catPillBadge, !selectedCategory && styles.catPillBadgeActive]}>
              <Text style={[styles.catPillBadgeText, !selectedCategory && styles.catPillBadgeTextActive]}>
                {pageMetrics.total}
              </Text>
            </View>
          </TouchableOpacity>

          {availableCategories.map(cat => {
            const isSelected = selectedCategory === cat;
            const count = programSongs.filter(s => s.category?.trim() === cat).length;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catPill, isSelected && styles.catPillActive]}
                onPress={() => setSelectedCategory(isSelected ? null : cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]}>
                  {cat}
                </Text>
                <View style={[styles.catPillBadge, isSelected && styles.catPillBadgeActive]}>
                  <Text style={[styles.catPillBadgeText, isSelected && styles.catPillBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Song Queue List */}
      <FlatList
        data={filteredSongs}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchSongs}
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
              title={searchQuery || selectedCategory || statusFilter !== 'all' ? 'No matching tracks' : 'Setlist is Empty'}
              description={
                searchQuery || selectedCategory || statusFilter !== 'all'
                  ? 'Try clearing filters or search terms.'
                  : 'Add songs from the catalog or create a new song for this setlist.'
              }
              actionLabel="Add Track"
              onAction={() => setAddModalVisible(true)}
            />
          )
        }
        renderItem={({ item, index }) => {
          const isHeard = Boolean(item.isHeard ?? item.heard ?? item.status === 'heard');
          const isActive = Boolean(item.isActive);
          const audioParts: Record<string, string> =
            item.audioUrls ||
            (typeof item.customParts === 'object' && !Array.isArray(item.customParts)
              ? (item.customParts as Record<string, string>)
              : {});
          const hasSoprano = Boolean(audioParts.soprano || audioParts.s);
          const hasAlto = Boolean(audioParts.alto || audioParts.a);
          const hasTenor = Boolean(audioParts.tenor || audioParts.t);
          const hasBass = Boolean(audioParts.bass || audioParts.b);

          return (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => {
                setInspectorSong(item);
                setInspectorVisible(true);
              }}
              style={[styles.songCard, isActive && styles.songCardActive]}
            >
              {/* Top Row: Track Index, Title, Vocals/Writer, and Heard Toggle Pill */}
              <View style={styles.cardTopRow}>
                <View style={styles.trackIndexPill}>
                  <Text style={styles.trackIndexText}>#{index + 1}</Text>
                </View>

                <View style={styles.songTitleCol}>
                  <Text style={styles.songTitleText} numberOfLines={2}>
                    {item.title || 'Untitled Song'}
                  </Text>
                  {(item.leadSinger || item.writer || item.conductor) ? (
                    <Text style={styles.songPersonnelText} numberOfLines={1}>
                      {item.leadSinger ? `Vocals: ${item.leadSinger}` : ''}
                      {item.writer ? `${item.leadSinger ? ' • ' : ''}By ${item.writer}` : ''}
                      {!item.writer && item.conductor ? `${item.leadSinger ? ' • ' : ''}Cond: ${item.conductor}` : ''}
                    </Text>
                  ) : null}
                </View>

                {/* Heard Toggle Pill */}
                <TouchableOpacity
                  style={[styles.heardTogglePill, isHeard ? styles.heardTogglePillActive : styles.heardTogglePillInactive]}
                  onPress={() => handleToggleHeard(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isHeard ? 'checkmark' : 'time-outline'}
                    size={13}
                    color={isHeard ? '#047857' : '#64748b'}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[styles.heardToggleText, isHeard ? styles.heardToggleTextActive : styles.heardToggleTextInactive]}>
                    {isHeard ? 'Heard' : 'Unheard'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Middle Row: Category, Key, Tempo Meta Badges, Stems */}
              <View style={styles.metaBadgesRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category || 'Standard'}</Text>
                </View>

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

                {/* Stem indicators */}
                <View style={styles.stemsContainer}>
                  <Text style={styles.stemsLabel}>Stems:</Text>
                  {[
                    { label: 'S', active: hasSoprano },
                    { label: 'A', active: hasAlto },
                    { label: 'T', active: hasTenor },
                    { label: 'B', active: hasBass },
                  ].map(stem => (
                    <View key={stem.label} style={[styles.stemDot, stem.active && styles.stemDotActive]}>
                      <Text style={[styles.stemDotText, stem.active && styles.stemDotTextActive]}>{stem.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Bottom Row: Quick Actions (Live Broadcast Toggle, Edit, Delete) */}
              <View style={styles.cardBottomRow}>
                {/* Live Broadcast Button */}
                <TouchableOpacity
                  style={[styles.liveBroadcastBtn, isActive && styles.liveBroadcastBtnActive]}
                  onPress={() => handleToggleSongActive(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="radio"
                    size={13}
                    color={isActive ? '#ffffff' : '#64748b'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.liveBroadcastBtnText, isActive && styles.liveBroadcastBtnTextActive]}>
                    {isActive ? 'Live Broadcast' : 'Go Live'}
                  </Text>
                </TouchableOpacity>

                {/* Edit & Delete Action Buttons */}
                <View style={styles.cardActionsGroup}>
                  <TouchableOpacity
                    style={styles.editTrackBtn}
                    onPress={() => {
                      setInspectorSong(item);
                      setInspectorVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.editTrackBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteTrackBtn}
                    onPress={() => handleRemoveSong(item.id, item.title || 'this song')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#f43f5e" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Program Status Picker Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade" onRequestClose={() => setShowStatusModal(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.statusPickerSheet}>
            <View style={styles.statusPickerHeader}>
              <Text style={styles.statusPickerTitle}>Program Lifecycle Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.statusOptionsList}>
              {STATUS_OPTIONS.map(opt => {
                const isSelected = (currentProgram.category || currentProgram.status) === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.statusOptionItem,
                      isSelected && { backgroundColor: opt.bg, borderColor: opt.border }
                    ]}
                    onPress={() => handleChangeProgramStatus(opt.value)}
                  >
                    <Text style={[styles.statusOptionLabel, { color: opt.color }]}>{opt.label}</Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color={opt.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Song Modal (2-tab) */}
      <AddSongModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        programId={currentProgram.id}
        existingIds={existingIds}
        onAdded={fetchSongs}
        onCreated={fetchSongs}
      />

      {/* Song Inspector Modal */}
      <SongInspectorModal
        visible={inspectorVisible}
        song={inspectorSong}
        onClose={() => setInspectorVisible(false)}
        onSave={handleSongUpdated}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  backBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  headerTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  titleAndStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  statusDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusDropdownText: {
    fontSize: 10,
    fontWeight: '700',
  },
  liveBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e11d48',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#be123c',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerMetaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  headerMetaDot: {
    fontSize: 10,
    color: '#cbd5e1',
    marginHorizontal: 5,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  metricsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 5,
  },
  metricsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  metricsDivider: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  metricsPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7c3aed',
    fontVariant: ['tabular-nums'],
  },
  metricsMiniBarTrack: {
    width: 32,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
    marginLeft: 2,
  },
  metricsMiniBarFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 999,
  },
  headerActionBtnsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
  },
  addTrackBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  liveConductorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  liveConductorBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchContainer: {
    position: 'relative',
    marginTop: 6,
    marginBottom: 6,
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: 9,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingLeft: 32,
    paddingRight: 30,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500',
  },
  searchClearBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 1,
  },
  segmentedFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 2,
    marginBottom: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentBtnTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  segmentBtnTextHeard: {
    color: '#047857',
    fontWeight: '700',
  },
  segmentBtnTextUnheard: {
    color: '#b45309',
    fontWeight: '700',
  },
  categoryPillList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  catPillActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  catPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  catPillBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  catPillBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  catPillBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  catPillBadgeTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  songCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  songCardActive: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffbfa',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  trackIndexPill: {
    paddingTop: 2,
  },
  trackIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    fontVariant: ['tabular-nums'],
  },
  songTitleCol: {
    flex: 1,
    minWidth: 0,
  },
  songTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  songPersonnelText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  heardTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  heardTogglePillActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  heardTogglePillInactive: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  heardToggleText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heardToggleTextActive: {
    color: '#047857',
  },
  heardToggleTextInactive: {
    color: '#64748b',
  },
  metaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  categoryBadge: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6d28d9',
  },
  keyBadge: {
    backgroundColor: '#eef2ff',
    borderColor: '#e0e7ff',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  keyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338ca',
  },
  tempoBadge: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tempoBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  stemsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  stemsLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    marginRight: 2,
  },
  stemDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stemDotActive: {
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  stemDotText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94a3b8',
  },
  stemDotTextActive: {
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
  liveBroadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  liveBroadcastBtnActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  liveBroadcastBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  liveBroadcastBtnTextActive: {
    color: '#ffffff',
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editTrackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  editTrackBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteTrackBtn: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  statusPickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  statusPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  statusPickerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusOptionsList: {
    marginTop: 12,
    gap: 8,
  },
  statusOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  statusOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});

// Inspector styles
const inspector = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)' },
  sheet: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 48,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  headerCenterCol: {
    flex: 1,
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
    fontWeight: '500',
  },
  heardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heardPillActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  heardPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  heardPillTextActive: {
    color: '#059669',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    marginLeft: 4,
  },
  saveBtn: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.accent,
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  stemBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stemBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    marginRight: 2,
  },
  stemPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stemPillActive: {
    backgroundColor: '#f3e8ff',
    borderColor: '#c084fc',
  },
  stemPillFull: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  stemPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
  },
  stemPillTextActive: {
    color: '#7c3aed',
  },
  rehearsalCountBadge: {
    marginLeft: 'auto',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  rehearsalCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  tabBarScroll: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtnActive: {
    backgroundColor: '#f5f3ff',
    borderColor: '#d8b4fe',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabBtnTextActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  tabSection: {
    gap: 14,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fieldValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  fieldValueBold: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '800',
  },
  fieldValueMuted: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  fieldSubText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 42,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inlineBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 42,
    paddingHorizontal: 4,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  keyChipScroll: {
    gap: 6,
    paddingVertical: 4,
  },
  keyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  keyChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  keyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  keyChipTextActive: {
    color: '#ffffff',
  },
  keyPill: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8b4fe',
  },
  keyPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7c3aed',
  },
  artworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artworkPreview: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  artworkPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkPlaceholderText: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    marginTop: 2,
  },
  audioLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  audioLinkBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7c3aed',
  },
  sectionDivider: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sectionDividerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  audioLabIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#faf5ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f3e8ff',
  },
  audioLabIntroTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#581c87',
  },
  audioLabIntroSub: {
    fontSize: 11,
    color: '#7e22ce',
    marginTop: 2,
    lineHeight: 16,
  },
  stemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stemBadgeSmall: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stemBadgeSmallText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stemCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: '#10b981',
  },
  statusDotEmpty: {
    backgroundColor: '#cbd5e1',
  },
  statusDotText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  statusDotTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  stemActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  stemTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  stemTestBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  stemClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  stemClearBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  customPartsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  addPartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  addPartBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  addPartBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  addPartBoxActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  addPartSubmitBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPartSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  addPartCancelBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPartCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  contentLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  lyricsCard: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    minHeight: 180,
  },
  lyricsText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  lyricsInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 180,
    lineHeight: 22,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  guideCard: {
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 6,
  },
  notationCard: {
    backgroundColor: '#fffbeb',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 6,
  },
  notationText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#78350f',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  commentCard: {
    backgroundColor: '#faf5ff',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f3e8ff',
    marginTop: 6,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4c1d95',
  },
});

// Add Song Modal styles
const addModal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 40,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  closeBtn: { padding: 6 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabPillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabPillText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  tabPillTextActive: { color: '#ffffff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  catalogList: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  catalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  catalogDetails: { flex: 1, marginRight: 10 },
  catalogTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  catalogMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catalogWriter: { fontSize: 12, color: Colors.textMuted },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addPillText: { fontSize: 12, fontWeight: '700', color: '#ffffff', marginLeft: 2 },
  createForm: { paddingHorizontal: 18, paddingTop: 16 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 44,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  textarea: { height: 100, paddingVertical: 10 },
  row2: { flexDirection: 'row', gap: 10 },
  keyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  keyChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  keyChipText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  keyChipTextActive: { color: '#ffffff' },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 10,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
