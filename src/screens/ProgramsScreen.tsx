import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { usePrograms, Program } from '../hooks/usePrograms';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  SectionList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { GradientCard, Badge, SearchFilterBar, EmptyState } from '../components/ui';
import MediaSelectionModal from '../components/MediaSelectionModal';
import { customAlert } from '../context/AlertContext';

// Program type is imported from usePrograms hook

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Ongoing', value: 'ongoing' },
  { label: 'Pre-Reh', value: 'pre-rehearsal' },
  { label: 'Archive', value: 'archive' },
  { label: 'Draft', value: 'draft' },
];

function formatDisplayDate(dateStr?: string) {
  if (!dateStr) return 'Date TBD';
  const parsed = new Date(dateStr);
  if (!parsed || isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getProgramYear(dateStr?: string) {
  if (!dateStr) return 'Other';
  const parsed = new Date(dateStr);
  if (parsed && !isNaN(parsed.getTime())) {
    return parsed.getFullYear().toString();
  }
  const match = dateStr.match(/\b(19\d\d|20\d\d)\b/);
  if (match) return match[1];
  return 'Other';
}

// ── Quick date presets ──────────────────────────────────────────────────────────
function getDatePresets() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextSunday = new Date(today);
  const daysToSunday = (7 - today.getDay()) % 7 || 7;
  nextSunday.setDate(today.getDate() + daysToSunday);
  const fmt = (d: Date) => d.toLocaleDateString('en-CA');
  return [
    { label: 'Today', value: fmt(today) },
    { label: 'Tomorrow', value: fmt(tomorrow) },
    { label: 'Next Sunday', value: fmt(nextSunday) },
  ];
}

const VENUE_SUGGESTIONS = [
  'Main Auditorium',
  'Crusade Grounds',
  'Studio A',
  'Oasis Studio',
  'Zone Hall',
  'Outdoor Stage',
];

// ── Local banner thumbnails ──────────────────────────────────────────────────────
const LOCAL_BANNERS: { key: string; src: any }[] = [
  { key: 'banner1', src: require('../../assets/banners/banner1.jpg') },
  { key: 'banner2', src: require('../../assets/banners/banner2.jpg') },
  { key: 'banner3', src: require('../../assets/banners/banner3.jpg') },
  { key: 'banner4', src: require('../../assets/banners/banner4.jpg') },
  { key: 'banner5', src: require('../../assets/banners/banner5.jpg') },
  { key: 'banner6', src: require('../../assets/banners/banner6.jpg') },
  { key: 'banner7', src: require('../../assets/banners/banner7.webp') },
  { key: 'banner8', src: require('../../assets/banners/banner8.jpg') },
  { key: 'banner9', src: require('../../assets/banners/banner9.jpg') },
];

export type ProgramStage = 'ongoing' | 'pre-rehearsal' | 'archive' | 'draft';

export const STAGE_OPTIONS: { value: ProgramStage; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { value: 'ongoing', label: 'Ongoing', icon: 'radio', color: '#047857' },
  { value: 'pre-rehearsal', label: 'Pre-Reh', icon: 'time-outline', color: '#b45309' },
  { value: 'archive', label: 'Archive', icon: 'archive-outline', color: '#475569' },
  { value: 'draft', label: 'Draft', icon: 'document-text-outline', color: '#2563eb' },
];

export function normalizeProgramStage(p?: Partial<Program> | null): ProgramStage {
  if (!p) return 'pre-rehearsal';
  const rawStatus = String(p.status || '').toLowerCase().trim();
  const rawCategory = String(p.category || '').toLowerCase().trim();
  const rawStage = String(p.stage || '').toLowerCase().trim();

  if (
    p.isActive ||
    rawStage === 'ongoing' ||
    rawStatus === 'ongoing' ||
    rawStatus === 'active' ||
    rawCategory === 'ongoing' ||
    rawCategory === 'active'
  ) {
    return 'ongoing';
  }
  if (
    p.isArchived ||
    rawStage === 'archive' ||
    rawStatus === 'archive' ||
    rawStatus === 'archived' ||
    rawStatus === 'completed' ||
    rawCategory === 'archive' ||
    rawCategory === 'archived'
  ) {
    return 'archive';
  }
  if (rawStage === 'draft' || rawStatus === 'draft' || rawCategory === 'draft') {
    return 'draft';
  }
  return 'pre-rehearsal';
}

// ────────────────────────────────────────────────────────────────────────────────
// Create / Edit Program Modal
// ────────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PROGRAM_CATEGORIES = [
  'Praise Night',
  'Special Service',
  'Communion Service',
  'Leaders Conference',
  'Sunday Service',
  'Midweek Service',
  'Easter Concert',
];

