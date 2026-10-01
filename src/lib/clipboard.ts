import { Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Copies text to the system clipboard across Web, iOS, and Android.
 * Features a 3-layer fallback:
 * 1. expo-clipboard setStringAsync
 * 2. Web navigator.clipboard.writeText
 * 3. Web DOM textarea + execCommand('copy')
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try expo-clipboard
  try {
    const success = await Clipboard.setStringAsync(text);
    if (success !== false) return true;
  } catch (err) {
    console.warn('[clipboard] expo-clipboard setStringAsync failed, trying fallbacks:', err);
  }

  // 2. Try web navigator.clipboard
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[clipboard] navigator.clipboard.writeText failed:', err);
    }
  }

  // 3. Web DOM fallback using hidden textarea + execCommand('copy')
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) return true;
    } catch (err) {
      console.warn('[clipboard] execCommand fallback failed:', err);
    }
  }

  return false;
}
