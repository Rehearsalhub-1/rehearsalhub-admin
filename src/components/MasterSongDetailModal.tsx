import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Colors } from '../constants/Colors';

export interface MasterSong {
  id: string;
  title: string;
  writer?: string;
  publishedByName?: string;
  leadSinger?: string;
  category?: string;
  key?: string;
  tempo?: string;
  conductor?: string;
  conductorGuide?: string;
  leadKeyboardist?: string;
  leadGuitarist?: string;
  bassGuitarist?: string;
  drummer?: string;
  audioFile?: string;
  audioUrl?: string;
  audioUrls?: Record<string, string>;
  customParts?: Record<string, string> | string[];
  lyrics?: string;
  solfas?: string;
  solfa?: string;
  history?: string;
  coordinatorComment?: string;
  coordinatorNotes?: string;
  rehearsalNotes?: string;
  comments?: any[];
  rehearsalCount?: number;
  imageUrl?: string;
  isHQOnly?: boolean;
  isHqOnly?: boolean;
  isHidden?: boolean;
  isHistory?: boolean;
}

interface MasterSongDetailModalProps {
  visible: boolean;
  song: MasterSong | null;
  onClose: () => void;
  onEdit: (song: MasterSong) => void;
  canEdit?: boolean;
}

export default function MasterSongDetailModal({
  visible,
  song,
  onClose,
  onEdit,
  canEdit = true,
}: MasterSongDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'lyrics' | 'conductor' | 'history'>('lyrics');

  // Audio Playback
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePart, setActivePart] = useState<string>('full');
  const [audioLoading, setAudioLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  useEffect(() => {
    if (!visible) {
      if (sound) {
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
        setSound(null);
      }
      setIsPlaying(false);
      setActivePart('full');
      setActiveTab('lyrics');
    }
  }, [visible]);

  if (!song) return null;

  const isHq = Boolean(song.isHQOnly || song.isHqOnly);

  // Collect available audio parts
  const audioPartsMap: Record<string, string> = {
    full: song.audioUrls?.full || song.audioFile || song.audioUrl || '',
    soprano: song.audioUrls?.soprano || '',
    alto: song.audioUrls?.alto || '',
    tenor: song.audioUrls?.tenor || '',
    bass: song.audioUrls?.bass || '',
  };

  if (song.customParts) {
    if (Array.isArray(song.customParts)) {
      song.customParts.forEach(cp => {
        if (song.audioUrls?.[cp]) audioPartsMap[cp] = song.audioUrls[cp];
      });
    } else if (typeof song.customParts === 'object') {
      Object.entries(song.customParts).forEach(([k, v]) => {
        if (typeof v === 'string') audioPartsMap[k] = v;
      });
    }
  }

  const availableParts = Object.entries(audioPartsMap).filter(([_, url]) => Boolean(url));
  const currentAudioUrl = audioPartsMap[activePart] || audioPartsMap.full || '';

  async function handleTogglePlay(partKey?: string) {
    const targetKey = partKey || activePart;
    const targetUrl = audioPartsMap[targetKey] || audioPartsMap.full;

    if (!targetUrl) {
      Alert.alert('No Audio', 'No audio track uploaded for this stem.');
      return;
    }

    try {
      if (sound && targetKey === activePart) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
            return;
          } else {
            await sound.playAsync();
            setIsPlaying(true);
            return;
          }
        }
      }

      // If switching part or new audio
      setAudioLoading(true);
      if (sound) {
        await sound.stopAsync().catch(() => {});
        await sound.unloadAsync().catch(() => {});
        setSound(null);
      }

      setActivePart(targetKey);
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: targetUrl },
        { shouldPlay: true },
        playbackStatus => {
          if (playbackStatus.isLoaded) {
            setIsPlaying(playbackStatus.isPlaying);
            if (playbackStatus.didJustFinish) {
              setIsPlaying(false);
            }
          }
        }
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (e: any) {
      console.log('Audio playback error:', e);
      Alert.alert('Playback Failed', 'Unable to stream audio track: ' + (e.message || 'Network error'));
      setIsPlaying(false);
    } finally {
      setAudioLoading(false);
    }
  }

  function handleOpenExternalLink(url?: string) {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Link Error', 'Unable to open audio URL in browser.');
    });
  }

  // Clean formatting for text
  const cleanLyrics = (song.lyrics || '')
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

  const cleanConductorGuide = (song.conductorGuide || song.solfas || song.solfa || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

  const cleanHistory = (song.history || song.coordinatorComment || song.coordinatorNotes || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Top Slim Drag / Action Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <Text style={styles.topCenterTitle} numberOfLines={1}>
              Song Details
            </Text>
            {isHq && (
              <View style={styles.topHqBadge}>
                <Text style={styles.topHqBadgeText}>HQ ONLY</Text>
              </View>
            )}
          </View>

          {canEdit ? (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onEdit(song);
              }}
              style={styles.editBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={14} color="#7c3aed" style={{ marginRight: 4 }} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 30 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.musicIconBox}>
                <Ionicons name="musical-notes" size={24} color="#ffffff" />
              </View>
              <View style={styles.heroTitleCol}>
                <Text style={styles.songTitle} numberOfLines={2}>
                  {song.title}
                </Text>
                <Text style={styles.songWriter} numberOfLines={1}>
                  {song.writer || song.publishedByName || 'Loveworld Singers Repertoire'}
                </Text>
              </View>
            </View>

            {/* Quick Metadata Badges */}
            <View style={styles.heroChipsRow}>
              {song.key ? (
                <View style={styles.heroChip}>
                  <Ionicons name="key-outline" size={11} color="#4f46e5" style={{ marginRight: 3 }} />
                  <Text style={styles.heroChipText}>Key {song.key}</Text>
                </View>
              ) : null}

              {song.tempo ? (
                <View style={styles.heroChip}>
                  <Ionicons name="speedometer-outline" size={11} color="#4f46e5" style={{ marginRight: 3 }} />
                  <Text style={styles.heroChipText}>{song.tempo} BPM</Text>
                </View>
              ) : null}

              {song.category ? (
                <View style={[styles.heroChip, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.heroChipText, { color: '#475569' }]}>{song.category}</Text>
                </View>
              ) : null}

              {isHq && (
                <View style={[styles.heroChip, { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe', borderWidth: 1 }]}>
                  <Ionicons name="lock-closed" size={10} color="#7c3aed" style={{ marginRight: 2 }} />
                  <Text style={[styles.heroChipText, { color: '#7c3aed', fontWeight: '800' }]}>HQ ONLY</Text>
                </View>
              )}
            </View>

            {/* Personnel Breakdown List */}
            <View style={styles.personnelList}>
              {song.leadSinger ? (
                <View style={styles.personnelRow}>
                  <Text style={styles.personnelLabel}>LEAD SINGER</Text>
                  <Text style={styles.personnelValue}>{song.leadSinger}</Text>
                </View>
              ) : null}

              {song.conductor ? (
                <View style={styles.personnelRow}>
                  <Text style={styles.personnelLabel}>CONDUCTOR</Text>
                  <Text style={styles.personnelValue}>{song.conductor}</Text>
                </View>
              ) : null}

              {song.leadKeyboardist ? (
                <View style={styles.personnelRow}>
                  <Text style={styles.personnelLabel}>LEAD KEYBOARD</Text>
                  <Text style={styles.personnelValue}>{song.leadKeyboardist}</Text>
                </View>
              ) : null}

              {song.leadGuitarist ? (
                <View style={styles.personnelRow}>
                  <Text style={styles.personnelLabel}>LEAD GUITAR</Text>
                  <Text style={styles.personnelValue}>{song.leadGuitarist}</Text>
                </View>
              ) : null}

              {song.bassGuitarist ? (
                <View style={styles.personnelRow}>
                  <Text style={styles.personnelLabel}>BASS GUITAR</Text>
                  <Text style={styles.personnelValue}>{song.bassGuitarist}</Text>
                </View>
              ) : null}

              {song.drummer ? (
                <View style={[styles.personnelRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.personnelLabel}>DRUMMER</Text>
                  <Text style={styles.personnelValue}>{song.drummer}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Audio Player Bar & Stem Switcher */}
          {availableParts.length > 0 && (
            <View style={styles.audioLabCard}>
              <View style={styles.audioLabHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="headset-outline" size={16} color="#7c3aed" />
                  <Text style={styles.audioLabTitle}>Audio Lab & Stems</Text>
                </View>
                {currentAudioUrl ? (
                  <TouchableOpacity onPress={() => handleOpenExternalLink(currentAudioUrl)}>
                    <Ionicons name="open-outline" size={15} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Stems horizontal selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stemPillsScroll}>
                {availableParts.map(([key, url]) => {
                  const isPartActive = activePart === key;
                  const label =
                    key === 'full'
                      ? 'Full Mix'
                      : key === 'soprano'
                      ? 'Soprano'
                      : key === 'alto'
                      ? 'Alto'
                      : key === 'tenor'
                      ? 'Tenor'
                      : key === 'bass'
                      ? 'Bass'
                      : key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.stemPill, isPartActive && styles.stemPillActive]}
                      onPress={() => handleTogglePlay(key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={isPartActive && isPlaying ? 'volume-high' : 'musical-note'}
                        size={12}
                        color={isPartActive ? '#ffffff' : '#64748b'}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.stemPillText, isPartActive && styles.stemPillTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Player Row */}
              <View style={styles.playerBarRow}>
                <TouchableOpacity
                  style={styles.playPauseBtn}
                  onPress={() => handleTogglePlay()}
                  activeOpacity={0.8}
                  disabled={audioLoading}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={20}
                    color="#ffffff"
                    style={!isPlaying ? { marginLeft: 2 } : undefined}
                  />
                </TouchableOpacity>

                <View style={styles.playerInfoCol}>
                  <Text style={styles.playingPartTitle} numberOfLines={1}>
                    {activePart.toUpperCase()} STEM
                  </Text>
                  <Text style={styles.playingStatusSub} numberOfLines={1}>
                    {audioLoading ? 'Buffering track...' : isPlaying ? 'Playing audio preview' : 'Tap play to listen'}
                  </Text>
                </View>

                {currentAudioUrl ? (
                  <View style={styles.audioAvailableBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#10b981" style={{ marginRight: 2 }} />
                    <Text style={styles.audioAvailableText}>Ready</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* Segmented Tab Navigation: Lyrics vs Conductor Guide vs History */}
          <View style={styles.segmentedTabContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'lyrics' && styles.segmentBtnActive]}
              onPress={() => setActiveTab('lyrics')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="document-text-outline"
                size={13}
                color={activeTab === 'lyrics' ? '#ffffff' : '#64748b'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.segmentBtnText, activeTab === 'lyrics' && styles.segmentBtnTextActive]}>
                Lyrics
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'conductor' && styles.segmentBtnActive]}
              onPress={() => setActiveTab('conductor')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="musical-notes-outline"
                size={13}
                color={activeTab === 'conductor' ? '#ffffff' : '#64748b'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.segmentBtnText, activeTab === 'conductor' && styles.segmentBtnTextActive]}>
                Conductor Guide
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, activeTab === 'history' && styles.segmentBtnActive]}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="time-outline"
                size={13}
                color={activeTab === 'history' ? '#ffffff' : '#64748b'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.segmentBtnText, activeTab === 'history' && styles.segmentBtnTextActive]}>
                History
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content Cards */}
          {activeTab === 'lyrics' && (
            <View style={styles.contentCard}>
              <View style={styles.contentCardHeader}>
                <Text style={styles.contentCardTitle}>Full Lyrics</Text>
                <Text style={styles.contentCardMeta}>Loveworld Official Catalog</Text>
              </View>
              {cleanLyrics ? (
                <Text style={styles.lyricsBodyText}>{cleanLyrics}</Text>
              ) : (
                <Text style={styles.emptyContentText}>No lyrics recorded for this song.</Text>
              )}
            </View>
          )}

          {activeTab === 'conductor' && (
            <View style={styles.contentCard}>
              <View style={styles.contentCardHeader}>
                <Text style={styles.contentCardTitle}>Conductor Arrangement & Solfa</Text>
                <Text style={styles.contentCardMeta}>Rehearsal Guidelines</Text>
              </View>
              {cleanConductorGuide ? (
                <Text style={styles.solfaBodyText}>{cleanConductorGuide}</Text>
              ) : (
                <Text style={styles.emptyContentText}>No conductor notes or tonic solfa provided.</Text>
              )}
            </View>
          )}

          {activeTab === 'history' && (
            <View style={styles.contentCard}>
              <View style={styles.contentCardHeader}>
                <Text style={styles.contentCardTitle}>Song Background & History</Text>
                <Text style={styles.contentCardMeta}>Ministered Context</Text>
              </View>
              {cleanHistory ? (
                <Text style={styles.historyBodyText}>{cleanHistory}</Text>
              ) : (
                <Text style={styles.emptyContentText}>No historical background documented yet.</Text>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topCenterTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  topHqBadge: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  topHqBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#7c3aed',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  musicIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  heroTitleCol: {
    flex: 1,
  },
  songTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  songWriter: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  heroChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  heroChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },
  personnelList: {
    marginTop: 6,
  },
  personnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  personnelLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.4,
  },
  personnelValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
  },
  audioLabCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  audioLabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  audioLabTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  stemPillsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 10,
  },
  stemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stemPillActive: {
    backgroundColor: '#7c3aed',
  },
  stemPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  stemPillTextActive: {
    color: '#ffffff',
  },
  playerBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  playPauseBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  playerInfoCol: {
    flex: 1,
  },
  playingPartTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  playingStatusSub: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  audioAvailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  audioAvailableText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  segmentedTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 3,
    borderRadius: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#0f172a',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentBtnTextActive: {
    color: '#ffffff',
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 180,
  },
  contentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contentCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  contentCardMeta: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontWeight: '500',
  },
  lyricsBodyText: {
    fontSize: 14,
    lineHeight: 24,
    color: '#1e293b',
    fontWeight: '500',
  },
  solfaBodyText: {
    fontSize: 13,
    lineHeight: 22,
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  historyBodyText: {
    fontSize: 13.5,
    lineHeight: 22,
    color: '#334155',
  },
  emptyContentText: {
    fontSize: 12.5,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 20,
    textAlign: 'center',
  },
});
