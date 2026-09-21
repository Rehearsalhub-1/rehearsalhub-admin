import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import ZoneHeader from '../../components/ZoneHeader';
import { styles } from './scheduleStyles';
import ScheduleProgramPicker from './ScheduleProgramPicker';
import ScheduleTimetableView from './ScheduleTimetableView';
import ScheduleSongListTabs from './ScheduleSongListTabs';
import ScheduleSongEligibilityList from './ScheduleSongEligibilityList';
import ScheduleSlotModal from './ScheduleSlotModal';
import ScheduleGenericItemModal from './ScheduleGenericItemModal';
import { useScheduleState } from './useScheduleState';
import { TABS, type ScheduleProgram, type ScheduleSlot } from './types';

export type { ScheduleProgram, ScheduleSlot };

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const state = useScheduleState();

  if (state.loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ZoneHeader title={state.isChurchMode ? 'Church Schedule' : 'Schedule Manager'} />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ZoneHeader title={state.isChurchMode ? 'Church Schedule' : 'Schedule Manager'} />

      <ScheduleProgramPicker
        viewHistory={state.viewHistory}
        setViewHistory={state.setViewHistory}
        displayedPrograms={state.displayedPrograms}
        activeProgramId={state.activeProgramId}
        setActiveProgramId={state.setActiveProgramId}
        activeProgram={state.activeProgram}
        onMakeCurrent={state.handleMakeCurrent}
        onToggleArchive={state.handleToggleArchive}
        onDeleteProgram={state.handleDeleteProgram}
        showCreateProgramModal={state.showCreateProgramModal}
        setShowCreateProgramModal={state.setShowCreateProgramModal}
        newProgramName={state.newProgramName}
        setNewProgramName={state.setNewProgramName}
        onCreateProgram={state.handleCreateProgram}
        showRenameModal={state.showRenameModal}
        setShowRenameModal={state.setShowRenameModal}
        renameProgramName={state.renameProgramName}
        setRenameProgramName={state.setRenameProgramName}
        onRenameProgram={state.handleRenameProgram}
      />

      {/* Tabs bar */}
      <View style={styles.tabsBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(t => {
            const isActive = state.activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => state.setActiveTab(t.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={t.icon as any}
                  size={15}
                  color={isActive ? '#7c3aed' : '#64748b'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main tab content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentInner,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={state.refetch} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {!state.activeProgram ? (
          state.fetchError ? (
            <View style={styles.emptyCenter}>
              <Ionicons name="cloud-offline-outline" size={44} color="#ef4444" style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyTitle, { color: '#ef4444' }]}>Failed to load schedules</Text>
              <Text style={styles.emptySubtitle}>{state.fetchError}</Text>
            </View>
          ) : (
            <View style={styles.emptyCenter}>
              <Ionicons name="calendar-outline" size={44} color="#cbd5e1" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyTitle}>No Program Selected</Text>
              <Text style={styles.emptySubtitle}>Tap "+ New Program" at the top to create a rehearsal schedule.</Text>
            </View>
          )
        ) : (
          <>
            {state.activeTab === 'schedule' && (
              <ScheduleTimetableView
                activeProgram={state.activeProgram}
                weeks={state.weeks}
                days={state.days}
                selectedWeekId={state.selectedWeekId}
                setSelectedWeekId={state.setSelectedWeekId}
                selectedDayId={state.selectedDayId}
                setSelectedDayId={state.setSelectedDayId}
                activeWeekDays={state.activeWeekDays}
                onAddWeek={state.handleAddWeek}
                onDeleteWeek={state.handleDeleteWeek}
                onAddDay={state.handleAddDay}
                onDeleteDay={state.handleDeleteDay}
                currentDaySlots={state.currentDaySlots}
                rehearsedCount={state.rehearsedCount}
                pendingCount={state.pendingCount}
                totalMinutes={state.totalMinutes}
                onCycleSlotStatus={state.handleCycleSlotStatus}
                onOpenAddSlot={state.handleOpenAddSlot}
                onOpenEditSlot={state.handleOpenEditSlot}
                onDeleteSlot={state.handleDeleteSlot}
              />
            )}

            {(state.activeTab === 'new' ||
              state.activeTab === 'carried' ||
              state.activeTab === 'swapped' ||
              state.activeTab === 'renamed' ||
              state.activeTab === 'invalid') && (
              <ScheduleSongListTabs
                activeTab={state.activeTab}
                activeProgram={state.activeProgram}
                onOpenAddGeneric={state.handleOpenAddGeneric}
                onDeleteGenericItem={state.handleDeleteGenericItem}
              />
            )}

            {state.activeTab === 'eligibility' && (
              <ScheduleSongEligibilityList
                submitters={state.activeProgram.submitters || []}
                filter={state.eligibilityFilter}
                setFilter={state.setEligibilityFilter}
                onAddMember={state.handleOpenAddGeneric}
                onDeleteItem={state.handleDeleteGenericItem}
              />
            )}
          </>
        )}
      </ScrollView>

      <ScheduleSlotModal
        visible={state.showSlotModal}
        onClose={() => state.setShowSlotModal(false)}
        editingSlotId={state.editingSlotId}
        weekName={state.weeks.find(w => w.id === state.selectedWeekId)?.name || 'Week 1'}
        dayName={state.activeWeekDays.find(d => d.id === state.selectedDayId)?.name || 'Day 1'}
        slotTime={state.slotTime}
        setSlotTime={state.setSlotTime}
        slotAllotment={state.slotAllotment}
        setSlotAllotment={state.setSlotAllotment}
        slotTitle={state.slotTitle}
        setSlotTitle={state.setSlotTitle}
        slotKey={state.slotKey}
        setSlotKey={state.setSlotKey}
        slotStatus={state.slotStatus}
        setSlotStatus={state.setSlotStatus}
        slotNote={state.slotNote}
        setSlotNote={state.setSlotNote}
        onSave={state.handleSaveSlot}
      />

      <ScheduleGenericItemModal
        visible={state.showGenericModal}
        onClose={() => state.setShowGenericModal(false)}
        activeTab={state.activeTab}
        field1={state.genericField1}
        setField1={state.setGenericField1}
        field2={state.genericField2}
        setField2={state.setGenericField2}
        field3={state.genericField3}
        setField3={state.setGenericField3}
        field4={state.genericField4}
        setField4={state.setGenericField4}
        field5={state.genericField5}
        setField5={state.setGenericField5}
        genericBool={state.genericBool}
        setGenericBool={state.setGenericBool}
        onSave={state.handleSaveGeneric}
      />
    </SafeAreaView>
  );
}
