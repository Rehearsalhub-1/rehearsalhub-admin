import React from 'react';
import SongModal from '../../components/SongModal';
import { CreateSongModalProps, PraiseSong } from './types';

export default function CreateSongModal({
  visible,
  programId,
  existingIds,
  onClose,
  onCreated,
}: CreateSongModalProps) {
  return (
    <SongModal
      visible={visible}
      song={null}
      programId={programId}
      existingSongIds={existingIds}
      onClose={onClose}
      onSaved={(newSong) => onCreated(newSong as PraiseSong)}
    />
  );
}
