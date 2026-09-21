export interface PraiseNightSong {
  id?: string;
  title?: string;
  key?: string;
  tempo?: string;
  leadSinger?: string;
  conductor?: string;
  writer?: string;
  category?: string | null;
  categories?: string[];
  lyrics?: string;
  solfa?: string;
  solfas?: string;
  notation?: string;
  rehearsalCount?: number;
  imageUrl?: string;
  audioFile?: string;
  audioUrl?: string;
  audioUrls?: Record<string, string>;
  customParts?: string[] | Record<string, string>;
  leadKeyboardist?: string;
  leadGuitarist?: string;
  drummer?: string;
  coordinatorComment?: string;
  coordinatorAudioUrl?: string;
  isActive?: boolean;
  isHeard?: boolean;
  heard?: boolean;
  status?: 'heard' | 'unheard' | string;
  comments?: any[];
  programId?: string;
  programName?: string;
  praiseNightId?: string;
  praiseNightName?: string;
  history?: any[];
  isHQOnly?: boolean;
  is_hq_only?: boolean;
  isHqOnly?: boolean;
  scope?: string;
  isHidden?: boolean;
}

export type EditSongTab = 'details' | 'lyrics' | 'audio' | 'personnel' | 'all';

export interface EditSongModalProps {
  visible: boolean;
  song: PraiseNightSong | null;
  programId?: string;
  programName?: string;
  programs?: Array<{ id: string; name: string }>;
  praiseNights?: Array<{ id: string; name: string }>;
  categories?: string[];
  isMaster?: boolean;
  initialTab?: EditSongTab;
  onClose: () => void;
  onUpdate: (updatedSong: PraiseNightSong) => void;
  onDelete?: (songId: string) => void;
}

export const DEFAULT_CATEGORIES = [
  'Praise',
  'Thanksgiving',
  'Anthem',
  'Special',
  'Hymn',
  'Evangelism',
  'Choir Special',
];

export const EDIT_SONG_TABS = [
  { id: 'details', label: 'Details', icon: 'document-text-outline' },
  { id: 'lyrics', label: 'Lyrics & Solfa', icon: 'musical-notes-outline' },
  { id: 'audio', label: 'AudioLab', icon: 'headset-outline' },
  { id: 'personnel', label: 'Personnel', icon: 'people-outline' },
  { id: 'all', label: 'All Cards', icon: 'grid-outline' },
] as const;
