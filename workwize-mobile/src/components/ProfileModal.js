import React, { useState, useMemo } from 'react';
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
import DropdownModal from './DropdownModal';
import { isSuperAdmin } from '../api/dailyJobApi';

export default function ProfileModal({
  visible,
  onClose,
  currentUser,
  allProperties = [],
  currentPropertyId = 'Testing',
  onSelectProperty,
  openCount = 0,
  closedCount = 0,
  primaryTeamName = '',
  onLogout,
}) {
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);

  const user = currentUser || {
    name: 'IT',
    email: 'it@workwize.com',
    desg: 'App admin',
    prop: 'Testing',
    role: ['ADMIN'],
    access: { QuickFix: 'Full' },
  };

  const superAdmin = isSuperAdmin(user);

  // Find active property name
  const activePropertyObj = useMemo(() => {
    return (
      allProperties.find(
        (p) =>
          String(p.propId || p.id) === String(currentPropertyId) ||
          String(p.propName || p.name) === String(currentPropertyId)
      ) || null
    );
  }, [allProperties, currentPropertyId]);

  const activePropertyName =
    activePropertyObj?.propName ||
    activePropertyObj?.name ||
    currentPropertyId ||
    'Testing';

  // Format properties for DropdownModal
  const propertyOptions = useMemo(() => {
    return allProperties.map((p) => ({
      id: p.propId || p.id || p.propName,
      label: p.propName || p.name || String(p.propId),
      value: p.propId || p.id || p.propName,
      sublabel: p.propId ? `Property ID: ${p.propId}` : undefined,
    }));
  }, [allProperties]);

  // Format Access Permissions text from API
  const accessDisplay = useMemo(() => {
    if (superAdmin) {
      return 'Superadmin · Full System Access (All Properties & Teams)';
    }

    if (user.access) {
      if (typeof user.access === 'object' && Object.keys(user.access).length > 0) {
        return Object.entries(user.access)
          .map(([k, v]) => `${k}: ${v === true ? 'Full' : v}`)
          .join(' • ');
      }
      if (typeof user.access === 'string' && user.access.trim()) {
        return user.access;
      }
      if (Array.isArray(user.access) && user.access.length > 0) {
        return user.access.join(', ');
      }
    }

    const rolesStr = Array.isArray(user.role) ? user.role.join(', ') : user.role || 'Staff';
    return `${rolesStr} Access (Assigned Property Only)`;
  }, [user, superAdmin]);

  const handlePickProperty = (propId, item) => {
    setShowPropertyPicker(false);
    if (onSelectProperty) {
      onSelectProperty(item);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.name ? user.name.slice(0, 2).toUpperCase() : 'IT'}
                  </Text>
                </View>
                <View style={styles.greenDot} />
              </View>
              <View>
                <Text style={styles.userName}>{user.name || 'IT'}</Text>
                <Text style={styles.userRole}>
                  {user.desg || (user.role && user.role[0]) || 'App admin'}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Interactive Property Selector Box (.pd-select-container in workwize-teal) */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>ACTIVE PROPERTY</Text>
                <Text style={styles.sectionRoleTag}>
                  {superAdmin
                    ? 'SUPERADMIN · ALL PROPERTIES'
                    : 'ASSIGNED PROPERTY'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.selectBox}
                onPress={() => setShowPropertyPicker(true)}
                activeOpacity={0.8}
              >
                <View style={styles.selectLeft}>
                  <View style={styles.propIconWrap}>
                    <Feather name="layers" size={18} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectValue} numberOfLines={1}>
                      {activePropertyName}
                    </Text>
                    <Text style={styles.selectSub}>
                      {superAdmin
                        ? 'Tap to switch between all properties'
                        : `Authorized property (${allProperties.length} available)`}
                    </Text>
                  </View>
                </View>
                <View style={styles.selectRight}>
                  <View style={styles.activeCheckBadge}>
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                  <Feather name="chevron-down" size={18} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Quick Stats Summary */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{openCount}</Text>
                <Text style={styles.statLbl}>Open Jobs</Text>
              </View>
              <View
                style={[
                  styles.statBox,
                  { borderLeftWidth: 1, borderLeftColor: Colors.line },
                ]}
              >
                <Text style={[styles.statNum, { color: Colors.greenDark }]}>
                  {closedCount}
                </Text>
                <Text style={styles.statLbl}>Closed Jobs</Text>
              </View>
            </View>

            {/* User Meta Details & API Access (.pd-menu) */}
            <View style={styles.menu}>
              <View style={styles.menuItem}>
                <Feather name="mail" size={16} color={Colors.primary} />
                <View style={styles.menuItemCol}>
                  <Text style={styles.menuItemLabel}>EMAIL ADDRESS</Text>
                  <Text style={styles.menuItemText}>{user.email || 'it@workwize.com'}</Text>
                </View>
              </View>

              {/* API Access Permission info */}
              <View style={styles.menuItem}>
                <Feather name="shield" size={16} color={Colors.primary} />
                <View style={styles.menuItemCol}>
                  <Text style={styles.menuItemLabel}>API ACCESS &amp; PERMISSIONS</Text>
                  <Text style={styles.menuItemText}>{accessDisplay}</Text>
                </View>
              </View>

              {/* Department / Primary Team */}
              <View style={styles.menuItem}>
                <Feather name="users" size={16} color={Colors.primary} />
                <View style={styles.menuItemCol}>
                  <Text style={styles.menuItemLabel}>ASSIGNED DEPARTMENT</Text>
                  <Text style={styles.menuItemText}>
                    {primaryTeamName || user.primaryTeam || user.dept || 'Testing-House Keeping'}
                  </Text>
                </View>
              </View>

              {/* Server Endpoint info */}
              <View style={styles.menuItem}>
                <Feather name="server" size={16} color={Colors.primary} />
                <View style={styles.menuItemCol}>
                  <Text style={styles.menuItemLabel}>API ENDPOINT</Text>
                  <Text style={styles.menuItemText}>
                    https://api.workwize.in/ &middot;{' '}
                    <Text style={{ color: Colors.greenDark, fontWeight: '700' }}>
                      Live Connected
                    </Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Logout button (.pd-action-btn.danger) */}
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
              <Feather name="log-out" size={16} color={Colors.red} />
              <Text style={styles.logoutBtnText}>Log Out from WorkWize</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Property Selector Dropdown Modal */}
      <DropdownModal
        visible={showPropertyPicker}
        title="Select Property"
        options={propertyOptions}
        selectedValue={currentPropertyId}
        onSelect={handlePickProperty}
        onClose={() => setShowPropertyPicker(false)}
        placeholder="Search property name or ID..."
      />
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    backgroundColor: '#FAFBFD',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  greenDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.green,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
  },
  userRole: {
    fontSize: 13,
    color: Colors.muted,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: 20,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  sectionRoleTag: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
    backgroundColor: '#EBF1FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F8FAFD',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D8E2FC',
  },
  selectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  propIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF1FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ink,
  },
  selectSub: {
    fontSize: 11.5,
    color: Colors.muted,
    marginTop: 2,
  },
  selectRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FAFBFD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    marginBottom: 16,
    paddingVertical: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
  },
  statLbl: {
    fontSize: 11.5,
    color: Colors.muted,
    fontWeight: '600',
    marginTop: 2,
  },
  menu: {
    backgroundColor: '#FAFBFD',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  menuItemCol: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: Colors.muted,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  menuItemText: {
    fontSize: 13,
    color: Colors.ink,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 10,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.red,
  },
});
