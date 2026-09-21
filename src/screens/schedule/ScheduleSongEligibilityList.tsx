import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './scheduleStyles';
import type { SubmitterItem } from './types';

interface ScheduleSongEligibilityListProps {
  submitters: SubmitterItem[];
  filter: 'eligible' | 'ineligible';
  setFilter: (val: 'eligible' | 'ineligible') => void;
  onAddMember: () => void;
  onDeleteItem: (id: string) => void;
}

export default function ScheduleSongEligibilityList({
  submitters,
  filter,
  setFilter,
  onAddMember,
  onDeleteItem,
}: ScheduleSongEligibilityListProps) {
  const eligibleCount = submitters.filter(s => !s.isBlocked).length;
  const ineligibleCount = submitters.filter(s => s.isBlocked).length;

  const filteredList = submitters.filter(s =>
    filter === 'eligible' ? !s.isBlocked : Boolean(s.isBlocked)
  );

  return (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>Submission Eligibility</Text>
        <TouchableOpacity style={styles.addSlotBtn} onPress={onAddMember} activeOpacity={0.8}>
          <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
          <Text style={styles.addSlotBtnText}>+ Add Member</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Switcher */}
      <View style={styles.eligibilitySwitcher}>
        <TouchableOpacity
          style={[styles.eligPill, filter === 'eligible' && styles.eligPillActive]}
          onPress={() => setFilter('eligible')}
        >
          <Text style={[styles.eligPillText, filter === 'eligible' && styles.eligPillTextActive]}>
            Eligible ({eligibleCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.eligPill, filter === 'ineligible' && styles.eligPillDangerActive]}
          onPress={() => setFilter('ineligible')}
        >
          <Text style={[styles.eligPillText, filter === 'ineligible' && styles.eligPillDangerTextActive]}>
            Ineligible ({ineligibleCount})
          </Text>
        </TouchableOpacity>
      </View>

      {filteredList.map(sub => {
        const used = sub.submissions || 0;
        const total = sub.quota || 1;
        const pct = Math.min(100, Math.round((used / total) * 100));
        const isMax = used >= total;

        return (
          <View key={sub.id} style={[styles.standardCard, sub.isBlocked && styles.redBorderCard]}>
            <View style={styles.cardTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardMainTitle}>{sub.name}</Text>
                <Text style={styles.cardSubRole}>{sub.role || 'Vocalist'}</Text>
              </View>
              {!sub.isBlocked ? (
                <View style={styles.quotaPill}>
                  <Text style={styles.quotaPillText}>
                    Usage: <Text style={{ fontWeight: '800', color: isMax ? '#ef4444' : '#7c3aed' }}>{used}</Text> / {total}
                  </Text>
                </View>
              ) : (
                <View style={styles.redBadge}>
                  <Text style={styles.redBadgeText}>Blocked since {sub.since || 'Recent'}</Text>
                </View>
              )}
            </View>

            {!sub.isBlocked && (
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: isMax ? '#ef4444' : '#10b981' }]} />
              </View>
            )}

            {sub.reason ? (
              <View style={styles.reasonQuote}>
                <Text style={styles.reasonQuoteText}>"{sub.reason}"</Text>
              </View>
            ) : null}

            <View style={styles.cardActionsRight}>
              <TouchableOpacity onPress={() => onDeleteItem(sub.id)} style={styles.cardDeleteBtn}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}
