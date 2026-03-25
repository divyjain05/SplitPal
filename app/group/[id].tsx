import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import AddMemberModal from '@/components/AddMemberModal';
import AddExpenseModal from '@/components/AddExpenseModal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function GroupScreen() {
  const { id } = useLocalSearchParams();
  const colorScheme = useColorScheme() ?? 'light';
  
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddMemberVisible, setAddMemberVisible] = useState(false);
  const [isAddExpenseVisible, setAddExpenseVisible] = useState(false);

  const fetchGroupDetails = async () => {
    setLoading(true);

    const { data: gData, error: gError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single();

    if (gError || !gData) {
      setLoading(false);
      return;
    }

    const { data: eData } = await supabase
      .from('expenses')
      .select('*, group_members:paid_by(member_name)')
      .eq('group_id', id)
      .order('expense_date', { ascending: false });

    const { data: mData } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', id);

    let totalExpense = 0;
    const balances: Record<string, {name: string, balance: number}> = {};
    
    mData?.forEach((m: any) => {
      balances[m.id] = { 
        name: m.member_name || 'Unknown', 
        balance: 0 
      };
    });

    eData?.forEach((e: any) => {
      const amount = Number(e.amount);
      totalExpense += amount;
      if (e.paid_by && balances[e.paid_by]) {
        balances[e.paid_by].balance += amount; 
      }
    });

    const memberCount = mData?.length || 1;
    const perPersonShare = totalExpense / memberCount;

    mData?.forEach((m: any) => {
      balances[m.id].balance -= perPersonShare;
    });

    const formattedMembers = Object.keys(balances).map(uid => ({
      id: uid,
      name: balances[uid].name,
      balance: balances[uid].balance
    }));

    const formattedExpenses = (eData || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      amount: Number(e.amount),
      paidBy: e.group_members?.member_name || 'Unknown',
      date: new Date(e.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }));

    setGroup({
      ...gData,
      totalExpense,
      expenses: formattedExpenses,
      members: formattedMembers,
      settlements: []
    });

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroupDetails();
    }, [id])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#64748B" />
          <ThemedText style={styles.headerTitle}>Back to Dashboard</ThemedText>
        </TouchableOpacity>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : !group ? (
        <ThemedText style={{textAlign: 'center', marginTop: 40}}>Group not found.</ThemedText>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Top Info Box */}
          <ThemedText style={styles.groupName}>{group.name}</ThemedText>
          <ThemedText style={styles.groupDateLabel}>Created on {new Date(group.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</ThemedText>

          <LinearGradient 
            colors={['#10B981', '#2DD4BF']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={styles.heroSummaryCard}
          >
            <ThemedText style={styles.heroExpensesLabel}>TOTAL EXPENSES</ThemedText>
            <ThemedText style={styles.heroExpensesAmount}>₹{group.totalExpense.toLocaleString('en-IN')}</ThemedText>
          </LinearGradient>

          {/* Expenses Section */}
          <View style={styles.sectionHeaderWrap}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Ionicons name="receipt-outline" size={24} color="#10B981" />
              <ThemedText type="subtitle" style={styles.sectionTitle}>Expenses</ThemedText>
            </View>
            <TouchableOpacity style={styles.addButtonExpense} onPress={() => setAddExpenseVisible(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <ThemedText style={styles.addButtonText}>Add Expense</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.listContainer}>
            {group.expenses.length === 0 ? (
              <ThemedText style={{padding: 24, textAlign: 'center', color: '#94A3B8'}}>No expenses yet.</ThemedText>
            ) : group.expenses.map((expense: any) => (
              <View key={expense.id} style={styles.listItemRow}>
                <View style={styles.listItemTextContainer}>
                  <ThemedText style={styles.listItemTitle}>{expense.title}</ThemedText>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4}}>
                    <View style={styles.tagWrap}><ThemedText style={styles.tagText}>Misc</ThemedText></View>
                    <ThemedText style={styles.listItemSub}>{expense.paidBy} paid on {expense.date}</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.listItemAmount}>₹{expense.amount.toLocaleString('en-IN')}</ThemedText>
              </View>
            ))}
          </View>

          {/* Members Section */}
          <View style={[styles.sectionHeaderWrap, { marginTop: 12 }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <Ionicons name="people-outline" size={24} color="#10B981" />
              <ThemedText type="subtitle" style={styles.sectionTitle}>Members</ThemedText>
            </View>
            <TouchableOpacity style={styles.addButtonMember} onPress={() => setAddMemberVisible(true)}>
              <Ionicons name="person-add" size={16} color="#475569" />
              <ThemedText style={[styles.addButtonText, {color: '#475569'}]}>Add</ThemedText>
            </TouchableOpacity>
          </View>
          
          <View style={styles.listContainer}>
            {group.members.map((member: any) => (
              <View key={member.id} style={styles.listItemRow}>
                <View style={styles.listItemIconBG}>
                  <ThemedText style={{fontSize: 14, fontWeight: '800', color: '#0F172A'}}>
                    {member.name ? member.name.substring(0, 2).toUpperCase() : '??'}
                  </ThemedText>
                </View>
                <View style={styles.listItemTextContainer}>
                  <ThemedText style={styles.listItemTitle}>{member.name}</ThemedText>
                </View>
                <ThemedText style={[styles.memberBalance, { color: member.balance >= 0 ? '#10B981' : '#FF6B6B' }]}>
                  {member.balance >= 0 ? 'Gets back' : 'Owes'} ₹{Math.abs(Math.round(member.balance)).toLocaleString('en-IN')}
                </ThemedText>
              </View>
            ))}
          </View>

        </ScrollView>
      )}
      <AddMemberModal 
        visible={isAddMemberVisible} 
        groupId={id as string} 
        onClose={() => setAddMemberVisible(false)} 
        onSuccess={() => {
          setAddMemberVisible(false);
          fetchGroupDetails();
        }} 
      />
      <AddExpenseModal 
        visible={isAddExpenseVisible} 
        groupId={id as string} 
        members={group?.members || []}
        onClose={() => setAddExpenseVisible(false)} 
        onSuccess={() => {
          setAddExpenseVisible(false);
          fetchGroupDetails();
        }} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  groupName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  groupDateLabel: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  heroSummaryCard: {
    padding: 40,
    borderRadius: 32, 
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 40,
  },
  heroExpensesLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
    letterSpacing: 1,
  },
  heroExpensesAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  addButtonExpense: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonMember: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Slate 100 for subtlety
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  listContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    marginBottom: 32,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  listItemIconBG: {
    width: 48,
    height: 48,
    borderRadius: 24, 
    backgroundColor: '#F1F5F9', // Slate 100
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  listItemTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  tagWrap: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  listItemSub: {
    fontSize: 12,
    color: '#64748B',
  },
  listItemAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  memberBalance: {
    fontSize: 15,
    fontWeight: '800',
  },
});
