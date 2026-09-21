import React from 'react';
import SongModal from '../../components/SongModal';
import { SongDetailsModalProps, PraiseSong } from './types';

export default function SongDetailsModal({
  visible,
  song,
  programId = '',
  onClose,
  onSave,
  onDelete,
}: SongDetailsModalProps) {
  return (
    <SongModal
      visible={visible}
      song={song}
      programId={programId}
      onClose={onClose}
      onSaved={(updated) => onSave(updated as PraiseSong)}
      onDelete={onDelete}
    />
  );
}
