import React, { useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AddMemberModalProps {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddMemberModal({ visible, groupId, onClose, onSuccess }: AddMemberModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();

  const handleAddMember = async () => {
    if (!name.trim()) return;
    setLoading(true);

    // Get current user to bypass RLS restrictions later
    const { data: { session } } = await supabase.auth.getSession();

    const { error } = await supabase
      .from('group_members')
      .insert({ 
        group_id: groupId, 
        member_name: name.trim(),
        user_id: session?.user?.id || null 
      });

    setLoading(false);
    
    if (error) {
      console.error(error);
      return;
    }

    setName('');
    onSuccess();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff' }]}>
          <ThemedText style={styles.title}>Add Member</ThemedText>
          <ThemedText style={styles.subtitle}>Enter the member's name. They don't need to have an account!</ThemedText>

          <TextInput
            style={[styles.input, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}
            placeholder="e.g. Rahul, Mom"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.createButton, !name.trim() && styles.createButtonDisabled]}
              onPress={handleAddMember}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.createButtonText}>Add</ThemedText>
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#88888822',
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
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
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 9999,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#a7f3d0',
  },
  createButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
