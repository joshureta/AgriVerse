import { styles } from '@/styles/components/worker-task-segmented-tabs.styles';
import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, Text, View } from 'react-native';

export type TaskTabValue = 'pending' | 'in_progress' | 'completed';

export const TASK_TABS: { label: string; value: TaskTabValue; route: string }[] = [
  { label: 'Pending', value: 'pending', route: '/WorkerTaskPending' },
  { label: 'Active', value: 'in_progress', route: '/WorkerTaskActive' },
  { label: 'Completed', value: 'completed', route: '/WorkerTaskCompleted' },
];

export function WorkerTaskSegmentedTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TaskTabValue;
  onTabChange: (tab: TaskTabValue, route: string) => void;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = TASK_TABS.findIndex((t) => t.value === activeTab);
  const animValue = useRef(new Animated.Value(activeIndex >= 0 ? activeIndex : 0)).current;

  useEffect(() => {
    const target = activeIndex >= 0 ? activeIndex : 0;
    Animated.spring(animValue, {
      toValue: target,
      friction: 8,
      tension: 65,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, animValue]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setContainerWidth(w);
    }
  };

  // Tab width accounts for 2px padding on each side (total 4px)
  const tabWidth = containerWidth > 0 ? (containerWidth - 4) / 3 : 0;

  const translateX = animValue.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, tabWidth, tabWidth * 2],
  });

  return (
    <View onLayout={handleLayout} style={styles.container}>
      {tabWidth > 0 ? (
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              width: tabWidth,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}

      {TASK_TABS.map((tab, idx) => {
        const isSelected = (activeIndex >= 0 ? activeIndex : 0) === idx;
        return (
          <Pressable
            key={tab.value}
            onPress={() => {
              if (tab.value !== activeTab) {
                // Instantly animate to the tapped tab
                Animated.spring(animValue, {
                  toValue: idx,
                  friction: 8,
                  tension: 65,
                  useNativeDriver: true,
                }).start();
                onTabChange(tab.value, tab.route);
              }
            }}
            style={styles.tabButton}>
            <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
