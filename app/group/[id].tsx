import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import AddMemberModal from '@/components/AddMemberModal';
import AddExpenseModal from '@/components/AddExpenseModal';
import { supabase } from '@/lib/supabase';

export default function GroupScreen() {
  const { id } = useLocalSearchParams();
  
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

    // Now securely fetching the exact expense_splits embedded on the expense records
    const { data: eData } = await supabase
      .from('expenses')
      .select('*, group_members:paid_by(member_name), expense_splits(*)')
      .eq('group_id', id)
      .order('expense_date', { ascending: false });

    const { data: mData } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', id);

    let totalExpense = 0;
    const balances: Record<string, {name: string, balance: number}> = {};
    
    // Initialize base maps
    mData?.forEach((m: any) => {
      balances[m.id] = { 
        name: m.member_name || 'Unknown', 
        balance: 0 
      };
    });

    eData?.forEach((e: any) => {
      const amount = Number(e.amount);
      totalExpense += amount;
      
      // 1. The person who paid is credited the entire expense amount.
      if (e.paid_by && balances[e.paid_by]) {
        balances[e.paid_by].balance += amount; 
      }

      // 2. Deduct exact mapped amounts natively from only the members in the specific expense_splits array.
      if (e.expense_splits && Array.isArray(e.expense_splits)) {
        e.expense_splits.forEach((split: any) => {
          if (balances[split.member_id]) {
            balances[split.member_id].balance -= Number(split.amount_owed);
          }
        });
      }
    });

    const formattedMembers = Object.keys(balances).map(uid => ({
      id: uid,
      name: balances[uid].name,
      balance: balances[uid].balance
    }));

    const formattedExpenses = (eData || []).map((e: any) => {
      let sharedWith = 'Unknown';
      
      if (e.expense_splits && Array.isArray(e.expense_splits)) {
        // Build the accurate list of who this was specifically shared with
        const names = e.expense_splits
          .map((s: any) => balances[s.member_id]?.name)
          .filter(Boolean);
        sharedWith = names.join(', ');
      }

      return {
        id: e.id,
        title: e.title,
        amount: Number(e.amount),
        paidBy: e.group_members?.member_name || 'Unknown',
        sharedWith,
        date: new Date(e.expense_date).toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' })
      };
    });

    setGroup({
      ...gData,
      totalExpense,
      expenses: formattedExpenses,
      members: formattedMembers,
      settlements: [
        { id: '1', from: 'param', to: 'adit', amount: 569.33 },
        { id: '2', from: 'divy', to: 'adit', amount: 207.33 }
      ] // Mock settlements based on the UI requested
    });

    setLoading(false);
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            const { data, error } = await supabase
              .from('group_members')
              .delete()
              .eq('id', memberId)
              .select();

            if (error) {
              console.error('Error deleting member:', error);
              Alert.alert('Action Blocked', `Database error: ${error.message}`);
              setLoading(false);
            } else if (!data || data.length === 0) {
              Alert.alert('Action Blocked', "You don't have permission to remove this member, or they don't exist.");
              setLoading(false);
            } else {
              fetchGroupDetails(); // This resets loading state
            }
          }
        }
      ]
    );
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
          <Ionicons name="arrow-back" size={22} color="#334155" />
          <ThemedText style={styles.headerTitle}>Back to Dashboard</ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4ABEA9" style={{ marginTop: 40 }} />
      ) : !group ? (
        <ThemedText style={{textAlign: 'center', marginTop: 40}}>Group not found.</ThemedText>
      ) : (
        <ScrollView style={{flex: 1}} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Main Hero Card */}
          <View style={styles.heroWrapperCard}>
            <ThemedText style={styles.groupName}>{group.name}</ThemedText>
            <ThemedText style={styles.groupDateLabel}>Created on {new Date(group.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'numeric', year: 'numeric' })}</ThemedText>
            
            <View style={styles.heroExpensesBox}>
              <ThemedText style={styles.heroExpensesLabel}>TOTAL EXPENSES</ThemedText>
              <ThemedText style={styles.heroExpensesAmount}>₹{group.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</ThemedText>
            </View>
          </View>

          {/* ------------- EXPENSES SECTION ------------- */}
          <View style={styles.sectionHeaderWrapCentered}>
            <Ionicons name="wallet-outline" size={24} color="#1E293B" />
            <ThemedText style={styles.sectionTitleCentered}>Expenses</ThemedText>
          </View>
          <View style={styles.centeredButtonWrap}>
            <TouchableOpacity style={styles.expenseButton} onPress={() => setAddExpenseVisible(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <ThemedText style={styles.buttonTextWhite}>Add Expense</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.cardsListWrap}>
            {group.expenses.length === 0 ? (
              <ThemedText style={styles.emptyText}>No expenses yet.</ThemedText>
            ) : group.expenses.map((expense: any) => (
              <View key={expense.id} style={styles.separatedCard}>
                <View style={styles.separatedCardContent}>
                  {/* Left Side */}
                  <View style={styles.expenseLeft}>
                    <View style={styles.expenseTitleRow}>
                      <ThemedText style={styles.expenseTitleName}>{expense.paidBy}</ThemedText>
                      <View style={styles.categoryPill}>
                        <ThemedText style={styles.categoryPillText}>Misc</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.expenseSubtext}>{expense.paidBy} paid for {expense.sharedWith}</ThemedText>
                    <ThemedText style={styles.expenseDate}>{expense.date}</ThemedText>
                  </View>
                  
                  {/* Right Side */}
                  <View style={styles.expenseRight}>
                    <ThemedText style={styles.expenseAmountText}>₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</ThemedText>
                    <TouchableOpacity style={styles.trashIconAlign}>
                     <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* ------------- MEMBERS SECTION ------------- */}
          <View style={[styles.sectionHeaderWrapCentered, { marginTop: 10 }]}>
            <Ionicons name="person-outline" size={24} color="#1E293B" />
            <ThemedText style={styles.sectionTitleCentered}>Members</ThemedText>
          </View>
          <View style={styles.centeredButtonWrap}>
            <TouchableOpacity style={styles.memberButton} onPress={() => setAddMemberVisible(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <ThemedText style={styles.buttonTextWhite}>Add Member</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.unifiedListCard}>
            {group.members.map((member: any, index: number) => (
              <View 
                key={member.id} 
                style={[
                  styles.unifiedListItem, 
                  index === group.members.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <View style={styles.memberAvatar}>
                  <ThemedText style={styles.memberAvatarInitial}>{member.name ? member.name.charAt(0).toUpperCase() : '?'}</ThemedText>
                </View>
                <ThemedText style={styles.memberNameText}>{member.name}</ThemedText>
                <TouchableOpacity 
                  style={{ marginLeft: 'auto' }}
                  onPress={() => handleDeleteMember(member.id, member.name)}
                >
                  <Ionicons name="trash-outline" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* ------------- PENDING AMOUNTS ------------- */}
          <View style={[styles.sectionHeaderWrapCentered, { marginTop: 24 }]}>
            <Ionicons name="journal-outline" size={24} color="#1E293B" />
            <ThemedText style={styles.sectionTitleCentered}>Pending Amounts</ThemedText>
          </View>

          <View style={styles.cardsListWrap}>
            {group.settlements.length === 0 ? (
               <ThemedText style={styles.emptyText}>Everyone is settled up!</ThemedText>
            ) : group.settlements.map((settlement: any) => (
              <View key={settlement.id} style={styles.settlementCard}>
                <View style={styles.settlementLeftRow}>
                  <View style={styles.settlementDot} />
                  <View>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                       <ThemedText style={styles.settlementTextMain}>{settlement.from}</ThemedText>
                       <Ionicons name="arrow-forward" size={14} color="#64748B" />
                       <ThemedText style={styles.settlementTextMain}>{settlement.to}</ThemedText>
                    </View>
                    <ThemedText style={styles.settlementSubText}>₹{settlement.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</ThemedText>
                  </View>
                </View>
                <TouchableOpacity style={styles.settleActionBtn}>
                  <ThemedText style={styles.settleActionText}>Settle</ThemedText>
                </TouchableOpacity>
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
    backgroundColor: '#FAFBFD', // Matching very light off-white background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 160,
  },

  // HERO WRAPPER CARD
  heroWrapperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
    alignItems: 'center',
  },
  groupName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  groupDateLabel: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 24,
  },
  heroExpensesBox: {
    backgroundColor: '#4ABEA9',
    width: '100%',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroExpensesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroExpensesAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // SECTION HEADERS
  sectionHeaderWrapCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitleCentered: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  centeredButtonWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  expenseButton: {
    backgroundColor: '#FF6B6B', // Salmon red
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  memberButton: {
    backgroundColor: '#6366F1', // Indigo purple
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
  },
  buttonTextWhite: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },

  // CARD LISTS
  cardsListWrap: {
    gap: 16,
    marginBottom: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    padding: 16,
  },
  separatedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  separatedCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expenseLeft: {
    flex: 1,
  },
  expenseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  expenseTitleName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryPillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  expenseSubtext: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 13,
    color: '#94A3B8',
  },
  expenseRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  expenseAmountText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16, // Pushes trash down slightly
  },
  trashIconAlign: {
    marginRight: 4,
  },

  // MEMBERS UNIFIED CARD
  unifiedListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 32,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  unifiedListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#66CDAA', // Soft light green
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  memberAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  memberNameText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },

  // SETTLEMENTS CARDS
  settlementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B2DFDB', // Light green-teal border
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  settlementLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settlementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00897B', // Teal
  },
  settlementTextMain: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  settlementSubText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  settleActionBtn: {
    backgroundColor: '#00897B', // Deep Teal
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  settleActionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
