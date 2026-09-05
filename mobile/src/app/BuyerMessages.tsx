import { Redirect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BuyerHeader } from '@/components/buyer-header';
import { useAuth } from '@/context/auth-context';
import {
  BuyerChatMessage,
  loadBuyerMessages,
  sendBuyerMessage,
  setBuyerTyping,
} from '@/lib/buyer-messages';
import { GREEN, styles } from '@/styles/buyer-messages.styles';
import Svg, { Path } from 'react-native-svg';

function SendIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="m22 2-7 20-4-9-9-4Z"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 2 11 13"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatTime(value: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatDateSeparator(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

const QUICK_SUGGESTIONS = [
  '📦 What is the status of my order?',
  '🍍 How fresh are the pineapples upon delivery?',
  '🚚 When will my order arrive?',
  '💳 What payment options do you support?',
];

function TypingDot({ delay }: { delay: number }) {
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bounce, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(1200 - delay),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce, delay]);

  return (
    <Animated.View
      style={[
        styles.typingDot,
        { transform: [{ translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
      ]}
    />
  );
}

export default function BuyerMessagesScreen() {
  const { loading: authLoading, profile } = useAuth();
  const [messages, setMessages] = useState<BuyerChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [supportOnline, setSupportOnline] = useState(false);
  const [supportTyping, setSupportTyping] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [hasUnreadLatestReply, setHasUnreadLatestReply] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const shouldScrollToLatestRef = useRef(true);
  const isNearLatestRef = useRef(true);
  const lastMessageIdRef = useRef<number | null>(null);

  function scrollToLatest(animated = true) {
    isNearLatestRef.current = true;
    scrollRef.current?.scrollToEnd({ animated });
    setShowJumpToLatest(false);
    setHasUnreadLatestReply(false);
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const isNear = distanceFromBottom <= 72;
    isNearLatestRef.current = isNear;
    setShowJumpToLatest(!isNear);
    if (isNear) setHasUnreadLatestReply(false);
  }

  const fetchMessages = useCallback(async (isBackground = false) => {
    try {
      const { messages: loaded, presence } = await loadBuyerMessages();
      setMessages(loaded);
      setSupportOnline(Boolean(presence?.online));
      setSupportTyping(Boolean(presence?.is_typing));
      setError('');
    } catch (caught) {
      if (!isBackground) setError(caught instanceof Error ? caught.message : 'Could not load messages.');
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchMessages();
    const interval = setInterval(() => fetchMessages(true), 3000);
    return () => clearInterval(interval);
  }, [fetchMessages, profile]);

  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    const latestMessageId = latestMessage?.id ?? null;
    const receivedNewMessage = lastMessageIdRef.current !== null && lastMessageIdRef.current !== latestMessageId;

    if (shouldScrollToLatestRef.current || lastMessageIdRef.current === null || isNearLatestRef.current) {
      scrollToLatest(lastMessageIdRef.current !== null);
    } else if (receivedNewMessage && latestMessage?.sender_role !== 'buyer') {
      setShowJumpToLatest(true);
      setHasUnreadLatestReply(true);
    }

    shouldScrollToLatestRef.current = false;
    lastMessageIdRef.current = latestMessageId;
  }, [messages]);

  async function handleSend(textToSend?: string) {
    const body = (textToSend ?? draft).trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const { message, presence } = await sendBuyerMessage(body);
      shouldScrollToLatestRef.current = true;
      setMessages((current) => [...current, message]);
      setSupportOnline(Boolean(presence?.online));
      setDraft('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send this message.');
    } finally {
      setSending(false);
    }
  }

  const buyerIsTyping = Boolean(draft.trim()) && !sending;

  useEffect(() => {
    if (!buyerIsTyping) return undefined;

    setBuyerTyping(true).catch(() => {});
    const interval = setInterval(() => {
      setBuyerTyping(true).catch(() => {});
    }, 2500);

    return () => {
      clearInterval(interval);
      setBuyerTyping(false).catch(() => {});
    };
  }, [buyerIsTyping]);

  if (authLoading) {
    return (
      <View style={[styles.loadingState, { flex: 1 }]}>
        <ActivityIndicator color={GREEN} size="large" />
      </View>
    );
  }
  if (!profile) return <Redirect href="/login" />;

  const lastBuyerMessageId = [...messages].reverse().find((message) => message.sender_role === 'buyer')?.id;

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader showBack />

      <KeyboardAvoidingView
        style={styles.flexArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {/* Messenger contact header */}
        <View style={styles.messengerHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>🌱</Text>
            </View>
            <View style={[styles.statusDot, supportOnline && styles.statusDotOnline]} />
          </View>
          <View style={styles.contactBlock}>
            <Text style={styles.contactTitle}>JToledo Farm</Text>
            <View style={styles.contactStatusRow}>
              <View style={[styles.statusIndicator, supportOnline && styles.statusIndicatorOnline]} />
              <Text style={[styles.contactStatusText, supportOnline && styles.contactStatusTextOnline]}>
                {supportOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Chat panel */}
        <View style={styles.chatPanel}>
          <ScrollView
            ref={scrollRef}
            style={styles.chatHistory}
            contentContainerStyle={styles.chatHistoryContent}
            onScroll={handleScroll}
            scrollEventThrottle={64}
            showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={GREEN} size="large" />
                <Text style={styles.loadingText}>Connecting to JToledo Farm…</Text>
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}>
                  <Text style={styles.emptyIconText}>✨</Text>
                </View>
                <Text style={styles.emptyTitle}>Welcome to JToledo Farm</Text>
                <Text style={styles.emptyText}>
                  Have questions about your order, delivery schedule, or pineapple freshness? Our farm
                  support team is here to assist you.
                </Text>
                <Text style={styles.suggestionsLabel}>Frequently Asked</Text>
                <View style={styles.suggestionsList}>
                  {QUICK_SUGGESTIONS.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      disabled={sending}
                      onPress={() => handleSend(suggestion.replace(/^[^\w]+/, ''))}
                      style={styles.suggestionChip}>
                      <Text style={styles.suggestionChipText}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              messages.map((message, index) => {
                const isBuyer = message.sender_role === 'buyer';
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showDate =
                  !prevMessage ||
                  new Date(message.created_at).toDateString() !== new Date(prevMessage.created_at).toDateString();
                const isLastBuyerMessage = isBuyer && message.id === lastBuyerMessageId;

                return (
                  <View key={message.id} style={styles.messageGroup}>
                    {showDate && (
                      <View style={styles.dateDivider}>
                        <Text style={styles.dateDividerText}>{formatDateSeparator(message.created_at)}</Text>
                      </View>
                    )}

                    <View style={[styles.messageRow, isBuyer ? styles.messageRowBuyer : styles.messageRowFarm]}>
                      {!isBuyer && (
                        <View style={styles.messageAvatar}>
                          <Text style={styles.messageAvatarText}>🌱</Text>
                        </View>
                      )}

                      <View style={[styles.messageContent, isBuyer && styles.messageContentBuyer]}>
                        {!isBuyer && <Text style={styles.senderName}>JToledo Farm</Text>}
                        <View style={[styles.bubble, isBuyer && styles.bubbleBuyer]}>
                          <Text style={[styles.bubbleText, isBuyer && styles.bubbleTextBuyer]}>{message.body}</Text>
                        </View>
                        <View style={[styles.messageMeta, isBuyer && styles.messageMetaBuyer]}>
                          <Text style={styles.metaTimeText}>🕒 {formatTime(message.created_at)}</Text>
                          {isLastBuyerMessage && (
                            <Text style={[styles.readReceiptText, message.read_at && styles.readReceiptSeen]}>
                              {message.read_at ? '✓✓ Seen' : '✓✓ Delivered'}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {!loading && supportTyping && (
              <View style={styles.typingRow}>
                <View style={styles.messageAvatar}>
                  <Text style={styles.messageAvatarText}>🌱</Text>
                </View>
                <View style={styles.typingBubble}>
                  <TypingDot delay={0} />
                  <TypingDot delay={150} />
                  <TypingDot delay={300} />
                </View>
                <Text style={styles.typingLabel}>JToledo Farm is typing</Text>
              </View>
            )}
          </ScrollView>

          {showJumpToLatest && (
            <Pressable onPress={() => scrollToLatest()} style={styles.jumpToLatest}>
              <Text style={styles.jumpToLatestText}>⌄ Latest</Text>
              {hasUnreadLatestReply && <View style={styles.jumpUnreadDot} />}
            </Pressable>
          )}

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={() => fetchMessages(false)} style={styles.errorRetryButton}>
                <Text style={styles.errorRetryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Composer */}
          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message to JToledo Farm..."
              placeholderTextColor="#94A3B8"
              editable={!sending}
              autoCapitalize="sentences"
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
            />
            <Pressable
              disabled={sending || !draft.trim()}
              onPress={() => handleSend()}
              style={[styles.sendButton, (sending || !draft.trim()) && styles.sendButtonDisabled]}>
              {sending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <SendIcon />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
