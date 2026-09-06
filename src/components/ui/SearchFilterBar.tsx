import React from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  placeholder?: string;
  filterOptions?: FilterOption[];
  activeFilter?: string;
  onFilterChange?: (filterValue: string) => void;
}

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  placeholder = 'Search...',
  filterOptions,
  activeFilter,
  onFilterChange,
}: SearchFilterBarProps) {
  return (
    <View style={styles.wrapper}>
      {/* Search Input Box */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearBtn} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Filter Chips */}
      {filterOptions && filterOptions.length > 0 && onFilterChange && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {filterOptions.map((opt) => {
            const isActive = activeFilter === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => onFilterChange(opt.value)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {opt.label}
                </Text>
                {opt.count !== undefined && (
                  <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                    <Text style={[styles.countText, isActive && styles.countTextActive]}>
                      {opt.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 44,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
  },
  clearBtn: {
    padding: 4,
  },
  filterList: {
    paddingTop: 10,
    paddingBottom: 2,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  countTextActive: {
    color: '#ffffff',
  },
});

