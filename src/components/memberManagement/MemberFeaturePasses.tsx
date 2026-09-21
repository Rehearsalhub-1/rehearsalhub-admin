import React from 'react';
import { View, Text, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './memberManagementStyles';

interface MemberFeaturePassesProps {
  passOngoing: boolean;
  setPassOngoing: (val: boolean) => void;
  passPreRehearsal: boolean;
  setPassPreRehearsal: (val: boolean) => void;
  passAnnotation: boolean;
  setPassAnnotation: (val: boolean) => void;
  passArchive: boolean;
  setPassArchive: (val: boolean) => void;
}

export default function MemberFeaturePasses({
  passOngoing,
  setPassOngoing,
  passPreRehearsal,
  setPassPreRehearsal,
  passAnnotation,
  setPassAnnotation,
  passArchive,
  setPassArchive,
}: MemberFeaturePassesProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeading}>Feature Passes</Text>
      <Text style={styles.cardHint}>Grant or revoke special access passes for this singer.</Text>

      <View style={styles.passesList}>
        {/* 1. Ongoing Programs Pass */}
        <View style={styles.passRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="play-circle" size={15} color="#10b981" />
              <Text style={styles.passTitle}>Ongoing Programs</Text>
            </View>
            <Text style={styles.passSub}>Live broadcast & ongoing rehearsal setlists</Text>
          </View>
          <Switch
            value={passOngoing}
            onValueChange={setPassOngoing}
            trackColor={{ false: '#e2e8f0', true: '#a7f3d0' }}
            thumbColor={passOngoing ? '#10b981' : '#94a3b8'}
          />
        </View>

        {/* 2. Pre-Rehearsal Sets Pass */}
        <View style={styles.passRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time" size={15} color="#d97706" />
              <Text style={styles.passTitle}>Pre-Rehearsal Sets</Text>
              <View style={styles.passTagAmber}>
                <Text style={styles.passTagAmberText}>Restricted</Text>
              </View>
            </View>
            <Text style={styles.passSub}>Access upcoming Praise Night repertoire in advance</Text>
          </View>
          <Switch
            value={passPreRehearsal}
            onValueChange={setPassPreRehearsal}
            trackColor={{ false: '#e2e8f0', true: '#fde68a' }}
            thumbColor={passPreRehearsal ? '#d97706' : '#94a3b8'}
          />
        </View>

        {/* 3. Annotation Pass */}
        <View style={styles.passRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="pencil" size={15} color="#6366f1" />
              <Text style={styles.passTitle}>Sheet Music Annotations</Text>
              <View style={styles.passTagIndigo}>
                <Text style={styles.passTagIndigoText}>Restricted</Text>
              </View>
            </View>
            <Text style={styles.passSub}>Draw notes and notations directly on song sheets</Text>
          </View>
          <Switch
            value={passAnnotation}
            onValueChange={setPassAnnotation}
            trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
            thumbColor={passAnnotation ? '#6366f1' : '#94a3b8'}
          />
        </View>

        {/* 4. Archive Pass */}
        <View style={[styles.passRow, { borderBottomWidth: 0 }]}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="library" size={15} color="#7c3aed" />
              <Text style={styles.passTitle}>Archive Access</Text>
            </View>
            <Text style={styles.passSub}>Browse historical Praise Night recordings & song archives</Text>
          </View>
          <Switch
            value={passArchive}
            onValueChange={setPassArchive}
            trackColor={{ false: '#e2e8f0', true: '#ddd6fe' }}
            thumbColor={passArchive ? '#7c3aed' : '#94a3b8'}
          />
        </View>
      </View>
    </View>
  );
}
