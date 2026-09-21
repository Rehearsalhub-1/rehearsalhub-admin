export interface AttendanceRecord {
  id: string;
  idempotencyKey?: string;
  userId?: string;
  user_id?: string;
  userName?: string;
  user_name?: string;
  eventName?: string;
  event_name?: string;
  checkInTime?: string;
  check_in_time?: string;
  checkOutTime?: string;
  status?: 'present' | 'absent' | 'completed';
  dateString?: string;
  date_string?: string;
  zoneId?: string;
  isManual?: boolean;
  method?: 'scanner' | 'manual';
}
