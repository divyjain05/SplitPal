import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, TextInput, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import NewGroupModal from '@/components/NewGroupModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type SortOption = 'recent' | 'name' | 'price';

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        groups (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', userData.user.id);

    if (data && !error) {
       const formattedGroups = data.map((gm: any) => ({
        id: gm.groups.id,
        name: gm.groups.name,
        createdDate: new Date(gm.groups.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' }),
        totalExpenditure: '₹2,140.00', // Hardcoded mockup for now
      }));
      formattedGroups.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
      setGroups(formattedGroups);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [])
  );

  const filteredGroups = useMemo(() => {
    let result = [...groups];
    if (searchQuery.trim()) {
      result = result.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [searchQuery, groups]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* Back to Dashboard Link Row */}
      <TouchableOpacity 
        style={styles.backLinkRow}
        onPress={() => router.push('/(tabs)')}
      >
        <Ionicons name="arrow-back" size={24} color="#334155" />
        <ThemedText style={styles.backLinkText}>Back to Dashboard</ThemedText>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.listContent}>
        
        {/* Title and top-right actions */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>All Groups</ThemedText>
          <View style={styles.headerIconsRow}>
            <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.iconButton}>
              <Ionicons name="add" size={24} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="filter" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>

        {/* Filters Row */}
        <View style={styles.filtersContainer}>
          <TouchableOpacity style={styles.pillDropdown}>
            <ThemedText style={styles.pillDropdownText}>Name</ThemedText>
            <Ionicons name="chevron-expand" size={16} color="#334155" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sortIconButton}>
            <Ionicons name="cellular-outline" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Groups List */}
        <View style={styles.groupsList}>
          {loading ? (
             <ThemedText style={{textAlign: 'center', marginTop: 20}}>Loading...</ThemedText>
          ) : filteredGroups.length === 0 ? (
             <ThemedText style={{textAlign: 'center', marginTop: 20, color: '#94A3B8'}}>
               No groups found. Hit + to make one!
             </ThemedText>
          ) : (
            filteredGroups.map((group) => (
              <TouchableOpacity 
                key={group.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/group/${group.id}`)}
              >
                <View style={styles.groupCard}>
                  {/* Top icons */}
                  <View style={styles.groupCardHeader}>
                    <View style={styles.groupIconBox}>
                      <Ionicons name="people-outline" size={28} color="#35A090" />
                    </View>
                    <View style={styles.rightCardIcons}>
                      <Ionicons name="trash-outline" size={22} color="#E2E8F0" />
                      <Ionicons name="arrow-forward" size={20} color="#CBD5E1" style={styles.arrowIcon} />
                    </View>
                  </View>
                  
                  {/* Title and Date stack */}
                  <View style={styles.groupInfoContainer}>
                    <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                    <ThemedText style={styles.groupCreatedDate}>Created {group.createdDate}</ThemedText>
                  </View>
                  
                  {/* Bottom expenses stack */}
                  <View style={styles.groupCardFooter}>
                    <ThemedText style={styles.totalExpensesLabel}>TOTAL EXPENSES</ThemedText>
                    <ThemedText style={styles.groupExpenditure}>{group.totalExpenditure}</ThemedText>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <NewGroupModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onSuccess={(id) => {
          setModalVisible(false);
          router.push(`/group/${id}`);
        }} 
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // exact background match
  },
  backLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backLinkText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
  },
  listContent: {
    padding: 20,
    paddingBottom: 120, // Floating tab bar space
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
    height: '100%',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  pillDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  pillDropdownText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  sortIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupsList: {
    gap: 16,
  },
  // GROUP CARD STYLES (Pulled from index.tsx + custom icons)
  groupCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  groupIconBox: {
    backgroundColor: '#E6F4F1',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightCardIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  arrowIcon: {
    transform: [{ rotate: '-45deg' }],
  },
  groupInfoContainer: {
    marginBottom: 20,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  groupCreatedDate: {
    fontSize: 13,
    color: '#64748B',
  },
  groupCardFooter: {
    alignItems: 'flex-start',
  },
  totalExpensesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  groupExpenditure: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
});
