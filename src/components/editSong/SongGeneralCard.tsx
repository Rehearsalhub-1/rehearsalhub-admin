import React from 'react';
import SongBasicDetailsCard, { SongBasicDetailsCardProps } from './SongBasicDetailsCard';
import SongMusicDetailsCard, { SongMusicDetailsCardProps } from './SongMusicDetailsCard';

export type SongGeneralCardProps = SongBasicDetailsCardProps & SongMusicDetailsCardProps;

export default function SongGeneralCard(props: SongGeneralCardProps) {
  return (
    <>
      <SongBasicDetailsCard {...props} />
      <SongMusicDetailsCard {...props} />
    </>
  );
}
