import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';

const TABS = ['lyrics', 'solfas', 'audio', 'personnel', 'comments'] as const;

export default function SongDetailScreen({ route, navigation }: any) {
  const { song: initialSong, songId } = route.params || {};
  const { adminUser } = useAuth();
  const { activeZone } = useZoneContext();

  const [song, setSong] = useState<any>(initialSong || null);
  const [loading, setLoading] = useState(!initialSong && Boolean(songId));
  const isZoneSong = Boolean(song?.subGroupId || (song as any)?.sub_group_id);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('lyrics');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    writer: '',
    leadSinger: '',
    conductor: '',
    key: '',
    tempo: '',
    lyrics: '',
    solfas: '',
    notation: '',
    comments: '',
  });

  useEffect(() => {
    if (initialSong) {
      setSong(initialSong);
      setEditForm({
        title: initialSong.title || '',
        writer: initialSong.writer || '',
        leadSinger: initialSong.leadSinger || '',
        conductor: initialSong.conductor || '',
        key: initialSong.key || '',
        tempo: initialSong.tempo || '',
        lyrics: initialSong.lyrics || '',
        solfas: initialSong.solfas || '',
        notation: initialSong.notation || '',
        comments: initialSong.notes || initialSong.comments || '',
      });
    } else if (songId) {
      loadSongDetails();
    }
  }, [songId, initialSong]);

  async function loadSongDetails() {
    setLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>(`/songs/${songId}`);
      if (res.data) {
        setSong(res.data);
        setEditForm({
          title: res.data.title || '',
          writer: res.data.writer || '',
          leadSinger: res.data.leadSinger || '',
          conductor: res.data.conductor || '',
          key: res.data.key || '',
          tempo: res.data.tempo || '',
          lyrics: res.data.lyrics || '',
          solfas: res.data.solfas || '',
          notation: res.data.notation || '',
          comments: res.data.notes || res.data.comments || '',
        });
      }
    } catch (e) {
      console.error('[SongDetail] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!song?.id) return;
    setSaving(true);
    try {
      if (!isZoneSong) return; // master songs are read-only
      await apiClient.patch(`/subgroups/songs/${song.id}`, editForm);
      setSong((prev: any) => ({ ...prev, ...editForm }));
      setIsEditing(false);
      Alert.alert('Saved', 'Song details updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update song');
    } finally {
      setSaving(false);
    }
  }

  const commentTitle = adminUser?.isHQAdmin
    ? "Pastor's Comments"
    : (adminUser?.role || '').toLowerCase().includes('church') || (adminUser?.role || '').toLowerCase().includes('subgroup')
    ? "Church Coordinator's Comments"
    : "Coordinator's Comments";

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{song?.title || 'Song Details'}</Text>
          <Text style={styles.headerMeta} numberOfLines={1}>
            {song?.writer || 'Unknown Writer'} {song?.key ? `· Key: ${song.key}` : ''}
          </Text>
        </View>

        {isZoneSong ? (
          <TouchableOpacity
            style={[styles.editToggleBtn, isEditing && styles.editToggleBtnActive]}
            onPress={() => { if (isEditing) { handleSave(); } else { setIsEditing(true); } }}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.editToggleText}>{isEditing ? 'Save' : 'Edit'}</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.editToggleBtn, { backgroundColor: Colors.textMuted }]}>
            <Text style={styles.editToggleText}>Master — Read Only</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {TABS.map(tab => {
            const label = tab === 'solfas' ? 'Solfa Notes' : tab === 'comments' ? commentTitle : tab.charAt(0).toUpperCase() + tab.slice(1);
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {activeTab === 'lyrics' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="document-text-outline" size={18} color={Colors.accentBright} />
              <Text style={styles.cardTitle}>Lyrics Sheet</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textarea]}
                value={editForm.lyrics}
                onChangeText={t => setEditForm(p => ({ ...p, lyrics: t }))}
                placeholder="Enter song lyrics..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            ) : (
              <Text style={styles.bodyText}>{song?.lyrics || 'No lyrics available for this song.'}</Text>
            )}
          </View>
        )}

        {activeTab === 'solfas' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="musical-notes-outline" size={18} color={Colors.accentBright} />
              <Text style={styles.cardTitle}>Conductor's Solfa Guide</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textarea]}
                value={editForm.solfas}
                onChangeText={t => setEditForm(p => ({ ...p, solfas: t }))}
                placeholder="Enter tonic solfa notes (e.g. d:r:m:f:s)..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            ) : (
              <Text style={[styles.bodyText, { fontFamily: 'monospace' }]}>
                {song?.solfas || song?.notation || 'No solfa guide uploaded.'}
              </Text>
            )}
          </View>
        )}

        {activeTab === 'audio' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="headset-outline" size={18} color={Colors.accentBright} />
              <Text style={styles.cardTitle}>Audio Lab & Rehearsal Stems</Text>
            </View>

            {/* Master Guide Track */}
            <View style={styles.audioTrackRow}>
              <View style={styles.trackIcon}>
                <Ionicons name="play" size={16} color={Colors.accentBright} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.trackName}>Master Rehearsal Track</Text>
                <Text style={styles.trackMeta}>Full Vocal Guide</Text>
              </View>
              <View style={styles.activeTag}>
                <Text style={styles.activeTagText}>READY</Text>
              </View>
            </View>

            {/* Stems list */}
            {['Soprano Stem', 'Alto Stem', 'Tenor Stem', 'Bass Stem', 'Instrumental Backing'].map(stem => (
              <View key={stem} style={styles.stemTrackRow}>
                <Ionicons name="musical-note" size={14} color={Colors.textMuted} style={{ marginRight: 8 }} />
                <Text style={styles.stemName}>{stem}</Text>
                <TouchableOpacity style={styles.stemBtn}>
                  <Text style={styles.stemBtnText}>SOLO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.stemBtn}>
                  <Text style={styles.stemBtnText}>MUTE</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'personnel' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.accentBright} />
              <Text style={styles.cardTitle}>Music Personnel & Metadata</Text>
            </View>

            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Song Title</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editForm.title}
                  onChangeText={t => setEditForm(p => ({ ...p, title: t }))}
                />
              ) : (
                <Text style={styles.metaValue}>{song?.title || '—'}</Text>
              )}
            </View>

            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Songwriter</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editForm.writer}
                  onChangeText={t => setEditForm(p => ({ ...p, writer: t }))}
                />
              ) : (
                <Text style={styles.metaValue}>{song?.writer || '—'}</Text>
              )}
            </View>

            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Lead Singer</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editForm.leadSinger}
                  onChangeText={t => setEditForm(p => ({ ...p, leadSinger: t }))}
                />
              ) : (
                <Text style={styles.metaValue}>{song?.leadSinger || '—'}</Text>
              )}
            </View>

            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Musical Key</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editForm.key}
                  onChangeText={t => setEditForm(p => ({ ...p, key: t }))}
                />
              ) : (
                <Text style={styles.metaValue}>{song?.key || '—'}</Text>
              )}
            </View>

            <View style={styles.metaField}>
              <Text style={styles.metaLabel}>Tempo (BPM)</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editForm.tempo}
                  onChangeText={t => setEditForm(p => ({ ...p, tempo: t }))}
                />
              ) : (
                <Text style={styles.metaValue}>{song?.tempo || '—'}</Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'comments' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.accentBright} />
              <Text style={styles.cardTitle}>{commentTitle}</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.textarea]}
                value={editForm.comments}
                onChangeText={t => setEditForm(p => ({ ...p, comments: t }))}
                placeholder="Enter commentary and vocal directives..."
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            ) : (
              <Text style={styles.bodyText}>{song?.notes || song?.comments || 'No commentary recorded for this song.'}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBackBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  headerMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  editToggleBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  editToggleBtnActive: {
    backgroundColor: Colors.success,
  },
  editToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  tabRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  tabBtnActive: {
    backgroundColor: Colors.accent,
  },
  tabBtnText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  bodyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 22,
  },

  audioTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  trackIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  trackMeta: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  activeTag: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeTagText: {
    color: Colors.success,
    fontSize: 9,
    fontWeight: '800',
  },

  stemTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  stemName: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  stemBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: 6,
  },
  stemBtnText: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },

  metaField: {
    gap: 4,
  },
  metaLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  textarea: {
    height: 140,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
});
