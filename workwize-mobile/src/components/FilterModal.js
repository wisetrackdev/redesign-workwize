import React, { useState } from 'react';
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

export default function FilterModal({
  visible,
  onClose,
  filterState,
  onApply,
  areaList = [],
  teamList = [],
}) {
  const [status, setStatus] = useState(filterState.status || 'all');
  const [area, setArea] = useState(filterState.area || 'all');
  const [issuedTo, setIssuedTo] = useState(filterState.issuedTo || 'all');
  const [issuedBy, setIssuedBy] = useState(filterState.issuedBy || 'all');
  const [sortBy, setSortBy] = useState(filterState.sort || 'new');
  const [fromDate, setFromDate] = useState(filterState.fromDate || '');
  const [toDate, setToDate] = useState(filterState.toDate || '');

  const statuses = [
    { label: 'All', value: 'all' },
    { label: 'Open', value: 'Open' },
    { label: 'Assigned', value: 'Assigned' },
    { label: 'In Progress', value: 'In-Progress' },
    { label: 'Closed', value: 'Closed' },
  ];

  const sortOptions = [
    { label: 'Newest first', value: 'new' },
    { label: 'Oldest first', value: 'old' },
    { label: 'Job name A-Z', value: 'az' },
    { label: 'Area A-Z', value: 'area' },
  ];

  const handleReset = () => {
    setStatus('all');
    setArea('all');
    setIssuedTo('all');
    setIssuedBy('all');
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
              <Text style={styles.title}>Filter & Sort</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Status Filter */}
            <Text style={styles.sectionTitle}>STATUS</Text>
            <View style={styles.chipsRow}>
              {statuses.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.chip,
                    status === item.value && styles.chipActive,
                  ]}
                  onPress={() => setStatus(item.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      status === item.value && styles.chipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sort Options */}
            <Text style={styles.sectionTitle}>SORT BY</Text>
            <View style={styles.chipsRow}>
              {sortOptions.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.chip,
                    sortBy === item.value && styles.chipActive,
                  ]}
                  onPress={() => setSortBy(item.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sortBy === item.value && styles.chipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Area Filter */}
            {areaList.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>FILTER BY AREA</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                  <TouchableOpacity
                    style={[styles.chip, area === 'all' && styles.chipActive]}
                    onPress={() => setArea('all')}
                  >
                    <Text style={[styles.chipText, area === 'all' && styles.chipTextActive]}>
                      All Areas
                    </Text>
                  </TouchableOpacity>
                  {areaList.slice(0, 15).map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={[styles.chip, area === a && styles.chipActive]}
                      onPress={() => setArea(a)}
                    >
                      <Text style={[styles.chipText, area === a && styles.chipTextActive]}>
                        {a}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Issued To Department */}
            {teamList.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>ISSUED TO TEAM</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                  <TouchableOpacity
                    style={[styles.chip, issuedTo === 'all' && styles.chipActive]}
                    onPress={() => setIssuedTo('all')}
                  >
                    <Text style={[styles.chipText, issuedTo === 'all' && styles.chipTextActive]}>
                      All Teams
                    </Text>
                  </TouchableOpacity>
                  {teamList.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, issuedTo === t && styles.chipActive]}
                      onPress={() => setIssuedTo(t)}
                    >
                      <Text style={[styles.chipText, issuedTo === t && styles.chipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Date Range Inputs */}
            <Text style={styles.sectionTitle}>DATE RANGE (YYYY-MM-DD)</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>From Date</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="2026-01-01"
                  placeholderTextColor={Colors.placeholder}
                  value={fromDate}
                  onChangeText={setFromDate}
                />
              </View>
              <View style={styles.dateCol}>
                <Text style={styles.dateLabel}>To Date</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="2026-12-31"
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: '#F8FAFD',
    marginRight: 6,
    marginBottom: 6,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.ink,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    borderWidth: 1.5,
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
    borderRadius: 8,
    backgroundColor: '#E5E9F6',
    alignItems: 'center',
  },
  resetBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
