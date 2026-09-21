import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './submissionReviewStyles';
import { SongSubmissionMessage, QUICK_FEEDBACK_CHIPS } from './submissionReviewUtils';

interface SubmissionConversationProps {
  conversation: SongSubmissionMessage[];
  replyingTo: SongSubmissionMessage | null;
  chatScrollRef: React.RefObject<ScrollView | null>;
  onReply: (msg: SongSubmissionMessage) => void;
  onCancelReply: () => void;
  onSendChip: (text: string) => void;
}

export default function SubmissionConversation({
  conversation,
  replyingTo,
  chatScrollRef,
  onReply,
  onCancelReply,
  onSendChip,
}: SubmissionConversationProps) {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={chatScrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {conversation.length === 0 ? (
          <View style={styles.emptyChatBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color="#cbd5e1" />
            <Text style={styles.emptyChatTitle}>No feedback comments yet</Text>
            <Text style={styles.emptyChatSub}>
              Use the quick feedback chips or composer below to guide the submitter.
            </Text>
          </View>
        ) : (
          conversation.map(msg => {
            const isAdmin = msg.sender === 'admin';
            return (
              <View
                key={msg.id}
                style={[styles.chatBubbleWrap, isAdmin ? styles.chatWrapRight : styles.chatWrapLeft]}
              >
                <View style={styles.chatMetaRow}>
                  <Text style={styles.chatSenderName}>{msg.senderName}</Text>
                  <Text style={styles.chatTimeText}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View
                  style={[
                    styles.chatBubble,
                    isAdmin ? styles.chatBubbleAdmin : styles.chatBubbleUser,
                  ]}
                >
                  {msg.replyTo && (
                    <View
                      style={[
                        styles.replyPreviewCard,
                        isAdmin ? styles.replyPreviewAdmin : styles.replyPreviewUser,
                      ]}
                    >
                      <Text style={styles.replyPreviewSender}>{msg.replyTo.senderName}</Text>
                      <Text style={styles.replyPreviewText} numberOfLines={1}>
                        {msg.replyTo.text}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={[
                      styles.chatMessageText,
                      isAdmin ? styles.chatMessageTextAdmin : styles.chatMessageTextUser,
                    ]}
                  >
                    {msg.message}
                  </Text>

                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <View style={styles.reactionsRow}>
                      {Object.entries(msg.reactions).map(([emoji, users]) => (
                        <View key={emoji} style={styles.reactionPill}>
                          <Text style={styles.reactionText}>
                            {emoji} {users.length}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.replyActionTouch}
                  onPress={() => onReply(msg)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-undo-outline" size={11} color="#94a3b8" style={{ marginRight: 2 }} />
                  <Text style={styles.replyActionText}>Reply</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Quick Feedback Chips */}
      <View style={styles.quickChipsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsScroll}>
          {QUICK_FEEDBACK_CHIPS.map((chip, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.quickChip}
              onPress={() => onSendChip(chip)}
              activeOpacity={0.8}
            >
              <Text style={styles.quickChipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Replying Banner */}
      {replyingTo && (
        <View style={styles.replyingBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.replyingToTitle}>Replying to {replyingTo.senderName}</Text>
            <Text style={styles.replyingToSnippet} numberOfLines={1}>
              {replyingTo.message}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
