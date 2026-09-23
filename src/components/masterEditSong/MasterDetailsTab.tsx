import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './masterEditSongStyles';
import MasterCollectionPicker from './MasterCollectionPicker';

interface MasterDetailsTabProps {
  title: string;
  setTitle: (val: string) => void;
  leadSinger: string;
  setLeadSinger: (val: string) => void;
  writer: string;
  setWriter: (val: string) => void;
  collectionsList: string[];
  category: string;
  setCategory: (val: string) => void;
  showNewCatInput: boolean;
  setShowNewCatInput: (val: boolean) => void;
  newCatName: string;
  setNewCatName: (val: string) => void;
  onAddNewCategory: () => void;
  keyVal: string;
  setKeyVal: (val: string) => void;
  tempo: string;
  setTempo: (val: string) => void;
  conductor: string;
  setConductor: (val: string) => void;
  leadKeyboardist: string;
  setLeadKeyboardist: (val: string) => void;
  bassGuitarist: string;
  setBassGuitarist: (val: string) => void;
  drummer: string;
  setDrummer: (val: string) => void;
  imageUrl: string;
  setImageUrl: (val: string) => void;
  onPickArtwork: () => void;
}

export default function MasterDetailsTab({
  title,
  setTitle,
  leadSinger,
  setLeadSinger,
  writer,
  setWriter,
  collectionsList,
  category,
  setCategory,
  showNewCatInput,
  setShowNewCatInput,
  newCatName,
  setNewCatName,
  onAddNewCategory,
  keyVal,
  setKeyVal,
  tempo,
  setTempo,
  conductor,
  setConductor,
  leadKeyboardist,
  setLeadKeyboardist,
  bassGuitarist,
  setBassGuitarist,
  drummer,
  setDrummer,
  imageUrl,
  setImageUrl,
  onPickArtwork,
}: MasterDetailsTabProps) {
  return (
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

        {/* Master Program / Collection Selection */}
        <MasterCollectionPicker
          collectionsList={collectionsList}
          category={category}
          setCategory={setCategory}
          showNewCatInput={showNewCatInput}
          setShowNewCatInput={setShowNewCatInput}
          newCatName={newCatName}
          setNewCatName={setNewCatName}
          onAddNewCategory={onAddNewCategory}
        />

        {/* Key and Tempo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>MUSICAL KEY</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. C, C to D#, F#"
            placeholderTextColor="#94a3b8"
            value={keyVal}
            onChangeText={setKeyVal}
          />
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
            onPress={onPickArtwork}
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
  );
}
