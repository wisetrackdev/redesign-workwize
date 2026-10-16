import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import DropdownModal from './DropdownModal';

export default function EditJobModal({
  visible,
  job,
  onClose,
  onSave,
  onDelete,
  canDelete = false,
  teamList = [],
  areaList = [],
}) {
  const [details, setDetails] = useState('');
  const [dept, setDept] = useState('');
  const [area, setArea] = useState('');
  const [sub, setSub] = useState('');
  const [status, setStatus] = useState('Open');
  const [remarks, setRemarks] = useState('');
  const [assigned, setAssigned] = useState('');

  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  useEffect(() => {
    if (job) {
      setDetails(job.details || '');
      setDept(job.dept || job.issued_to_team || '');
      setArea(job.area || '');
      setSub(job.sub || '');
      setStatus(job.status || 'Open');
      setRemarks(job.remarks || '');
      setAssigned(job.assigned || '');
    }
  }, [job]);

  if (!job) return null;

  const defaultTeams = teamList.length > 0 ? teamList : [
    'IT',
    'Engineering',
    'Housekeeping',
    'Security',
    'Front Office',
    'Food & Beverage',
  ];

  const defaultAreas = areaList.length > 0 ? areaList : [
    'Waste Management',
    'Main Building',
    'Lobby & Reception',
    'Guest Rooms - Wing A',
    'Guest Rooms - Wing B',
    'Restaurant & Kitchen',
    'Swimming Pool & Spa',
  ];

  const statusOptions = ['Open', 'Assigned', 'In-Progress', 'Closed'];

  const handleSave = () => {
    if (!details.trim()) {
      Alert.alert('Required', 'Please enter job details.');
      return;
    }

    onSave({
      ...job,
      details: details.trim(),
      dept,
      area,
      sub: sub.trim(),
      status,
      remarks: remarks.trim(),
      assigned: assigned.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Edit Job</Text>
              <Text style={styles.subTitle}>{job.propId || ''}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Job Details */}
            <View style={styles.fld}>
              <Text style={styles.label}>Job Details *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Issued To Dept */}
            <View style={styles.fld}>
              <Text style={styles.label}>Issued To Dept.</Text>
              <TouchableOpacity
                style={styles.dropdownBox}
                onPress={() => setShowDeptPicker(true)}
              >
                <Text style={dept ? styles.dropdownVal : styles.dropdownPlaceholder}>
                  {dept || 'Select Department'}
                </Text>
                <Feather name="chevron-down" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Area */}
            <View style={styles.fld}>
              <Text style={styles.label}>Area</Text>
              <TouchableOpacity
                style={styles.dropdownBox}
                onPress={() => setShowAreaPicker(true)}
              >
                <Text style={area ? styles.dropdownVal : styles.dropdownPlaceholder}>
                  {area || 'Select Area'}
                </Text>
                <Feather name="chevron-down" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Sub-Area */}
            <View style={styles.fld}>
              <Text style={styles.label}>Sub-Area</Text>
              <TextInput
                style={styles.input}
                value={sub}
                onChangeText={setSub}
                placeholder="Subarea"
                placeholderTextColor={Colors.placeholder}
              />
            </View>

            {/* Status */}
            <View style={styles.fld}>
              <Text style={styles.label}>Status</Text>
              <TouchableOpacity
                style={styles.dropdownBox}
                onPress={() => setShowStatusPicker(true)}
              >
                <Text style={styles.dropdownVal}>{status}</Text>
                <Feather name="chevron-down" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Assign To */}
            <View style={styles.fld}>
              <Text style={styles.label}>Assign To</Text>
              <TextInput
                style={styles.input}
                value={assigned}
                onChangeText={setAssigned}
                placeholder="Staff name / email"
                placeholderTextColor={Colors.placeholder}
              />
            </View>

            {/* Remarks */}
            <View style={styles.fld}>
              <Text style={styles.label}>Remarks</Text>
              <TextInput
                style={styles.input}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Remarks notes"
                placeholderTextColor={Colors.placeholder}
              />
            </View>
          </ScrollView>

          {/* Footer with Delete and Save buttons */}
          <View style={styles.footer}>
            {canDelete && onDelete && (
              <TouchableOpacity
                style={styles.btnDelete}
                onPress={() => {
                  onClose();
                  if (onDelete) onDelete(job);
                }}
              >
                <Feather name="trash-2" size={16} color={Colors.red} />
                <Text style={styles.btnDeleteText}>Delete</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={styles.btnSaveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={showDeptPicker}
        title="Select Department"
        options={defaultTeams}
        selectedValue={dept}
        onSelect={(d) => setDept(d)}
        onClose={() => setShowDeptPicker(false)}
      />

      <DropdownModal
        visible={showAreaPicker}
        title="Select Area"
        options={defaultAreas}
        selectedValue={area}
        onSelect={(a) => setArea(a)}
        onClose={() => setShowAreaPicker(false)}
      />

      <DropdownModal
        visible={showStatusPicker}
        title="Select Status"
        options={statusOptions}
        selectedValue={status}
        onSelect={(s) => setStatus(s)}
        onClose={() => setShowStatusPicker(false)}
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
    maxHeight: '88%',
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
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
  },
  subTitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
  },
  fld: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFCFF',
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: 9,
    paddingHorizontal: 12,
    height: 44,
  },
  dropdownVal: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.ink,
  },
  dropdownPlaceholder: {
    fontSize: 13,
    color: Colors.placeholder,
  },
  input: {
    backgroundColor: '#FAFCFF',
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: Colors.ink,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: '#FAFBFD',
  },
  btnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnDeleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.red,
  },
  btnSave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
