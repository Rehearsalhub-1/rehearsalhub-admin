import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './editSongStyles';

export interface SongPersonnelCardProps {
  isMedium: boolean;
  songLeadSinger: string;
  setSongLeadSinger: (val: string) => void;
  songWriter: string;
  setSongWriter: (val: string) => void;
  songConductor: string;
  setSongConductor: (val: string) => void;
  songLeadKeyboardist: string;
  setSongLeadKeyboardist: (val: string) => void;
  songLeadGuitarist: string;
  setSongLeadGuitarist: (val: string) => void;
  songBassGuitarist: string;
  setSongBassGuitarist: (val: string) => void;
  songDrummer: string;
  setSongDrummer: (val: string) => void;
  handleAddHistory: (type: string) => void;
}

export default function SongPersonnelCard({
  isMedium,
  songLeadSinger,
  setSongLeadSinger,
  songWriter,
  setSongWriter,
  songConductor,
  setSongConductor,
  songLeadKeyboardist,
  setSongLeadKeyboardist,
  songLeadGuitarist,
  setSongLeadGuitarist,
  songBassGuitarist,
  setSongBassGuitarist,
  songDrummer,
  setSongDrummer,
  handleAddHistory,
}: SongPersonnelCardProps) {
  return (
    <View style={styles.cardSlate}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardHeaderTitle}>Personnel</Text>
        <TouchableOpacity
          style={styles.addHistoryBtn}
          onPress={() => handleAddHistory('personnel')}
        >
          <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.addHistoryBtnText}>Add History</Text>
        </TouchableOpacity>
      </View>

      {/* Responsive Grid: 2-Col on screens >= 500px, 1-Col stacked on phones */}
      <View style={[styles.personnelGrid, isMedium && { flexDirection: 'row', flexWrap: 'wrap' }]}>
        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Lead Singer</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songLeadSinger}
            onChangeText={setSongLeadSinger}
            placeholder="Enter lead singer name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Writer</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songWriter}
            onChangeText={setSongWriter}
            placeholder="Enter writer name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Conductor's Guide</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songConductor}
            onChangeText={setSongConductor}
            placeholder="Enter conductor name"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Lead Keyboardist</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songLeadKeyboardist}
            onChangeText={setSongLeadKeyboardist}
            placeholder="Enter lead keyboardist"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Lead Guitarist</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songLeadGuitarist}
            onChangeText={setSongLeadGuitarist}
            placeholder="Enter lead guitarist"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Bass Guitarist</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songBassGuitarist}
            onChangeText={setSongBassGuitarist}
            placeholder="Enter bass guitarist"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={[styles.fieldGroup, isMedium && { width: '48.5%' }]}>
          <Text style={styles.fieldLabel}>Drummer</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songDrummer}
            onChangeText={setSongDrummer}
            placeholder="Enter drummer name"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
    </View>
  );
}
