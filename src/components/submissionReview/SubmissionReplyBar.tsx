import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './submissionReviewStyles';

interface SubmissionReplyBarProps {
  inputMessage: string;
  sending: boolean;
  onChangeText: (text: string) => void;
  onSend: () => void;
}

export default function SubmissionReplyBar({
  inputMessage,
  sending,
  onChangeText,
  onSend,
}: SubmissionReplyBarProps) {
  return (
    <View style={styles.composerRow}>
      <TextInput
        style={styles.composerInput}
        placeholder="Write advice or rehearsal feedback..."
        placeholderTextColor="#94a3b8"
        value={inputMessage}
        onChangeText={onChangeText}
      />
      <TouchableOpacity
        style={[styles.sendBtn, (!inputMessage.trim() || sending) && styles.sendBtnDisabled]}
        onPress={onSend}
        disabled={!inputMessage.trim() || sending}
        activeOpacity={0.8}
      >
        <Ionicons name="send" size={15} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}
