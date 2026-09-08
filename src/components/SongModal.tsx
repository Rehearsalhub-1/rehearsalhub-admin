import React from 'react';
import EditSongModal, { PraiseNightSong } from './EditSongModal';

export type SongData = PraiseNightSong;

export interface SongModalProps {
  visible: boolean;
  song: SongData | null;
  programId?: string;
  programName?: string;
  existingSongIds?: string[];
  praiseNights?: Array<{ id: string; name: string }>;
  categories?: string[];
  onClose: () => void;
  onSaved?: (saved: SongData, isNew: boolean) => void;
  onUpdate?: (updatedSong: SongData) => void;
  onDelete?: (songId: string) => void;
}

export default function SongModal({
  visible,
  song,
  programId = '',
  programName = 'Praise Night 25',
  existingSongIds = [],
  praiseNights,
  categories,
  onClose,
  onSaved,
  onUpdate,
  onDelete,
}: SongModalProps) {
  const isEditing = Boolean(song && song.id);

  const handleUpdate = (updatedSong: SongData) => {
    if (onUpdate) {
      onUpdate(updatedSong);
    }
    if (onSaved) {
      onSaved(updatedSong, !isEditing);
    }
  };

  return (
    <EditSongModal
      visible={visible}
      song={song}
      programId={programId}
      programName={programName}
      praiseNights={praiseNights}
      categories={categories}
      onClose={onClose}
      onUpdate={handleUpdate}
      onDelete={onDelete}
    />
  );
}

export { EditSongModal };
