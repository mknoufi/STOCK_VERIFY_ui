import { StyleSheet } from 'react-native';
import { borderRadius, spacing, typography, colors } from '../../styles/globalStyles';

export const staffHomeStyles = StyleSheet.create({
  quickActions: {
    marginTop: spacing.sm,
  },
  sessionsList: {
    paddingBottom: spacing.lg,
  },
  sessionCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionWarehouse: {
    ...typography.h5,
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  statusText: {
    color: '#fff',
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  sessionDate: {
    ...typography.bodySmall,
    fontSize: 12,
    marginBottom: 6,
  },
  sessionStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sessionStat: {
    ...typography.bodySmall,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xl,
    ...typography.body,
  },
  modalContainer: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: 320,
    maxWidth: '90%',
  },
  modalTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  modalLabel: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    ...typography.body,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mrpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mrpModalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  mrpModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  mrpModalTitle: {
    ...typography.h3,
  },
  mrpModalSubtitle: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  mrpSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  mrpSearchInput: {
    flex: 1,
    ...typography.body,
  },
  mrpSearchResults: {
    maxHeight: 400,
  },
  mrpSearchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  mrpResultContent: {
    flex: 1,
  },
  mrpResultName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  mrpResultCode: {
    ...typography.bodySmall,
    marginBottom: 2,
  },
  mrpResultBarcode: {
    ...typography.bodySmall,
    marginBottom: 2,
  },
  mrpResultMRP: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginTop: 4,
  },
  selectedItemCard: {
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
    borderWidth: 2,
  },
  selectedItemName: {
    ...typography.h4,
    marginBottom: spacing.xs,
  },
  selectedItemCode: {
    ...typography.bodySmall,
    marginBottom: 4,
  },
  selectedItemBarcode: {
    ...typography.bodySmall,
    marginBottom: 4,
  },
  selectedItemCurrentMRP: {
    ...typography.body,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  mrpInputLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  mrpInput: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.h4,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  mrpButtonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

export const staffHomeColors = {
  danger: colors.error,
  warning: colors.warning,
  success: colors.success,
};
