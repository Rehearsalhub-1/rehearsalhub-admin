export interface PraiseSong {
  id: string;
  title?: string;
  key?: string;
  tempo?: string;
  leadSinger?: string;
  conductor?: string;
  writer?: string;
  category?: string;
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
  customParts?: Record<string, string> | string[];
  leadKeyboardist?: string;
  leadGuitarist?: string;
  bassGuitarist?: string;
  drummer?: string;
  coordinatorComment?: string;
  coordinatorAudioUrl?: string;
  isActive?: boolean;
  isLive?: boolean;
  isHeard?: boolean;
  heard?: boolean;
  status?: string;
  comments?: any[];
  programId?: string;
  praiseNightId?: string;
}

export interface MasterSong {
  id: string;
  title?: string;
  writer?: string;
  leadSinger?: string;
  conductor?: string;
  conductorGuide?: string;
  key?: string;
  tempo?: string;
  category?: string;
  categories?: string[];
  audioFile?: string;
  audioUrl?: string;
  audioUrls?: Record<string, string>;
  customParts?: Record<string, string> | string[];
  lyrics?: string;
  solfa?: string;
  solfas?: string;
  notation?: string;
  imageUrl?: string;
  image?: string;
  leadKeyboardist?: string;
  leadGuitarist?: string;
  bassGuitarist?: string;
  drummer?: string;
  comments?: any[] | string;
  notes?: string;
  coordinatorComment?: string;
  coordinatorAudioUrl?: string;
  rehearsalCount?: number;
}

export interface Program {
  id: string;
  name?: string;
  date?: string;
  location?: string;
  status?: string;
  category?: string;
  description?: string;
  songIds?: string[];
  categoryOrder?: string[];
}

export interface SongDetailsModalProps {
  visible: boolean;
  song: PraiseSong | null;
  programId?: string;
  onClose: () => void;
  onSave: (updated: PraiseSong) => void;
  onDelete?: (id: string) => void;
}

export interface CloneModalProps {
  visible: boolean;
  programId: string;
  existingIds: string[];
  onClose: () => void;
  onCloned: (clonedSong?: PraiseSong) => void;
}

export interface CreateSongModalProps {
  visible: boolean;
  programId: string;
  existingIds: string[];
  onClose: () => void;
  onCreated: (newSong?: PraiseSong) => void;
}

export interface EditProgramModalProps {
  visible: boolean;
  program: Program;
  onClose: () => void;
  onSaved: (updated: Program) => void;
}
