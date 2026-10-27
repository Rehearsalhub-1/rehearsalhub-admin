import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { styles } from './programsStyles';
import { formatDisplayDate, normalizeProgramStage } from './programUtils';
import type { Program } from '../../hooks/usePrograms';

export interface ProgramStats {
  songCount: number;
  heardCount: number;
  percent: number;
}

export interface ProgramCardItemProps {
  item: Program;
  stats: ProgramStats;
  isOngoing: boolean;
  isPreRehearsal: boolean;
  isLoadingAction: boolean;
  onPress: () => void;
  onMenu: () => void;
}

export const ProgramCardItem = React.memo(function ProgramCardItem({
  item,
  stats,
  isOngoing,
  isPreRehearsal,
  isLoadingAction,
  onPress,
  onMenu,
}: ProgramCardItemProps) {
  const { songCount, percent } = stats;
  const stage = normalizeProgramStage(item);
  const isCardOngoing = isOngoing || stage === 'ongoing';
  const isCardPreReh = !isCardOngoing && (isPreRehearsal || stage === 'pre-rehearsal');

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.programCard, isCardOngoing && styles.programCardOngoing]}
    >
      {/* Top Bar: Status Badge + Overflow Menu Button */}
      <View style={styles.cardTopRow}>
        <View style={styles.statusBadgeWrap}>
          {isCardOngoing ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>IN PROGRESS</Text>
            </View>
          ) : isCardPreReh ? (
            <View style={styles.prepBadge}>
              <Text style={styles.prepBadgeText}>PRE-REH</Text>
            </View>
          ) : stage === 'draft' ? (
            <View style={styles.draftBadge}>
              <Text style={styles.draftBadgeText}>DRAFT</Text>
            </View>
          ) : (
            <View style={styles.archiveBadge}>
              <Text style={styles.archiveBadgeText}>ARCHIVE</Text>
            </View>
          )}

          {item.pageCategory ? (
            <View style={styles.pageCategoryBadge}>
              <Text style={styles.pageCategoryText} numberOfLines={1}>
                {item.pageCategory}
              </Text>
            </View>
          ) : null}
        </View>

        {isLoadingAction ? (
          <ActivityIndicator size="small" color={Colors.accent} />
        ) : (
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={onMenu}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Program options"
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Program Name */}
      <Text style={styles.cardTitleText} numberOfLines={2}>
        {item.name}
      </Text>

      {/* Date & Location */}
      <View style={styles.cardMetaRow}>
        <Ionicons name="calendar-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
        <Text style={styles.cardDateText}>{formatDisplayDate(item.date)}</Text>
        {item.location ? (
          <>
            <Text style={styles.cardMetaDot}>•</Text>
            <Ionicons name="location-outline" size={13} color="#64748b" style={{ marginRight: 3 }} />
            <Text style={styles.cardLocationText} numberOfLines={1}>{item.location}</Text>
          </>
        ) : null}
      </View>

      {/* Sleek Progress Row */}
      <View style={{ marginTop: 2, marginBottom: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="musical-notes-outline" size={11} color="#64748b" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b' }}>
              {songCount} {songCount === 1 ? 'track' : 'tracks'}
            </Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: percent === 100 ? '#10b981' : '#7c3aed' }}>
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
    </TouchableOpacity>
  );
});

export default ProgramCardItem;
