import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

/**
 * Universal Mobile Popup Dropdown Modal with Search
 */
export default function DropdownModal({
  visible,
  title = 'Select Option',
  options = [],
  items = [],
  selectedValue,
  onSelect,
  onClose,
  placeholder = 'Search...',
}) {
  const [search, setSearch] = useState('');

  const listToFormat = options && options.length > 0 ? options : (items || []);

  // Handle both string arrays and object arrays { id, name, value, label }
  const formattedOptions = listToFormat.map((opt) => {
    if (typeof opt === 'string') {
      return { id: opt, label: opt, value: opt };
    }
    return {
      id: opt.id || opt.value || opt.areaid || opt.teamId || opt.propId || opt.name,
      label: opt.label || opt.name || opt.areaName || opt.teamName || opt.propName || String(opt.value || ''),
      value: opt.value || opt.id || opt.areaid || opt.teamId || opt.propId || opt.name,
      sublabel: opt.sublabel || opt.email || opt.propId || '',
    };
  });

  const filtered = formattedOptions.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const lbl = (item.label || '').toLowerCase();
    const sub = (item.sublabel || '').toLowerCase();
    return lbl.includes(q) || sub.includes(q);
  });

  const handlePick = (item) => {
    onSelect(item.value, item);
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity
                onPress={() => {
                  setSearch('');
                  onClose();
                }}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            {options.length > 6 && (
              <View style={styles.searchWrap}>
                <Feather name="search" size={16} color={Colors.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.placeholder}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color={Colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* List of Options */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => {
                const isSelected = String(selectedValue) === String(item.value);
                return (
                  <TouchableOpacity
                    style={[styles.itemRow, isSelected && styles.itemRowActive]}
                    onPress={() => handlePick(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemTextCol}>
                      <Text style={[styles.itemLabel, isSelected && styles.itemLabelActive]}>
                        {item.label}
                      </Text>
                      {item.sublabel ? (
                        <Text style={styles.itemSublabel}>{item.sublabel}</Text>
                      ) : null}
                    </View>

                    {isSelected && (
                      <Feather name="check" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No matching options found</Text>
                </View>
              }
            />
          </View>
        </SafeAreaView>
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
  safeArea: {
    maxHeight: '85%',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    backgroundColor: '#FAFBFD',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
  },
  closeBtn: {
    padding: 2,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    paddingHorizontal: 16,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.ink,
  },
  listContent: {
    paddingVertical: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemRowActive: {
    backgroundColor: '#EEF2FB',
  },
  itemTextCol: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.ink,
  },
  itemLabelActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  itemSublabel: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F3FA',
    marginLeft: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.muted,
  },
});
