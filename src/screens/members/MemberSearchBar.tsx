import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './membersStyles';

interface MemberSearchBarProps {
  viewMode: 'directory' | 'feature_pass';
  setViewMode: (mode: 'directory' | 'feature_pass') => void;
  search: string;
  setSearch: (val: string) => void;
  onAddEmail: () => void;
}

export default function MemberSearchBar({
  viewMode,
  setViewMode,
  search,
  setSearch,
  onAddEmail,
}: MemberSearchBarProps) {
  return (
    <>
      {/* Two-Tab Navigation Switcher */}
      <View style={styles.modeSegmentWrap}>
        <TouchableOpacity
          style={[styles.modeSegmentBtn, viewMode === 'directory' && styles.modeSegmentBtnActive]}
          onPress={() => setViewMode('directory')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={viewMode === 'directory' ? '#7c3aed' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.modeSegmentText, viewMode === 'directory' && styles.modeSegmentTextActive]}>
            Members Directory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeSegmentBtn, viewMode === 'feature_pass' && styles.modeSegmentBtnActive]}
          onPress={() => setViewMode('feature_pass')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="key-outline"
            size={16}
            color={viewMode === 'feature_pass' ? '#7c3aed' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.modeSegmentText, viewMode === 'feature_pass' && styles.modeSegmentTextActive]}>
            Feature Pass
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={viewMode === 'directory' ? 'Search members by name or email...' : 'Filter passes by name or email...'}
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {viewMode === 'feature_pass' && (
          <TouchableOpacity
            style={styles.addPassBtn}
            onPress={onAddEmail}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.addPassBtnText}>Add Email</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}
