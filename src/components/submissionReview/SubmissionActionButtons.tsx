import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './submissionReviewStyles';
import { SongSubmission } from './submissionReviewUtils';

interface SubmissionActionButtonsProps {
  song: SongSubmission;
  isPending: boolean;
  isApproved: boolean;
  insetBottom: number;
  onApprove: (song: SongSubmission) => void;
  onOpenReject: () => void;
  onRequestRevision: () => void;
}

export default function SubmissionActionButtons({
  song,
  isPending,
  isApproved,
  insetBottom,
  onApprove,
  onOpenReject,
  onRequestRevision,
}: SubmissionActionButtonsProps) {
  return (
    <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insetBottom, 12) }]}>
      {isPending ? (
        <>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={onOpenReject}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={15} color="#e11d48" style={{ marginRight: 3 }} />
            <Text style={styles.declineBtnText}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.revisionBtn}
            onPress={onRequestRevision}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={14} color="#b45309" style={{ marginRight: 3 }} />
            <Text style={styles.revisionBtnText}>Request Revision</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => onApprove(song)}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.approveBtnText}>Approve Song</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.reviewedNoticeBar}>
          <Ionicons
            name={isApproved ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={isApproved ? '#10b981' : '#e11d48'}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.reviewedNoticeText}>
            {isApproved ? 'This song is approved for rehearsals.' : 'This submission was declined.'}
          </Text>
        </View>
      )}
    </View>
  );
}
