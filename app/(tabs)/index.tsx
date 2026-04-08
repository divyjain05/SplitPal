import React, { useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router, useFocusEffect } from 'expo-router';
import NewGroupModal from '@/components/NewGroupModal';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
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
        createdDate: new Date(gm.groups.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        totalExpenditure: '₹0', // Placeholder until expenses query
        lastUpdated: 'Just now'
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
            <ThemedText type="title" style={{color: '#1E293B', fontWeight: '800', fontSize: 24}}>Dashboard</ThemedText>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <ThemedText style={styles.logoutText}>Logout</ThemedText>
              <Ionicons name="log-out-outline" size={18} color="#64748B" />
            </TouchableOpacity>
        </View>

        {/* Monthly Expenditure Box */}
        <LinearGradient 
          colors={['#10B981', '#2DD4BF']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.expenditureBox}
        >
          <View style={styles.expenditureInner}>
            <View>
              <ThemedText style={styles.expenditureLabel}>Total Monthly Expenses</ThemedText>
              <ThemedText style={styles.expenditureAmount}>₹4,486.00</ThemedText>
              <ThemedText style={styles.expenditureDate}>March 2026</ThemedText>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="wallet-outline" size={38} color="#ffffff" />
            </View>
          </View>
        </LinearGradient>

        {/* My Groups Header */}
        <View style={styles.groupsHeader}>
          <ThemedText type="subtitle" style={styles.groupsTitle}>My Groups</ThemedText>
          <TouchableOpacity style={styles.addGroupButton} onPress={() => setModalVisible(true)}>
            <LinearGradient
              colors={['#10B981', '#2DD4BF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addGroupGradient}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <ThemedText style={styles.addGroupText}>New Group</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Groups List */}
        <View style={styles.groupsList}>
          {loading ? (
             <ThemedText style={{textAlign: 'center', marginTop: 20}}>Loading...</ThemedText>
          ) : groups.length === 0 ? (
             <ThemedText style={{textAlign: 'center', marginTop: 20, color: '#94A3B8'}}>
               No groups yet. Hit "New Group" to start!
             </ThemedText>
          ) : (
            groups.map((group) => (
              <TouchableOpacity 
                key={group.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/group/${group.id}`)}
              >
                <ThemedView style={styles.groupCard}>
                  <View style={styles.groupCardHeader}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                      <View style={styles.groupIconBox}>
                        <Ionicons name="calendar-outline" size={24} color="#10B981" />
                      </View>
                      <View>
                        <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                        <ThemedText style={styles.groupCreatedDate}>Created {group.createdDate}</ThemedText>
                      </View>
                    </View>
                    <Ionicons name="arrow-forward" size={18} color="#94A3B8" />
                  </View>
                  
                  <View style={styles.groupCardFooter}>
                    <ThemedText style={styles.totalExpensesLabel}>TOTAL EXPENSES</ThemedText>
                    <ThemedText style={styles.groupExpenditure}>{group.totalExpenditure}</ThemedText>
                  </View>
                </ThemedView>
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    gap: 24,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#64748B', 
    fontSize: 14,
    fontWeight: '600',
  },
  expenditureBox: {
    paddingVertical: 52,
    paddingHorizontal: 28,
    minHeight: 180,
    borderRadius: 32,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  expenditureInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenditureLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
    opacity: 0.9,
    fontWeight: '500',
  },
  expenditureAmount: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  expenditureDate: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
    opacity: 0.8,
  },
  heroIconBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  groupsTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  addGroupButton: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addGroupGradient: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  addGroupText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  groupsList: {
    gap: 16,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  groupCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  groupIconBox: {
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 2,
  },
  groupCreatedDate: {
    fontSize: 12,
    color: '#64748B',
  },
  groupCardFooter: {
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalExpensesLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  groupExpenditure: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
});
