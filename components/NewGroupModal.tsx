import React, { useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface NewGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (groupId: string) => void;
}

export default function NewGroupModal({ visible, onClose, onSuccess }: NewGroupModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      return;
    }

    // Insert group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({ name: name.trim(), created_by: userData.user.id })
      .select('id')
      .single();

    if (groupError || !group) {
      console.error('Error creating group:', groupError);
      setLoading(false);
      return;
    }

    // Get the creator's actual name to insert into group_members.member_name
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', userData.user.id).single();
    const creatorName = profile?.full_name || 'Creator';

    // Insert as member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ 
        group_id: group.id, 
        user_id: userData.user.id,
        member_name: creatorName 
      });

    if (memberError) {
      console.error('Error adding member:', memberError);
      setLoading(false);
      return;
    }

    setLoading(false);
    setName('');
    onSuccess(group.id);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff' }]}>
          <ThemedText style={styles.title}>New Group</ThemedText>
          <ThemedText style={styles.subtitle}>What is this group for?</ThemedText>

          <TextInput
            style={[styles.input, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}
            placeholder="e.g. Goa Trip, Apartment Bills"
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
              onPress={handleCreate}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.createButtonText}>Create</ThemedText>
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
    backgroundColor: '#88888822', // updated to be adaptive
  },
  cancelButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  createButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
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
