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
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ZoneSongFormModal, { ZoneSong } from './ZoneSongFormModal';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { GradientCard, Badge, SearchFilterBar, EmptyState } from '../components/ui';
import ZoneHeader from '../components/ZoneHeader';

// ─── Song Inspector Modal ────────────────────────────────────────────────────

function MasterSongInspector({
  visible,
  song,
  onClose,
  onUpdated,
}: {
  visible: boolean;
  song: MasterSong | null;
  onClose: () => void;
  onUpdated: (s: MasterSong) => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'audiolab' | 'lyrics' | 'notation' | 'notes'>('info');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    title: string;
    key: string;
    tempo: string;
    category: string;
    leadSinger: string;
    writer: string;
    conductor: string;
    conductorGuide: string;
    leadKeyboardist: string;
    leadGuitarist: string;
    bassGuitarist: string;
    drummer: string;
    audioFile: string;
    lyrics: string;
    solfas: string;
    coordinatorNotes: string;
    rehearsalCount: number;
  }>({
    title: '',
    key: '',
    tempo: '',
    category: '',
    leadSinger: '',
    writer: '',
    conductor: '',
    conductorGuide: '',
    leadKeyboardist: '',
    leadGuitarist: '',
    bassGuitarist: '',
    drummer: '',
    audioFile: '',
    lyrics: '',
    solfas: '',
    coordinatorNotes: '',
    rehearsalCount: 0,
  });

  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [customParts, setCustomParts] = useState<string[]>([]);
  const [showAddCustomPart, setShowAddCustomPart] = useState(false);
  const [newPartName, setNewPartName] = useState('');

  React.useEffect(() => {
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
      const standardKeys = ['soprano', 'alto', 'tenor', 'bass', 'full', 'lead', 'instrumental'];
      Object.keys(urls).forEach(k => {
        if (!standardKeys.includes(k.toLowerCase()) && !cParts.includes(k)) {
          cParts.push(k);
        }
      });

      setForm({
        title: song.title || '',
        key: song.key || '',
        tempo: song.tempo || '',
        category: song.category || '',
        leadSinger: song.leadSinger || '',
        writer: song.writer || song.publishedByName || '',
        conductor: song.conductor || '',
        conductorGuide: song.conductorGuide || '',
        leadKeyboardist: song.leadKeyboardist || '',
        leadGuitarist: song.leadGuitarist || '',
        bassGuitarist: song.bassGuitarist || '',
        drummer: song.drummer || '',
        audioFile: song.audioFile || song.audioUrl || '',
        lyrics: song.lyrics || '',
        solfas: song.solfas || song.solfa || '',
        coordinatorNotes: song.coordinatorNotes || song.rehearsalNotes || song.coordinatorComment || '',
        rehearsalCount: song.rehearsalCount ?? 0,
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

  async function handleSave() {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title: form.title,
        category: form.category,
        key: form.key,
        tempo: form.tempo,
        leadSinger: form.leadSinger,
        writer: form.writer,
        conductor: form.conductor,
        conductorGuide: form.conductorGuide,
        leadKeyboardist: form.leadKeyboardist,
        leadGuitarist: form.leadGuitarist,
        bassGuitarist: form.bassGuitarist,
        drummer: form.drummer,
        audioFile: form.audioFile,
        lyrics: form.lyrics,
        solfas: form.solfas,
        audioUrls: audioUrls,
        coordinatorNotes: form.coordinatorNotes,
        rehearsalCount: Number(form.rehearsalCount) || 0,
      };

      await api.songs.update(currentSong.id, payload);
      onUpdated({ ...currentSong, ...payload });
      setEditMode(false);
      Alert.alert('Saved', 'Master song details updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  function handleOpenLink(url?: string) {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open audio link: ' + url);
    });
  }

  function handleAddCustomPart() {
    const name = newPartName.trim();
    if (!name) return;
    if (['soprano', 'alto', 'tenor', 'bass'].includes(name.toLowerCase()) || customParts.some(p => p.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Part Exists', 'This vocal part is already present.');
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
      <View style={inspStyle.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <SafeAreaView style={inspStyle.sheet}>
            {/* Header */}
            <View style={inspStyle.header}>
              <TouchableOpacity onPress={onClose} style={inspStyle.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-down" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>

              <View style={inspStyle.headerCenterCol}>
                <Text style={inspStyle.headerTitle} numberOfLines={1}>{form.title || song.title || 'Song Inspector'}</Text>
                <Text style={inspStyle.headerSub} numberOfLines={1}>
                  {form.leadSinger ? `Lead: ${form.leadSinger}` : form.writer ? `Writer: ${form.writer}` : 'Master Repertoire Catalog'}
                </Text>
              </View>

              {editMode ? (
                <TouchableOpacity style={inspStyle.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={inspStyle.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={inspStyle.editBtn} onPress={() => setEditMode(true)} activeOpacity={0.8}>
                  <Ionicons name="pencil" size={14} color={Colors.accent} />
                  <Text style={inspStyle.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tab Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={inspStyle.tabBar}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[inspStyle.tabBtn, isActive && inspStyle.tabBtnActive]}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={14}
                      color={isActive ? Colors.accent : Colors.textMuted}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[inspStyle.tabBtnText, isActive && inspStyle.tabBtnTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Tab Content */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={inspStyle.content} keyboardShouldPersistTaps="handled">
              {/* TAB 1: INFO & BAND */}
              {activeTab === 'info' && (
                <View style={inspStyle.sectionGap}>
                  <View style={inspStyle.sectionCard}>
                    <Text style={inspStyle.sectionTitle}>Track Metadata</Text>
                    {[
                      { label: 'SONG TITLE', key: 'title', placeholder: 'e.g. Blessed Be the Name' },
                      { label: 'MUSICAL KEY', key: 'key', placeholder: 'e.g. Eb, F, G' },
                      { label: 'TEMPO (BPM)', key: 'tempo', placeholder: 'e.g. 72' },
                      { label: 'CATEGORY', key: 'category', placeholder: 'e.g. Praise, Worship, Anthem' },
                      { label: 'LEAD SINGER', key: 'leadSinger', placeholder: 'e.g. Sister Ruth' },
                      { label: 'COMPOSER / WRITER', key: 'writer', placeholder: 'e.g. Pastor Chris Oyakhilome' },
                      { label: 'CONDUCTOR', key: 'conductor', placeholder: 'e.g. Brother Dennis' },
                    ].map(field => (
                      <View key={field.key} style={inspStyle.formRow}>
                        <Text style={inspStyle.fieldLabel}>{field.label}</Text>
                        {editMode ? (
                          <TextInput
                            style={inspStyle.fieldInput}
                            value={(form as any)[field.key]}
                            onChangeText={val => setForm(prev => ({ ...prev, [field.key]: val }))}
                            placeholder={field.placeholder}
                            placeholderTextColor={Colors.textMuted}
                          />
                        ) : (
                          <Text style={inspStyle.fieldValue}>{(form as any)[field.key] || '—'}</Text>
                        )}
                      </View>
                    ))}
                  </View>

                  <View style={inspStyle.sectionCard}>
                    <Text style={inspStyle.sectionTitle}>Band & Rhythm Section</Text>
                    {[
                      { label: 'DRUMMER', key: 'drummer', placeholder: 'Assigned drummer' },
                      { label: 'LEAD KEYBOARDIST', key: 'leadKeyboardist', placeholder: 'Assigned keyboardist' },
                      { label: 'LEAD GUITARIST', key: 'leadGuitarist', placeholder: 'Assigned guitarist' },
                      { label: 'BASS GUITARIST', key: 'bassGuitarist', placeholder: 'Assigned bassist' },
                    ].map(field => (
                      <View key={field.key} style={inspStyle.formRow}>
                        <Text style={inspStyle.fieldLabel}>{field.label}</Text>
                        {editMode ? (
                          <TextInput
                            style={inspStyle.fieldInput}
                            value={(form as any)[field.key]}
                            onChangeText={val => setForm(prev => ({ ...prev, [field.key]: val }))}
                            placeholder={field.placeholder}
                            placeholderTextColor={Colors.textMuted}
                          />
                        ) : (
                          <Text style={inspStyle.fieldValue}>{(form as any)[field.key] || '—'}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* TAB 2: AUDIO LAB */}
              {activeTab === 'audiolab' && (
                <View style={inspStyle.sectionGap}>
                  <View style={inspStyle.sectionCard}>
                    <Text style={inspStyle.sectionTitle}>Master Audio Track</Text>
                    <Text style={inspStyle.fieldLabel}>FULL MIX / LEAD AUDIO URL</Text>
                    {editMode ? (
                      <TextInput
                        style={inspStyle.fieldInput}
                        value={form.audioFile}
                        onChangeText={val => setForm(prev => ({ ...prev, audioFile: val }))}
                        placeholder="https://... or cloud storage URL"
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="none"
                      />
                    ) : form.audioFile ? (
                      <TouchableOpacity
                        style={inspStyle.audioPlayBar}
                        onPress={() => handleOpenLink(form.audioFile)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play-circle" size={24} color={Colors.accent} />
                        <Text style={inspStyle.audioPlayText} numberOfLines={1}>Stream Master Track</Text>
                        <Ionicons name="open-outline" size={16} color={Colors.accent} />
                      </TouchableOpacity>
                    ) : (
                      <Text style={inspStyle.emptyText}>No master audio file attached.</Text>
                    )}
                  </View>

                  <View style={inspStyle.sectionCard}>
                    <View style={inspStyle.cardHeaderRow}>
                      <Text style={inspStyle.sectionTitle}>Multitrack Stems & Vocal Parts</Text>
                      {editMode && !showAddCustomPart && (
                        <TouchableOpacity
                          style={inspStyle.addPartBtn}
                          onPress={() => setShowAddCustomPart(true)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="add" size={14} color={Colors.accent} />
                          <Text style={inspStyle.addPartBtnText}>Add Stem</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {editMode && showAddCustomPart && (
                      <View style={inspStyle.addPartBox}>
                        <TextInput
                          style={inspStyle.addPartInput}
                          placeholder="Part name (e.g. Bass Vocal, Descant, Flute)"
                          placeholderTextColor={Colors.textMuted}
                          value={newPartName}
                          onChangeText={setNewPartName}
                        />
                        <View style={inspStyle.addPartActions}>
                          <TouchableOpacity style={inspStyle.confirmAddBtn} onPress={handleAddCustomPart}>
                            <Text style={inspStyle.confirmAddText}>Add</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { setShowAddCustomPart(false); setNewPartName(''); }}>
                            <Text style={inspStyle.cancelAddText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {([
                      { id: 'soprano', label: 'Soprano Stem' },
                      { id: 'alto', label: 'Alto Stem' },
                      { id: 'tenor', label: 'Tenor Stem' },
                      { id: 'bass', label: 'Bass Stem' },
                      ...customParts.map(cp => ({ id: cp, label: `${cp} Part` })),
                    ]).map(part => {
                      const url = audioUrls[part.id] || '';
                      return (
                        <View key={part.id} style={inspStyle.stemRow}>
                          <View style={inspStyle.stemLabelRow}>
                            <Text style={inspStyle.stemName}>{part.label}</Text>
                            {editMode && customParts.includes(part.id) && (
                              <TouchableOpacity onPress={() => handleRemoveCustomPart(part.id)}>
                                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>

                          {editMode ? (
                            <TextInput
                              style={inspStyle.stemInput}
                              value={url}
                              onChangeText={val => setAudioUrls(prev => ({ ...prev, [part.id]: val }))}
                              placeholder={`URL for ${part.label}...`}
                              placeholderTextColor={Colors.textMuted}
                              autoCapitalize="none"
                            />
                          ) : url ? (
                            <TouchableOpacity
                              style={inspStyle.stemStreamBtn}
                              onPress={() => handleOpenLink(url)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="volume-medium" size={16} color={Colors.accent} />
                              <Text style={inspStyle.stemStreamText} numberOfLines={1}>{url}</Text>
                              <Ionicons name="open-outline" size={14} color={Colors.accent} />
                            </TouchableOpacity>
                          ) : (
                            <Text style={inspStyle.stemEmptyText}>Not uploaded</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* TAB 3: LYRICS */}
              {activeTab === 'lyrics' && (
                <View style={inspStyle.sectionCard}>
                  <Text style={inspStyle.sectionTitle}>Full Song Lyrics</Text>
                  {editMode ? (
                    <TextInput
                      style={inspStyle.lyricsInput}
                      value={form.lyrics}
                      onChangeText={val => setForm(prev => ({ ...prev, lyrics: val }))}
                      placeholder="Enter song lyrics here..."
                      placeholderTextColor={Colors.textMuted}
                      multiline
                      textAlignVertical="top"
                    />
                  ) : (
                    <Text style={inspStyle.lyricsText}>
                      {form.lyrics
                        ? form.lyrics.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').trim()
                        : 'No lyrics registered for this catalog track.'}
                    </Text>
                  )}
                </View>
              )}

              {/* TAB 4: NOTATION & GUIDE */}
              {activeTab === 'notation' && (
                <View style={inspStyle.sectionGap}>
                  <View style={inspStyle.sectionCard}>
                    <Text style={inspStyle.sectionTitle}>Solfa Notation & Part Guides</Text>
                    {editMode ? (
                      <TextInput
                        style={inspStyle.lyricsInput}
                        value={form.solfas}
                        onChangeText={val => setForm(prev => ({ ...prev, solfas: val }))}
                        placeholder="Enter tonic solfa notation (e.g. d:r:m | f:s:l)..."
                        placeholderTextColor={Colors.textMuted}
                        multiline
                        textAlignVertical="top"
                      />
                    ) : (
                      <Text style={inspStyle.lyricsText}>
                        {form.solfas
                          ? form.solfas.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').trim()
                          : 'No solfa notation entered.'}
                      </Text>
                    )}
                  </View>

                  <View style={inspStyle.sectionCard}>
                    <Text style={inspStyle.sectionTitle}>Conductor Arrangement Guide</Text>
                    {editMode ? (
                      <TextInput
                        style={inspStyle.lyricsInput}
                        value={form.conductorGuide}
                        onChangeText={val => setForm(prev => ({ ...prev, conductorGuide: val }))}
                        placeholder="Enter modulation cues, choir entries, coda, and section directions..."
                        placeholderTextColor={Colors.textMuted}
                        multiline
                        textAlignVertical="top"
                      />
                    ) : (
                      <Text style={inspStyle.lyricsText}>
                        {form.conductorGuide
                          ? form.conductorGuide.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').trim()
                          : 'No conductor arrangement cues documented.'}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* TAB 5: COORDINATOR NOTES */}
              {activeTab === 'notes' && (
                <View style={inspStyle.sectionCard}>
                  <Text style={inspStyle.sectionTitle}>Coordinator Rehearsal Notes</Text>
                  {editMode ? (
                    <TextInput
                      style={inspStyle.lyricsInput}
                      value={form.coordinatorNotes}
                      onChangeText={val => setForm(prev => ({ ...prev, coordinatorNotes: val }))}
                      placeholder="Notes for rehearsal directors, stage positioning, mic assignments..."
                      placeholderTextColor={Colors.textMuted}
                      multiline
                      textAlignVertical="top"
                    />
                  ) : (
                    <Text style={inspStyle.lyricsText}>
                      {form.coordinatorNotes
                        ? form.coordinatorNotes.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').trim()
                        : 'No coordinator notes recorded for this song.'}
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const inspStyle = StyleSheet.create({
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: { padding: 6, borderRadius: 10, backgroundColor: '#f1f5f9' },
  headerCenterCol: { flex: 1, marginHorizontal: 12 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  headerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
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
  editBtnText: { fontSize: 13, fontWeight: '700', color: Colors.accent, marginLeft: 4 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.accent },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabBtnActive: { backgroundColor: '#f5f3ff', borderColor: '#e9d5ff' },
  tabBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  tabBtnTextActive: { color: Colors.accent, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 44 },
  sectionGap: { gap: 14 },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  formRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fieldInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 40,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  audioPlayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    gap: 8,
  },
  audioPlayText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.accent,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  addPartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
  },
  addPartBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
    marginLeft: 3,
  },
  addPartBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addPartInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    height: 36,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  addPartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmAddBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  confirmAddText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  cancelAddText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  stemRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stemName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  stemInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    height: 36,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  stemStreamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  stemStreamText: {
    flex: 1,
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
  stemEmptyText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  lyricsText: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textPrimary,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    minHeight: 120,
  },
  lyricsInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 180,
    lineHeight: 22,
  },
});

interface MasterSong {
  id: string;
  title: string;
  writer: string;
  category: string;
  key: string;
  tempo: string;
  audioFile?: string;
  audioUrl?: string;
  publishedByName?: string;
  leadSinger?: string;
  conductor?: string;
  conductorGuide?: string;
  drummer?: string;
  leadKeyboardist?: string;
  leadGuitarist?: string;
  bassGuitarist?: string;
  solfas?: string;
  solfa?: string;
  lyrics?: string;
  audioUrls?: Record<string, string>;
  customParts?: Record<string, string> | string[];
  coordinatorComment?: string;
  coordinatorNotes?: string;
  rehearsalNotes?: string;
  comments?: any[];
  rehearsalCount?: number;
  imageUrl?: string;
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

  // Inspector
  const [inspectorSong, setInspectorSong] = useState<MasterSong | null>(null);
  const [inspectorVisible, setInspectorVisible] = useState(false);

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
      const result = await api.songs.getZoneSongs(activeZone?.id || 'zone-001');
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
      <ZoneHeader
        title="All Ministered Repertoire"
        rightElement={
          activeTab === 'zone' ? (
            <TouchableOpacity
              style={styles.addZoneBtn}
              onPress={() => {
                setEditingZoneSong(null);
                setShowZoneForm(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 3 }} />
              <Text style={styles.addZoneText}>Add Song</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Top Search & Filter Bar */}
      <View style={styles.topSection}>

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
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => { setInspectorSong(item); setInspectorVisible(true); }}
            >
              <GradientCard variant="surface" style={styles.songCard}>
                <View style={styles.songRow}>
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle} numberOfLines={1}>
                      {item.title || 'Untitled Song'}
                    </Text>
                    <Text style={styles.songWriter} numberOfLines={1}>
                      {item.publishedByName ? `✍️ ${item.publishedByName}` : 'Loveworld Singers Repertoire'}
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

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {item.audioFile ? (
                      <View style={styles.audioBadge}>
                        <Ionicons name="musical-notes" size={16} color={Colors.accentBright} />
                      </View>
                    ) : null}
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </View>
                </View>
              </GradientCard>
            </TouchableOpacity>
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

      {/* Master Song Inspector */}
      <MasterSongInspector
        visible={inspectorVisible}
        song={inspectorSong}
        onClose={() => setInspectorVisible(false)}
        onUpdated={updated => {
          setSongs(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
          setInspectorSong(null);
          setInspectorVisible(false);
        }}
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
