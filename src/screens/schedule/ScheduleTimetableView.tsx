import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './scheduleStyles';
import type { ScheduleProgram, ScheduleSlot } from './types';

interface ScheduleTimetableViewProps {
  activeProgram: ScheduleProgram;
  weeks: { id: string; name: string }[];
  days: { id: string; weekId: string; name: string }[];
  selectedWeekId: string;
  setSelectedWeekId: (id: string) => void;
  selectedDayId: string;
  setSelectedDayId: (id: string) => void;
  activeWeekDays: { id: string; weekId: string; name: string }[];
  onAddWeek: () => void;
  onDeleteWeek: (id: string) => void;
  onAddDay: () => void;
  onDeleteDay: (id: string) => void;
  currentDaySlots: ScheduleSlot[];
  rehearsedCount: number;
  pendingCount: number;
  totalMinutes: number;
  onCycleSlotStatus: (slotId: string) => void;
  onOpenAddSlot: () => void;
  onOpenEditSlot: (slot: ScheduleSlot) => void;
  onDeleteSlot: (slotId: string) => void;
}

export default function ScheduleTimetableView({
  activeProgram,
  weeks,
  selectedWeekId,
  setSelectedWeekId,
  selectedDayId,
  setSelectedDayId,
  activeWeekDays,
  onAddWeek,
  onDeleteWeek,
  onAddDay,
  onDeleteDay,
  currentDaySlots,
  rehearsedCount,
  pendingCount,
  totalMinutes,
  onCycleSlotStatus,
  onOpenAddSlot,
  onOpenEditSlot,
  onDeleteSlot,
}: ScheduleTimetableViewProps) {
  return (
    <>
      {/* ── TIMETABLE WEEKS & DAYS BAR ──────────────────────────────────── */}
      <View style={styles.weeksDaysContainer}>
        {/* Weeks Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeksScroll}>
          {weeks.map(w => {
            const isSelected = selectedWeekId === w.id;
            const isCurrentWeek = activeProgram.currentWeekId === w.id;
            return (
              <View key={w.id} style={styles.weekTabWrap}>
                <TouchableOpacity
                  style={[styles.weekTab, isSelected && styles.weekTabActive]}
                  onPress={() => setSelectedWeekId(w.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.weekTabText, isSelected && styles.weekTabTextActive]}>
                    {w.name}
                  </Text>
                  {isCurrentWeek && <Text style={styles.currentSubText}>(Current)</Text>}
                </TouchableOpacity>
                {weeks.length > 1 && (
                  <TouchableOpacity onPress={() => onDeleteWeek(w.id)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                    <Ionicons name="close" size={12} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          <TouchableOpacity style={styles.addWeekDayBtn} onPress={onAddWeek} activeOpacity={0.75}>
            <Ionicons name="add" size={13} color="#7c3aed" style={{ marginRight: 2 }} />
            <Text style={styles.addWeekDayBtnText}>Week</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Days Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {activeWeekDays.map(d => {
            const isSelected = selectedDayId === d.id;
            const isCurrentDay = activeProgram.currentDayId === d.id;
            return (
              <View key={d.id} style={styles.dayChipWrap}>
                <TouchableOpacity
                  style={[styles.dayChip, isSelected && styles.dayChipActive]}
                  onPress={() => setSelectedDayId(d.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                    {d.name}
                  </Text>
                  {isCurrentDay && <Text style={styles.currentSubText}>(Current)</Text>}
                </TouchableOpacity>
                {activeWeekDays.length > 1 && (
                  <TouchableOpacity onPress={() => onDeleteDay(d.id)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                    <Ionicons name="close" size={12} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          <TouchableOpacity style={styles.addWeekDayBtn} onPress={onAddDay} activeOpacity={0.75}>
            <Ionicons name="add" size={13} color="#7c3aed" style={{ marginRight: 2 }} />
            <Text style={styles.addWeekDayBtnText}>Day</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── DAILY SCHEDULE TIMETABLE CONTENT ── */}
      <View>
        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <Text style={[styles.kpiVal, { color: '#059669' }]}>{rehearsedCount}</Text>
            <Text style={[styles.kpiLabel, { color: '#047857' }]}>Rehearsed</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Text style={[styles.kpiVal, { color: '#dc2626' }]}>{pendingCount}</Text>
            <Text style={[styles.kpiLabel, { color: '#b91c1c' }]}>Pending</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
            <Text style={[styles.kpiVal, { color: '#0f172a' }]}>{totalMinutes}m</Text>
            <Text style={[styles.kpiLabel, { color: '#64748b' }]}>Total Time</Text>
          </View>
        </View>

        {/* Section Title & Add Slot Button */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionHeaderTitle}>Timetable Itinerary</Text>
            <Text style={styles.sectionHeaderSub}>Tap status pill to cycle Pending ➔ Rehearsed ➔ Break</Text>
          </View>
          <TouchableOpacity style={styles.addSlotBtn} onPress={onOpenAddSlot} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.addSlotBtnText}>+ Slot</Text>
          </TouchableOpacity>
        </View>

        {currentDaySlots.length === 0 ? (
          <View style={styles.emptyTabCard}>
            <Text style={styles.emptyTabText}>No schedule slots added for this day yet.</Text>
            <TouchableOpacity style={styles.emptyActionBtn} onPress={onOpenAddSlot}>
              <Text style={styles.emptyActionBtnText}>+ Add First Slot</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timelineList}>
            {currentDaySlots.map((slot, idx) => {
              const isBreak = slot.status === 'break';
              const isRehearsed = slot.status === 'rehearsed';
              return (
                <View key={slot.id} style={styles.timelineItem}>
                  {/* Left Column: Time */}
                  <View style={styles.timelineTimeCol}>
                    <Text style={styles.timelineTimeText}>{slot.time}</Text>
                  </View>

                  {/* Middle Column: Line & Bullet */}
                  <View style={styles.timelineAxis}>
                    <View
                      style={[
                        styles.timelineDot,
                        isBreak
                          ? styles.dotBreak
                          : isRehearsed
                          ? styles.dotRehearsed
                          : styles.dotPending,
                      ]}
                    />
                    {idx < currentDaySlots.length - 1 && <View style={styles.timelineLine} />}
                  </View>

                  {/* Right Column: Slot Card */}
                  <View
                    style={[
                      styles.timelineCard,
                      isBreak && styles.timelineCardBreak,
                    ]}
                  >
                    <View style={styles.timelineCardHeader}>
                      <Text
                        style={[
                          styles.slotTitleText,
                          isBreak && styles.slotTitleBreak,
                        ]}
                        numberOfLines={2}
                      >
                        {slot.title}
                      </Text>

                      <View style={styles.slotBadgeGroup}>
                        {slot.key && slot.key !== '—' && (
                          <View style={styles.slotKeyBadge}>
                            <Text style={styles.slotKeyBadgeText}>Key {slot.key}</Text>
                          </View>
                        )}

                        <View style={styles.slotMinsBadge}>
                          <Text style={styles.slotMinsBadgeText}>{slot.allotment}m</Text>
                        </View>

                        {/* 1-Tap Quick Status Toggle */}
                        <TouchableOpacity
                          onPress={() => onCycleSlotStatus(slot.id)}
                          activeOpacity={0.7}
                          style={[
                            styles.statusPill,
                            isBreak
                              ? styles.statusPillBreak
                              : isRehearsed
                              ? styles.statusPillRehearsed
                              : styles.statusPillPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              isBreak
                                ? styles.statusPillTextBreak
                                : isRehearsed
                                ? styles.statusPillTextRehearsed
                                : styles.statusPillTextPending,
                            ]}
                          >
                            {isBreak ? 'Break' : isRehearsed ? 'Rehearsed' : 'Pending'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {slot.note ? (
                      <View style={styles.slotNoteBox}>
                        <Text style={styles.slotNoteText}>"{slot.note}"</Text>
                      </View>
                    ) : null}

                    <View style={styles.slotFooterActions}>
                      <TouchableOpacity onPress={() => onOpenEditSlot(slot)} style={styles.slotActionBtn}>
                        <Ionicons name="pencil" size={13} color="#64748b" style={{ marginRight: 3 }} />
                        <Text style={styles.slotActionBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onDeleteSlot(slot.id)} style={styles.slotActionBtn}>
                        <Ionicons name="trash-outline" size={13} color="#ef4444" style={{ marginRight: 3 }} />
                        <Text style={[styles.slotActionBtnText, { color: '#ef4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </>
  );
}
