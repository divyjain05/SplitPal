import React, { useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

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
  const [category, setCategory] = useState('Misc');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [paidFor, setPaidFor] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Custom dropdown states
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [paidByDropdownOpen, setPaidByDropdownOpen] = useState(false);

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

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: groupId,
        paid_by: paidBy,
        title: title.trim(),
        amount: numericAmount,
        // We aren't storing Category in schema yet, but UI supports it!
      })
      .select('id')
      .single();

    if (expenseError || !expense) {
      console.error('Error inserting expense:', expenseError);
      setLoading(false);
      return;
    }

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
    
    // Reset state
    setTitle('');
    setAmount('');
    setPaidBy(null);
    setPaidFor([]);
    setCategory('Misc');
    setCategoryDropdownOpen(false);
    setPaidByDropdownOpen(false);
    
    onSuccess();
  };

  // Helper to map member ID to name safely
  const getMemberName = (id: string | null) => {
    if (!id) return 'Select Member';
    const memb = members.find(m => m.id === id);
    return memb ? memb.name : 'Select Member';
  };

  const isFormValid = title.trim() && amount.trim() && paidBy && paidFor.length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.overlayBackground}>
          <ScrollView contentContainerStyle={styles.scrollLayout} showsVerticalScrollIndicator={false}>
            <View style={[styles.dialog, { backgroundColor: colorScheme === 'dark' ? '#1E293B' : '#FFFFFF' }]}>
              
              <ThemedText style={styles.headerTitle}>Add New Expense</ThemedText>
              
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  style={[styles.inputField, { color: colorScheme === 'dark' ? '#F8FAFC' : '#1E293B' }]}
                  placeholder="e.g., Dinner, Taxi"
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Amount (₹)</ThemedText>
                <TextInput
                  style={[styles.inputField, { color: colorScheme === 'dark' ? '#F8FAFC' : '#1E293B' }]}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Category</ThemedText>
                <TouchableOpacity 
                  style={styles.dropdownSelector} 
                  activeOpacity={0.7}
                  onPress={() => {
                    setCategoryDropdownOpen(!categoryDropdownOpen);
                    setPaidByDropdownOpen(false);
                  }}
                >
                  <ThemedText style={[styles.dropdownValue, { color: colorScheme === 'dark' ? '#F8FAFC' : '#1E293B' }]}>
                    {category}
                  </ThemedText>
                  <Ionicons name="chevron-expand" size={18} color="#64748B" />
                </TouchableOpacity>
                
                {/* Simulated Custom Category Dropdown List */}
                {categoryDropdownOpen && (
                  <View style={styles.inlineDropdownList}>
                    {['Misc', 'Food', 'Transport', 'Entertainment'].map((cat, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.dropdownListItem} 
                        onPress={() => {
                          setCategory(cat);
                          setCategoryDropdownOpen(false);
                        }}
                      >
                        <ThemedText style={{color: '#334155'}}>{cat}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Paid By</ThemedText>
                <TouchableOpacity 
                  style={styles.dropdownSelector} 
                  activeOpacity={0.7}
                  onPress={() => {
                    setPaidByDropdownOpen(!paidByDropdownOpen);
                    setCategoryDropdownOpen(false);
                  }}
                >
                  <ThemedText style={[
                      styles.dropdownValue, 
                      { color: paidBy ? (colorScheme === 'dark' ? '#F8FAFC' : '#1E293B') : '#94A3B8' }
                  ]}>
                    {getMemberName(paidBy)}
                  </ThemedText>
                  <Ionicons name="chevron-expand" size={18} color="#64748B" />
                </TouchableOpacity>

                {/* Simulated Custom PaidBy Dropdown List */}
                {paidByDropdownOpen && (
                  <View style={styles.inlineDropdownList}>
                    {members.length === 0 && <ThemedText style={{padding: 12, color: '#94A3B8'}}>No members</ThemedText>}
                    {members.map(m => (
                      <TouchableOpacity 
                        key={m.id} 
                        style={styles.dropdownListItem} 
                        onPress={() => {
                          setPaidBy(m.id);
                          setPaidByDropdownOpen(false);
                        }}
                      >
                        <ThemedText style={{color: '#334155'}}>{m.name}</ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Split Between</ThemedText>
                <View style={styles.splitBoxWrapper}>
                  {members.length === 0 && <ThemedText style={{color: '#94A3B8'}}>No members to split with.</ThemedText>}
                  {members.map(m => {
                    const isSelected = paidFor.includes(m.id);
                    return (
                      <TouchableOpacity 
                        key={m.id} 
                        style={styles.checkboxRow}
                        activeOpacity={0.7}
                        onPress={() => handleTogglePaidFor(m.id)}
                      >
                        <View style={[styles.customCheckbox, isSelected && styles.customCheckboxSelected]}>
                           {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                        </View>
                        <ThemedText style={styles.checkboxLabel}>{m.name}</ThemedText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {/* Red Error Message Validation */}
                {paidFor.length === 0 && (
                  <ThemedText style={styles.errorText}>Select at least one member</ThemedText>
                )}
              </View>

              <View style={styles.footerActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.addBtn, !isFormValid && styles.addBtnDisabled]}
                  onPress={handleCreate}
                  disabled={!isFormValid || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <ThemedText style={styles.addBtnText}>Add Expense</ThemedText>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  scrollLayout: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  dialog: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  dropdownValue: {
    fontSize: 15,
  },
  inlineDropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
  },
  dropdownListItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  splitBoxWrapper: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  customCheckboxSelected: {
    backgroundColor: '#4ABEA9',
    borderColor: '#4ABEA9',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#334155',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
    gap: 16,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  addBtn: {
    backgroundColor: '#4ABEA9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
