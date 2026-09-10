import 'expo-audio';

declare module 'expo-audio' {
  interface AudioPlayer {
    addListener(eventName: string, listener: (status: any) => void): { remove: () => void };
  }
}
