import { PraiseSong } from './types';

export function addSong(songIds: string[], newId: string): string[] {
  if (songIds.includes(newId)) return songIds;
  return [...songIds, newId];
}

export function removeSong(songIds: string[], removeId: string): string[] {
  return songIds.filter(id => id !== removeId);
}

export const SONG_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const STATUS_OPTIONS: { value: string; label: string; color: string; bg: string; border: string }[] = [
  { value: 'ongoing', label: '🟢 Ongoing', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  { value: 'pre-rehearsal', label: '🟡 Pre-Reh', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  { value: 'archive', label: '📦 Archive', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  { value: 'draft', label: '📝 Draft', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
];

export function formatDisplayDate(dateStr?: string) {
  if (!dateStr) return 'Date TBD';
  const parsed = new Date(dateStr);
  if (!parsed || isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getSongDisplayCategory(s: PraiseSong): string | null {
  const primary = s.category?.trim();
  if (primary) return primary;
  if (Array.isArray(s.categories) && s.categories.length > 0) {
    const first = s.categories.find(c => c && c.trim());
    if (first) return first.trim();
  }
  return null;
}
