import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './scheduleStyles';
import type { ScheduleProgram } from './types';

interface ScheduleProgramPickerProps {
  viewHistory: boolean;
  setViewHistory: (val: boolean) => void;
  displayedPrograms: ScheduleProgram[];
  activeProgramId: string | null;
  setActiveProgramId: (id: string) => void;
  activeProgram: ScheduleProgram | null;
  onMakeCurrent: () => void;
  onToggleArchive: () => void;
  onDeleteProgram: () => void;
  showCreateProgramModal: boolean;
  setShowCreateProgramModal: (val: boolean) => void;
  newProgramName: string;
  setNewProgramName: (val: string) => void;
  onCreateProgram: () => void;
  showRenameModal: boolean;
  setShowRenameModal: (val: boolean) => void;
  renameProgramName: string;
  setRenameProgramName: (val: string) => void;
  onRenameProgram: () => void;
}

export default function ScheduleProgramPicker({
  viewHistory,
  setViewHistory,
  displayedPrograms,
  activeProgramId,
  setActiveProgramId,
  activeProgram,
  onMakeCurrent,
  onToggleArchive,
  onDeleteProgram,
  showCreateProgramModal,
  setShowCreateProgramModal,
  newProgramName,
  setNewProgramName,
  onCreateProgram,
  showRenameModal,
  setShowRenameModal,
  renameProgramName,
  setRenameProgramName,
  onRenameProgram,
}: ScheduleProgramPickerProps) {
  return (
    <>
      {/* ── 1. STUDIO HEADER & CONTROLS ──────────────────────────────────────── */}
      <View style={styles.topControlBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={[styles.historyPill, viewHistory && styles.historyPillActive]}
            onPress={() => setViewHistory(!viewHistory)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={viewHistory ? 'arrow-back' : 'archive-outline'}
              size={14}
              color={viewHistory ? '#d97706' : '#64748b'}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.historyPillText, viewHistory && styles.historyPillTextActive]}>
              {viewHistory ? 'Active Schedules' : 'Archive'}
            </Text>
          </TouchableOpacity>
        </View>

        {!viewHistory && (
          <TouchableOpacity
            style={styles.newProgramBtn}
            onPress={() => {
              setNewProgramName('');
              setShowCreateProgramModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.newProgramBtnText}>New Program</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── 2. PROGRAM SELECTOR & ACTIONS ──────────────────────────────────── */}
      <View style={styles.programBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.programScroll}>
          {displayedPrograms.length === 0 && (
            <Text style={styles.noProgramsText}>
              No {viewHistory ? 'archived' : 'active'} schedules. Tap "+ New Program".
            </Text>
          )}

          {displayedPrograms.map(p => {
            const isSelected = activeProgramId === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => setActiveProgramId(p.id)}
                style={[styles.programPill, isSelected && styles.programPillSelected]}
                activeOpacity={0.75}
              >
                <Text style={[styles.programPillText, isSelected && styles.programPillTextSelected]}>
                  {p.name}
                </Text>
                {p.isCurrent && (
                  <View style={[styles.currentTag, isSelected && styles.currentTagSelected]}>
                    <Text style={[styles.currentTagText, isSelected && styles.currentTagTextSelected]}>
                      ★ CURRENT
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeProgram && (
          <View style={styles.programActionRow}>
            {!viewHistory && !activeProgram.isCurrent && (
              <TouchableOpacity style={styles.actionBtnSmall} onPress={onMakeCurrent} activeOpacity={0.75}>
                <Ionicons name="star" size={13} color="#d97706" style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnSmallText}>Make Current</Text>
              </TouchableOpacity>
            )}

            {!viewHistory && (
              <TouchableOpacity
                style={styles.iconActionBtn}
                onPress={() => {
                  setRenameProgramName(activeProgram.name);
                  setShowRenameModal(true);
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="pencil" size={14} color="#64748b" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.iconActionBtn} onPress={onToggleArchive} activeOpacity={0.75}>
              <Ionicons name={viewHistory ? 'refresh' : 'archive'} size={14} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconActionBtn} onPress={onDeleteProgram} activeOpacity={0.75}>
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── MODAL: CREATE PROGRAM ──────────────────────────────────────────── */}
      <Modal visible={showCreateProgramModal} transparent animationType="fade" onRequestClose={() => setShowCreateProgramModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New Schedule Program</Text>
              <Text style={styles.modalSub}>Create a new timetable itinerary board</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. AUGUST PRAISE FESTIVAL"
                placeholderTextColor="#94a3b8"
                value={newProgramName}
                onChangeText={setNewProgramName}
                autoFocus
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowCreateProgramModal(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={onCreateProgram}>
                  <Text style={styles.modalSubmitBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL: RENAME PROGRAM ──────────────────────────────────────────── */}
      <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Rename Schedule</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Program Name"
                placeholderTextColor="#94a3b8"
                value={renameProgramName}
                onChangeText={setRenameProgramName}
                autoFocus
              />
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRenameModal(false)}>
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmitBtn} onPress={onRenameProgram}>
                  <Text style={styles.modalSubmitBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
