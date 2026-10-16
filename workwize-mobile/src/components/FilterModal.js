import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import DropdownModal from './DropdownModal';

/**
 * FilterModal with all dropdown filters (Status, Area, Issued To, Issued By, Assign To, Sort By, Date Range)
 */
export default function FilterModal({
  visible,
  onClose,
  filterState = {},
  onApply,
  areaList = [],
  teamList = [],
  issuedByList = [],
  assignToList = [],
}) {
  const [status, setStatus] = useState(filterState.status || 'all');
  const [area, setArea] = useState(filterState.area || 'all');
  const [issuedTo, setIssuedTo] = useState(filterState.issuedTo || 'all');
  const [issuedBy, setIssuedBy] = useState(filterState.issuedBy || 'all');
  const [assignedTo, setAssignedTo] = useState(filterState.assignedTo || 'all');
  const [sortBy, setSortBy] = useState(filterState.sort || 'new');
  const [fromDate, setFromDate] = useState(filterState.fromDate || '');
  const [toDate, setToDate] = useState(filterState.toDate || '');

  // Active Dropdown picker: 'status' | 'area' | 'issuedTo' | 'issuedBy' | 'assignedTo' | 'sort' | null
  const [activePicker, setActivePicker] = useState(null);

  useEffect(() => {
    setStatus(filterState.status || 'all');
    setArea(filterState.area || 'all');
    setIssuedTo(filterState.issuedTo || 'all');
    setIssuedBy(filterState.issuedBy || 'all');
    setAssignedTo(filterState.assignedTo || 'all');
    setSortBy(filterState.sort || 'new');
    setFromDate(filterState.fromDate || '');
    setToDate(filterState.toDate || '');
  }, [filterState, visible]);

  // Options configuration
  const statusItems = useMemo(
    () => [
      { id: 'all', label: 'All Statuses', value: 'all' },
      { id: 'Open', label: 'Open', value: 'Open' },
      { id: 'Assigned', label: 'Assigned', value: 'Assigned' },
      { id: 'In-Progress', label: 'In Progress', value: 'In-Progress' },
      { id: 'Closed', label: 'Closed', value: 'Closed' },
    ],
    []
  );

  const sortItems = useMemo(
    () => [
      { id: 'new', label: 'Newest first', value: 'new' },
      { id: 'old', label: 'Oldest first', value: 'old' },
      { id: 'az', label: 'Job name A-Z', value: 'az' },
      { id: 'area', label: 'Area A-Z', value: 'area' },
    ],
    []
  );

  const areaItems = useMemo(() => {
    return [
      { id: 'all', label: 'All Areas', value: 'all' },
      ...areaList.map((a) => ({ id: a, label: a, value: a })),
    ];
  }, [areaList]);

  const teamItems = useMemo(() => {
    return [
      { id: 'all', label: 'All Teams / Departments', value: 'all' },
      ...teamList.map((t) => ({ id: t, label: t, value: t })),
    ];
  }, [teamList]);

  const issuedByItems = useMemo(() => {
    return [
      { id: 'all', label: 'All Issued By', value: 'all' },
      ...issuedByList.map((b) => ({ id: b, label: b, value: b })),
    ];
  }, [issuedByList]);

  const assignToItems = useMemo(() => {
    return [
      { id: 'all', label: 'All Assign To', value: 'all' },
      { id: '__unassigned__', label: 'Not Assigned', value: '__unassigned__' },
      ...assignToList.map((p) => ({ id: p, label: p, value: p })),
    ];
  }, [assignToList]);

  // Selected value label helpers
  const getStatusLabel = () => {
    const found = statusItems.find((s) => s.value === status);
    return found ? found.label : status || 'All Statuses';
  };

  const getAreaLabel = () => {
    if (area === 'all') return 'All Areas';
    return area;
  };

  const getIssuedToLabel = () => {
    if (issuedTo === 'all') return 'All Teams';
    return issuedTo;
  };

  const getIssuedByLabel = () => {
    if (issuedBy === 'all') return 'All Issued By';
    return issuedBy;
  };

  const getAssignToLabel = () => {
    if (assignedTo === 'all') return 'All Assign To';
    if (assignedTo === '__unassigned__') return 'Not Assigned';
    return assignedTo;
  };

  const getSortLabel = () => {
    const found = sortItems.find((s) => s.value === sortBy);
    return found ? found.label : 'Newest first';
  };

  // Picker modal dynamic configurations
  const pickerConfig = useMemo(() => {
    switch (activePicker) {
      case 'status':
        return {
          title: 'Select Status',
          items: statusItems,
          selectedValue: status,
          onSelect: (val) => setStatus(val),
        };
      case 'area':
        return {
          title: 'Select Area',
          items: areaItems,
          selectedValue: area,
          onSelect: (val) => setArea(val),
        };
      case 'issuedTo':
        return {
          title: 'Select Issued To Team',
          items: teamItems,
          selectedValue: issuedTo,
          onSelect: (val) => setIssuedTo(val),
        };
      case 'issuedBy':
        return {
          title: 'Select Issued By',
          items: issuedByItems,
          selectedValue: issuedBy,
          onSelect: (val) => setIssuedBy(val),
        };
      case 'assignedTo':
        return {
          title: 'Select Assign To',
          items: assignToItems,
          selectedValue: assignedTo,
          onSelect: (val) => setAssignedTo(val),
        };
      case 'sort':
        return {
          title: 'Sort Order',
          items: sortItems,
          selectedValue: sortBy,
          onSelect: (val) => setSortBy(val),
        };
      default:
        return null;
    }
  }, [
    activePicker,
    status,
    area,
    issuedTo,
    issuedBy,
    assignedTo,
    sortBy,
    statusItems,
    areaItems,
    teamItems,
    issuedByItems,
    assignToItems,
    sortItems,
  ]);

  const handleReset = () => {
    setStatus('all');
    setArea('all');
    setIssuedTo('all');
    setIssuedBy('all');
    setAssignedTo('all');
    setSortBy('new');
    setFromDate('');
    setToDate('');
  };

  const handleApply = () => {
    onApply({
      status,
      area,
      issuedTo,
      issuedBy,
      assignedTo,
      sort: sortBy,
      fromDate,
      toDate,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Header matching workwize-teal .fs-head */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Feather name="sliders" size={18} color={Colors.primary} />
              <Text style={styles.title}>Filter Jobs</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* 1. Status Dropdown */}
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>STATUS</Text>
              <TouchableOpacity
                style={[styles.dropdownBox, status !== 'all' && styles.dropdownBoxActive]}
                onPress={() => setActivePicker('status')}
                activeOpacity={0.75}
              >
                <View style={styles.dropdownLeft}>
                  <Feather
                    name="tag"
                    size={15}
                    color={status !== 'all' ? Colors.primary : Colors.muted}
                  />
                  <Text
                    style={[
                      styles.dropdownValueText,
                      status !== 'all' && styles.dropdownValueTextActive,
                    ]}
                  >
                    {getStatusLabel()}
                  </Text>
                </View>
                <Feather name="chevron-down" size={16} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* 2. Area Dropdown */}
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>AREA</Text>
              <TouchableOpacity
                style={[styles.dropdownBox, area !== 'all' && styles.dropdownBoxActive]}
                onPress={() => setActivePicker('area')}
                activeOpacity={0.75}
              >
                <View style={styles.dropdownLeft}>
                  <Feather
                    name="map-pin"
                    size={15}
                    color={area !== 'all' ? Colors.primary : Colors.muted}
                  />
                  <Text
                    style={[
                      styles.dropdownValueText,
                      area !== 'all' && styles.dropdownValueTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {getAreaLabel()}
                  </Text>
                </View>
                <Feather name="chevron-down" size={16} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* 3. Issued To (Team) Dropdown */}
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>ISSUED TO (TEAM)</Text>
              <TouchableOpacity
                style={[styles.dropdownBox, issuedTo !== 'all' && styles.dropdownBoxActive]}
                onPress={() => setActivePicker('issuedTo')}
                activeOpacity={0.75}
              >
                <View style={styles.dropdownLeft}>
                  <Feather
                    name="users"
                    size={15}
                    color={issuedTo !== 'all' ? Colors.primary : Colors.muted}
                  />
                  <Text
                    style={[
                      styles.dropdownValueText,
                      issuedTo !== 'all' && styles.dropdownValueTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {getIssuedToLabel()}
                  </Text>
                </View>
                <Feather name="chevron-down" size={16} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* 4. Issued By Dropdown */}
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>ISSUED BY</Text>
              <TouchableOpacity
                style={[styles.dropdownBox, issuedBy !== 'all' && styles.dropdownBoxActive]}
                onPress={() => setActivePicker('issuedBy')}
                activeOpacity={0.75}
              >
                <View style={styles.dropdownLeft}>
                  <Feather
                    name="user-check"
                    size={15}
                    color={issuedBy !== 'all' ? Colors.primary : Colors.muted}
                  />
                  <Text
                    style={[
                      styles.dropdownValueText,
                      issuedBy !== 'all' && styles.dropdownValueTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {getIssuedByLabel()}
                  </Text>
                </View>
                <Feather name="chevron-down" size={16} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* 5. Assign To Dropdown */}
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>ASSIGN TO</Text>
              <TouchableOpacity
                style={[styles.dropdownBox, assignedTo !== 'all' && styles.dropdownBoxActive]}
                onPress={() => setActivePicker('assignedTo')}
                activeOpacity={0.75}
              >
                <View style={styles.dropdownLeft}>
                  <Feather
                    name="user-plus"
                    size={15}
                    color={assignedTo !== 'all' ? Colors.primary : Colors.muted}
                  />
                  <Text
                    style={[
                      styles.dropdownValueText,
                      assignedTo !== 'all' && styles.dropdownValueTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {getAssignToLabel()}
                  </Text>
                </View>
                <Feather name="chevron-down" size={16} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* 6. Sort By Dropdown */}
            <View style={styles.fieldGroup}>
              <Text style={styles.sectionTitle}>SORT ORDER</Text>
              <TouchableOpacity
                style={[styles.dropdownBox, sortBy !== 'new' && styles.dropdownBoxActive]}
                onPress={() => setActivePicker('sort')}
                activeOpacity={0.75}
              >
                <View style={styles.dropdownLeft}>
                  <Feather
                    name="arrow-down"
                    size={15}
                    color={sortBy !== 'new' ? Colors.primary : Colors.muted}
                  />
                  <Text
                    style={[
                      styles.dropdownValueText,
                      sortBy !== 'new' && styles.dropdownValueTextActive,
                    ]}
                  >
                    {getSortLabel()}
                  </Text>
                </View>
                <Feather name="chevron-down" size={16} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* 7. Date Range Inputs */}
            <Text style={styles.sectionTitle}>DATE RANGE (YYYY-MM-DD)</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>From Date</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.placeholder}
                  value={fromDate}
                  onChangeText={setFromDate}
                />
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>To Date</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.placeholder}
                  value={toDate}
                  onChangeText={setToDate}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons (.fs-foot) */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Reusable Popup Dropdown Modal */}
      {pickerConfig ? (
        <DropdownModal
          visible={activePicker !== null}
          title={pickerConfig.title}
          items={pickerConfig.items}
          selectedValue={pickerConfig.selectedValue}
          onSelect={(val) => {
            pickerConfig.onSelect(val);
            setActivePicker(null);
          }}
          onClose={() => setActivePicker(null)}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.bgOverlay,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
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
    fontWeight: '800',
    color: Colors.ink,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    letterSpacing: 0.6,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFBFD',
    borderWidth: 1.2,
    borderColor: Colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: '#F3F6FD',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  dropdownValueText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.ink,
  },
  dropdownValueTextActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: '#FAFCFF',
    borderWidth: 1.2,
    borderColor: Colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.ink,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: '#FAFBFD',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E5E9F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13.5,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
});
