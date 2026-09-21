import React from 'react';
import { ProgramModal } from '../ProgramsScreen';
import { EditProgramModalProps } from './types';

export default function EditProgramModal({
  visible,
  program,
  onClose,
  onSaved,
}: EditProgramModalProps) {
  return (
    <ProgramModal
      visible={visible}
      editingProgram={program as any}
      activeZoneId={(program as any).zoneId}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
