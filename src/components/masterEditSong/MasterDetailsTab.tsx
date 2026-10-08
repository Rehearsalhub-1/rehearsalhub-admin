import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './masterEditSongStyles';
import MasterCollectionPicker from './MasterCollectionPicker';

const QUICK_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const QUICK_TEMPOS = ['70', '80', '95', '110', '120', '135'] as const;

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
  categories: string[];
  setCategories: (cats: string[]) => void;
  toggleCategory: (cat: string) => void;
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
  categories,
  setCategories,
  toggleCategory,
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
      {/* ── CARD 1: MUSIC ESSENTIALS (Zero-Scroll Top Card) ─────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Music Essentials</Text>

        {/* 1. Song Title */}
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

        {/* 2. Musical Key with 1-Tap Chips */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>MUSICAL KEY</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. C, C to D#, F#"
            placeholderTextColor="#94a3b8"
            value={keyVal}
            onChangeText={setKeyVal}
          />
          <View style={styles.keyChipsWrap}>
            {QUICK_KEYS.map(k => {
              const isSelected = (keyVal || '').trim().toLowerCase() === k.toLowerCase();
              return (
                <TouchableOpacity
                  key={k}
                  style={[styles.keyChip, isSelected && styles.keyChipActive]}
                  onPress={() => setKeyVal(k)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.keyChipText, isSelected && styles.keyChipTextActive]}>
                    {k}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Tempo with 1-Tap BPM Chips */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>TEMPO (BPM)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 112 or 112 BPM"
            placeholderTextColor="#94a3b8"
            value={tempo}
            onChangeText={setTempo}
          />
          <View style={styles.tempoChipsWrap}>
            {QUICK_TEMPOS.map(t => {
              const isSelected = (tempo || '').includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tempoChip, isSelected && styles.tempoChipActive]}
                  onPress={() => setTempo(`${t} BPM`)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tempoChipText, isSelected && styles.tempoChipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. Lead Singer & Composer / Writer */}
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
      </View>

      {/* ── CARD 2: MASTER COLLECTIONS & CATEGORIES ─────────────────────── */}
      <View style={styles.card}>
        <MasterCollectionPicker
          collectionsList={collectionsList}
          category={category}
          setCategory={setCategory}
          categories={categories}
          setCategories={setCategories}
          toggleCategory={toggleCategory}
          showNewCatInput={showNewCatInput}
          setShowNewCatInput={setShowNewCatInput}
          newCatName={newCatName}
          setNewCatName={setNewCatName}
          onAddNewCategory={onAddNewCategory}
        />
      </View>

      {/* ── CARD 3: BAND & MUSICIANS (Grouped Cleanly) ───────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Band & Direction</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>CONDUCTOR / DIRECTOR</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Bro Dennis"
            placeholderTextColor="#94a3b8"
            value={conductor}
            onChangeText={setConductor}
          />
        </View>

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

      {/* ── CARD 4: COVER ARTWORK (Visual Preview & Library Picker) ──────── */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Cover Artwork</Text>

        <View style={styles.artworkSectionRow}>
          {imageUrl ? (
            <View style={styles.artworkPreviewWrap}>
              <Image source={{ uri: imageUrl }} style={styles.artworkImg} resizeMode="cover" />
              <TouchableOpacity
                style={styles.artworkRemoveBadge}
                onPress={() => setImageUrl('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={13} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.browseArtworkBtn}
            onPress={onPickArtwork}
            activeOpacity={0.8}
          >
            <Ionicons name="image-outline" size={15} color="#7c3aed" />
            <Text style={styles.browseArtworkBtnText}>
              {imageUrl ? 'Change Artwork' : 'Browse Media Library'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
