import { useState, useRef, useCallback, useEffect } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { customAlert } from '../../context/AlertContext';
import { MediaItem } from './types';

export function useMediaAudioPlayer() {
  const [activeAudioItem, setActiveAudioItem] = useState<MediaItem | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [playbackPos, setPlaybackPos] = useState<number>(0);
  const [playbackDur, setPlaybackDur] = useState<number>(0);
  const [showFullPlayerModal, setShowFullPlayerModal] = useState<boolean>(false);
  const soundRef = useRef<AudioPlayer | null>(null);

  const stopCurrentAudio = useCallback(async () => {
    if (soundRef.current) {
      try {
        soundRef.current.pause();
        soundRef.current.remove();
      } catch {}
      soundRef.current = null;
    }
    setIsPlaying(false);
    setIsBuffering(false);
    setPlaybackPos(0);
    setPlaybackDur(0);
  }, []);

  const closeAudioPlayer = useCallback(async () => {
    await stopCurrentAudio();
    setActiveAudioItem(null);
    setShowFullPlayerModal(false);
  }, [stopCurrentAudio]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [stopCurrentAudio]);

  const handleTogglePlay = async (item: MediaItem) => {
    if (activeAudioItem?.id === item.id) {
      if (isPlaying) {
        if (soundRef.current) {
          try {
            soundRef.current.pause();
          } catch {}
        }
        setIsPlaying(false);
      } else {
        if (soundRef.current) {
          try {
            if (soundRef.current.currentTime >= soundRef.current.duration && soundRef.current.duration > 0) {
              await soundRef.current.seekTo(0);
            }
            soundRef.current.play();
            setIsPlaying(true);
          } catch {}
        }
      }
      return;
    }

    await stopCurrentAudio();
    if (!item.url) {
      customAlert('No Audio Stream', 'This media track does not have an audio stream URL.');
      return;
    }

    setActiveAudioItem(item);
    setIsBuffering(true);
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });

      const player = createAudioPlayer({ uri: item.url }, { updateInterval: 250 });
      (player as any).addListener('playbackStatusUpdate', (status: any) => {
        setPlaybackPos((status.currentTime || 0) * 1000);
        setPlaybackDur((status.duration || 0) * 1000);
        setIsPlaying(status.playing);
        setIsBuffering(status.isBuffering);
        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlaybackPos(0);
        }
      });

      player.play();
      soundRef.current = player;
      setIsPlaying(true);
    } catch (err: any) {
      customAlert('Playback Notice', 'Could not stream audio: ' + (err?.message || 'Unsupported format'));
      setActiveAudioItem(null);
    } finally {
      setIsBuffering(false);
    }
  };

  const handleSeekRelative = async (offsetMillis: number) => {
    if (!soundRef.current) return;
    try {
      const newPosMs = Math.max(0, Math.min(playbackDur, playbackPos + offsetMillis));
      await soundRef.current.seekTo(newPosMs / 1000);
      setPlaybackPos(newPosMs);
    } catch {}
  };

  return {
    activeAudioItem,
    setActiveAudioItem,
    isPlaying,
    isBuffering,
    playbackPos,
    playbackDur,
    showFullPlayerModal,
    setShowFullPlayerModal,
    soundRef,
    stopCurrentAudio,
    closeAudioPlayer,
    handleTogglePlay,
    handleSeekRelative,
  };
}
