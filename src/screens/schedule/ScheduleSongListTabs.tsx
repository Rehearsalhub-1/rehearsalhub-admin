import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './scheduleStyles';
import type { ScheduleProgram } from './types';

interface ScheduleSongListTabsProps {
  activeTab: string;
  activeProgram: ScheduleProgram;
  onOpenAddGeneric: () => void;
  onDeleteGenericItem: (id: string) => void;
}

export default function ScheduleSongListTabs({
  activeTab,
  activeProgram,
  onOpenAddGeneric,
  onDeleteGenericItem,
}: ScheduleSongListTabsProps) {
  if (activeTab === 'new') {
    const list = activeProgram.newSongs || [];
    return (
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>New Songs Submitted ({list.length})</Text>
          <TouchableOpacity style={styles.addSlotBtn} onPress={onOpenAddGeneric} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.addSlotBtnText}>+ Add Song</Text>
          </TouchableOpacity>
        </View>

        {list.length === 0 ? (
          <View style={styles.emptyTabCard}><Text style={styles.emptyTabText}>No new songs submitted.</Text></View>
        ) : (
          list.map(song => (
            <View key={song.id} style={styles.standardCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardMainTitle}>{song.title}</Text>
                <View style={styles.chipGroup}>
                  {song.key && <View style={styles.tinyBadge}><Text style={styles.tinyBadgeText}>Key: {song.key}</Text></View>}
                  {song.duration && <View style={styles.tinyBadge}><Text style={styles.tinyBadgeText}>{song.duration}</Text></View>}
                </View>
              </View>
              <Text style={styles.cardMetaText}>
                By: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{song.submittedBy || 'Minister'}</Text> • Date: {song.submittedOn || 'Recent'}
              </Text>
              <View style={styles.cardActionsRight}>
                <TouchableOpacity onPress={() => onDeleteGenericItem(song.id)} style={styles.cardDeleteBtn}>
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

  if (activeTab === 'carried') {
    const list = activeProgram.carriedOver || [];
    return (
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Carried Over Songs ({list.length})</Text>
          <TouchableOpacity style={styles.addSlotBtn} onPress={onOpenAddGeneric} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.addSlotBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {list.length === 0 ? (
          <View style={styles.emptyTabCard}><Text style={styles.emptyTabText}>No carried over songs.</Text></View>
        ) : (
          list.map(song => (
            <View key={song.id} style={styles.standardCard}>
              <View style={styles.cardTopRow}>
                <Text style={styles.cardMainTitle}>{song.title}</Text>
                <View style={styles.amberBadge}>
                  <Text style={styles.amberBadgeText}>{song.rehearsalCount || 1} prior rehearsals</Text>
                </View>
              </View>
              <Text style={styles.cardMetaText}>
                From: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{song.originalProgram || 'Previous'}</Text> • Key: {song.key || '—'}
              </Text>
              {song.reason ? <View style={styles.reasonQuote}><Text style={styles.reasonQuoteText}>"{song.reason}"</Text></View> : null}
              <View style={styles.cardActionsRight}>
                <TouchableOpacity onPress={() => onDeleteGenericItem(song.id)} style={styles.cardDeleteBtn}>
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

  if (activeTab === 'swapped') {
    const list = activeProgram.swapped || [];
    return (
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Swapped Songs ({list.length})</Text>
          <TouchableOpacity style={styles.addSlotBtn} onPress={onOpenAddGeneric} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.addSlotBtnText}>+ Add Swap</Text>
          </TouchableOpacity>
        </View>

        {list.length === 0 ? (
          <View style={styles.emptyTabCard}><Text style={styles.emptyTabText}>No swapped songs.</Text></View>
        ) : (
          list.map(item => (
            <View key={item.id} style={styles.standardCard}>
              <View style={styles.swapTitleRow}>
                <Text style={styles.swapOriginal}>{item.original}</Text>
                <Ionicons name="arrow-forward" size={15} color="#94a3b8" style={{ marginHorizontal: 6 }} />
                <Text style={styles.swapReplacement}>{item.replacement}</Text>
              </View>
              <Text style={styles.cardMetaText}>
                Swapped by: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.swappedBy || 'Director'}</Text> • Date: {item.swappedOn || 'Recent'}
              </Text>
              {item.reason ? <View style={styles.reasonQuote}><Text style={styles.reasonQuoteText}>"{item.reason}"</Text></View> : null}
              <View style={styles.cardActionsRight}>
                <TouchableOpacity onPress={() => onDeleteGenericItem(item.id)} style={styles.cardDeleteBtn}>
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

  if (activeTab === 'renamed') {
    const list = activeProgram.nameChanges || [];
    return (
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Song Name Changes ({list.length})</Text>
          <TouchableOpacity style={styles.addSlotBtn} onPress={onOpenAddGeneric} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.addSlotBtnText}>+ Add Change</Text>
          </TouchableOpacity>
        </View>

        {list.length === 0 ? (
          <View style={styles.emptyTabCard}><Text style={styles.emptyTabText}>No song name changes.</Text></View>
        ) : (
          list.map(item => (
            <View key={item.id} style={styles.standardCard}>
              <View style={styles.swapTitleRow}>
                <Text style={styles.nameChangeOld}>{item.from}</Text>
                <Ionicons name="arrow-forward" size={15} color="#7c3aed" style={{ marginHorizontal: 6 }} />
                <Text style={styles.nameChangeNew}>{item.to}</Text>
              </View>
              <Text style={styles.cardMetaText}>
                Changed by: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.changedBy || 'Admin'}</Text> • Date: {item.changedOn || 'Recent'}
              </Text>
              {item.reason ? <View style={styles.reasonQuote}><Text style={styles.reasonQuoteText}>"{item.reason}"</Text></View> : null}
              <View style={styles.cardActionsRight}>
                <TouchableOpacity onPress={() => onDeleteGenericItem(item.id)} style={styles.cardDeleteBtn}>
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

  if (activeTab === 'invalid') {
    const list = activeProgram.invalidSongs || [];
    return (
      <View>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Invalid Songs ({list.length})</Text>
          <TouchableOpacity style={styles.addSlotBtn} onPress={onOpenAddGeneric} activeOpacity={0.8}>
            <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.addSlotBtnText}>+ Add Invalid</Text>
          </TouchableOpacity>
        </View>

        {list.length === 0 ? (
          <View style={styles.emptyTabCard}><Text style={styles.emptyTabText}>No invalid songs.</Text></View>
        ) : (
          list.map(item => (
            <View key={item.id} style={[styles.standardCard, styles.redBorderCard]}>
              <View style={styles.cardTopRow}>
                <Text style={styles.invalidTitle}>{item.title}</Text>
                <View style={styles.redBadge}>
                  <Text style={styles.redBadgeText}>{item.invalidatedBy || 'Invalid'}</Text>
                </View>
              </View>
              <Text style={styles.cardMetaText}>
                {item.replacedBy ? `Replaced by: ${item.replacedBy} • ` : ''}Date: {item.date || 'Recent'}
              </Text>
              {item.reason ? <View style={styles.reasonQuote}><Text style={styles.reasonQuoteText}>"{item.reason}"</Text></View> : null}
              <View style={styles.cardActionsRight}>
                <TouchableOpacity onPress={() => onDeleteGenericItem(item.id)} style={styles.cardDeleteBtn}>
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

  return null;
}
