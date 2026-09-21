import { MasterSong } from '../MasterSongDetailModal';

export interface MasterEditSongModalProps {
  visible: boolean;
  song?: MasterSong | null;
  mode?: 'edit' | 'create';
  onClose: () => void;
  onSaved: (song: MasterSong, isNew: boolean) => void;
}

export const SONG_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const DEFAULT_COLLECTIONS = [
 
];
