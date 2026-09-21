export interface SongSubmissionMessage {
  id: string;
  sender: 'user' | 'admin';
  senderId?: string;
  senderName: string;
  message: string;
  timestamp: string;
  isEdited?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  } | null;
  reactions?: Record<string, string[]>;
}

export interface SongSubmission {
  id: string;
  title: string;
  artist?: string;
  writer?: string;
  lyrics?: string;
  audioUrl?: string;
  category?: string;
  key?: string;
  tempo?: string;
  solfas?: string;
  notes?: string;
  rejectNotes?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  zoneId?: string;
  zoneName?: string;
  submittedBy?: any;
  submittedByEmail?: string;
  createdAt: string;
  conversation?: SongSubmissionMessage[];
  rawData?: any;
}

export const QUICK_FEEDBACK_CHIPS = [
  '🎵 Approved for Praise Night!',
  '🎹 Needs piano accompaniment track',
  '🎙️ Please re-record vocals in Key G',
  '✨ Excellent lyrics & arrangement',
  '📝 Please update verse 2 lyrics',
  '🔄 Revision requested on tempo',
];

export function getCleanSubmitterName(song?: SongSubmission | null): { name: string; date: string } {
  if (!song) return { name: 'Member', date: '' };
  let name = '';
  let date = song.createdAt || '';

  const raw = song.submittedBy || song.rawData?.submittedBy || song.rawData?.submittedByName;
  if (typeof raw === 'object' && raw !== null) {
    name = raw.userName || raw.name || raw.firstName || (raw.email ? raw.email.split('@')[0] : '');
    if (raw.submittedAt) date = raw.submittedAt;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      name = parsed.userName || parsed.name || parsed.firstName || '';
      if (parsed.submittedAt) date = parsed.submittedAt;
    } catch {
      name = raw;
    }
  }

  if (!name || name === 'Unknown') {
    name = song.submittedByEmail?.split('@')[0] || song.writer || song.artist || 'Member';
  }

  let formattedDate = '';
  try {
    if (date) {
      formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  } catch {
    formattedDate = '';
  }

  return { name, date: formattedDate };
}
