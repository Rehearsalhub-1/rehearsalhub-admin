import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { styles } from './programsStyles';
import type { ProgramStats } from './ProgramCard';

interface ProgramStatsPanelProps {
  stats: ProgramStats;
}

export default function ProgramStatsPanel({ stats }: ProgramStatsPanelProps) {
  const { songCount, percent } = stats;

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressStatsRow}>
        <View style={styles.songCountRow}>
          <Ionicons name="musical-notes-outline" size={12} color={Colors.accent} style={{ marginRight: 4 }} />
          <Text style={styles.progressSongCount}>
            {songCount} {songCount === 1 ? 'track' : 'tracks'}
          </Text>
        </View>
        <Text style={[styles.progressPercentText, percent === 100 && styles.progressPercentCompleted]}>
          {percent}% rehearsed
        </Text>
      </View>
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${Math.min(100, Math.max(0, percent))}%` },
            percent === 100 && styles.progressBarFillCompleted,
          ]}
        />
      </View>
    </View>
  );
}
