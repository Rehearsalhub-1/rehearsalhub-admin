import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';

interface SupportThread {
  id: string;
  userName: string;
  userEmail: string;
  subject: string;
  lastMessage: string;
  updatedAt: string;
  status: 'open' | 'closed';
  unreadCount?: number;
}

interface Message {
  id: string;
  senderName: string;
  text: string;
  createdAt: string;
  isCoordinator: boolean;
}

export default function SupportChatScreen() {
  const { activeZone } = useZoneContext();
  const { adminUser } = useAuth();

  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchThreads = useCallback(async () => {
    try {
      const zoneParam = activeZone ? `?zoneId=${activeZone.id}` : '';
      const res = await apiClient.get<{ success: boolean; data: SupportThread[] }>(`/support${zoneParam}`).catch(() => ({ data: [] }));
      const threadList = Array.isArray(res.data) ? res.data : [];
      setThreads(threadList);
    } catch (e) {
      console.error('[SupportChat] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetchThreads();
  }, [fetchThreads]);

  async function openThread(thread: SupportThread) {
    setSelectedThread(thread);
    try {
      const res = await apiClient.get<{ success: boolean; data: Message[] }>(`/support/${thread.id}/messages`).catch(() => ({ data: [] }));
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('[SupportChat] messages error:', e);
    }
  }

  async function handleSendReply() {
    if (!replyText.trim() || !selectedThread) return;
    setSending(true);
    try {
      const payload = {
        message: replyText.trim(),
        text: replyText.trim(),
        senderName: adminUser?.name || adminUser?.email?.split('@')[0] || 'Coordinator',
      };
      await apiClient.post(`/support/${selectedThread.id}/messages`, payload);
      setMessages(prev => [
        ...prev,
        {
          id: String(Date.now()),
          senderName: 'You',
          text: replyText.trim(),
          createdAt: new Date().toISOString(),
          isCoordinator: true,
        },
      ]);
      setReplyText('');
    } catch (e) {
      console.error('[SupportChat] send error:', e);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Support Desk" />
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title={selectedThread ? selectedThread.userName : "Support Desk"} />

      {selectedThread ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Back button row */}
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => setSelectedThread(null)}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={18} color={Colors.accentBright} />
            <Text style={styles.backText}>Back to all inquiries</Text>
          </TouchableOpacity>

          {/* Conversation list */}
          <FlatList
            data={messages}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <View style={[
                styles.messageBubble,
                item.isCoordinator ? styles.msgCoordinator : styles.msgSender,
              ]}>
                <Text style={styles.msgSenderName}>{item.senderName}</Text>
                <Text style={styles.msgText}>{item.text}</Text>
                <Text style={styles.msgTime}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
              </View>
            )}
          />

          {/* Reply input */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Type coordinator reply..."
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity
              style={[styles.sendBtn, sending && { opacity: 0.5 }]}
              onPress={handleSendReply}
              disabled={sending}
              activeOpacity={0.8}
            >
              {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        /* Thread Inbox List */
        <FlatList
          data={threads}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchThreads(); }} tintColor={Colors.accent} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="chatbubbles-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No support tickets or inquiries</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.threadCard}
              onPress={() => openThread(item)}
              activeOpacity={0.75}
            >
              <View style={styles.threadAvatar}>
                <Text style={styles.avatarText}>{(item.userName?.[0] || 'U').toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.threadName} numberOfLines={1}>{item.userName}</Text>
                  <Text style={styles.threadTime}>
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                  </Text>
                </View>
                <Text style={styles.threadSubject} numberOfLines={1}>{item.subject || 'Support Inquiry'}</Text>
                <Text style={styles.threadSnippet} numberOfLines={1}>{item.lastMessage || 'No message content'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 13 },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backText: {
    color: Colors.accentBright,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },

  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  threadAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.accentBright,
    fontSize: 15,
    fontWeight: '800',
  },
  threadName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  threadTime: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  threadSubject: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  threadSnippet: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },

  messageBubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 14,
    gap: 4,
  },
  msgCoordinator: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 2,
  },
  msgSender: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 2,
  },
  msgSenderName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
  },
  msgText: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
  },
  msgTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    alignSelf: 'flex-end',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
