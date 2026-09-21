import { Ionicons } from '@expo/vector-icons';

export type MediaType = 'audio' | 'video' | 'image' | 'document';

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  videoUrl?: string;
  type: MediaType;
  size?: number | string;
  thumbnail?: string | null;
  description?: string;
  uploadedAt?: string;
  folder?: string;
  views?: number;
  forHq?: boolean;
  zoneId?: string;
}

export type CategoryFilter = 'all' | 'audio' | 'video' | 'image' | 'document';

export const CATEGORY_TABS: { id: CategoryFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'All', icon: 'albums-outline' },
  { id: 'audio', label: 'Audio Stems', icon: 'musical-notes-outline' },
  { id: 'video', label: 'Videos', icon: 'videocam-outline' },
  { id: 'image', label: 'Photos & Images', icon: 'image-outline' },
  { id: 'document', label: 'Scores & Sheets', icon: 'document-text-outline' },
];
