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

    // Get groups user is in
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
      // Format them for the UI
      const formatted = data.map((gm: any) => ({
        id: gm.groups.id,
        name: gm.groups.name,
        price: 0, // Placeholder for total cost
        createdAt: gm.groups.created_at,
        memberCount: 1 // Placeholder until we count members
      }));
      setGroups(formatted);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [])
  );

  const filteredAndSortedGroups = useMemo(() => {
    let result = [...groups];

    // Filter by search
    if (searchQuery.trim()) {
      result = result.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'price') {
        return b.price - a.price; // Descending price (highest first)
      } else {
        // recent (created)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [searchQuery, sortBy, groups]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>All Groups</ThemedText>
        <TouchableOpacity style={styles.addButtonIcon} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}
          placeholder="Search groups..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filtersContainer}>
        <TouchableOpacity 
          style={[styles.filterPill, sortBy === 'recent' && styles.filterPillActive]}
          onPress={() => setSortBy('recent')}
        >
          <ThemedText style={[styles.filterText, sortBy === 'recent' && styles.filterTextActive]}>Recent</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterPill, sortBy === 'name' && styles.filterPillActive]}
          onPress={() => setSortBy('name')}
        >
          <ThemedText style={[styles.filterText, sortBy === 'name' && styles.filterTextActive]}>Name</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterPill, sortBy === 'price' && styles.filterPillActive]}
          onPress={() => setSortBy('price')}
        >
          <ThemedText style={[styles.filterText, sortBy === 'price' && styles.filterTextActive]}>Price</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterIconBtn}>
          <Ionicons name="options-outline" size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 20 }} />
        ) : filteredAndSortedGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>No groups found</ThemedText>
          </View>
        ) : (
          filteredAndSortedGroups.map((group) => (
            <TouchableOpacity 
              key={group.id}
              activeOpacity={0.8}
              onPress={() => router.push(`/group/${group.id}`)}
            >
              <ThemedView style={styles.groupCard}>
                <View style={styles.groupCardHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.groupName}>{group.name}</ThemedText>
                  <ThemedText style={styles.groupPrice}>₹{group.price.toLocaleString('en-IN')}</ThemedText>
                </View>
                <View style={styles.groupCardFooter}>
                  <ThemedText style={styles.groupMembers}>
                    <Ionicons name="people-outline" size={14} /> {group.memberCount} members
                  </ThemedText>
                  <ThemedText style={styles.groupDate}>
                    {new Date(group.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </ThemedText>
                </View>
              </ThemedView>
            </TouchableOpacity>
          ))
        )}
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    textAlign: 'left',
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
  },
  addButtonIcon: {
    padding: 8,
    backgroundColor: '#1E293B',
    borderRadius: 9999,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 9999, // Pill shaped search like vercel
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  filterPillActive: {
    backgroundColor: '#10b981',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  filterIconBtn: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // accommodate floating tab bar
    gap: 16,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  groupPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981', // Clean green
  },
  groupCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupMembers: {
    fontSize: 13,
    color: '#64748B',
    alignItems: 'center',
  },
  groupDate: {
    fontSize: 13,
    color: '#94a3b8',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
  },
});