export interface ProgramModalProps {
  visible: boolean;
  editingProgram: Program | null;
  activeZoneId?: string;
  isChurchMode?: boolean;
  activeChurchId?: string;
  onClose: () => void;
  onSaved: (updatedProgram?: any) => void;
}

export function ProgramModal({
  visible,
  editingProgram,
  activeZoneId,
  isChurchMode,
  activeChurchId,
  onClose,
  onSaved,
}: ProgramModalProps) {
  const insets = useSafeAreaInsets();
  const datePresets = useMemo(getDatePresets, []);

  const [availablePageCategories, setAvailablePageCategories] = useState<string[]>(DEFAULT_PROGRAM_CATEGORIES);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [form, setForm] = useState({
    name: '',
    date: new Date().toLocaleDateString('en-CA'),
    location: '',
    category: 'pre-rehearsal' as ProgramStage,
    pageCategory: 'Praise Night',
    description: '',
    bannerKey: '' as string,
    bannerUrl: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [showCustomBanner, setShowCustomBanner] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingProgram) {
        const existingCat = editingProgram.pageCategory || 'Praise Night';
        const initialStage = normalizeProgramStage(editingProgram);
        setForm({
          name: editingProgram.name || '',
          date: editingProgram.date || '',
          location: editingProgram.location || '',
          category: initialStage,
          pageCategory: existingCat,
          description: editingProgram.description || '',
          bannerKey: (editingProgram as any).bannerKey || '',
          bannerUrl: editingProgram.bannerImage || '',
        });
        setAvailablePageCategories(prev => Array.from(new Set([...DEFAULT_PROGRAM_CATEGORIES, ...prev, existingCat])));
      } else {
        setForm({
          name: '',
          date: new Date().toLocaleDateString('en-CA'),
          location: '',
          category: 'pre-rehearsal',
          pageCategory: 'Praise Night',
          description: '',
          bannerKey: 'banner1',
          bannerUrl: '',
        });
      }
      setFormError('');
      setShowVenueSuggestions(false);
      setShowCustomBanner(false);
      setShowNewCategoryInput(false);
      setNewCategoryName('');

      api.categories.getPage().then(res => {
        const pageCategories = (Array.isArray(res?.data) ? res.data : [])
          .map((item: any) => ({ id: String(item.id || ''), name: item.name || item.title || '' }))
          .filter((item: any) => item.name);
        if (pageCategories.length > 0) {
          const currentValue = editingProgram?.pageCategory || '';
          const currentName = pageCategories.find(item => item.id === currentValue)?.name || currentValue;
          setAvailablePageCategories(Array.from(new Set([
            ...pageCategories.map(item => item.name),
            ...DEFAULT_PROGRAM_CATEGORIES,
            ...(currentName ? [currentName] : []),
          ])));
          if (currentName) setForm(prev => ({ ...prev, pageCategory: currentName }));
        }
      }).catch(() => {});
    }
  }, [visible, editingProgram]);

  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (!availablePageCategories.includes(trimmed)) {
      setAvailablePageCategories(prev => [...prev, trimmed]);
    }
    setForm(p => ({ ...p, pageCategory: trimmed }));
    setNewCategoryName('');
    setShowNewCategoryInput(false);
  };

  const resolvedBanner = form.bannerKey
    ? LOCAL_BANNERS.find(b => b.key === form.bannerKey)?.src
    : form.bannerUrl
    ? { uri: form.bannerUrl }
    : null;

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Program name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        date: form.date.trim(),
        location: form.location.trim(),
        category: form.category,
        status: form.category,
        stage: form.category,
        isActive: form.category === 'ongoing',
        isArchived: form.category === 'archive',
        pageCategory: form.pageCategory,
        description: form.description.trim(),
      };
      if (form.bannerUrl.trim()) {
        payload.bannerImage = form.bannerUrl.trim();
      }
      if (form.bannerKey) {
        payload.bannerKey = form.bannerKey;
      }

      if (editingProgram) {
        const res = await api.programs.update(editingProgram.id, payload).catch(() => null);
        const updated = res?.data ? { ...editingProgram, ...res.data, ...payload } : { ...editingProgram, ...payload };
        onSaved(updated);
      } else {
        const createPayload = {
          ...payload,
          organizationId: activeZoneId,
          zoneId: activeZoneId,
          songIds: [],
          ...(isChurchMode && activeChurchId
            ? { groupId: activeChurchId, subGroupId: activeChurchId, scope: 'subgroup' }
            : {}),
        };
        const res = await api.programs.create(createPayload).catch(() => null);
        const created: Program = res?.data || {
          ...createPayload,
          id: `prog-${Date.now()}`,
          name: payload.name,
          date: payload.date,
          location: payload.location,
          category: payload.category,
          status: payload.category,
          songIds: [],
        };
        onSaved(created);
      }
      onClose();
    } catch (e: any) {
      setFormError(e.message || 'Failed to save program.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View
            style={[
              modalStyles.sheet,
              {
                marginTop: Math.max(insets.top + 16, 54),
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={modalStyles.dragHandle} />
            {/* Header */}
            <View style={modalStyles.header}>
              <View>
                <Text style={modalStyles.title}>{editingProgram ? 'Edit Program' : 'New Rehearsal Program'}</Text>
                <Text style={modalStyles.sub}>
                  {editingProgram
                    ? `Update "${editingProgram.name}"`
                    : 'Configure schedule, venue, and banner artwork'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={modalStyles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {formError ? <Text style={modalStyles.errorText}>{formError}</Text> : null}

              {/* Program Name */}
              <Text style={modalStyles.label}>PROGRAM NAME *</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="e.g. Midweek Rehearsal Program"
                placeholderTextColor={Colors.textMuted}
                value={form.name}
                onChangeText={t => setForm(p => ({ ...p, name: t }))}
              />

              {/* Quick Date Presets */}
              <Text style={modalStyles.label}>REHEARSAL DATE</Text>
              <View style={modalStyles.presetRow}>
                {datePresets.map(preset => (
                  <TouchableOpacity
                    key={preset.value}
                    style={[modalStyles.presetChip, form.date === preset.value && modalStyles.presetChipActive]}
                    onPress={() => setForm(p => ({ ...p, date: preset.value }))}
                  >
                    <Text style={[modalStyles.presetChipText, form.date === preset.value && modalStyles.presetChipTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[modalStyles.input, { marginTop: 6 }]}
                placeholder="YYYY-MM-DD (custom date)"
                placeholderTextColor={Colors.textMuted}
                value={form.date}
                onChangeText={t => setForm(p => ({ ...p, date: t }))}
              />

              {/* Venue */}
              <Text style={modalStyles.label}>VENUE / LOCATION</Text>
              <TextInput
                style={modalStyles.input}
                placeholder="e.g. Main Auditorium"
                placeholderTextColor={Colors.textMuted}
                value={form.location}
                onChangeText={t => {
                  setForm(p => ({ ...p, location: t }));
                  setShowVenueSuggestions(t.length === 0);
                }}
                onFocus={() => setShowVenueSuggestions(form.location.length === 0)}
                onBlur={() => setTimeout(() => setShowVenueSuggestions(false), 150)}
              />
              {showVenueSuggestions && (
                <View style={modalStyles.suggestionsBox}>
                  {VENUE_SUGGESTIONS.map(venue => (
                    <TouchableOpacity
                      key={venue}
                      style={modalStyles.suggestionItem}
                      onPress={() => {
                        setForm(p => ({ ...p, location: venue }));
                        setShowVenueSuggestions(false);
                      }}
                    >
                      <Ionicons name="location-outline" size={14} color={Colors.textMuted} style={{ marginRight: 8 }} />
                      <Text style={modalStyles.suggestionText}>{venue}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Program Category (Parent Group) with Inline Creation */}
              <View style={{ marginTop: 14 }}>
                <View style={modalStyles.labelWithActionRow}>
                  <Text style={[modalStyles.label, { marginTop: 0 }]}>PROGRAM CATEGORY</Text>
                  {!showNewCategoryInput ? (
                    <TouchableOpacity
                      style={modalStyles.addCategoryPill}
                      onPress={() => { setShowNewCategoryInput(true); setNewCategoryName(''); }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="add" size={13} color="#7c3aed" style={{ marginRight: 2 }} />
                      <Text style={modalStyles.addCategoryPillText}>New Category</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Inline New Category Creation Input */}
                {showNewCategoryInput && (
                  <View style={modalStyles.newCategoryInputRow}>
                    <TextInput
                      style={modalStyles.newCategoryTextInput}
                      placeholder="e.g. Easter Special, Zonal Rally..."
                      placeholderTextColor="#94a3b8"
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                      autoFocus
                      onSubmitEditing={handleAddNewCategory}
                    />
                    <TouchableOpacity style={modalStyles.addCategoryConfirmBtn} onPress={handleAddNewCategory}>
                      <Text style={modalStyles.addCategoryConfirmBtnText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={modalStyles.addCategoryCancelBtn}
                      onPress={() => { setShowNewCategoryInput(false); setNewCategoryName(''); }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close" size={16} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Horizontal Scrolling Category Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                >
                  {availablePageCategories.map(cat => {
                    const isSelected = form.pageCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          modalStyles.categoryChip,
                          isSelected && modalStyles.categoryChipActive,
                        ]}
                        onPress={() => setForm(p => ({ ...p, pageCategory: cat }))}
                        activeOpacity={0.75}
                      >
                        <Ionicons
                          name="folder-outline"
                          size={13}
                          color={isSelected ? '#ffffff' : '#64748b'}
                          style={{ marginRight: 5 }}
                        />
                        <Text style={[
                          modalStyles.categoryChipText,
                          isSelected && modalStyles.categoryChipTextActive,
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Session Stage */}
              <Text style={modalStyles.label}>SESSION STAGE</Text>
              <View style={modalStyles.stageRow}>
                {STAGE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      modalStyles.stageChip,
                      form.category === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                    ]}
                    onPress={() => setForm(p => ({ ...p, category: opt.value }))}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={14}
                      color={form.category === opt.value ? '#ffffff' : Colors.textMuted}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[
                      modalStyles.stageChipText,
                      form.category === opt.value && { color: '#ffffff', fontWeight: '700' },
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description */}
              <Text style={modalStyles.label}>DESCRIPTION / NOTES</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textarea]}
                placeholder="Optional notes for this rehearsal..."
                placeholderTextColor={Colors.textMuted}
                value={form.description}
                onChangeText={t => setForm(p => ({ ...p, description: t }))}
                multiline
                textAlignVertical="top"
              />

              {/* Banner Artwork Picker */}
              <View style={modalStyles.bannerSection}>
                <View style={modalStyles.labelWithActionRow}>
                  <Text style={modalStyles.label}>BANNER ARTWORK</Text>
                  <TouchableOpacity
                    style={modalStyles.pickMediaBtn}
                    onPress={() => setShowMediaLibrary(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="folder-open-outline" size={13} color="#7c3aed" style={{ marginRight: 4 }} />
                    <Text style={modalStyles.pickMediaBtnText}>Pick from Media Library</Text>
                  </TouchableOpacity>
                </View>

                {resolvedBanner && (
                  <View style={{ position: 'relative' }}>
                    <Image source={resolvedBanner} style={modalStyles.bannerPreview} resizeMode="cover" />
                    {form.bannerUrl ? (
                      <TouchableOpacity
                        style={modalStyles.bannerClearBtn}
                        onPress={() => setForm(p => ({ ...p, bannerUrl: '', bannerKey: 'banner1' }))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={22} color="#ffffff" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.bannerScroll}>
                  {LOCAL_BANNERS.map(b => (
                    <TouchableOpacity
                      key={b.key}
                      onPress={() => setForm(p => ({ ...p, bannerKey: b.key, bannerUrl: '' }))}
                      style={[
                        modalStyles.bannerThumb,
                        form.bannerKey === b.key && modalStyles.bannerThumbActive,
                      ]}
                    >
                      <Image source={b.src} style={modalStyles.bannerThumbImg} resizeMode="cover" />
                      {form.bannerKey === b.key && (
                        <View style={modalStyles.bannerCheckOverlay}>
                          <Ionicons name="checkmark-circle" size={22} color="#7c3aed" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={modalStyles.customBannerToggle}
                  onPress={() => setShowCustomBanner(p => !p)}
                >
                  <Ionicons name="link-outline" size={14} color={Colors.accent} style={{ marginRight: 5 }} />
                  <Text style={modalStyles.customBannerToggleText}>
                    {showCustomBanner ? 'Hide custom URL' : 'Use custom image URL'}
                  </Text>
                </TouchableOpacity>

                {showCustomBanner && (
                  <TextInput
                    style={[modalStyles.input, { marginTop: 8 }]}
                    placeholder="https://..."
                    placeholderTextColor={Colors.textMuted}
                    value={form.bannerUrl}
                    onChangeText={t => setForm(p => ({ ...p, bannerUrl: t, bannerKey: '' }))}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                )}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={modalStyles.saveBtn}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons
                      name={editingProgram ? 'save-outline' : 'checkmark-circle'}
                      size={17}
                      color="#fff"
                      style={{ marginRight: 7 }}
                    />
                    <Text style={modalStyles.saveBtnText}>
                      {editingProgram ? 'Save Changes' : 'Create Program'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>

      <MediaSelectionModal
        visible={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        allowedType="image"
        title="Select Banner Artwork"
        onSelect={(url) => {
          setForm(p => ({ ...p, bannerUrl: url, bannerKey: '' }));
          setShowMediaLibrary(false);
        }}
      />
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Memoized Program Card
// ────────────────────────────────────────────────────────────────────────────────

interface ProgramStats {
  songCount: number;
  heardCount: number;
  percent: number;
}

interface ProgramCardItemProps {
  item: Program;
  stats: ProgramStats;
  isOngoing: boolean;
  isPreRehearsal: boolean;
  isLoadingAction: boolean;
  onPress: () => void;
  onMenu: () => void;
}

const ProgramCardItem = React.memo(function ProgramCardItem({
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
              <Text style={styles.liveBadgeText}>ONGOING</Text>
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

      {/* Clean Inset Progress Box */}
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

      {/* Card Footer: Setlist navigation cue */}
      <View style={styles.cardFooterRow}>
        <Text style={styles.footerHintText}>
          {songCount > 0 ? 'Tap to view setlist queue' : 'Tap to add songs'}
        </Text>
        <View style={styles.openSetlistWrap}>
          <Text style={styles.openSetlistText}>Setlist Queue</Text>
          <Ionicons name="chevron-forward" size={13} color={Colors.accent} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ────────────────────────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────────────────────────

export default function ProgramsScreen({ navigation }: any) {
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();
  const { programs, allSongs, loading, refreshing, refetch, upsertProgram, removeProgram } = usePrograms();

  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const onRefresh = refetch;

  const handleProgramSaved = useCallback((savedProg?: any) => {
    if (!savedProg) return;
    upsertProgram(savedProg);
  }, []);

  const handleDuplicate = useCallback((program: Program) => {
    customAlert('Duplicate Program', `Create a copy of "${program.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          const copyPayload = {
            name: `${program.name} (Copy)`,
            date: new Date().toLocaleDateString('en-CA'),
            location: program.location,
            category: 'pre-rehearsal',
            status: 'pre-rehearsal',
            organizationId: program.organizationId || (program as any).zoneId,
            zoneId: (program as any).zoneId || program.organizationId,
            groupId: program.groupId || (program as any).subGroupId,
            subGroupId: (program as any).subGroupId || program.groupId,
            scope: (program as any).scope,
            songIds: program.songIds || [],
          };
          const res = await api.programs.create(copyPayload).catch(() => null);
          const copy = res?.data || {
            ...program,
            ...copyPayload,
            id: `prog-${Date.now()}`,
          };
          upsertProgram(copy);
          customAlert('Duplicated', 'Program duplicated successfully.');
        },
      },
    ]);
  }, []);

  const handleDelete = useCallback((program: Program) => {
    customAlert('Delete Program', `Delete "${program.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.programs.delete(program.id).catch(() => {});
          removeProgram(program.id);
        },
      },
    ]);
  }, []);

  const handleOpenMenu = useCallback(
    (program: Program) => {
      customAlert(
        program.name,
        'Manage this rehearsal program',
        [
          {
            text: 'Edit Details',
            onPress: () => {
              setEditingProgram(program);
              setShowProgramModal(true);
            },
          },
          {
            text: 'Duplicate',
            onPress: () => handleDuplicate(program),
          },
          {
            text: 'Delete Program',
            style: 'destructive',
            onPress: () => handleDelete(program),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    },
    [handleDuplicate, handleDelete]
  );

  const filteredPrograms = useMemo(() => {
    // usePrograms already handles zone/church scoping and HQ bleed removal.
    // Here we only apply UI-level filters: tab, search, and sort.
    let list = [...programs];

    // Status / Tab filter
    if (selectedTab !== 'all') {
      list = list.filter(p => normalizeProgramStage(p) === selectedTab);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q) ||
          (p.pageCategory || '').toLowerCase().includes(q)
      );
    }

    // Sort: ongoing first, then chronological descending
    list.sort((a, b) => {
      const aOngoing = normalizeProgramStage(a) === 'ongoing';
      const bOngoing = normalizeProgramStage(b) === 'ongoing';
      if (aOngoing && !bOngoing) return -1;
      if (!aOngoing && bOngoing) return 1;
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });

    return list;
  }, [programs, selectedTab, searchQuery]);

  const groupedPrograms = useMemo(() => {
    const groups: { year: string; data: Program[] }[] = [];
    filteredPrograms.forEach(p => {
      const yr = getProgramYear(p.date);
      const last = groups[groups.length - 1];
      if (last && last.year === yr) {
        last.data.push(p);
      } else {
        groups.push({ year: yr, data: [p] });
      }
    });
    return groups;
  }, [filteredPrograms]);

  const songStatsMap = useMemo(() => {
    const map: Record<string, ProgramStats> = {};
    if (!allSongs || allSongs.length === 0) return map;

    for (let i = 0; i < allSongs.length; i++) {
      const s = allSongs[i];
      const sPid = s.praiseNightId || s.praisenightid || s.praisenight_id || s.programId || s.pageId;
      if (!sPid) continue;
      const key = String(sPid);
      if (!map[key]) {
        map[key] = { songCount: 0, heardCount: 0, percent: 0 };
      }
      map[key].songCount++;
      if (s.status === 'heard' || s.isHeard || s.heard) {
        map[key].heardCount++;
      }
    }

    for (const key in map) {
      const stats = map[key];
      stats.percent = stats.songCount > 0 ? Math.round((stats.heardCount / stats.songCount) * 100) : 0;
    }
    return map;
  }, [allSongs]);

  const renderItem = useCallback(
    ({ item }: { item: Program }) => {
      const stage = normalizeProgramStage(item);
      const isOngoing = stage === 'ongoing';
      const isPreRehearsal = stage === 'pre-rehearsal';

      let stats = songStatsMap[String(item.id)];
      if (!stats) {
        const itemSongs = Array.isArray(item.songs) ? item.songs : [];
        const songCount = Array.isArray(item.songIds) && item.songIds.length > 0
          ? item.songIds.length
          : itemSongs.length;
        const heardCount = itemSongs.filter((s: any) => s.status === 'heard' || s.isHeard || s.heard).length;
        const percent = songCount > 0 ? Math.round((heardCount / songCount) * 100) : 0;
        stats = { songCount, heardCount, percent };
      }

      return (
        <ProgramCardItem
          item={item}
          stats={stats}
          isOngoing={isOngoing}
          isPreRehearsal={isPreRehearsal}
          isLoadingAction={actionLoadingId === item.id}
          onPress={() => navigation.navigate('ProgramSongs', { program: item })}
          onMenu={() => handleOpenMenu(item)}
        />
      );
    },
    [songStatsMap, actionLoadingId, navigation, handleOpenMenu]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader
        title={isChurchMode ? 'Church Programs' : 'Programs'}
        subtitle={
          isChurchMode
            ? (activeChurch?.name || 'Local church rehearsals & setlists')
            : (activeZone?.name || 'Rehearsal programs & setlists')
        }
        rightElement={
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => { setEditingProgram(null); setShowProgramModal(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.createBtnText}>New</Text>
          </TouchableOpacity>
        }
      />

      {/* Search and Filter Bar */}
      <View style={styles.topControlSection}>
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search sets, dates, venues..."
          filterOptions={TABS}
          activeFilter={selectedTab}
          onFilterChange={setSelectedTab}
        />
      </View>

      {/* Programs List Grouped By Year */}
      <SectionList
        sections={groupedPrograms}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accentBright}
            colors={[Colors.accentBright]}
          />
        }
        renderSectionHeader={({ section: { year, data } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionYearText}>{year}</Text>
            <View style={styles.sectionLine} />
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{data.length}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.accentBright} size="large" />
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title={searchQuery ? 'No matching programs' : 'No Programs Found'}
              description={
                searchQuery
                  ? 'Try a different search keyword.'
                  : isChurchMode
                  ? `No rehearsal programs scheduled for ${activeChurch?.name || 'this church choir'}.`
                  : 'No rehearsal programs scheduled for this zone.'
              }
            />
          )
        }
        renderItem={renderItem}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <ProgramModal
        visible={showProgramModal}
        editingProgram={editingProgram}
        activeZoneId={activeZone?.id}
        isChurchMode={isChurchMode}
        activeChurchId={activeChurch?.id}
        onClose={() => setShowProgramModal(false)}
        onSaved={handleProgramSaved}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  topControlSection: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  sectionYearText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  sectionCountBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7c3aed',
  },
  programCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  programCardOngoing: {
    borderColor: '#c4b5fd',
    backgroundColor: '#faf5ff',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.4,
  },
  prepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  prepBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#7c3aed',
    letterSpacing: 0.3,
  },
  archiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  archiveBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.3,
  },
  draftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  draftBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#2563eb',
    letterSpacing: 0.3,
  },
  pageCategoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    maxWidth: 130,
  },
  pageCategoryText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#475569',
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
    lineHeight: 22,
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardDateText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  cardMetaDot: {
    fontSize: 10,
    color: '#cbd5e1',
    marginHorizontal: 6,
  },
  cardLocationText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    flexShrink: 1,
  },
  progressSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  progressStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  songCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressSongCount: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  progressPercentText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7c3aed',
    fontVariant: ['tabular-nums'],
  },
  progressPercentCompleted: {
    color: '#059669',
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 999,
  },
  progressBarFillCompleted: {
    backgroundColor: '#10b981',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerHintText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  openSetlistWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  openSetlistText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#7c3aed',
  },
});

// Modal styles
const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a', letterSpacing: -0.3 },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 18, paddingTop: 16 },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 44,
    color: '#0f172a',
    fontSize: 14,
  },
  textarea: { height: 80, paddingVertical: 10 },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  presetChipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  presetChipTextActive: { color: '#ffffff' },
  suggestionsBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  stageRow: { flexDirection: 'row', gap: 8 },
  stageChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stageChipText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  labelWithActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pickMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  pickMediaBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#7c3aed',
  },
  bannerSection: { marginTop: 4 },
  bannerPreview: {
    width: '100%',
    height: 120,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#f1f5f9',
  },
  bannerClearBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 14,
    padding: 2,
  },
  bannerScroll: { flexGrow: 0, marginBottom: 8 },
  bannerThumb: {
    width: 72,
    height: 52,
    borderRadius: 10,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bannerThumbActive: { borderColor: Colors.accent },
  bannerThumbImg: { width: '100%', height: '100%' },
  bannerCheckOverlay: {
    position: 'absolute',
    inset: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBannerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  customBannerToggleText: { fontSize: 12, color: Colors.accent, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  // ── Inline Category Creation Styles ───────────────────────────────────────
  addCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  addCategoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  newCategoryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 10,
    padding: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  newCategoryTextInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0f172a',
  },
  addCategoryConfirmBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addCategoryConfirmBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  addCategoryCancelBtn: {
    padding: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

export { ProgramsScreen, ProgramsScreen as ProgramScreen };
