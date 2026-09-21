import React from 'react';
import { View } from 'react-native';
import { SearchFilterBar } from '../../components/ui';
import { styles } from './programsStyles';
import { TABS } from './programUtils';

interface ProgramsFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedTab: string;
  onSelectTab: (val: string) => void;
}

export default function ProgramsFilterBar({
  searchQuery,
  onSearchChange,
  selectedTab,
  onSelectTab,
}: ProgramsFilterBarProps) {
  return (
    <View style={styles.topControlSection}>
      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        placeholder="Search sets, dates, venues..."
        filterOptions={TABS}
        activeFilter={selectedTab}
        onFilterChange={onSelectTab}
      />
    </View>
  );
}
