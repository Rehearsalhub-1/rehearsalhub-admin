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
  return (
    <View style={styles.tabSection}>
      {/* Master Audio Track */}
      <View style={styles.card}>
        <View style={styles.labelWithAction}>
          <Text style={styles.cardSectionTitle}>Full Mix (Master Track)</Text>
          <TouchableOpacity
            style={styles.pickMediaPill}
            onPress={() => onPickMedia('full')}
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
              onPress={() => onToggleStemAudio('full', audioUrls.full)}
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
                    <Text style={styles.smallPickBtnText}>Pick</Text>
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
                    onPress={() => onToggleStemAudio(part.key, url)}
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
  );
}
