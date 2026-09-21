import { Ionicons } from '@expo/vector-icons';
import type { Program } from '../../hooks/usePrograms';

export const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Ongoing', value: 'ongoing' },
  { label: 'Pre-Reh', value: 'pre-rehearsal' },
  { label: 'Archive', value: 'archive' },
  { label: 'Draft', value: 'draft' },
];

export function formatDisplayDate(dateStr?: string) {
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

export function getProgramYear(dateStr?: string) {
  if (!dateStr) return 'Other';
  const parsed = new Date(dateStr);
  if (parsed && !isNaN(parsed.getTime())) {
    return parsed.getFullYear().toString();
  }
  const match = dateStr.match(/\b(19\d\d|20\d\d)\b/);
  if (match) return match[1];
  return 'Other';
}

export function getDatePresets() {
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

export const VENUE_SUGGESTIONS = [
  'Main Auditorium',
  'Crusade Grounds',
  'Studio A',
  'Oasis Studio',
  'Zone Hall',
  'Outdoor Stage',
];

export const LOCAL_BANNERS: { key: string; src: any }[] = [
  { key: 'banner1', src: require('../../../assets/banners/banner1.jpg') },
  { key: 'banner2', src: require('../../../assets/banners/banner2.jpg') },
  { key: 'banner3', src: require('../../../assets/banners/banner3.jpg') },
  { key: 'banner4', src: require('../../../assets/banners/banner4.jpg') },
  { key: 'banner5', src: require('../../../assets/banners/banner5.jpg') },
  { key: 'banner6', src: require('../../../assets/banners/banner6.jpg') },
  { key: 'banner7', src: require('../../../assets/banners/banner7.webp') },
  { key: 'banner8', src: require('../../../assets/banners/banner8.jpg') },
  { key: 'banner9', src: require('../../../assets/banners/banner9.jpg') },
];

export type ProgramStage = 'ongoing' | 'pre-rehearsal' | 'archive' | 'draft';

export const STAGE_OPTIONS: {
  value: ProgramStage;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
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

export const DEFAULT_PROGRAM_CATEGORIES = [
  'Praise Night',
  'Special Service',
  'Communion Service',
  'Leaders Conference',
  'Sunday Service',
  'Midweek Service',
  'Easter Concert',
];
