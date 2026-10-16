import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { formatApiDate } from '../api/config';

export default function JobCard({
  job,
  onPress,
  onAssign,
  onClose,
  onEdit,
  onDelete,
  isClosed = false,
  canAssign = true,
  canClose = true,
  canDelete = false,
}) {
  const status = job.status || 'Open';

  // Get status badge styles matching workwize-teal
  const getStatusBadge = (st) => {
    switch (st.toLowerCase()) {
      case 'in-progress':
      case 'inprogress':
        return {
          bg: '#E0F2FE',
          text: '#0369A1',
          border: '#0284C7',
          topBorder: '#0284C7',
        };
      case 'assigned':
        return {
          bg: '#E3E8F8',
          text: '#2F4390',
          border: '#6366F1',
          topBorder: '#6366F1',
        };
      case 'closed':
        return {
          bg: Colors.greenSoft,
          text: '#2A7A26',
          border: Colors.green,
          topBorder: Colors.green,
        };
      case 'open':
      default:
        return {
          bg: '#FEF0D3',
          text: '#B45309',
          border: Colors.amber,
          topBorder: Colors.amber,
        };
    }
  };

  const badgeStyle = getStatusBadge(status);

  return (
    <TouchableOpacity
      style={[styles.card, { borderTopColor: badgeStyle.topBorder }]}
      onPress={() => onPress(job)}
      activeOpacity={0.85}
    >
      {/* Top Header Row: Property ID + Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.leftMeta}>
          {/* Property badge (.prop-badge) */}
          <View style={styles.propBadge}>
            <Text style={styles.propText} numberOfLines={1}>
              {job.propId || ''}
            </Text>
          </View>
        </View>

        {/* Status Tag (.tag .st-Open, etc.) */}
        <View style={[styles.statusTag, { backgroundColor: badgeStyle.bg }]}>
          <Text style={[styles.statusTagText, { color: badgeStyle.text }]}>
            {status}
          </Text>
        </View>
      </View>

      {/* Job Details Title (h3) */}
      <Text style={styles.jobTitle} numberOfLines={2}>
        {job.details || 'Maintenance Task'}
      </Text>

      {/* Issued To Dept Bar (.issued-to-bar) */}
      {(job.dept || job.issued_to_team) && (
        <View style={styles.issuedToBar}>
          <Feather name="arrow-right-circle" size={12} color={Colors.primary} />
          <Text style={styles.issuedToText} numberOfLines={1}>
            Issued To: {job.dept || job.issued_to_team}
          </Text>
        </View>
      )}

      {/* Key-Value Details Grid (.kv) */}
      <View style={styles.kvGrid}>
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Area:</Text>
          <Text style={styles.kvValue} numberOfLines={1}>
            {job.area || 'General Area'}
            {job.sub ? ` • ${job.sub}` : ''}
          </Text>
        </View>

        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Issued By:</Text>
          <Text style={styles.kvValue} numberOfLines={1}>
            {job.by || job.creator_name || 'IT Staff'}
          </Text>
        </View>

        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Assigned To:</Text>
          <Text style={styles.kvValue} numberOfLines={1}>
            {job.assigned || 'Unassigned'}
            {job.assignDept && job.assignDept !== 'NA' ? ` (${job.assignDept})` : ''}
          </Text>
        </View>

        {isClosed && job.closedBy && (
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Closed By:</Text>
            <Text style={styles.kvValue} numberOfLines={1}>
              {job.closedBy} {job.closedAt ? `• ${formatApiDate(job.closedAt)}` : ''}
            </Text>
          </View>
        )}

        {isClosed && job.remarks ? (
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Remark:</Text>
            <Text style={styles.kvValue} numberOfLines={1}>
              {job.remarks}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Media indicators */}
      {(job.photoBefore || job.photoAfter) && (
        <View style={styles.mediaRow}>
          {job.photoBefore ? (
            <View style={styles.mediaBadge}>
              <Feather name="camera" size={10} color={Colors.primary} />
              <Text style={styles.mediaBadgeText}>Before Photo</Text>
            </View>
          ) : null}
          {job.photoAfter ? (
            <View style={[styles.mediaBadge, styles.mediaBadgeAfter]}>
              <Feather name="check-circle" size={10} color={Colors.greenDark} />
              <Text style={[styles.mediaBadgeText, styles.mediaBadgeTextAfter]}>After Photo</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Bottom Actions Row (.card-actions) */}
      <View style={styles.bottomRow}>
        <Text style={styles.dateText}>
          {formatApiDate(job.opened || job.createdAt)}
        </Text>

        {/* Mobile Action Buttons (Optimized for finger touches!) */}
        {!isClosed ? (
          <View style={styles.actionButtons}>
            {onEdit && (job.status || '').toLowerCase() === 'open' && (
              <TouchableOpacity
                style={styles.btnEdit}
                onPress={() => onEdit(job)}
                activeOpacity={0.8}
              >
                <Feather name="edit-2" size={11} color={Colors.primary} />
                <Text style={styles.btnEditText}>Edit</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.btnAssign, !canAssign && styles.btnDisabled]}
              onPress={() => {
                if (canAssign) onAssign(job);
              }}
              disabled={!canAssign}
              activeOpacity={canAssign ? 0.8 : 1}
            >
              <Feather name="user-plus" size={11} color={canAssign ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.btnAssignText, !canAssign && styles.btnDisabledText]}>Assign</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnClose, !canClose && styles.btnDisabled]}
              onPress={() => {
                if (canClose) onClose(job);
              }}
              disabled={!canClose}
              activeOpacity={canClose ? 0.8 : 1}
            >
              <Feather name="check-circle" size={11} color={canClose ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.btnCloseText, !canClose && styles.btnDisabledText]}>Close</Text>
            </TouchableOpacity>

            {canDelete && onDelete && (
              <TouchableOpacity
                style={styles.btnDeleteCard}
                onPress={() => onDelete(job)}
                activeOpacity={0.8}
              >
                <Feather name="trash-2" size={11} color={Colors.red} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.actionButtons}>
            {canDelete && onDelete && (
              <TouchableOpacity
                style={styles.btnDeleteCard}
                onPress={() => onDelete(job)}
                activeOpacity={0.8}
              >
                <Feather name="trash-2" size={11} color={Colors.red} />
              </TouchableOpacity>
            )}
            <View style={styles.closedBadgeWrap}>
              <Feather name="check" size={13} color={Colors.greenDark} />
              <Text style={styles.closedBadgeText}>Completed</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    borderTopWidth: 4,
    padding: 14,
    marginBottom: 12,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  propBadge: {
    backgroundColor: '#EEF2FA',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D4E0F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propText: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  jobTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.ink,
    lineHeight: 20,
    marginBottom: 8,
  },
  issuedToBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F4FA',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  issuedToText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.primaryDeep,
  },
  kvGrid: {
    backgroundColor: '#FAFBFD',
    borderRadius: 8,
    padding: 8,
    gap: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kvLabel: {
    fontSize: 11,
    color: Colors.muted,
    width: 80,
    fontWeight: '600',
  },
  kvValue: {
    flex: 1,
    fontSize: 11.5,
    color: Colors.ink,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateText: {
    fontSize: 11,
    color: Colors.muted,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  btnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  btnEditText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  btnAssign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnAssignText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  btnClose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.green,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnCloseText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  btnDisabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
    opacity: 0.55,
  },
  btnDisabledText: {
    color: '#94A3B8',
  },
  btnDeleteCard: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.greenSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closedBadgeText: {
    color: Colors.greenDark,
    fontSize: 11,
    fontWeight: '700',
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    marginTop: 2,
  },
  mediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mediaBadgeAfter: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  mediaBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  mediaBadgeTextAfter: {
    color: Colors.greenDark,
  },
});
