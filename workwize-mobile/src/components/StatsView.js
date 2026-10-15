import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export default function StatsView({
  jobs = [],
  currentPropertyName = 'Testing',
  onSelectFilter,
}) {
  const [statPeriod, setStatPeriod] = useState('today'); // 'today' | 'weekly' | 'monthly'

  // Filter jobs by period
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const filtered = jobs.filter((j) => {
      const d = new Date(j.opened || j.createdAt || now).getTime();
      if (isNaN(d)) return true;
      if (statPeriod === 'today') {
        const jd = new Date(d);
        return (
          jd.getDate() === now.getDate() &&
          jd.getMonth() === now.getMonth() &&
          jd.getFullYear() === now.getFullYear()
        );
      } else if (statPeriod === 'weekly') {
        return d >= oneWeekAgo;
      }
      return d >= thirtyDaysAgo;
    });

    const total = filtered.length;
    const open = filtered.filter((j) => (j.status || '').toLowerCase() === 'open').length;
    const assigned = filtered.filter(
      (j) => (j.status || '').toLowerCase() === 'assigned'
    ).length;
    const inProgress = filtered.filter((j) =>
      (j.status || '').toLowerCase().includes('progress')
    ).length;
    const closed = filtered.filter(
      (j) => (j.status || '').toLowerCase() === 'closed'
    ).length;

    // Aging: > 1 week old
    const agingOpen = jobs.filter(
      (j) =>
        (j.status || '').toLowerCase() === 'open' &&
        new Date(j.opened || j.createdAt).getTime() < oneWeekAgo
    ).length;
    const agingAssigned = jobs.filter(
      (j) =>
        (j.status || '').toLowerCase() === 'assigned' &&
        new Date(j.opened || j.createdAt).getTime() < oneWeekAgo
    ).length;
    const agingInProgress = jobs.filter(
      (j) =>
        (j.status || '').toLowerCase().includes('progress') &&
        new Date(j.opened || j.createdAt).getTime() < oneWeekAgo
    ).length;

    // Department Breakdown
    const deptMap = {};
    filtered.forEach((j) => {
      const dept = j.dept || j.issued_to_team || 'General';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    });

    const deptBreakdown = Object.keys(deptMap)
      .map((k) => ({ name: k, count: deptMap[k] }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      open,
      assigned,
      inProgress,
      closed,
      agingOpen,
      agingAssigned,
      agingInProgress,
      deptBreakdown,
    };
  }, [jobs, statPeriod]);

  const handleCardPress = (status) => {
    if (onSelectFilter) {
      onSelectFilter(status);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Statistics Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsTopBar}>
            <View>
              <Text style={styles.statsHeading}>Job Statistics</Text>
              <Text style={styles.propertyText}>
                Property: <Text style={styles.propName}>{currentPropertyName}</Text>
              </Text>
            </View>

            {/* Period Selector Tabs */}
            <View style={styles.statPeriodTabs}>
              <TouchableOpacity
                style={[styles.ptab, statPeriod === 'today' && styles.ptabActive]}
                onPress={() => setStatPeriod('today')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.ptabText,
                    statPeriod === 'today' && styles.ptabTextActive,
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ptab, statPeriod === 'weekly' && styles.ptabActive]}
                onPress={() => setStatPeriod('weekly')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.ptabText,
                    statPeriod === 'weekly' && styles.ptabTextActive,
                  ]}
                >
                  Weekly
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ptab, statPeriod === 'monthly' && styles.ptabActive]}
                onPress={() => setStatPeriod('monthly')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.ptabText,
                    statPeriod === 'monthly' && styles.ptabTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Metric Boxes Grid (Total, Open, Assigned, Closed) */}
          <View style={styles.metricGrid}>
            {/* Total Jobs */}
            <TouchableOpacity
              style={[styles.mBox, styles.mBoxTotal]}
              onPress={() => handleCardPress('all')}
              activeOpacity={0.8}
            >
              <View style={[styles.mIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Feather name="briefcase" size={18} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.mLabel}>TOTAL JOBS</Text>
                <Text style={styles.mNum}>{stats.total}</Text>
              </View>
            </TouchableOpacity>

            {/* Open */}
            <TouchableOpacity
              style={[styles.mBox, styles.mBoxOpen]}
              onPress={() => handleCardPress('Open')}
              activeOpacity={0.8}
            >
              <View style={[styles.mIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="clock" size={18} color={Colors.amberDark} />
              </View>
              <View>
                <Text style={styles.mLabel}>OPEN</Text>
                <Text style={[styles.mNum, { color: Colors.amberDark }]}>
                  {stats.open}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Assigned */}
            <TouchableOpacity
              style={[styles.mBox, styles.mBoxAssigned]}
              onPress={() => handleCardPress('Assigned')}
              activeOpacity={0.8}
            >
              <View style={[styles.mIconWrap, { backgroundColor: '#E0E7FF' }]}>
                <Feather name="user-check" size={18} color="#4338CA" />
              </View>
              <View>
                <Text style={styles.mLabel}>ASSIGNED</Text>
                <Text style={[styles.mNum, { color: '#4338CA' }]}>
                  {stats.assigned}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Closed */}
            <TouchableOpacity
              style={[styles.mBox, styles.mBoxClosed]}
              onPress={() => handleCardPress('Closed')}
              activeOpacity={0.8}
            >
              <View style={[styles.mIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Feather name="check-circle" size={18} color={Colors.greenDark} />
              </View>
              <View>
                <Text style={styles.mLabel}>CLOSED</Text>
                <Text style={[styles.mNum, { color: Colors.greenDark }]}>
                  {stats.closed}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Aging of Jobs Section */}
          <View style={styles.agingSection}>
            <View style={styles.agingHeader}>
              <View style={styles.agingTitleLeft}>
                <Feather name="alert-circle" size={15} color={Colors.red} />
                <Text style={styles.agingTitle}>Aging of Pending Jobs</Text>
              </View>
              <View style={styles.agingBadge}>
                <Text style={styles.agingBadgeText}>&gt; 7 Days Old</Text>
              </View>
            </View>

            <View style={styles.agingRow}>
              <View style={styles.agingBox}>
                <Text style={styles.agingBoxLabel}>OPEN</Text>
                <Text style={[styles.agingBoxNum, { color: Colors.amberDark }]}>
                  {stats.agingOpen}
                </Text>
                <Text style={styles.agingBoxSub}>&gt; 7 days</Text>
              </View>

              <View style={styles.agingBox}>
                <Text style={styles.agingBoxLabel}>ASSIGNED</Text>
                <Text style={[styles.agingBoxNum, { color: '#4338CA' }]}>
                  {stats.agingAssigned}
                </Text>
                <Text style={styles.agingBoxSub}>&gt; 7 days</Text>
              </View>

              <View style={styles.agingBox}>
                <Text style={styles.agingBoxLabel}>IN-PROGRESS</Text>
                <Text style={[styles.agingBoxNum, { color: Colors.progressDark }]}>
                  {stats.agingInProgress}
                </Text>
                <Text style={styles.agingBoxSub}>&gt; 7 days</Text>
              </View>
            </View>
          </View>

          {/* Department Breakdown */}
          {stats.deptBreakdown.length > 0 && (
            <View style={styles.deptSection}>
              <View style={styles.deptHeader}>
                <Feather name="pie-chart" size={14} color={Colors.primary} />
                <Text style={styles.deptHeading}>Jobs by Department</Text>
              </View>

              {stats.deptBreakdown.map((d, index) => {
                const percentage = stats.total > 0 ? Math.round((d.count / stats.total) * 100) : 0;
                return (
                  <View key={d.name || index} style={styles.deptRow}>
                    <View style={styles.deptRowTop}>
                      <Text style={styles.deptName} numberOfLines={1}>
                        {d.name}
                      </Text>
                      <Text style={styles.deptCount}>
                        {d.count} ({percentage}%)
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(100, Math.max(5, percentage))}%`,
                            backgroundColor:
                              index === 0
                                ? Colors.primary
                                : index === 1
                                ? Colors.greenDark
                                : index === 2
                                ? Colors.amberDark
                                : '#6366F1',
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 95,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statsTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  statsHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
  },
  propertyText: {
    fontSize: 11.5,
    color: Colors.muted,
    marginTop: 2,
  },
  propName: {
    color: Colors.primary,
    fontWeight: '700',
  },
  statPeriodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    gap: 3,
  },
  ptab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ptabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  ptabText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
  },
  ptabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  mBox: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: '#FFFFFF',
  },
  mBoxTotal: {
    borderColor: '#E0E7FF',
    backgroundColor: '#F8FAFF',
  },
  mBoxOpen: {
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFDF5',
  },
  mBoxAssigned: {
    borderColor: '#E0E7FF',
    backgroundColor: '#F5F7FF',
  },
  mBoxClosed: {
    borderColor: '#DCFCE7',
    backgroundColor: '#F6FEF9',
  },
  mIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.3,
  },
  mNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 1,
  },
  agingSection: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginBottom: 14,
  },
  agingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  agingTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  agingTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#9A3412',
  },
  agingBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  agingBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.red,
  },
  agingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  agingBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  agingBoxLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.muted,
  },
  agingBoxNum: {
    fontSize: 16,
    fontWeight: '800',
    marginVertical: 2,
  },
  agingBoxSub: {
    fontSize: 9,
    color: Colors.muted,
  },
  deptSection: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  deptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  deptHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
  },
  deptRow: {
    marginBottom: 9,
  },
  deptRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  deptName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
    flex: 1,
  },
  deptCount: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.muted,
    marginLeft: 8,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
