import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { styles } from '@/styles/components/notification-toast.styles';

type ToastItem = { id: number; title: string; body: string; tone?: 'info' | 'success'; actionLabel?: string };

const VISIBLE_MS = 4000;

export function NotificationToast({
  item,
  insetsTop,
  onHide,
  onPress,
}: {
  item: ToastItem | null;
  insetsTop: number;
  onHide: () => void;
  onPress?: () => void;
}) {
  const [translateY] = useState(() => new Animated.Value(-100));
  const [opacity] = useState(() => new Animated.Value(0));
  const itemId = item?.id;

  useEffect(() => {
    if (!itemId) return;
    translateY.setValue(-100);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onHide());
    }, VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [itemId, onHide, opacity, translateY]);

  if (!item) return null;

  return (
    <Modal animationType="none" statusBarTranslucent transparent visible>
      <View pointerEvents="box-none" style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { top: insetsTop + 80, transform: [{ translateY }], opacity }]}
        >
          <Pressable accessibilityRole="alert" onPress={onPress} style={[styles.card, item.tone === 'success' && styles.successCard]}>
            {item.tone === 'success' ? <View style={styles.successIcon}><Check size={16} color="#FFFFFF" strokeWidth={3} /></View> : <View style={styles.dot} />}
            <View style={styles.body}>
              <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.text}>{item.body}</Text>
              {item.actionLabel ? <Text style={styles.title}>{item.actionLabel}</Text> : null}
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
