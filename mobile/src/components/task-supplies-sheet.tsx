import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { apiRequest } from '@/lib/api';
import type { SupplyItem, SupplyKind } from '@/lib/task-supplies';

const GREEN = '#176D34';

type Props = {
  visible: boolean;
  kind: SupplyKind;
  title: string;
  submitting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (itemId: number, quantity: number) => void;
};

// Shown when a worker starts a Fertilization or Pest & Disease Action task: pick the item, then the amount.
export function TaskSuppliesSheet({ visible, kind, title, submitting, error, onCancel, onConfirm }: Props) {
  const [items, setItems] = useState<SupplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  // The sheet is mounted only while a task is being started, so it loads once on open.
  useEffect(() => {
    let cancelled = false;
    apiRequest<{ items: SupplyItem[] }>(`/api/worker/tasks/inventory-options?type=${kind}`)
      .then((result) => { if (!cancelled) setItems(result.items); })
      .catch((caught) => { if (!cancelled) setLoadError(caught instanceof Error ? caught.message : 'Could not load the inventory list.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kind]);

  const selected = items.find((item) => item.id === selectedId) || null;
  const label = kind === 'fertilizer' ? 'fertilizer' : 'pesticide';

  function choose(item: SupplyItem) {
    if (!item.available) return;
    setSelectedId(item.id);
    setQuantity((current) => Math.min(Math.max(current, 1), item.quantity));
  }

  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}>
      <View style={sheet.backdrop}>
        <Pressable accessibilityLabel="Close" onPress={onCancel} style={sheet.dismiss} />
        <View style={sheet.card}>
          <View style={sheet.headerRow}>
            <Text style={sheet.title}>Start task</Text>
            <Pressable accessibilityLabel="Close" hitSlop={8} onPress={onCancel}>
              <Text style={sheet.close}>✕</Text>
            </Pressable>
          </View>
          <Text style={sheet.subtitle} numberOfLines={1}>{title}</Text>

          <Text style={sheet.label}>Choose {label}</Text>
          {loading ? (
            <View style={sheet.centerBox}><ActivityIndicator color={GREEN} /></View>
          ) : loadError ? (
            <Text style={sheet.errorText}>{loadError}</Text>
          ) : items.length ? (
            <ScrollView style={sheet.list}>
              {items.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.id === selectedId, disabled: !item.available }}
                  disabled={!item.available}
                  key={item.id}
                  onPress={() => choose(item)}
                  style={[sheet.row, item.id === selectedId && sheet.rowSelected]}>
                  <Text style={[sheet.rowName, !item.available && sheet.rowMuted]}>{item.name}</Text>
                  <Text style={[sheet.rowStock, !item.available && sheet.rowMuted]}>
                    {item.available ? `${item.quantity} ${item.unit} left` : 'Out of stock'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Text style={sheet.rowMuted}>No {label} is in the inventory yet. Ask your admin to add one.</Text>
          )}

          <Text style={sheet.label}>{selected ? `How many ${selected.unit} used` : 'Amount used'}</Text>
          <View style={sheet.counter}>
            <Pressable
              accessibilityLabel="Use less"
              disabled={!selected || quantity <= 1}
              onPress={() => setQuantity((current) => Math.max(1, current - 1))}
              style={[sheet.counterButton, (!selected || quantity <= 1) && sheet.counterDisabled]}>
              <Text style={sheet.counterSign}>−</Text>
            </Pressable>
            <Text style={sheet.counterValue}>{quantity}</Text>
            <Pressable
              accessibilityLabel="Use more"
              disabled={!selected || quantity >= selected.quantity}
              onPress={() => setQuantity((current) => Math.min(selected ? selected.quantity : current, current + 1))}
              style={[sheet.counterButton, (!selected || quantity >= selected.quantity) && sheet.counterDisabled]}>
              <Text style={sheet.counterSign}>+</Text>
            </Pressable>
          </View>

          {error ? <Text accessibilityRole="alert" style={sheet.errorText}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={!selected || submitting}
            onPress={() => selected && onConfirm(selected.id, quantity)}
            style={[sheet.submit, (!selected || submitting) && sheet.submitDisabled]}>
            {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={sheet.submitText}>Start task</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  dismiss: { flex: 1 },
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  close: { color: '#64748B', fontSize: 18 },
  subtitle: { marginTop: 2, color: '#64748B', fontSize: 13 },
  label: { marginTop: 16, marginBottom: 6, color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  list: { maxHeight: 220, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowSelected: { backgroundColor: '#E8F5E9' },
  rowName: { flex: 1, color: '#0F172A', fontSize: 14, fontWeight: '700' },
  rowStock: { marginLeft: 10, color: GREEN, fontSize: 12, fontWeight: '700' },
  rowMuted: { color: '#94A3B8', fontSize: 13 },
  centerBox: { paddingVertical: 18, alignItems: 'center' },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F8FAFC' },
  counterButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  counterDisabled: { opacity: 0.4 },
  counterSign: { color: '#0F172A', fontSize: 22, fontWeight: '700' },
  counterValue: { minWidth: 36, textAlign: 'center', color: '#0F172A', fontSize: 24, fontWeight: '800' },
  errorText: { marginTop: 10, color: '#B91C1C', fontSize: 13 },
  submit: { marginTop: 16, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: GREEN },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
