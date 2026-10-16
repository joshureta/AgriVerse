import { Pressable, StyleSheet, Text, View } from 'react-native';

type Tone = 'info' | 'success' | 'warning' | 'error';

const colors: Record<Tone, { background: string; border: string; accent: string }> = {
  info: { background: '#EDF5F0', border: '#C8DED0', accent: '#216A43' },
  success: { background: '#ECF7ED', border: '#B9DEC1', accent: '#23743D' },
  warning: { background: '#FFF7E9', border: '#EBD6A9', accent: '#8A5D12' },
  error: { background: '#FFF1EF', border: '#E9C5C0', accent: '#A23D35' },
};

export function BuyerInlineNotice({ title, message, tone = 'info', actionLabel, onAction }: {
  title: string;
  message: string;
  tone?: Tone;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const palette = colors[tone];
  return (
    <View accessibilityLiveRegion="polite" style={[styles.container, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <View style={[styles.accent, { backgroundColor: palette.accent }]} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: palette.accent }]}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
            <Text style={[styles.actionText, { color: palette.accent }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginVertical: 10 },
  accent: { width: 4 },
  content: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  title: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  message: { color: '#33463A', fontSize: 13, lineHeight: 19 },
  action: { alignSelf: 'flex-start', marginTop: 8, minHeight: 28, justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '800' },
});
