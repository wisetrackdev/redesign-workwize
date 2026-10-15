import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export default function Header({
  activeTab,
  onTabChange,
  onOpenNewJob,
  onOpenMenu,
  onOpenProfile,
  onOpenFilter,
  propertyName = 'Testing',
  unreadCount = 0,
  openCount = 0,
  closedCount = 0,
  currentUser,
}) {
  const userInitial = currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'IT';

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primaryDark}
        translucent={Platform.OS === 'android'}
      />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        {/* WorkWize Logo in White Pill (Exact match to workwize-teal) */}
        <TouchableOpacity
          style={styles.logoPill}
          activeOpacity={0.9}
          onPress={() => onTabChange && onTabChange('open')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Active Property Badge Pill */}
        <TouchableOpacity
          style={styles.propPill}
          onPress={onOpenProfile}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="layers" size={13} color="#FFFFFF" />
          <Text style={styles.propPillText} numberOfLines={1}>
            {propertyName}
          </Text>
          <Feather name="chevron-down" size={13} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>

        {/* Right Action Icons */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenFilter}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="filter" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* User Avatar with Green Active Dot */}
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={onOpenProfile}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View style={styles.greenDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Control Navigation Tabs (Exact match to workwize-teal .seg .tab) */}
      <View style={styles.segContainer}>
        {/* New Job Tab */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.tabActive]}
          onPress={onOpenNewJob}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
            + New Job
          </Text>
        </TouchableOpacity>

        {/* Open Tab */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'open' && styles.tabActive]}
          onPress={() => onTabChange('open')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'open' && styles.tabTextActive]}>
            Open
          </Text>
          <View style={[styles.badge, activeTab === 'open' && styles.badgeActive]}>
            <Text style={[styles.badgeText, activeTab === 'open' && styles.badgeTextActive]}>
              {openCount}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Closed Tab */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'closed' && styles.tabActive]}
          onPress={() => onTabChange('closed')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'closed' && styles.tabTextActive]}>
            Closed
          </Text>
          <View style={[styles.badge, activeTab === 'closed' && styles.badgeActive]}>
            <Text style={[styles.badgeText, activeTab === 'closed' && styles.badgeTextActive]}>
              {closedCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 10 : (Platform.OS === 'ios' ? 44 : 12),
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  logoPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoImage: {
    width: 90,
    height: 22,
  },
  propPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    maxWidth: 160,
  },
  propPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarWrap: {
    position: 'relative',
    padding: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  greenDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  segContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 6,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: Colors.primary,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
});
