import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './editSongStyles';

export interface SongAudioStemsCardProps {
  isSmallPhone: boolean;
  isTablet: boolean;
  showAddPart: boolean;
  setShowAddPart: (val: boolean) => void;
  newPartName: string;
  setNewPartName: (val: string) => void;
  handleAddCustomPart: () => void;
  handleRemoveCustomPart: (partName: string) => void;
  handleRemoveAudioPart: (partKey: string) => void;
  audioUrls: Record<string, string>;
  customParts: string[];
  playingAudioUrl: string | null;
  handleTogglePlay: (url: string) => void;
  handleOpenMediaSelector: (target: string, type: 'audio' | 'image') => void;
}

export default function SongAudioStemsCard({
  isSmallPhone,
  isTablet,
  showAddPart,
  setShowAddPart,
  newPartName,
  setNewPartName,
  handleAddCustomPart,
  handleRemoveCustomPart,
  handleRemoveAudioPart,
  audioUrls,
  customParts,
  playingAudioUrl,
  handleTogglePlay,
  handleOpenMediaSelector,
}: SongAudioStemsCardProps) {
  return (
    <View style={styles.cardSlate}>
      <View style={[styles.cardHeaderRow, isSmallPhone && { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
        <View>
          <Text style={styles.cardHeaderTitle}>Audio Parts (for AudioLab)</Text>
          <Text style={styles.cardHeaderSub}>Upload separate tracks for each vocal part</Text>
        </View>
        <TouchableOpacity
          style={styles.addCustomPartPill}
          onPress={() => setShowAddPart(true)}
        >
          <Ionicons name="add" size={14} color="#7c3aed" style={{ marginRight: 4 }} />
          <Text style={styles.addCustomPartPillText}>Add Custom Part</Text>
        </TouchableOpacity>
      </View>

      {/* Add Custom Part Input Bar */}
      {showAddPart && (
        <View style={styles.addCustomPartInputBar}>
          <TextInput
            style={styles.addCustomPartInput}
            placeholder="Part name (e.g., Harmony, Lead 2)"
            placeholderTextColor="#94a3b8"
            value={newPartName}
            onChangeText={setNewPartName}
          />
          <TouchableOpacity style={styles.addPartBtn} onPress={handleAddCustomPart}>
            <Text style={styles.addPartBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelPartBtn}
            onPress={() => { setShowAddPart(false); setNewPartName(''); }}
          >
            <Ionicons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* Responsive Stems Grid: 2-col on wide screens, 1-col on mobile */}
      <View style={[styles.stemsContainer, isTablet && { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {[
          { key: 'soprano', label: 'Soprano' },
          { key: 'alto', label: 'Alto' },
          { key: 'tenor', label: 'Tenor' },
          { key: 'bass', label: 'Bass' },
        ].map(({ key, label }) => {
          const hasStem = Boolean(audioUrls[key]);
          return (
            <View
              key={key}
              style={[
                styles.stemCard,
                hasStem ? styles.stemCardUploaded : styles.stemCardEmpty,
                isTablet && { width: '48.5%' },
              ]}
            >
              <View style={styles.stemCardTop}>
                <Text style={[styles.stemCardLabel, hasStem && styles.stemCardLabelUploaded]}>
                  {label}
                </Text>
                {hasStem && (
                  <Ionicons name="checkmark" size={18} color="#16a34a" />
                )}
              </View>

              {hasStem ? (
                <View style={styles.stemAudioActions}>
                  <TouchableOpacity
                    style={[styles.stemPlayTouch, playingAudioUrl === audioUrls[key] && styles.stemPlayTouchActive]}
                    onPress={() => handleTogglePlay(audioUrls[key])}
                  >
                    <Ionicons
                      name={playingAudioUrl === audioUrls[key] ? 'pause' : 'play'}
                      size={12}
                      color={playingAudioUrl === audioUrls[key] ? '#ffffff' : '#16a34a'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.stemPlayTouchText, playingAudioUrl === audioUrls[key] && styles.stemPlayTouchTextActive]}>
                      {playingAudioUrl === audioUrls[key] ? 'Playing' : 'Listen'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.stemTrashBtn}
                    onPress={() => handleRemoveAudioPart(key)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selectFromMediaBtn}
                  onPress={() => handleOpenMediaSelector(key, 'audio')}
                >
                  <Ionicons name="folder-open-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.selectFromMediaBtnText}>Select from Media</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Custom Parts Cards */}
        {customParts.map(partName => {
          const hasStem = Boolean(audioUrls[partName]);
          return (
            <View
              key={partName}
              style={[
                styles.stemCard,
                hasStem ? styles.stemCardUploaded : styles.stemCardCustomEmpty,
                isTablet && { width: '48.5%' },
              ]}
            >
              <View style={styles.stemCardTop}>
                <Text style={[styles.stemCardLabel, hasStem && styles.stemCardLabelUploaded]} numberOfLines={1}>
                  {partName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {hasStem && <Ionicons name="checkmark" size={18} color="#16a34a" />}
                  <TouchableOpacity
                    onPress={() => handleRemoveCustomPart(partName)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              {hasStem ? (
                <View style={styles.stemAudioActions}>
                  <TouchableOpacity
                    style={[styles.stemPlayTouch, playingAudioUrl === audioUrls[partName] && styles.stemPlayTouchActive]}
                    onPress={() => handleTogglePlay(audioUrls[partName])}
                  >
                    <Ionicons
                      name={playingAudioUrl === audioUrls[partName] ? 'pause' : 'play'}
                      size={12}
                      color={playingAudioUrl === audioUrls[partName] ? '#ffffff' : '#16a34a'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.stemPlayTouchText, playingAudioUrl === audioUrls[partName] && styles.stemPlayTouchTextActive]}>
                      {playingAudioUrl === audioUrls[partName] ? 'Playing' : 'Listen'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.stemTrashBtn}
                    onPress={() => handleRemoveAudioPart(partName)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selectFromMediaBtn}
                  onPress={() => handleOpenMediaSelector(partName, 'audio')}
                >
                  <Ionicons name="folder-open-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
                  <Text style={styles.selectFromMediaBtnText}>Select from Media</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
