import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export default function TabBar({
  activeTab,
  openCount = 0,
  closedCount = 0,
  onPressNewJob,
  onPressOpenJobs,
  onPressClosedJobs,
  onPressFilter,
  onPressStats,
}) {
  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.dockBar}>
        {/* Tab 1: Open Jobs Button */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'open' && styles.tabButtonActive]}
          onPress={onPressOpenJobs}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Feather
              name="layers"
              size={20}
              color={activeTab === 'open' ? Colors.primary : Colors.muted}
            />
            {openCount > 0 && (
              <View style={[styles.tabBadge, activeTab === 'open' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'open' && styles.tabBadgeTextActive]}>
                  {openCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'open' && styles.tabLabelActive]}>
            Open
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Filter Button */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={onPressFilter}
          activeOpacity={0.7}
        >
          <Feather name="sliders" size={20} color={Colors.muted} />
          <Text style={styles.tabLabel}>Filter</Text>
        </TouchableOpacity>

        {/* Center Placeholder to leave space for Floating Action Button */}
        <View style={styles.fabSpacer} pointerEvents="none" />

        {/* Tab 3: Closed Jobs Button */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'closed' && styles.tabButtonActive]}
          onPress={onPressClosedJobs}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Feather
              name="check-circle"
              size={20}
              color={activeTab === 'closed' ? Colors.greenDark : Colors.muted}
            />
            {closedCount > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: Colors.greenSoft }]}>
                <Text style={[styles.tabBadgeText, { color: Colors.greenDark }]}>
                  {closedCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'closed' && styles.tabLabelActive]}>
            Closed
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Statistics Button */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'stats' && styles.tabButtonActive]}
          onPress={onPressStats}
          activeOpacity={0.7}
        >
          <Feather
            name="bar-chart-2"
            size={20}
            color={activeTab === 'stats' ? Colors.primary : Colors.muted}
          />
          <Text style={[styles.tabLabel, activeTab === 'stats' && styles.tabLabelActive]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Floating Center Action Button (+ New Job) positioned at wrapper level so Android doesn't clip touches! */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabTouchable}
          onPress={onPressNewJob}
          activeOpacity={0.8}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <LinearGradient
            colors={
              activeTab === 'new'
                ? [Colors.primary, Colors.primaryDark]
                : [Colors.green, Colors.greenDark]
            }
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingTop: 16,
  },
  dockBar: {
    width: '100%',
    height: 68,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 14 : 4,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabButtonActive: {
    transform: [{ scale: 1.05 }],
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 26,
    height: 24,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    marginTop: 3,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -12,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  tabBadgeActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.primary,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  fabSpacer: {
    width: 60,
    height: 40,
  },
  fabContainer: {
    position: 'absolute',
    top: 4,
    left: '50%',
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 99,
  },
  fabTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    overflow: 'hidden',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
