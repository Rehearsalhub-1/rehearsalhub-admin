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

/** Returns every non-empty category a song belongs to. */
export function getSongAllCategories(s: PraiseSong): string[] {
  const result = new Set<string>();
  if (s.category?.trim()) result.add(s.category.trim());
  if (Array.isArray(s.categories)) {
    s.categories.forEach(c => { if (c?.trim()) result.add(c.trim()); });
  }
  return Array.from(result);
}

/** Returns the primary display category (first non-empty value). */
export function getSongDisplayCategory(s: PraiseSong): string | null {
  const all = getSongAllCategories(s);
  return all.length > 0 ? all[0] : null;
}
