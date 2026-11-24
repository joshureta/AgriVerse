import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  DAMAGE_TYPES,
  STOCK_CONDITIONS,
  stockKey,
  type StockCheckInfo,
  type StockCondition,
  type StockPhoto,
} from '@/lib/stock-check';
import { GREEN, styles } from '@/styles/worker-task-completion.styles';

type Props = {
  info: StockCheckInfo;
  counts: Record<string, string>;
  photos: Record<string, StockPhoto>;
  damageTypes: Record<string, string[]>;
  onChangeCount: (key: string, value: string) => void;
  onPickPhoto: (key: string) => void;
  onRemovePhoto: (key: string) => void;
  onToggleDamage: (key: string, type: string) => void;
};

// Damaged pineapples by size and damage type for a Stock Check, inside the task completion sheet.
// It reuses the harvest count cards and the photo proof styles of the same sheet.
export function StockCheckCounts({ info, counts, photos, damageTypes, onChangeCount, onPickPhoto, onRemovePhoto, onToggleDamage }: Props) {
  const [activeSize, setActiveSize] = useState(info.sizes[0] || 'Small');
  const quantityOf = (size: string, condition: StockCondition) => Number(counts[stockKey(size, condition)]) || 0;
  const sizeTotal = (size: string) => STOCK_CONDITIONS.reduce((sum, condition) => sum + quantityOf(size, condition.code), 0);
  const total = sizeTotal(activeSize);
  const grand = info.sizes.reduce((sum, size) => sum + sizeTotal(size), 0);

  function step(key: string, delta: number) {
    const next = Math.max(0, (Number(counts[key]) || 0) + delta);
    onChangeCount(key, String(next));
  }

  return (
    <View style={styles.harvestSection}>
      <View style={styles.harvestHeaderRow}>
        <Text style={styles.harvestKicker}>DAMAGED PINEAPPLES</Text>
        <Text style={styles.harvestHint}>Enter damaged only</Text>
      </View>

      {info.sizes.length > 1 ? (
        <View accessibilityRole="tablist" style={local.tabs}>
          {info.sizes.map((size) => {
            const selected = size === activeSize;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                key={size}
                onPress={() => setActiveSize(size)}
                style={[local.tab, selected && local.tabActive]}>
                <Text style={[local.tabText, selected && local.tabTextActive]}>{size} · {sizeTotal(size)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.harvestGrid}>
        {STOCK_CONDITIONS.map((condition) => {
          const key = stockKey(activeSize, condition.code);
          const flagged = quantityOf(activeSize, condition.code) > 0;
          const photo = photos[key];
          return (
            <View key={key}>
              <View style={[styles.harvestGridCard, local.card, flagged && styles.harvestGridCardDamaged]}>
                <View style={local.labelColumn}>
                  <Text style={[styles.harvestCardLabel, flagged && styles.harvestCardLabelDamaged, false]}>
                    {condition.label}
                  </Text>
                  <Text style={local.hint}>{condition.hint}</Text>
                </View>
                <View style={local.stepper}>
                  <Pressable accessibilityLabel={`Decrease ${condition.label}`} accessibilityRole="button" hitSlop={4} onPress={() => step(key, -1)} style={local.stepButton}>
                    <Text style={local.stepText}>−</Text>
                  </Pressable>
                  <TextInput
                    accessibilityLabel={`${activeSize} ${condition.label} count`}
                    keyboardType="number-pad"
                    maxLength={5}
                    onChangeText={(value) => onChangeCount(key, value.replace(/\D/g, ''))}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    selectTextOnFocus
                    style={[styles.harvestCardInput, flagged && styles.harvestCardInputDamaged]}
                    value={counts[key] ?? ''}
                  />
                  <Pressable accessibilityLabel={`Increase ${condition.label}`} accessibilityRole="button" hitSlop={4} onPress={() => step(key, 1)} style={local.stepButton}>
                    <Text style={local.stepText}>+</Text>
                  </Pressable>
                </View>
              </View>

              {flagged ? (
                <View style={local.evidence}>
                  {condition.code === 'minor_damage' ? (
                    <View style={local.chips}>
                      {DAMAGE_TYPES.map((type) => {
                        const selected = (damageTypes[key] || []).includes(type);
                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            key={type}
                            onPress={() => onToggleDamage(key, type)}
                            style={[local.chip, selected && local.chipSelected]}>
                            <Text style={[local.chipText, selected && local.chipTextSelected]}>{type}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                  {photo ? (
                    <View style={local.photoRow}>
                      <Image source={{ uri: photo.uri }} style={local.thumb} />
                      <Text style={local.photoText}>Photo attached</Text>
                      <Pressable accessibilityRole="button" onPress={() => onPickPhoto(key)}>
                        <Text style={styles.changeButtonText}>Change</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={() => onRemovePhoto(key)}>
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable accessibilityRole="button" onPress={() => onPickPhoto(key)} style={styles.photoEmptySelectButton}>
                      <Text style={styles.photoEmptySelectButtonText}>
                        Add Photo (Required)
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.taskInfoCard}>
        <View style={styles.infoCol}>
          <Text style={styles.infoKicker}>TOTAL DAMAGES</Text>
          <Text style={[styles.infoValue, local.nonSaleable]}>{grand} pcs</Text>
        </View>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  tabs: { height: 40, flexDirection: 'row', padding: 2, borderRadius: 20, borderWidth: 1.5, borderColor: GREEN, backgroundColor: '#FFFFFF' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  tabActive: { backgroundColor: GREEN },
  tabText: { color: '#1E293B', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '800' },
  // The harvest card is sized for a row of two; here each card is a full-width row.
  card: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  labelColumn: { flex: 1, minWidth: 0, paddingRight: 8 },

  hint: { marginTop: 1, color: '#64748B', fontSize: 10.5, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepButton: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#F1F5F9' },
  stepText: { color: '#334155', fontSize: 18, fontWeight: '800' },
  evidence: { gap: 8, marginTop: 6, marginBottom: 2, paddingLeft: 4, alignItems: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' },
  chipSelected: { borderColor: '#176D34', backgroundColor: '#E8F5E9' },
  chipText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: '#166534', fontWeight: '800' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#F8FAFC' },
  photoText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  nonSaleable: { color: '#B91C1C' },
});
