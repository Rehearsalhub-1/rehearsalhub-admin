export interface Member {
  id: string;
  membershipId?: string;
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  alias?: string;
  phone?: string;
  church?: string;
  designation?: string;
  profile_image_url?: string;
  created_at?: string;
  is_active: boolean;
  role: 'member' | 'hq_admin' | 'admin' | string;
  isAdmin?: boolean;
  has_hq_access?: boolean;
  zoneId?: string;
  zoneName?: string;
  pending_hq_approval?: boolean;
  can_access_pre_rehearsal?: boolean;
  can_access_ongoing?: boolean;
  can_access_archive?: boolean;
  canAnnotate?: boolean;
  canSeeArchive?: boolean;
  hiddenFeatures?: {
    hideOngoing?: boolean;
    hidePreRehearsal?: boolean;
    hideAnnotations?: boolean;
    hideArchives?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface MemberManagementModalProps {
  visible: boolean;
  member: Member | null;
  onClose: () => void;
  onSave: (updated: Member, newPassword?: string) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
  onApprove?: (member: Member) => Promise<void> | void;
  onReject?: (member: Member) => Promise<void> | void;
}
