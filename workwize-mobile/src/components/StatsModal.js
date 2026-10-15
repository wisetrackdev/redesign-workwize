import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export default function StatsModal({
  visible,
  onClose,
  allJobs = [],
  onSelectStatusFilter,
}) {
  const [period, setPeriod] = useState('today');

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Filter jobs by period
  const filterByPeriod = (jobs) => {
    return jobs.filter((j) => {
      const d = new Date(j.opened || j.createdAt || now);
      if (isNaN(d.getTime())) return true;
      if (period === 'today') {
        return d.toDateString() === now.toDateString();
      } else if (period === 'weekly') {
        return d >= oneWeekAgo;
      }
      return true; // Monthly
    });
  };

  const periodJobs = filterByPeriod(allJobs);
  const totalCount = periodJobs.length;
  const openCount = periodJobs.filter((j) => (j.status || '').toLowerCase() === 'open').length;
  const assignedCount = periodJobs.filter((j) => (j.status || '').toLowerCase() === 'assigned').length;
  const inProgressCount = periodJobs.filter((j) => (j.status || '').toLowerCase().includes('progress')).length;
  const closedCount = periodJobs.filter((j) => (j.status || '').toLowerCase() === 'closed').length;

  // Aging (> 7 days)
  const openAging = allJobs.filter((j) => {
    if ((j.status || '').toLowerCase() !== 'open') return false;
    const d = new Date(j.opened || j.createdAt);
    return !isNaN(d.getTime()) && d < oneWeekAgo;
  }).length;

  const assignedAging = allJobs.filter((j) => {
    if ((j.status || '').toLowerCase() !== 'assigned') return false;
    const d = new Date(j.opened || j.createdAt);
    return !isNaN(d.getTime()) && d < oneWeekAgo;
  }).length;

  const inProgressAging = allJobs.filter((j) => {
    if (!(j.status || '').toLowerCase().includes('progress')) return false;
    const d = new Date(j.opened || j.createdAt);
    return !isNaN(d.getTime()) && d < oneWeekAgo;
  }).length;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Feather name="bar-chart-2" size={18} color={Colors.primary} />
              <Text style={styles.title}>Job Statistics</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Period Tabs (.recent-tabs) */}
            <View style={styles.periodTabs}>
              <TouchableOpacity
                style={[styles.pTab, period === 'today' && styles.pTabActive]}
                onPress={() => setPeriod('today')}
              >
                <Text style={[styles.pTabText, period === 'today' && styles.pTabTextActive]}>
                  Today
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pTab, period === 'weekly' && styles.pTabActive]}
                onPress={() => setPeriod('weekly')}
              >
                <Text style={[styles.pTabText, period === 'weekly' && styles.pTabTextActive]}>
                  Weekly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pTab, period === 'monthly' && styles.pTabActive]}
                onPress={() => setPeriod('monthly')}
              >
                <Text style={[styles.pTabText, period === 'monthly' && styles.pTabTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stat Boxes (.stat-boxes) */}
            <View style={styles.grid}>
              {/* Total Jobs */}
              <TouchableOpacity
                style={[styles.statBox, styles.boxTotal]}
                onPress={() => {
                  onSelectStatusFilter('all');
                  onClose();
                }}
              >
                <View style={[styles.boxIcon, { backgroundColor: '#E8ECF8' }]}>
                  <Feather name="layers" size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.boxLabel}>TOTAL NEW JOBS</Text>
                  <Text style={[styles.boxNumber, { color: Colors.primaryDeep }]}>
                    {totalCount}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Open */}
              <TouchableOpacity
                style={[styles.statBox, styles.boxOpen]}
                onPress={() => {
                  onSelectStatusFilter('Open');
                  onClose();
                }}
              >
                <View style={[styles.boxIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Feather name="clock" size={18} color="#D97706" />
                </View>
                <View>
                  <Text style={styles.boxLabel}>OPEN</Text>
                  <Text style={[styles.boxNumber, { color: '#B45309' }]}>
                    {openCount}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Assigned */}
              <TouchableOpacity
                style={[styles.statBox, styles.boxAssigned]}
                onPress={() => {
                  onSelectStatusFilter('Assigned');
                  onClose();
                }}
              >
                <View style={[styles.boxIcon, { backgroundColor: '#EEF0FE' }]}>
                  <Feather name="user-check" size={18} color="#4F46E5" />
                </View>
                <View>
                  <Text style={styles.boxLabel}>ASSIGNED</Text>
                  <Text style={[styles.boxNumber, { color: '#3730A3' }]}>
                    {assignedCount}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* In Progress */}
              <TouchableOpacity
                style={[styles.statBox, styles.boxProgress]}
                onPress={() => {
                  onSelectStatusFilter('In-Progress');
                  onClose();
                }}
              >
                <View style={[styles.boxIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Feather name="activity" size={18} color="#0284C7" />
                </View>
                <View>
                  <Text style={styles.boxLabel}>IN PROGRESS</Text>
                  <Text style={[styles.boxNumber, { color: '#0369A1' }]}>
                    {inProgressCount}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Closed */}
              <TouchableOpacity
                style={[styles.statBox, styles.boxClosed]}
                onPress={() => {
                  onSelectStatusFilter('Closed');
                  onClose();
                }}
              >
                <View style={[styles.boxIcon, { backgroundColor: '#E3F5DE' }]}>
                  <Feather name="check-circle" size={18} color="#2E8A2B" />
                </View>
                <View>
                  <Text style={styles.boxLabel}>CLOSED</Text>
                  <Text style={[styles.boxNumber, { color: '#15803D' }]}>
                    {closedCount}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Aging of Jobs Section (.aging-section) */}
            <View style={styles.agingSection}>
              <View style={styles.agingHeader}>
                <View style={styles.agingTitleWrap}>
                  <Feather name="alert-triangle" size={15} color="#EF4444" />
                  <Text style={styles.agingTitle}>Aging of Jobs</Text>
                </View>
                <View style={styles.agingPill}>
                  <Text style={styles.agingPillText}>{'>'} 1 Week Old</Text>
                </View>
              </View>

              <View style={styles.agingGrid}>
                <View style={[styles.agingBox, { borderColor: '#FDE68A' }]}>
                  <View style={styles.agingDotLabel}>
                    <View style={[styles.dot, { backgroundColor: '#D97706' }]} />
                    <Text style={styles.agingBoxLabel}>Open</Text>
                  </View>
                  <Text style={[styles.agingBoxNum, { color: '#B45309' }]}>
                    {openAging}
                  </Text>
                  <Text style={styles.agingBoxSub}>{'>'} 7 days</Text>
                </View>

                <View style={[styles.agingBox, { borderColor: '#DDD6FE' }]}>
                  <View style={styles.agingDotLabel}>
                    <View style={[styles.dot, { backgroundColor: '#6366F1' }]} />
                    <Text style={styles.agingBoxLabel}>Assigned</Text>
                  </View>
                  <Text style={[styles.agingBoxNum, { color: '#4338CA' }]}>
                    {assignedAging}
                  </Text>
                  <Text style={styles.agingBoxSub}>{'>'} 7 days</Text>
                </View>

                <View style={[styles.agingBox, { borderColor: '#BAE6FD' }]}>
                  <View style={styles.agingDotLabel}>
                    <View style={[styles.dot, { backgroundColor: '#0284C7' }]} />
                    <Text style={styles.agingBoxLabel}>In-Progress</Text>
                  </View>
                  <Text style={[styles.agingBoxNum, { color: '#0369A1' }]}>
                    {inProgressAging}
                  </Text>
                  <Text style={styles.agingBoxSub}>{'>'} 7 days</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.bgOverlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    backgroundColor: '#FAFBFD',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F0F4FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D9E2F5',
    padding: 4,
    gap: 4,
    marginBottom: 16,
  },
  pTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  pTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  pTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.ink,
  },
  pTabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  boxTotal: {
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    backgroundColor: '#F7F9FD',
  },
  boxOpen: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.amber,
  },
  boxAssigned: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  boxProgress: {
    borderLeftWidth: 4,
    borderLeftColor: '#0284C7',
  },
  boxClosed: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.green,
  },
  boxIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.4,
  },
  boxNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  agingSection: {
    backgroundColor: '#FAFBFD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 14,
    marginBottom: 20,
  },
  agingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  agingTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  agingPill: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  agingPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
  agingGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  agingBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
  },
  agingDotLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  agingBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
  },
  agingBoxNum: {
    fontSize: 17,
    fontWeight: '800',
    marginVertical: 2,
  },
  agingBoxSub: {
    fontSize: 9.5,
    color: Colors.muted,
    fontWeight: '600',
  },
});
