import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

/**
 * Delete Job Confirmation Dialog (Matches workwize-teal #delModal)
 */
export default function DeleteJobModal({
  visible,
  job,
  onClose,
  onConfirmDelete,
}) {
  if (!job) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconWrap}>
                <Feather name="trash-2" size={18} color={Colors.red} />
              </View>
              <Text style={styles.title}>Delete Job?</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          {/* Prompt */}
          <Text style={styles.prompt}>
            Are you sure you want to delete <Text style={styles.boldText}>{job.propId || 'this job'}</Text>?
          </Text>
          <Text style={styles.subtext}>
            {job.details || 'This job record'} will be permanently removed. This action cannot be undone.
          </Text>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnDelete}
              onPress={() => {
                onClose();
                if (onConfirmDelete) onConfirmDelete(job);
              }}
              activeOpacity={0.85}
            >
              <Feather name="trash-2" size={15} color="#FFFFFF" />
              <Text style={styles.btnDeleteText}>Delete</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.ink,
  },
  closeBtn: {
    padding: 4,
  },
  prompt: {
    fontSize: 14.5,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 6,
  },
  boldText: {
    fontWeight: '800',
    color: Colors.primaryDeep,
  },
  subtext: {
    fontSize: 12.5,
    color: Colors.muted,
    lineHeight: 18,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  btnCancelText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  btnDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.red,
  },
  btnDeleteText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
