import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { api } from '../../services/api';
import MediaSelectionModal from '../../components/MediaSelectionModal';
import { modalStyles } from './programModalStyles';
import {
  getDatePresets,
  VENUE_SUGGESTIONS,
  DEFAULT_PROGRAM_CATEGORIES,
  STAGE_OPTIONS,
  normalizeProgramStage,
  type ProgramStage,
} from './programUtils';
import type { Program } from '../../hooks/usePrograms';
import { ProgramCategorySection } from './ProgramCategorySection';
import { ProgramBannerPicker } from './ProgramBannerPicker';

export interface ProgramModalProps {
  visible: boolean;
  editingProgram: Program | null;
  activeZoneId?: string;
  isChurchMode?: boolean;
  activeChurchId?: string;
  onClose: () => void;
  onSaved: (updatedProgram?: any) => void;
}

export default function ProgramModal({
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
  const [newCategoryName, setNewCategoryName] = useState(''), [newCategoryImageUrl, setNewCategoryImageUrl] = useState('');
  const [mediaTarget, setMediaTarget] = useState<'banner' | 'category'>('banner');

  const [form, setForm] = useState({
    name: '', date: new Date().toLocaleDateString('en-CA'), location: '',
    category: 'pre-rehearsal' as ProgramStage, pageCategory: 'Praise Night',
    description: '', bannerKey: '' as string, bannerUrl: '',
  });
  const [formError, setFormError] = useState(''), [saving, setSaving] = useState(false);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);
  const [showCustomBanner, setShowCustomBanner] = useState(false), [showMediaLibrary, setShowMediaLibrary] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingProgram) {
        const existingCat = editingProgram.pageCategory || 'Praise Night';
        const initialStage = normalizeProgramStage(editingProgram);
        setForm({
          name: editingProgram.name || '', date: editingProgram.date || '', location: editingProgram.location || '',
          category: initialStage, pageCategory: existingCat, description: editingProgram.description || '',
          bannerKey: (editingProgram as any).bannerKey || '', bannerUrl: editingProgram.bannerImage || '',
        });
        setAvailablePageCategories(prev => Array.from(new Set([...DEFAULT_PROGRAM_CATEGORIES, ...prev, existingCat])));
      } else {
        setForm({
          name: '', date: new Date().toLocaleDateString('en-CA'), location: '',
          category: 'pre-rehearsal', pageCategory: 'Praise Night',
          description: '', bannerKey: 'banner1', bannerUrl: '',
        });
      }
      setFormError(''); setShowVenueSuggestions(false); setShowCustomBanner(false);
      setShowNewCategoryInput(false); setNewCategoryName(''); setNewCategoryImageUrl('');

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

  const handleAddNewCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (!availablePageCategories.includes(trimmed)) {
      setAvailablePageCategories(prev => [...prev, trimmed]);
    }
    setForm(p => ({ ...p, pageCategory: trimmed }));

    const categoryImageToSave = newCategoryImageUrl || form.bannerUrl || undefined;

    setNewCategoryName('');
    setNewCategoryImageUrl('');
    setShowNewCategoryInput(false);

    try {
      await api.categories.create({
        name: trimmed,
        type: 'PAGE',
        color: '#7c3aed',
        image: categoryImageToSave,
      });
    } catch (e) {
      console.warn('[handleAddNewCategory] Failed to save category to backend:', e);
    }
  };

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Program name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(), date: form.date.trim(), location: form.location.trim(),
        category: form.category, status: form.category, stage: form.category,
        isActive: form.category === 'ongoing', isArchived: form.category === 'archive',
        pageCategory: form.pageCategory, description: form.description.trim(),
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
              <ProgramCategorySection
                availablePageCategories={availablePageCategories}
                selectedCategory={form.pageCategory}
                onSelectCategory={cat => setForm(p => ({ ...p, pageCategory: cat }))}
                showNewCategoryInput={showNewCategoryInput}
                setShowNewCategoryInput={setShowNewCategoryInput}
                newCategoryName={newCategoryName}
                setNewCategoryName={setNewCategoryName}
                newCategoryImageUrl={newCategoryImageUrl}
                onPickCategoryImage={() => {
                  setMediaTarget('category');
                  setShowMediaLibrary(true);
                }}
                onAddNewCategory={handleAddNewCategory}
              />

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
              <ProgramBannerPicker
                bannerKey={form.bannerKey}
                bannerUrl={form.bannerUrl}
                onSelectBannerKey={key => setForm(p => ({ ...p, bannerKey: key, bannerUrl: '' }))}
                onChangeBannerUrl={url => setForm(p => ({ ...p, bannerUrl: url, bannerKey: '' }))}
                onClearBanner={() => setForm(p => ({ ...p, bannerUrl: '', bannerKey: 'banner1' }))}
                showCustomBanner={showCustomBanner}
                setShowCustomBanner={setShowCustomBanner}
                onOpenMediaLibrary={() => {
                  setMediaTarget('banner');
                  setShowMediaLibrary(true);
                }}
              />

              {/* Save Button */}
              <TouchableOpacity
                style={modalStyles.saveBtn}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={modalStyles.saveBtnText}>
                    {editingProgram ? 'Save Changes' : 'Create Program'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {/* Media Selection Modal */}
        <MediaSelectionModal
          visible={showMediaLibrary}
          onClose={() => setShowMediaLibrary(false)}
          allowedType="image"
          title={mediaTarget === 'banner' ? 'Pick Program Banner Artwork' : 'Pick Category Banner Artwork'}
          onSelect={url => {
            if (mediaTarget === 'category') {
              setNewCategoryImageUrl(url);
            } else {
              setForm(p => ({ ...p, bannerUrl: url, bannerKey: '' }));
            }
            setShowMediaLibrary(false);
          }}
        />
      </View>
    </Modal>
  );
}

export { ProgramModal };
