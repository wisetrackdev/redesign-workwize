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
  onOpenPropertyPicker,
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
        translucent={false}
      />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        {/* WorkWize Logo in White Pill (Exact match to workwize-teal) */}
        <TouchableOpacity
          style={styles.logoPill}
          activeOpacity={0.9}
          onPress={() => onTabChange && onTabChange('open')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Active Property Badge Pill - Clicking opens Property Switcher */}
        <TouchableOpacity
          style={styles.propPill}
          onPress={onOpenPropertyPicker || onOpenProfile}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        >
          <Feather name="layers" size={12} color="#FFFFFF" />
          <Text style={styles.propPillText} numberOfLines={1}>
            {propertyName}
          </Text>
          <Feather name="chevron-down" size={12} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>

        {/* Right Action Icons */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onOpenFilter}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Feather name="filter" size={17} color="#FFFFFF" />
          </TouchableOpacity>

          {/* User Avatar with Green Active Dot - Clicking opens Profile Modal */}
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={onOpenProfile}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
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
    paddingTop: Platform.OS === 'android' ? 6 : (Platform.OS === 'ios' ? 8 : 4),
    paddingBottom: 10,
    paddingHorizontal: 12,
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
    marginBottom: 10,
    gap: 6,
  },
  logoPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 78,
    height: 20,
  },
  propPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    flexShrink: 1,
    maxWidth: 135,
  },
  propPillText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarWrap: {
    position: 'relative',
    padding: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  avatarText: {
    fontSize: 12,
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
