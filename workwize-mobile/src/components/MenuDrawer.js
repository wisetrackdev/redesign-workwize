import React from 'react';
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

export default function MenuDrawer({
  visible,
  onClose,
  activeItem,
  onSelectTab,
  onOpenNewJob,
  onOpenStats,
  onOpenFilter,
  onOpenProfile,
  onOpenLogin,
  onLogout,
  currentUser,
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        {/* Top Close Button (Circled X matching Screen 17) */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <ScrollView style={styles.menuContainer} contentContainerStyle={styles.menuContent}>
          {/* Group 1: Navigation */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onSelectTab('open');
            }}
          >
            <View style={styles.menuLeft}>
              <Feather name="layers" size={20} color={Colors.textPrimary} />
              <Text style={styles.menuLabel}>Open Jobs</Text>
            </View>
            {activeItem === 'open' && (
              <Feather name="check" size={18} color={Colors.textAccent} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onSelectTab('closed');
            }}
          >
            <View style={styles.menuLeft}>
              <Feather name="check-circle" size={20} color={Colors.textPrimary} />
              <Text style={styles.menuLabel}>Closed Jobs</Text>
            </View>
            {activeItem === 'closed' && (
              <Feather name="check" size={18} color={Colors.textAccent} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onOpenNewJob();
            }}
          >
            <View style={styles.menuLeft}>
              <Feather name="plus-square" size={20} color={Colors.textPrimary} />
              <Text style={styles.menuLabel}>Create New Job</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Group 2: Tools & Stats */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onOpenStats();
            }}
          >
            <View style={styles.menuLeft}>
              <Feather name="bar-chart-2" size={20} color={Colors.textPrimary} />
              <Text style={styles.menuLabel}>Job Statistics & Aging</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onOpenFilter();
            }}
          >
            <View style={styles.menuLeft}>
              <Feather name="sliders" size={20} color={Colors.textPrimary} />
              <Text style={styles.menuLabel}>Filter & Sort Settings</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Group 3: Account */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onOpenProfile();
            }}
          >
            <View style={styles.menuLeft}>
              <Feather name="user" size={20} color={Colors.textPrimary} />
              <Text style={styles.menuLabel}>
                {currentUser ? currentUser.name : 'Account Profile'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onOpenLogin();
            }}
          >
            <View style={styles.menuLeft}>
              <Feather name="log-in" size={20} color={Colors.textPrimary} />
              <Text style={styles.menuLabel}>Sign In / Switch User</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onLogout();
            }}
          >
            <View style={styles.menuLeft}>
              <Feather name="log-out" size={20} color={Colors.statusDanger} />
              <Text style={[styles.menuLabel, { color: Colors.statusDanger }]}>Log Out</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#070E22EE',
    justifyContent: 'center',
    paddingTop: 60,
  },
  closeBtn: {
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  menuContainer: {
    paddingHorizontal: 36,
  },
  menuContent: {
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 18,
    width: '40%',
    alignSelf: 'center',
  },
});
