import { useState, useRef, useCallback, useEffect } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { customAlert } from '../../context/AlertContext';

interface UseSongAudioPlayerProps {
  setSongImageUrl: (url: string) => void;
  setSongAudioFile: (url: string) => void;
  setCoordinatorAudioUrl: (url: string) => void;
  setAudioUrls: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function useSongAudioPlayer({
  setSongImageUrl,
  setSongAudioFile,
  setCoordinatorAudioUrl,
  setAudioUrls,
}: UseSongAudioPlayerProps) {
  const soundRef = useRef<AudioPlayer | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'audio' | 'image'>('audio');

  const stopAudio = useCallback(async () => {
    try {
      if (soundRef.current) {
        soundRef.current.pause();
        soundRef.current.remove();
        soundRef.current = null;
      }
    } catch {
      // ignore
    } finally {
      setPlayingAudioUrl(null);
      setAudioLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  const handleTogglePlay = async (url: string) => {
    if (!url) return;
    if (playingAudioUrl === url) {
      await stopAudio();
      return;
    }
    await stopAudio();
    setAudioLoading(true);
    setPlayingAudioUrl(url);
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      const player = createAudioPlayer({ uri: url });
      (player as any).addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) setPlayingAudioUrl(null);
      });
      player.play();
      soundRef.current = player;
    } catch {
      customAlert('Playback Error', 'Unable to play this audio track.');
      setPlayingAudioUrl(null);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleOpenMediaSelector = (part: string, type: 'audio' | 'image' = 'audio') => {
    setMediaTarget(part);
    setMediaType(type);
    setShowMediaModal(true);
  };

  const handleMediaSelected = (url: string) => {
    if (!mediaTarget) return;
    if (mediaTarget === 'image') setSongImageUrl(url);
    else if (mediaTarget === 'mainAudio') setSongAudioFile(url);
    else if (mediaTarget === 'commentAudio') setCoordinatorAudioUrl(url);
    else setAudioUrls(prev => ({ ...prev, [mediaTarget]: url }));
    setShowMediaModal(false);
    setMediaTarget(null);
  };

  return {
    playingAudioUrl,
    audioLoading,
    stopAudio,
    handleTogglePlay,
    showMediaModal,
    setShowMediaModal,
    mediaType,
    handleOpenMediaSelector,
    handleMediaSelected,
  };
}
