import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export default function AssignModal({
  visible,
  job,
  onClose,
  onAssignSubmit,
}) {
  const [subTeam, setSubTeam] = useState('General Maintenance');
  const [member, setMember] = useState('Ahmed Ali');
  const [remarks, setRemarks] = useState('');

  if (!job) return null;

  const subTeams = [
    'General Maintenance',
    'HVAC & AC',
    'Electrical & Power',
    'Plumbing & Water',
    'Carpentry & Paint',
  ];

  const members = [
    'Ahmed Ali [Senior Tech]',
    'John Doe [Technician]',
    'Jane Smith [Supervisor]',
    'Rajesh Kumar [Staff]',
    'Mohamed Hassan [Tech]',
  ];

  const handleSubmit = () => {
    onAssignSubmit({
      jobId: job.id,
      subTeam,
      member,
      remarks,
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
              <Text style={styles.title}>Assign Job #{job.id}</Text>
              <Text style={styles.subTitle} numberOfLines={1}>
                {job.details || 'Task'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Sub-Team selection */}
            <Text style={styles.label}>SELECT SUB-DEPT. / SUB-TEAM</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {subTeams.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.chip, subTeam === st && styles.chipActive]}
                  onPress={() => setSubTeam(st)}
                >
                  <Text style={[styles.chipText, subTeam === st && styles.chipTextActive]}>
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Team Member */}
            <Text style={styles.label}>ASSIGN TO TEAM MEMBER</Text>
            <View style={styles.memberList}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.memberItem, member === m && styles.memberItemActive]}
                  onPress={() => setMember(m)}
                >
                  <View style={styles.memberLeft}>
                    <Feather
                      name="user"
                      size={15}
                      color={member === m ? Colors.primary : Colors.muted}
                    />
                    <Text
                      style={[
                        styles.memberName,
                        member === m && styles.memberNameActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </View>
                  {member === m && (
                    <Feather name="check" size={16} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Assignment Remarks */}
            <Text style={styles.label}>ASSIGNMENT NOTES / INSTRUCTIONS (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Please check urgently"
              placeholderTextColor={Colors.placeholder}
              value={remarks}
              onChangeText={setRemarks}
            />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>Assign Job</Text>
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
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    backgroundColor: '#FAFBFD',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  subTitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
    maxWidth: 260,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  hScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: '#F7F9FD',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.ink,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  memberList: {
    gap: 6,
    marginBottom: 10,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 11,
    borderRadius: 8,
    backgroundColor: '#FAFCFF',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  memberItemActive: {
    borderColor: Colors.primary,
    backgroundColor: '#E8ECF8',
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberName: {
    fontSize: 13,
    color: Colors.ink,
    fontWeight: '500',
  },
  memberNameActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F7F9FD',
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.ink,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: '#FAFBFD',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E5E9F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
