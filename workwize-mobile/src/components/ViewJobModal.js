import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { formatApiDate } from '../api/config';
import ImagePreviewModal from './ImagePreviewModal';

export default function ViewJobModal({
  visible,
  job,
  onClose,
  onAssign,
  onCloseJob,
  onEdit,
  onDelete,
  canAssign = true,
  canClose = true,
  canDelete = false,
}) {
  const [previewImage, setPreviewImage] = useState(null);

  if (!job) return null;

  const isClosed = (job.status || '').toLowerCase() === 'closed';

  const handleOpenPreview = (url, title) => {
    if (url) {
      setPreviewImage({ url, title });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.jobCode}>{job.propId || 'Job Details'}</Text>
            </View>

            {/* Quick Actions in Header */}
            <View style={styles.headerActions}>
              {onEdit && (job.status || '').toLowerCase() === 'open' && (
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={() => {
                    onClose();
                    onEdit(job);
                  }}
                  title="Edit Job"
                >
                  <Feather name="edit-2" size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}

              {canDelete && onDelete && (
                <TouchableOpacity
                  style={[styles.iconActionBtn, styles.iconDeleteBtn]}
                  onPress={() => {
                    onClose();
                    onDelete(job);
                  }}
                  title="Delete Job"
                >
                  <Feather name="trash-2" size={16} color={Colors.red} />
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Status & Date */}
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusTag,
                  isClosed ? styles.stClosed : styles.stOpen,
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    isClosed ? styles.textClosed : styles.textOpen,
                  ]}
                >
                  {job.status || 'Open'}
                </Text>
              </View>
              <Text style={styles.dateLabel}>
                Opened: {formatApiDate(job.opened || job.createdAt)}
              </Text>
            </View>

            {/* Title */}
            <Text style={styles.titleText}>{job.details || 'Maintenance Task'}</Text>

            {/* Details Box (.job-brief) */}
            <View style={styles.jobBrief}>
              <View style={styles.briefRow}>
                <Text style={styles.briefLabel}>Area:</Text>
                <Text style={styles.briefValue}>{job.area || 'NA'}</Text>
              </View>

              <View style={styles.briefRow}>
                <Text style={styles.briefLabel}>Sub-Area:</Text>
                <Text style={styles.briefValue}>{job.sub || 'NA'}</Text>
              </View>

              <View style={styles.briefRow}>
                <Text style={styles.briefLabel}>Issued To:</Text>
                <Text style={styles.briefValue}>{job.dept || job.issued_to_team || 'NA'}</Text>
              </View>

              <View style={styles.briefRow}>
                <Text style={styles.briefLabel}>Issued By:</Text>
                <Text style={styles.briefValue}>{job.by || job.creator_name || 'IT Staff'}</Text>
              </View>

              <View style={styles.briefRow}>
                <Text style={styles.briefLabel}>Assigned To:</Text>
                <Text style={styles.briefValue}>
                  {job.assigned || 'Unassigned'}
                </Text>
              </View>

              <View style={styles.briefRow}>
                <Text style={styles.briefLabel}>Sub-Team:</Text>
                <Text style={styles.briefValue}>{job.assignDept || 'General'}</Text>
              </View>
            </View>

            {/* Remarks */}
            {job.remarks && (
              <View style={styles.remarksBox}>
                <Text style={styles.remarksLabel}>COMPLETION REMARKS</Text>
                <Text style={styles.remarksValue}>{job.remarks}</Text>
                {job.closedBy && (
                  <Text style={styles.closedByText}>
                    Closed by: {job.closedBy} {job.closedAt ? `(${formatApiDate(job.closedAt)})` : ''}
                  </Text>
                )}
              </View>
            )}

            {/* Attached Photos */}
            {(job.photoBefore || job.photoAfter) && (
              <View style={styles.photosSection}>
                <Text style={styles.remarksLabel}>ATTACHED PHOTOS</Text>
                <View style={styles.photosRow}>
                  {job.photoBefore ? (
                    <View style={styles.photoCol}>
                      <Text style={styles.photoSubLabel}>Photo Before</Text>
                      <TouchableOpacity
                        style={styles.photoTouchable}
                        onPress={() => handleOpenPreview(job.photoBefore, 'Photo Before')}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: job.photoBefore }} style={styles.jobPhoto} />
                        <View style={styles.zoomHintBadge}>
                          <Feather name="maximize-2" size={11} color="#FFFFFF" />
                          <Text style={styles.zoomHintText}>Tap to view</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {job.photoAfter ? (
                    <View style={styles.photoCol}>
                      <Text style={[styles.photoSubLabel, styles.photoSubLabelAfter]}>Photo After</Text>
                      <TouchableOpacity
                        style={styles.photoTouchable}
                        onPress={() => handleOpenPreview(job.photoAfter, 'Photo After')}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: job.photoAfter }} style={styles.jobPhoto} />
                        <View style={[styles.zoomHintBadge, styles.zoomHintBadgeAfter]}>
                          <Feather name="maximize-2" size={11} color="#FFFFFF" />
                          <Text style={styles.zoomHintText}>Tap to view</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          {!isClosed ? (
            <View style={styles.footer}>
              {onEdit && (job.status || '').toLowerCase() === 'open' && (
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => {
                    onClose();
                    if (onEdit) onEdit(job);
                  }}
                >
                  <Feather name="edit-2" size={14} color={Colors.primary} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.assignBtn, !canAssign && styles.btnDisabled]}
                onPress={() => {
                  if (canAssign) {
                    onClose();
                    onAssign(job);
                  }
                }}
                disabled={!canAssign}
                activeOpacity={canAssign ? 0.7 : 1}
              >
                <Feather name="user-check" size={14} color={canAssign ? '#FFFFFF' : '#94A3B8'} />
                <Text style={[styles.assignBtnText, !canAssign && styles.btnDisabledText]}>Assign</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.closeJobBtn, !canClose && styles.btnDisabled]}
                onPress={() => {
                  if (canClose) {
                    onClose();
                    onCloseJob(job);
                  }
                }}
                disabled={!canClose}
                activeOpacity={canClose ? 0.7 : 1}
              >
                <Feather name="check-circle" size={14} color={canClose ? '#FFFFFF' : '#94A3B8'} />
                <Text style={[styles.closeJobBtnText, !canClose && styles.btnDisabledText]}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.editBtnFull}
                onPress={() => {
                  onClose();
                  if (onEdit) onEdit(job);
                }}
              >
                <Feather name="edit-2" size={14} color={Colors.primary} />
                <Text style={styles.editBtnText}>Edit Job</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Fullscreen Image Popup Modal with Bottom Close Button */}
      <ImagePreviewModal
        visible={!!previewImage}
        imageUrl={previewImage?.url}
        title={previewImage?.title || 'Job Photo'}
        subTitle={job.propId || ''}
        onClose={() => setPreviewImage(null)}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
  },
  iconDeleteBtn: {
    backgroundColor: '#FEE2E2',
  },
  jobCode: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.primary,
  },
  propCode: {
    fontSize: 12,
    color: Colors.muted,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#EDF2F7',
  },
  body: {
    padding: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  stOpen: {
    backgroundColor: '#FEF0D3',
  },
  stClosed: {
    backgroundColor: Colors.greenSoft,
  },
  statusTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textOpen: {
    color: Colors.amber,
  },
  textClosed: {
    color: Colors.greenDark,
  },
  dateLabel: {
    fontSize: 12,
    color: Colors.muted,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.ink,
    lineHeight: 23,
    marginVertical: 10,
  },
  jobBrief: {
    backgroundColor: '#FAFBFD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  briefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  briefLabel: {
    fontSize: 13,
    color: Colors.muted,
    fontWeight: '500',
  },
  briefValue: {
    fontSize: 13,
    color: Colors.ink,
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  remarksBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  remarksLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.greenDark,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  remarksValue: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  closedByText: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 6,
    fontStyle: 'italic',
  },
  photosSection: {
    marginBottom: 20,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoCol: {
    flex: 1,
  },
  photoSubLabel: {
    fontSize: 11,
    color: Colors.muted,
    marginBottom: 4,
    fontWeight: '600',
  },
  photoSubLabelAfter: {
    color: Colors.greenDark,
    fontWeight: '700',
  },
  photoTouchable: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  zoomHintBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  zoomHintBadgeAfter: {
    backgroundColor: 'rgba(22, 101, 52, 0.85)',
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  jobPhoto: {
    width: '100%',
    height: 120,
    backgroundColor: '#E2E8F0',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: '#FFFFFF',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editBtnFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  assignBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  assignBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  closeJobBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.green,
    paddingVertical: 12,
    borderRadius: 10,
  },
  closeJobBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDisabled: {
    backgroundColor: '#E2E8F0',
    opacity: 0.55,
  },
  btnDisabledText: {
    color: '#94A3B8',
  },
});
