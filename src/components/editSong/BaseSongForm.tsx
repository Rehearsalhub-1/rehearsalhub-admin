import React from 'react';
import { View } from 'react-native';
import { styles } from './editSongStyles';
import SongGeneralCard from './SongGeneralCard';
import SongAudioStemsCard from './SongAudioStemsCard';
import SongPersonnelCard from './SongPersonnelCard';
import SongLyricsCard from './SongLyricsCard';
import SongCommentsCard from './SongCommentsCard';

export type EditSongTab = 'details' | 'lyrics' | 'audio' | 'personnel' | 'all';

export interface BaseSongFormProps {
  activeTab: EditSongTab;
  isDesktop: boolean;
  isTablet: boolean;
  isMedium: boolean;
  isSmallPhone: boolean;
  isMaster: boolean;

  // General & Music Details
  songTitle: string;
  setSongTitle: (val: string) => void;
  songCategories: string[];
  setSongCategories: React.Dispatch<React.SetStateAction<string[]>>;
  availableCategories: string[];
  showNewCategoryInput: boolean;
  setShowNewCategoryInput: (val: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (val: string) => void;
  handleAddNewCategory: () => void;
  toggleCategory: (cat: string) => void;
  songStatus: 'heard' | 'unheard';
  setShowStatusPicker: (val: boolean) => void;
  isSongActive: boolean;
  setIsSongActive: (val: boolean) => void;
  isHQOnly: boolean;
  setIsHQOnly: (val: boolean) => void;
  songImageUrl: string;
  setSongImageUrl: (val: string) => void;
  handleOpenMediaSelector: (target: string, type: 'audio' | 'image') => void;
  songKey: string;
  setSongKey: (val: string) => void;
  songTempo: string;
  setSongTempo: (val: string) => void;
  rehearsalCount: number;
  setRehearsalCount: (val: number) => void;
  songAudioFile: string;
  setSongAudioFile: (val: string) => void;
  playingAudioUrl: string | null;
  audioLoading: boolean;
  handleTogglePlay: (url: string) => void;
  handleAddHistory: (type: string) => void;

  // AudioLab Stems
  showAddPart: boolean;
  setShowAddPart: (val: boolean) => void;
  newPartName: string;
  setNewPartName: (val: string) => void;
  handleAddCustomPart: () => void;
  handleRemoveCustomPart: (part: string) => void;
  handleRemoveAudioPart: (part: string) => void;
  audioUrls: Record<string, string>;
  customParts: string[];

  // Personnel
  songLeadSinger: string;
  setSongLeadSinger: (val: string) => void;
  songWriter: string;
  setSongWriter: (val: string) => void;
  songConductor: string;
  setSongConductor: (val: string) => void;
  songLeadKeyboardist: string;
  setSongLeadKeyboardist: (val: string) => void;
  songLeadGuitarist: string;
  setSongLeadGuitarist: (val: string) => void;
  songBassGuitarist: string;
  setSongBassGuitarist: (val: string) => void;
  songDrummer: string;
  setSongDrummer: (val: string) => void;

  // Lyrics & Solfa
  songLyrics: string;
  setSongLyrics: (val: string) => void;
  lyricsSelection: { start: number; end: number };
  setLyricsSelection: (val: { start: number; end: number }) => void;
  setShowFullscreenLyrics: (val: boolean) => void;
  songSolfas: string;
  setSongSolfas: (val: string) => void;
  songNotation: string;
  setSongNotation: (val: string) => void;

  // Comments
  coordinatorComment: string;
  setCoordinatorComment: (val: string) => void;
  coordinatorAudioUrl: string;
  setCoordinatorAudioUrl: (val: string) => void;
}

export default function BaseSongForm(props: BaseSongFormProps) {
  const { activeTab, isDesktop } = props;

  const renderCardGeneral = () => <SongGeneralCard {...props} />;
  const renderCardStems = () => <SongAudioStemsCard {...props} />;
  const renderCardPersonnel = () => <SongPersonnelCard {...props} />;
  const renderCardLyrics = () => <SongLyricsCard {...props} />;
  const renderCardComments = () => <SongCommentsCard {...props} />;

  if (activeTab === 'details') {
    return <View style={{ gap: 16 }}>{renderCardGeneral()}</View>;
  }

  if (activeTab === 'lyrics') {
    return <View style={{ gap: 16 }}>{renderCardLyrics()}</View>;
  }

  if (activeTab === 'audio') {
    return <View style={{ gap: 16 }}>{renderCardStems()}</View>;
  }

  if (activeTab === 'personnel') {
    return (
      <View style={{ gap: 16 }}>
        {renderCardPersonnel()}
        {renderCardComments()}
      </View>
    );
  }

  if (activeTab === 'all') {
    return isDesktop ? (
      <View style={styles.desktopTwoColContainer}>
        <View style={styles.desktopLeftCol}>
          {renderCardGeneral()}
          {renderCardStems()}
          {renderCardPersonnel()}
        </View>
        <View style={styles.desktopRightCol}>
          {renderCardLyrics()}
          {renderCardComments()}
        </View>
      </View>
    ) : (
      <View style={{ gap: 16 }}>
        {renderCardGeneral()}
        {renderCardStems()}
        {renderCardPersonnel()}
        {renderCardLyrics()}
        {renderCardComments()}
      </View>
    );
  }

  return null;
}
