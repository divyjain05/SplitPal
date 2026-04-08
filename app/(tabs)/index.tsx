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
        
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="wallet-outline" size={30} color="#1D8A78" />
            <ThemedText style={styles.logoText}>SplitPal</ThemedText>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="#64748B" />
            <ThemedText style={styles.logoutText}>Logout</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Monthly Expenditure Box */}
        <LinearGradient 
          colors={['#4ABEA9', '#1C9381']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={styles.expenditureBox}
        >
          <ThemedText style={styles.expenditureLabel}>Total Monthly Expenses</ThemedText>
          <ThemedText style={styles.expenditureAmount}>₹2,140.00</ThemedText>
          <ThemedText style={styles.expenditureDate}>April 2026</ThemedText>
          <View style={styles.heroSpacer} />
          <View style={styles.heroIconBoxContainer}>
            <View style={styles.heroIconBox}>
              <Ionicons name="wallet-outline" size={34} color="#ffffff" />
            </View>
          </View>
        </LinearGradient>

        {/* My Groups Header */}
        <View style={styles.groupsHeader}>
          <ThemedText style={styles.groupsTitle}>My Groups</ThemedText>
          <TouchableOpacity style={styles.addGroupButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={16} color="#ffffff" />
            <ThemedText style={styles.addGroupText}>New Group</ThemedText>
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
                <View style={styles.groupCard}>
                  {/* Top icons */}
                  <View style={styles.groupCardHeader}>
                    <View style={styles.groupIconBox}>
                      <Ionicons name="calendar-outline" size={24} color="#35A090" />
                    </View>
                    <Ionicons name="arrow-forward" size={22} color="#64748B" style={styles.arrowIcon} />
                  </View>
                  
                  {/* Title and Date stack */}
                  <View style={styles.groupInfoContainer}>
                    <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                    <ThemedText style={styles.groupCreatedDate}>Created {group.createdDate}</ThemedText>
                  </View>
                  
                  {/* Bottom expenses stack */}
                  <View style={styles.groupCardFooter}>
                    <ThemedText style={styles.totalExpensesLabel}>TOTAL EXPENSES</ThemedText>
                    <ThemedText style={styles.groupExpenditure}>{group.totalExpenditure || '₹0.00'}</ThemedText>
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
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    gap: 24,
    paddingBottom: 120, // Extra space for the floating bottom pill
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#64748B', 
    fontSize: 16,
    fontWeight: '500',
  },
  expenditureBox: {
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#1C7468',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  expenditureLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 6,
    opacity: 0.9,
    fontWeight: '500',
  },
  expenditureAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  expenditureDate: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 24,
    opacity: 0.8,
  },
  heroSpacer: {
    height: 10,
  },
  heroIconBoxContainer: {
    width: '100%',
    alignItems: 'center',
  },
  heroIconBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  addGroupButton: {
    flexDirection: 'row',
    backgroundColor: '#86D4C4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  addGroupText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  groupsList: {
    gap: 16,
  },
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    transform: [{ rotate: '-45deg' }],
    marginTop: 4,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
  },
});
