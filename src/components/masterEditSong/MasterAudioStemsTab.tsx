import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './masterEditSongStyles';

interface MasterAudioStemsTabProps {
  audioUrls: Record<string, string>;
  setAudioUrls: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  customParts: string[];
  showAddPart: boolean;
  setShowAddPart: (val: boolean) => void;
  newPartName: string;
  setNewPartName: (val: string) => void;
  onAddStem: () => void;
  onRemoveCustomStem: (part: string) => void;
  playingKey: string | null;
  onToggleStemAudio: (stemKey: string, url: string) => void;
  onPickMedia: (target: string) => void;
}

export default function MasterAudioStemsTab({
  audioUrls,
  setAudioUrls,
  customParts,
  showAddPart,
  setShowAddPart,
  newPartName,
  setNewPartName,
  onAddStem,
  onRemoveCustomStem,
  playingKey,
  onToggleStemAudio,
  onPickMedia,
}: MasterAudioStemsTabProps) {
  const fullMixUrl = audioUrls.full || '';
  const fullMixName = fullMixUrl ? fullMixUrl.split('/').pop()?.split('?')[0] || 'Master Audio Track' : '';

  return (
    <View style={styles.tabSection}>
      {/* ── CARD 1: FULL MIX (MASTER TRACK) ─────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.labelWithAction}>
          <Text style={styles.cardSectionTitle}>Full Mix (Master Track)</Text>
          <TouchableOpacity
            style={styles.pickMediaPill}
            onPress={() => onPickMedia('full')}
            activeOpacity={0.8}
          >
            <Ionicons name="folder-open-outline" size={12} color="#7c3aed" style={{ marginRight: 3 }} />
            <Text style={styles.pickMediaPillText}>Browse Media Library</Text>
          </TouchableOpacity>
        </View>

        {fullMixUrl ? (
          <View style={styles.audioTrackBox}>
            <View style={styles.audioTrackMetaRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Ionicons name="musical-notes" size={15} color="#7c3aed" />
                <Text style={styles.audioTrackFileName} numberOfLines={1}>
                  {fullMixName}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.miniPlayBtn, playingKey === 'full' && styles.miniPlayBtnActive]}
                  onPress={() => onToggleStemAudio('full', fullMixUrl)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={playingKey === 'full' ? 'pause' : 'play'}
                    size={13}
                    color={playingKey === 'full' ? '#ffffff' : '#7c3aed'}
                  />
                  <Text style={[styles.miniPlayBtnText, playingKey === 'full' && styles.miniPlayBtnTextActive]}>
                    {playingKey === 'full' ? 'Playing' : 'Play'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changeAudioBtn}
                  onPress={() => onPickMedia('full')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeAudioBtnText}>Change</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAudioUrls(prev => ({ ...prev, full: '' }))}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.browseAudioBtn}
            onPress={() => onPickMedia('full')}
            activeOpacity={0.85}
          >
            <Ionicons name="musical-notes-outline" size={16} color="#ffffff" />
            <Text style={styles.browseAudioBtnText}>Select Master Audio Track</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── CARD 2: VOCAL STEMS (S, A, T, B) ─────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.labelWithAction}>
          <Text style={styles.cardSectionTitle}>Vocal Stems & Parts</Text>
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

        {showAddPart && (
          <View style={styles.inlineNewCatRow}>
            <TextInput
              style={styles.inlineNewCatInput}
              placeholder="Stem name (e.g. Lead, Synth)..."
              placeholderTextColor="#94a3b8"
              value={newPartName}
              onChangeText={setNewPartName}
              autoFocus
            />
            <TouchableOpacity
              style={styles.inlineAddCatBtn}
              onPress={onAddStem}
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

        {[
          { key: 'soprano', label: 'Soprano Stem', color: '#ec4899' },
          { key: 'alto', label: 'Alto Stem', color: '#f43f5e' },
          { key: 'tenor', label: 'Tenor Stem', color: '#3b82f6' },
          { key: 'bass', label: 'Bass Stem', color: '#6366f1' },
          ...customParts.map(cp => ({ key: cp, label: `${cp} Stem`, color: '#8b5cf6', isCustom: true })),
        ].map(part => {
          const url = audioUrls[part.key] || '';
          const stemFileName = url ? url.split('/').pop()?.split('?')[0] || `${part.label} Audio` : '';

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
                    onPress={() => onPickMedia(part.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="folder-open-outline" size={11} color="#7c3aed" style={{ marginRight: 2 }} />
                    <Text style={styles.smallPickBtnText}>Pick File</Text>
                  </TouchableOpacity>

                  {(part as any).isCustom && (
                    <TouchableOpacity
                      onPress={() => onRemoveCustomStem(part.key)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {url ? (
                <View style={[styles.audioTrackBox, { marginTop: 4, paddingVertical: 6 }]}>
                  <View style={styles.audioTrackMetaRow}>
                    <Text style={[styles.audioTrackFileName, { fontSize: 11.5 }]} numberOfLines={1}>
                      {stemFileName}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.miniPlayBtn, playingKey === part.key && styles.miniPlayBtnActive, { paddingVertical: 3, paddingHorizontal: 7 }]}
                        onPress={() => onToggleStemAudio(part.key, url)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={playingKey === part.key ? 'pause' : 'play'}
                          size={11}
                          color={playingKey === part.key ? '#ffffff' : '#7c3aed'}
                        />
                        <Text style={[styles.miniPlayBtnText, playingKey === part.key && styles.miniPlayBtnTextActive, { fontSize: 10.5 }]}>
                          {playingKey === part.key ? 'Playing' : 'Play'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setAudioUrls(prev => ({ ...prev, [part.key]: '' }))}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="close-circle" size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
