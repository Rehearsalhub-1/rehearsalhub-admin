export interface ScheduleSlot {
  id: string;
  weekId?: string;
  dayId?: string;
  time: string;
  title: string;
  key?: string;
  allotment: number | string;
  status: 'rehearsed' | 'not-rehearsed' | 'break';
  note?: string;
}

export interface NewSongItem {
  id: string;
  title: string;
  key?: string;
  duration?: string;
  submittedBy?: string;
  submittedOn?: string;
}

export interface CarriedSongItem {
  id: string;
  title: string;
  rehearsalCount?: number;
  originalProgram?: string;
  key?: string;
  reason?: string;
}

export interface SwappedSongItem {
  id: string;
  original: string;
  replacement: string;
  swappedBy?: string;
  swappedOn?: string;
  reason?: string;
}

export interface NameChangeItem {
  id: string;
  from: string;
  to: string;
  changedBy?: string;
  changedOn?: string;
  reason?: string;
}

export interface InvalidSongItem {
  id: string;
  title: string;
  invalidatedBy?: string;
  replacedBy?: string;
  date?: string;
  reason?: string;
}

export interface SubmitterItem {
  id: string;
  name: string;
  role?: string;
  submissions?: number;
  quota?: number;
  isBlocked?: boolean;
  since?: string;
  reason?: string;
}

export interface ScheduleProgram {
  id: string;
  name: string;
  date?: string;
  category?: string;
  status?: string;
  zoneId?: string;
  organizationId?: string;
  subGroupId?: string;
  isCurrent?: boolean;
  isArchived?: boolean;
  currentWeekId?: string;
  currentDayId?: string;
  weeks?: { id: string; name: string }[];
  days?: { id: string; weekId: string; name: string }[];
  dailySchedules?: ScheduleSlot[];
  newSongs?: NewSongItem[];
  carriedOver?: CarriedSongItem[];
  swapped?: SwappedSongItem[];
  nameChanges?: NameChangeItem[];
  invalidSongs?: InvalidSongItem[];
  submitters?: SubmitterItem[];
  createdAt?: string;
  updatedAt?: string;
}

export const TABS = [
  { id: 'schedule', label: 'Daily Schedule', icon: 'calendar' },
  { id: 'new', label: 'New Songs', icon: 'musical-notes' },
  { id: 'carried', label: 'Carried Over', icon: 'return-down-back' },
  { id: 'swapped', label: 'Swapped', icon: 'swap-horizontal' },
  { id: 'renamed', label: 'Name Changes', icon: 'pencil' },
  { id: 'invalid', label: 'Invalid', icon: 'ban' },
  { id: 'eligibility', label: 'Eligibility', icon: 'people' },
];
