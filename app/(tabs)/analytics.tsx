import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [topGroup, setTopGroup] = useState<any>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setLoading(false);
      return;
    }

    // 1. Get groups user is part of
    const { data: memberGroups } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, created_at)')
      .eq('user_id', userData.user.id);

    if (!memberGroups || memberGroups.length === 0) {
      setLoading(false);
      return;
    }

    const groupIds = memberGroups.map((g: any) => g.group_id);

    // 2. Fetch all expenses for these groups
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, group_id')
      .in('group_id', groupIds);

    let total = 0;
    const groupTotals: Record<string, number> = {};

    memberGroups.forEach((g: any) => {
      groupTotals[g.group_id] = 0;
    });

    expenses?.forEach((expense: any) => {
      const amt = Number(expense.amount);
      total += amt;
      groupTotals[expense.group_id] += amt;
    });

    setTotalSpent(total);

    // 3. Find top group
    let maxObj = { id: null, total: -1, name: '' } as any;
    
    Object.keys(groupTotals).forEach((gid) => {
      if (groupTotals[gid] > maxObj.total) {
        const matchingGroup = memberGroups.find((g: any) => g.group_id === gid);
        maxObj = {
          id: gid,
          total: groupTotals[gid],
          name: matchingGroup?.groups?.name || 'Unknown'
        };
      }
    });

    if (maxObj.id) {
      setTopGroup(maxObj);
    } else {
      setTopGroup(null);
    }

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [])
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Analytics</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.sectionTitle}>Overview</ThemedText>

        {loading ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grid}>
            {/* Total Lifetime Spending Box */}
            <LinearGradient 
              colors={['#10B981', '#2DD4BF']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }} 
              style={[styles.box, styles.largeBox]}
            >
              <ThemedText style={styles.boxLabel}>Lifetime Spent</ThemedText>
              <ThemedText style={styles.boxAmount}>₹{totalSpent.toLocaleString('en-IN')}</ThemedText>
              <View style={styles.iconOverlay}>
                 <Ionicons name="stats-chart" size={24} color="#ffffff" opacity={0.6}/>
              </View>
            </LinearGradient>

            {/* Top Spending Group Box */}
            <TouchableOpacity 
              disabled={!topGroup}
              onPress={() => topGroup && router.push(`/group/${topGroup.id}`)}
              style={styles.touchableCard}
              activeOpacity={0.8}
            >
              <View style={[styles.box, styles.whiteBox]}>
                <ThemedText style={styles.boxLabelDark}>Top Group</ThemedText>
                {topGroup ? (
                  <>
                    <ThemedText style={styles.topGroupName} numberOfLines={1}>{topGroup.name}</ThemedText>
                    <ThemedText style={styles.topGroupAmount}>₹{topGroup.total.toLocaleString('en-IN')}</ThemedText>
                    <View style={styles.linkRow}>
                      <ThemedText style={styles.linkText}>View Group</ThemedText>
                      <Ionicons name="arrow-forward" size={12} color="#10B981" />
                    </View>
                  </>
                ) : (
                  <ThemedText style={styles.emptyCardText}>No data yet.</ThemedText>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  touchableCard: {
    flex: 1,
  },
  box: {
    padding: 20,
    borderRadius: 24,
    height: 160,
    justifyContent: 'center',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  largeBox: {
    flex: 1.2,
    shadowColor: '#10B981',
    shadowOpacity: 0.25,
  },
  whiteBox: {
    backgroundColor: '#FFFFFF',
  },
  boxLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '700',
    marginBottom: 8,
  },
  boxAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  iconOverlay: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.3,
    transform: [{ scale: 2 }],
  },
  boxLabelDark: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  topGroupName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  topGroupAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyCardText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
  }
});
