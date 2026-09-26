import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './attendanceStyles';
import AttendanceRecordCard from './AttendanceRecordCard';
import type { AttendanceRecord } from './types';

interface AttendanceRecordListProps {
  dailyRecords: AttendanceRecord[];
  search: string;
  setSearch: (val: string) => void;
  selectedDate: string;
  formattedDateLabel: string;
  isTodaySelected: boolean;
  shiftDate: (days: number) => void;
  loading: boolean;
  refreshing: boolean;
  refetch: () => void;
  insetsBottom: number;
  onSelectRecord?: (record: AttendanceRecord) => void;
}

export default function AttendanceRecordList({
  dailyRecords,
  search,
  setSearch,
  selectedDate,
  formattedDateLabel,
  isTodaySelected,
  shiftDate,
  loading,
  refreshing,
  refetch,
  insetsBottom,
  onSelectRecord,
}: AttendanceRecordListProps) {
  return (
    <>
      {/* ── Daily attendance view tab ── */}
      <View style={styles.viewModeTabsContainer}>
        <View style={[styles.viewModeTab, styles.viewModeTabActive]}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color="#7c3aed"
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.viewModeTabText, styles.viewModeTabTextActive]}>
            Daily Logs
          </Text>
        </View>
      </View>

      {/* ── Date Navigation Strip ── */}
      <View style={styles.dateFilterStrip}>
        <TouchableOpacity
          style={styles.dateArrowBtn}
          onPress={() => shiftDate(-1)}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-back" size={16} color="#64748b" />
        </TouchableOpacity>

        <View style={styles.dateCenterInfo}>
          <Ionicons name="time-outline" size={14} color="#7c3aed" style={{ marginRight: 6 }} />
          <Text style={styles.dateLabelText}>{formattedDateLabel}</Text>
          <Text style={styles.dateSubText}>({selectedDate})</Text>
        </View>

        <TouchableOpacity
          style={[styles.dateArrowBtn, isTodaySelected && { opacity: 0.4 }]}
          onPress={() => shiftDate(1)}
          disabled={isTodaySelected}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="chevron-forward" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* ── Quick Search Bar ── */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search checked-in singers..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Records List ── */}
      <FlatList
        data={dailyRecords}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insetsBottom, 20) + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} colors={['#7c3aed']} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#7c3aed" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Attendance for {formattedDateLabel}</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'No singers match your search query.' : 'Tap "Scan QR" to start clocking in singers for this date.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => <AttendanceRecordCard item={item} onPress={onSelectRecord} />}
      />
    </>
  );
}
