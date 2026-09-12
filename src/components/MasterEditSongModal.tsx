import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { Colors } from '../constants/Colors';
import MediaSelectionModal from './MediaSelectionModal';
import { MasterSong } from './MasterSongDetailModal';
import { api } from '../services/api';
import { customAlert } from '../context/AlertContext';
import { stripHtml } from '../lib/stripHtml';

export interface MasterEditSongModalProps {
  visible: boolean;
  song?: MasterSong | null;
  mode?: 'edit' | 'create';
  onClose: () => void;
  onSaved: (song: MasterSong, isNew: boolean) => void;
}

const SONG_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const DEFAULT_COLLECTIONS = [
  'Praise Night 28',
  'Praise Night 27',
  'Praise Night 26',
  'Praise Night 25',
  'Praise Night 24',
  'HSLHS October 2024',
  'HSLHS July 2024',
  'HSLHS March 2024',
  'Praise Night 23',
  'Praise Night 22',
  'Global Communion Service',
  'Christmas Eve Service',
];

export default function MasterEditSongModal({
  visible,
  song,
  mode = 'edit',
  onClose,
  onSaved,
}: MasterEditSongModalProps) {
  const insets = useSafeAreaInsets();
  const isCreate = mode === 'create' || !song;

  const [activeTab, setActiveTab] = useState<'details' | 'audio' | 'lyrics' | 'access'>('details');

  // Form State
  const [title, setTitle] = useState('');
  const [writer, setWriter] = useState('');
  const [leadSinger, setLeadSinger] = useState('');
  const [key, setKey] = useState('');
  const [tempo, setTempo] = useState('');
  const [conductor, setConductor] = useState('');
  const [leadKeyboardist, setLeadKeyboardist] = useState('');
  const [bassGuitarist, setBassGuitarist] = useState('');
  const [drummer, setDrummer] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isHQOnly, setIsHQOnly] = useState(false);

  // Master Programs / Collections & Inline Creation
  const [collectionsList, setCollectionsList] = useState<string[]>(DEFAULT_COLLECTIONS);
  const [collectionToIdMap, setCollectionToIdMap] = useState<Record<string, string>>({});
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Audio Lab
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({
    full: '',
    soprano: '',
    alto: '',
    tenor: '',
    bass: '',
  });
  const [customParts, setCustomParts] = useState<string[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [showAddPart, setShowAddPart] = useState(false);

  // Lyrics & Guides
  const [lyrics, setLyrics] = useState('');
  const [solfa, setSolfa] = useState('');
  const [history, setHistory] = useState('');

  // Media Selector
  const [mediaTarget, setMediaTarget] = useState<string | null>(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);

  // Audio Playback for Stem Testing
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [player, setPlayer] = useState<AudioPlayer | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (player) {
        player.pause();
        player.remove();
      }
    };
  }, [player]);

  useEffect(() => {
    if (!visible && player) {
      player.pause();
      player.remove();
      setPlayer(null);
      setPlayingKey(null);
    }
  }, [visible, player]);

  useEffect(() => {
    if (visible) {
      setActiveTab('details');
      setShowNewCatInput(false);
      setNewCatName('');
      setShowAddPart(false);
      setNewPartName('');

      // Fetch the 46 canonical Master Programs / Collections
      api.programs.getMasterPrograms().then(res => {
        const progs = (Array.isArray(res?.data) ? res.data : [])
          .map((p: any) => ({
            id: p.id,
            name: (p.name || p.title || '').trim(),
          }))
          .filter((p: any) => Boolean(p.name));
        if (progs.length > 0) {
          const map: Record<string, string> = {};
          const names: string[] = [];
          progs.forEach((p: any) => {
            map[p.name] = p.id;
            names.push(p.name);
          });
          setCollectionToIdMap(map);
          setCollectionsList(prev => Array.from(new Set([...names, ...DEFAULT_COLLECTIONS, ...prev])));
        }
      }).catch(() => {});

      if (song && !isCreate) {
        setTitle(song.title || '');
        setWriter(song.writer || song.publishedByName || '');
        setLeadSinger(song.leadSinger || '');
        setKey(song.key || '');
        setTempo(song.tempo || '');
        setConductor(song.conductor || '');
        setLeadKeyboardist(song.leadKeyboardist || '');
        setBassGuitarist(song.bassGuitarist || '');
        setDrummer(song.drummer || '');
        const existingColl = (song as any).program || (song as any).programName || song.category || 'Praise Night 28';
        setCategory(existingColl);
        setImageUrl(song.imageUrl || '');
        setIsHQOnly(Boolean(song.isHQOnly || song.isHqOnly));
        setLyrics(stripHtml(song.lyrics || ''));
        setSolfa(stripHtml(song.solfas || song.solfa || song.conductorGuide || ''));
        setHistory(stripHtml(song.history || song.coordinatorComment || song.coordinatorNotes || ''));

        // Ensure collection is in collectionsList
        if (existingColl && !collectionsList.includes(existingColl)) {
          setCollectionsList(prev => [existingColl, ...prev]);
        }

        const urls: Record<string, string> = {
          full: song.audioUrls?.full || song.audioFile || song.audioUrl || '',
          soprano: song.audioUrls?.soprano || '',
          alto: song.audioUrls?.alto || '',
          tenor: song.audioUrls?.tenor || '',
          bass: song.audioUrls?.bass || '',
        };

        const parts: string[] = [];
        if (song.customParts) {
          if (Array.isArray(song.customParts)) {
            song.customParts.forEach(p => {
              parts.push(p);
              if (song.audioUrls?.[p]) urls[p] = song.audioUrls[p];
            });
          } else if (typeof song.customParts === 'object') {
            Object.entries(song.customParts).forEach(([k, v]) => {
              parts.push(k);
              if (typeof v === 'string') urls[k] = v;
            });
          }
        }
        setAudioUrls(urls);
        setCustomParts(parts);
      } else {
        // New song initial values
        setTitle('');
        setWriter('Loveworld Singers');
        setLeadSinger('');
        setKey('C');
        setTempo('100');
        setConductor('');
        setLeadKeyboardist('');
        setBassGuitarist('');
        setDrummer('');
        setCategory('Praise Night 28');
        setImageUrl('');
        setIsHQOnly(false);
        setLyrics('');
        setSolfa('');
        setHistory('');
        setAudioUrls({
          full: '',
          soprano: '',
          alto: '',
          tenor: '',
          bass: '',
        });
        setCustomParts([]);
      }
    } else {
      if (player) {
        player.pause();
        player.remove();
        setPlayer(null);
      }
      setPlayingKey(null);
    }
  }, [visible, song, isCreate]);

  // Handle inline collection creation
  async function handleAddNewCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (!collectionsList.includes(trimmed)) {
      setCollectionsList(prev => [trimmed, ...prev]);
    }
    setCategory(trimmed);
    setNewCatName('');
    setShowNewCatInput(false);

    // Persist as a Master Program / Collection (category: 'ministered')
    try {
      const res = await api.programs.create({
        name: trimmed,
        category: 'ministered',
        status: 'completed',
        isArchived: true,
      });
      if (res?.data?.id) {
        setCollectionToIdMap(prev => ({ ...prev, [trimmed]: res.data.id }));
      }
    } catch (e) {
      console.warn('Failed to persist master collection:', e);
    }
  }

  // Handle add custom stem
  function handleAddStem() {
    const trimmed = newPartName.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (['full', 'soprano', 'alto', 'tenor', 'bass', ...customParts.map(p => p.toLowerCase())].includes(lower)) {
      customAlert('Exists', 'This stem part name is already in use.');
      return;
    }
    setCustomParts(prev => [...prev, trimmed]);
    setAudioUrls(prev => ({ ...prev, [trimmed]: '' }));
    setNewPartName('');
    setShowAddPart(false);
  }

  function handleRemoveCustomStem(part: string) {
    setCustomParts(prev => prev.filter(p => p !== part));
    setAudioUrls(prev => {
      const next = { ...prev };
      delete next[part];
      return next;
    });
  }

  // Audio Playback
  async function handleToggleStemAudio(stemKey: string, url: string) {
    if (!url) return;
    try {
      if (playingKey === stemKey && player) {
        player.pause();
        player.remove();
        setPlayer(null);
        setPlayingKey(null);
        return;
      }

      if (player) {
        player.pause();
        player.remove();
        setPlayer(null);
      }

      setPlayingKey(stemKey);
      const newPlayer = createAudioPlayer({ uri: url });
      (newPlayer as any).addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          setPlayingKey(null);
        }
      });
      newPlayer.play();
      setPlayer(newPlayer);
    } catch (e) {
      console.log('Stem play error:', e);
      setPlayingKey(null);
    }
  }

  // Save Song
  async function handleSave() {
    if (!title.trim()) {
      customAlert('Required Field', 'Please enter a song title.');
      setActiveTab('details');
      return;
    }

    setSaving(true);
    try {
      const resolvedProgramId =
        collectionToIdMap[category.trim()] ||
        (song as any)?.programId ||
        (song as any)?.praiseNightId ||
        undefined;

      const payload: MasterSong = {
        id: song?.id || `master-${Date.now()}`,
        title: title.trim(),
        writer: writer.trim(),
        publishedByName: writer.trim(),
        leadSinger: leadSinger.trim(),
        category: category.trim(),
        program: category.trim(),
        programName: category.trim(),
        programId: resolvedProgramId,
        praiseNightId: resolvedProgramId,
        key: key.trim(),
        tempo: tempo.trim(),
        conductor: conductor.trim(),
        leadKeyboardist: leadKeyboardist.trim(),
        bassGuitarist: bassGuitarist.trim(),
        drummer: drummer.trim(),
        audioFile: audioUrls.full || '',
        audioUrl: audioUrls.full || '',
        audioUrls: audioUrls,
        customParts: customParts,
        lyrics: lyrics.trim(),
        solfas: solfa.trim(),
        solfa: solfa.trim(),
        conductorGuide: solfa.trim(),
        history: history.trim(),
        imageUrl: imageUrl.trim(),
        isHQOnly: isHQOnly,
        isHqOnly: isHQOnly,
        isMaster: true,
        isMinistered: true,
      };

      let response: any;
      if (isCreate) {
        response = await api.songs.create({ ...payload, status: isHQOnly ? 'hq_only' : 'active' });
      } else if (song?.id) {
        response = await api.songs.update(song.id, { ...payload, status: isHQOnly ? 'hq_only' : 'active' });
      }
      if (response && response.success === false) throw new Error('Failed to save master song.');

      onSaved(payload, isCreate);
      onClose();
    } catch (e: any) {
      customAlert('Save Error', e.message || 'Failed to save master song.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {isCreate ? 'Add Master Song' : 'Edit Master Song'}
            </Text>
            {isHQOnly && (
              <View style={styles.hqIndicator}>
                <Text style={styles.hqIndicatorText}>HQ</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, !title.trim() && styles.saveBtnDisabled]}
            disabled={saving || !title.trim()}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 4 Tabs Bar (Web Admin Parity) */}
        <View style={styles.tabsRow}>
          {[
            { id: 'details', label: 'Details', icon: 'information-circle-outline' },
            { id: 'audio', label: 'Audio & Stems', icon: 'musical-notes-outline' },
            { id: 'lyrics', label: 'Lyrics & Guide', icon: 'document-text-outline' },
            { id: 'access', label: 'Access Control', icon: 'shield-checkmark-outline' },
          ].map(t => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.id as any)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon as any}
                  size={14}
                  color={isActive ? '#7c3aed' : '#64748b'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── TAB 1: DETAILS ────────────────────────────────────────────── */}
            {activeTab === 'details' && (
              <View style={styles.tabSection}>
                {/* General Info Card */}
                <View style={styles.card}>
                  <Text style={styles.cardSectionTitle}>General Metadata</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>SONG TITLE *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. King of Kings (You Reign)"
                      placeholderTextColor="#94a3b8"
                      value={title}
                      onChangeText={setTitle}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>LEAD SINGER</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Pastor Ruth"
                        placeholderTextColor="#94a3b8"
                        value={leadSinger}
                        onChangeText={setLeadSinger}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>COMPOSER / WRITER</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Loveworld Singers"
                        placeholderTextColor="#94a3b8"
                        value={writer}
                        onChangeText={setWriter}
                      />
                    </View>
                  </View>

                  {/* Master Program / Collection Selection with INLINE creation */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelWithAction}>
                      <Text style={styles.label}>MASTER PROGRAM / COLLECTION</Text>
                      {!showNewCatInput && (
                        <TouchableOpacity
                          style={styles.addCategoryPill}
                          onPress={() => setShowNewCatInput(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add" size={12} color="#7c3aed" style={{ marginRight: 2 }} />
                          <Text style={styles.addCategoryPillText}>+ New Collection</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {showNewCatInput && (
                      <View style={styles.inlineNewCatRow}>
                        <TextInput
                          style={styles.inlineNewCatInput}
                          placeholder="Collection name (e.g. Praise Night 29, HSLHS)..."
                          placeholderTextColor="#94a3b8"
                          value={newCatName}
                          onChangeText={setNewCatName}
                          autoFocus
                        />
                        <TouchableOpacity
                          style={styles.inlineAddCatBtn}
                          onPress={handleAddNewCategory}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.inlineAddCatBtnText}>Add</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.inlineCancelCatBtn}
                          onPress={() => {
                            setShowNewCatInput(false);
                            setNewCatName('');
                          }}
                        >
                          <Ionicons name="close" size={16} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    )}

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                      {collectionsList.map(cat => {
                        const isSelected = category === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                            onPress={() => setCategory(cat)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name="albums-outline"
                              size={12}
                              color={isSelected ? '#7c3aed' : '#64748b'}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Key and Tempo */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>MUSICAL KEY</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.keyScroll}>
                      {SONG_KEYS.map(k => {
                        const isSelected = key === k;
                        return (
                          <TouchableOpacity
                            key={k}
                            style={[styles.keyPill, isSelected && styles.keyPillActive]}
                            onPress={() => setKey(k)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.keyPillText, isSelected && styles.keyPillTextActive]}>
                              {k}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>TEMPO (BPM)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 112"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        value={tempo}
                        onChangeText={setTempo}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>CONDUCTOR</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Bro Dennis"
                        placeholderTextColor="#94a3b8"
                        value={conductor}
                        onChangeText={setConductor}
                      />
                    </View>
                  </View>
                </View>

                {/* Rhythm Section Card */}
                <View style={styles.card}>
                  <Text style={styles.cardSectionTitle}>Band & Musicians</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>LEAD KEYBOARDIST</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Bro Enoch"
                      placeholderTextColor="#94a3b8"
                      value={leadKeyboardist}
                      onChangeText={setLeadKeyboardist}
                    />
                  </View>

                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>BASS GUITARIST</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Bro Wisdom"
                        placeholderTextColor="#94a3b8"
                        value={bassGuitarist}
                        onChangeText={setBassGuitarist}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>DRUMMER</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Bro Victor"
                        placeholderTextColor="#94a3b8"
                        value={drummer}
                        onChangeText={setDrummer}
                      />
                    </View>
                  </View>
                </View>

                {/* Artwork Card */}
                <View style={styles.card}>
                  <View style={styles.labelWithAction}>
                    <Text style={styles.cardSectionTitle}>Cover Artwork URL</Text>
                    <TouchableOpacity
                      style={styles.pickMediaPill}
                      onPress={() => {
                        setMediaTarget('image');
                        setMediaModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="image-outline" size={12} color="#7c3aed" style={{ marginRight: 3 }} />
                      <Text style={styles.pickMediaPillText}>Media Library</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="https://... or cloud storage image URL"
                    placeholderTextColor="#94a3b8"
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            {/* ── TAB 2: AUDIO & STEMS ───────────────────────────────────────── */}
            {activeTab === 'audio' && (
              <View style={styles.tabSection}>
                {/* Master Audio Track */}
                <View style={styles.card}>
                  <View style={styles.labelWithAction}>
                    <Text style={styles.cardSectionTitle}>Full Mix (Master Track)</Text>
                    <TouchableOpacity
                      style={styles.pickMediaPill}
                      onPress={() => {
                        setMediaTarget('full');
                        setMediaModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="folder-open-outline" size={12} color="#7c3aed" style={{ marginRight: 3 }} />
                      <Text style={styles.pickMediaPillText}>Pick from Library</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.stemInputRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="https://... full master audio URL"
                      placeholderTextColor="#94a3b8"
                      value={audioUrls.full || ''}
                      onChangeText={val => setAudioUrls(prev => ({ ...prev, full: val }))}
                      autoCapitalize="none"
                    />
                    {audioUrls.full ? (
                      <TouchableOpacity
                        style={[styles.testPlayBtn, playingKey === 'full' && styles.testPlayBtnActive]}
                        onPress={() => handleToggleStemAudio('full', audioUrls.full)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={playingKey === 'full' ? 'pause' : 'play'}
                          size={15}
                          color={playingKey === 'full' ? '#ffffff' : '#7c3aed'}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Vocal Stems */}
                <View style={styles.card}>
                  <View style={styles.labelWithAction}>
                    <Text style={styles.cardSectionTitle}>Vocal Stems (S, A, T, B)</Text>
                    {!showAddPart && (
                      <TouchableOpacity
                        style={styles.addCategoryPill}
                        onPress={() => setShowAddPart(true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={12} color="#7c3aed" style={{ marginRight: 2 }} />
                        <Text style={styles.addCategoryPillText}>+ Custom Stem</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Add Custom Stem Inline Input */}
                  {showAddPart && (
                    <View style={styles.inlineNewCatRow}>
                      <TextInput
                        style={styles.inlineNewCatInput}
                        placeholder="Part name (e.g. Lead Vocals, Harmony 2)..."
                        placeholderTextColor="#94a3b8"
                        value={newPartName}
                        onChangeText={setNewPartName}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.inlineAddCatBtn}
                        onPress={handleAddStem}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.inlineAddCatBtnText}>Add</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.inlineCancelCatBtn}
                        onPress={() => {
                          setShowAddPart(false);
                          setNewPartName('');
                        }}
                      >
                        <Ionicons name="close" size={16} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* 4 Standard Stems + Custom Stems */}
                  {[
                    { key: 'soprano', label: 'Soprano Stem', color: '#ec4899' },
                    { key: 'alto', label: 'Alto Stem', color: '#f43f5e' },
                    { key: 'tenor', label: 'Tenor Stem', color: '#3b82f6' },
                    { key: 'bass', label: 'Bass Stem', color: '#6366f1' },
                    ...customParts.map(cp => ({ key: cp, label: `${cp} Stem`, color: '#8b5cf6', isCustom: true })),
                  ].map(part => {
                    const url = audioUrls[part.key] || '';
                    return (
                      <View key={part.key} style={styles.stemFieldBlock}>
                        <View style={styles.stemHeaderRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={[styles.stemDot, { backgroundColor: part.color }]} />
                            <Text style={styles.stemFieldLabel}>{part.label}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity
                              style={styles.smallPickBtn}
                              onPress={() => {
                                setMediaTarget(part.key);
                                setMediaModalVisible(true);
                              }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="folder-open-outline" size={11} color="#7c3aed" style={{ marginRight: 2 }} />
                              <Text style={styles.smallPickBtnText}>Pick</Text>
                            </TouchableOpacity>

                            {(part as any).isCustom && (
                              <TouchableOpacity
                                onPress={() => handleRemoveCustomStem(part.key)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        <View style={styles.stemInputRow}>
                          <TextInput
                            style={[styles.input, { flex: 1, fontSize: 12 }]}
                            placeholder={`URL for ${part.label}...`}
                            placeholderTextColor="#94a3b8"
                            value={url}
                            onChangeText={val => setAudioUrls(prev => ({ ...prev, [part.key]: val }))}
                            autoCapitalize="none"
                          />
                          {url ? (
                            <TouchableOpacity
                              style={[styles.testPlayBtn, playingKey === part.key && styles.testPlayBtnActive]}
                              onPress={() => handleToggleStemAudio(part.key, url)}
                              activeOpacity={0.8}
                            >
                              <Ionicons
                                name={playingKey === part.key ? 'pause' : 'play'}
                                size={14}
                                color={playingKey === part.key ? '#ffffff' : '#7c3aed'}
                              />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── TAB 3: LYRICS & GUIDE ─────────────────────────────────────── */}
            {activeTab === 'lyrics' && (
              <View style={styles.tabSection}>
                <View style={styles.card}>
                  <Text style={styles.cardSectionTitle}>Official Song Lyrics</Text>
                  <TextInput
                    style={styles.multilineInput}
                    placeholder="Enter full song lyrics with verses and chorus..."
                    placeholderTextColor="#94a3b8"
                    value={lyrics}
                    onChangeText={setLyrics}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardSectionTitle}>Conductor Guide & Tonic Solfa</Text>
                  <TextInput
                    style={styles.multilineInput}
                    placeholder="Enter tonic solfa (e.g. d:r:m | f:s:l) and conductor cues..."
                    placeholderTextColor="#94a3b8"
                    value={solfa}
                    onChangeText={setSolfa}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardSectionTitle}>Song History & Ministered Background</Text>
                  <TextInput
                    style={[styles.multilineInput, { height: 100 }]}
                    placeholder="Notes on the inspiration, ministered program dates, or special instructions..."
                    placeholderTextColor="#94a3b8"
                    value={history}
                    onChangeText={setHistory}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </View>
            )}

            {/* ── TAB 4: ACCESS CONTROL (HQ ONLY) ───────────────────────────── */}
            {activeTab === 'access' && (
              <View style={styles.tabSection}>
                <View style={styles.card}>
                  <View style={styles.accessToggleRow}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={styles.accessTitle}>Headquarters Only (HQ Only)</Text>
                      <Text style={styles.accessSubtitle}>
                        When enabled, this song will only be visible to Headquarter administrators and singers, hiding it from zonal rehearsal portals.
                      </Text>
                    </View>
                    <Switch
                      value={isHQOnly}
                      onValueChange={setIsHQOnly}
                      trackColor={{ false: '#cbd5e1', true: '#7c3aed' }}
                      thumbColor="#ffffff"
                    />
                  </View>

                  <View style={styles.hqInfoBox}>
                    <Ionicons name="shield-checkmark" size={18} color="#7c3aed" style={{ marginTop: 1 }} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.hqInfoBoxTitle}>Scope Protection</Text>
                      <Text style={styles.hqInfoBoxText}>
                        Zonal admins will not be able to clone or view this master repertoire track while HQ Only is activated.
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Media Selection Modal */}
        <MediaSelectionModal
          visible={mediaModalVisible}
          onClose={() => {
            setMediaModalVisible(false);
            setMediaTarget(null);
          }}
          allowedType={mediaTarget === 'image' ? 'image' : 'audio'}
          title={mediaTarget === 'image' ? 'Select Cover Artwork' : `Select ${mediaTarget} Audio`}
          onSelect={url => {
            if (mediaTarget === 'image') {
              setImageUrl(url);
            } else if (mediaTarget) {
              setAudioUrls(prev => ({ ...prev, [mediaTarget]: url }));
            }
            setMediaModalVisible(false);
            setMediaTarget(null);
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cancelBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  hqIndicator: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  hqIndicatorText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7c3aed',
  },
  saveBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  tabBtnActive: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  tabBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#7c3aed',
    fontWeight: '800',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  tabSection: {
    gap: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  cardSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  inputGroup: {
    gap: 4,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  labelWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13.5,
    color: '#0f172a',
  },
  multilineInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    height: 150,
    fontSize: 13.5,
    color: '#0f172a',
    lineHeight: 20,
  },
  addCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  addCategoryPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7c3aed',
  },
  inlineNewCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inlineNewCatInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7c3aed',
    paddingHorizontal: 10,
    height: 34,
    fontSize: 12.5,
    color: '#0f172a',
  },
  inlineAddCatBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddCatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  inlineCancelCatBtn: {
    padding: 6,
  },
  categoryScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#f5f3ff',
    borderColor: '#7c3aed',
  },
  categoryChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryChipTextActive: {
    color: '#7c3aed',
    fontWeight: '800',
  },
  keyScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  keyPill: {
    width: 36,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  keyPillActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  keyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  keyPillTextActive: {
    color: '#ffffff',
  },
  pickMediaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  pickMediaPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7c3aed',
  },
  stemInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testPlayBtn: {
    width: 38,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testPlayBtnActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  stemFieldBlock: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 4,
  },
  stemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  stemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stemFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  smallPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  smallPickBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
  },
  accessToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accessTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  accessSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
  },
  hqInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f3ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    marginTop: 4,
  },
  hqInfoBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7c3aed',
    marginBottom: 2,
  },
  hqInfoBoxText: {
    fontSize: 11,
    color: '#6b21a8',
    lineHeight: 15,
  },
});
