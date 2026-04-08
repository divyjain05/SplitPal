import React, { useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AddExpenseModalProps {
  visible: boolean;
  groupId: string;
  members: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddExpenseModal({ visible, groupId, members, onClose, onSuccess }: AddExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [paidFor, setPaidFor] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();

  const handleTogglePaidFor = (memberId: string) => {
    if (paidFor.includes(memberId)) {
      setPaidFor(paidFor.filter(id => id !== memberId));
    } else {
      setPaidFor([...paidFor, memberId]);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !amount.trim() || !paidBy || paidFor.length === 0) return;
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    setLoading(true);

    // 1. Insert Expense
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        paid_by: paidBy,
        title: title.trim(),
        amount: numericAmount
      })
      .select('id')
      .single();

    if (expenseError || !expense) {
      console.error('Error inserting expense:', expenseError);
      setLoading(false);
      return;
    }

    // 2. Insert Split Logic (Only among those who are selected in Paid For)
    const perPersonShare = numericAmount / paidFor.length;
    
    const splits = paidFor.map(memberId => ({
      expense_id: expense.id,
      member_id: memberId,
      amount_owed: perPersonShare
    }));

    const { error: splitError } = await supabase
      .from('expense_splits')
      .insert(splits);

    if (splitError) {
      console.error('Error inserting splits:', splitError);
    }

    setLoading(false);
    setTitle('');
    setAmount('');
    setPaidBy(null);
    setPaidFor([]);
    onSuccess();
  };

  const isFormValid = title.trim() && amount.trim() && paidBy && paidFor.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff' }]}>
          <ThemedText style={styles.title}>Add Expense</ThemedText>
          
          <ThemedText style={styles.label}>What was this for?</ThemedText>
          <TextInput
            style={[styles.input, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}
            placeholder="e.g. Flight Tickets, Dinner"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={setTitle}
          />

          <ThemedText style={styles.label}>Amount (₹)</ThemedText>
          <TextInput
            style={[styles.input, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}
            placeholder="0.00"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <ThemedText style={styles.label}>Paid By</ThemedText>
          <ScrollView style={styles.membersList} horizontal showsHorizontalScrollIndicator={false}>
            {members.length === 0 && <ThemedText style={{color: '#888'}}>No members in group.</ThemedText>}
            {members.map(m => (
              <TouchableOpacity
                key={`by-${m.id}`}
                style={[styles.memberPill, paidBy === m.id && styles.memberPillActive]}
                onPress={() => setPaidBy(m.id)}
              >
                <ThemedText style={[styles.memberPillText, paidBy === m.id && styles.memberPillTextActive]}>
                  {m.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ThemedText style={styles.label}>Paid For</ThemedText>
          <ScrollView style={styles.membersList} horizontal showsHorizontalScrollIndicator={false}>
            {members.length === 0 && <ThemedText style={{color: '#888'}}>No members in group.</ThemedText>}
            {members.map(m => (
              <TouchableOpacity
                key={`for-${m.id}`}
                style={[styles.memberPill, paidFor.includes(m.id) && styles.memberPillActiveMulti]}
                onPress={() => handleTogglePaidFor(m.id)}
              >
                <ThemedText style={[styles.memberPillText, paidFor.includes(m.id) && styles.memberPillTextActive]}>
                  {m.name}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.createButton, !isFormValid && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.createButtonText}>Add Expense</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#6b7280',
  },
  input: {
    backgroundColor: '#88888822',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  membersList: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  memberPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#88888822',
    marginRight: 8,
  },
  memberPillActive: {
    backgroundColor: '#10B981', // Solid teal/green for singles
  },
  memberPillActiveMulti: {
    backgroundColor: '#3b82f6', // Solid blue to differentiate 'Paid For' multi-selection
  },
  memberPillText: {
    fontWeight: '500',
  },
  memberPillTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#88888822',
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  createButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
