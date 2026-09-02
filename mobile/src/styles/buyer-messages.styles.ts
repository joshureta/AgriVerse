import { StyleSheet } from 'react-native';

export const GREEN = '#176D34';
export const GREEN_DARK = '#125829';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flexArea: {
    flex: 1,
  },

  // Messenger header
  messengerHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    gap: 14,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#94A3B8',
  },
  statusDotOnline: {
    backgroundColor: '#22C55E',
  },
  contactBlock: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  contactStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#94A3B8',
  },
  statusIndicatorOnline: {
    backgroundColor: '#22C55E',
  },
  contactStatusText: {
    fontSize: 13,
    color: '#64748B',
  },
  contactStatusTextOnline: {
    color: '#15803D',
  },

  // Chat panel
  chatPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatHistory: {
    flex: 1,
  },
  chatHistoryContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 14,
    flexGrow: 1,
  },

  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconText: {
    fontSize: 26,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  suggestionChipText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#334155',
  },

  // Date divider
  dateDivider: {
    alignItems: 'center',
    marginVertical: 6,
  },
  dateDividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },

  // Message rows
  messageGroup: {
    gap: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '82%',
  },
  messageRowBuyer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageRowFarm: {
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2F5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  messageAvatarText: {
    fontSize: 13,
  },
  messageContent: {
    flexShrink: 1,
  },
  messageContentBuyer: {
    alignItems: 'flex-end',
  },
  senderName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 3,
    marginLeft: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  bubbleBuyer: {
    backgroundColor: GREEN,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 20,
    color: '#1E293B',
  },
  bubbleTextBuyer: {
    color: '#FFFFFF',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginLeft: 4,
  },
  messageMetaBuyer: {
    marginLeft: 0,
    marginRight: 4,
    justifyContent: 'flex-end',
  },
  metaTimeText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  readReceiptText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  readReceiptSeen: {
    color: '#16A34A',
  },

  // Typing indicator
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 50,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: '#F1F5F0',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6F8E74',
  },
  typingLabel: {
    fontSize: 10.5,
    color: '#7B887E',
    fontStyle: 'italic',
  },

  // Jump to latest
  jumpToLatest: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 4,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  jumpToLatestText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  jumpUnreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#EF4444',
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  errorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12.5,
    marginRight: 10,
  },
  errorRetryButton: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  errorRetryText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },

  // Composer
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  input: {
    flex: 1,
    height: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 23,
    paddingHorizontal: 18,
    fontSize: 14.5,
    color: '#0F172A',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
