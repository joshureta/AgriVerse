import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useAuth } from '@/context/auth-context';
import { apiRequest } from '@/lib/api';
import { DriverOrdersResponse } from '@/lib/driver-deliveries';
import {
  ACTIVE_ICON_COLOR,
  INACTIVE_ICON_COLOR,
  styles,
} from '@/styles/components/driver-bottom-navigation.styles';

export type DriverTab = 'home' | 'tasks' | 'schedule' | 'profile';

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.2L12 3l9 7.2V20a1.5 1.5 0 0 1-1.5 1.5H15V14H9v7.5H4.5A1.5 1.5 0 0 1 3 20V10.2Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? 'rgba(255, 255, 255, 0.2)' : 'none'}
      />
    </Svg>
  );
}

function DeliveryIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 5h12v10H2V5Zm12 4h4l3 3v3h-7V9Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={6.5} cy={18.5} r={2} stroke={color} strokeWidth={2} fill={active ? color : 'none'} />
      <Circle cx={16.5} cy={18.5} r={2} stroke={color} strokeWidth={2} fill={active ? color : 'none'} />
      <Path d="M9 9h3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={4}
        width={18}
        height={17}
        rx={3}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M16 2v4M8 2v4M3 9.5h18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={8} cy={14} r={1} fill={color} />
      <Circle cx={12} cy={14} r={1} fill={color} />
      <Circle cx={16} cy={14} r={1} fill={color} />
      <Circle cx={8} cy={17.5} r={1} fill={color} />
      <Circle cx={12} cy={17.5} r={1} fill={color} />
    </Svg>
  );
}

function DriverProfileIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={7.5} r={3.8} stroke={color} strokeWidth={2} fill={active ? 'rgba(255, 255, 255, 0.3)' : 'none'} />
      <Path
        d="M4.5 20.5a7.5 7.5 0 0 1 15 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

interface DriverBottomNavigationProps {
  activeTab?: DriverTab;
  pendingCount?: number;
}

export function DriverBottomNavigation({ activeTab = 'home', pendingCount: propPendingCount }: DriverBottomNavigationProps) {
  const { profile } = useAuth();
  const [pendingDispatches, setPendingDispatches] = useState<number>(propPendingCount ?? 0);

  useEffect(() => {
    if (propPendingCount !== undefined) {
      setPendingDispatches(propPendingCount);
      return;
    }

    let isSubscribed = true;
    const fetchPendingCount = async () => {
      try {
        const response = await apiRequest<DriverOrdersResponse>('/api/driver/orders');
        const assigned = (response.orders ?? []).filter(
          (order) => order.delivery_assignment_status === 'assigned'
        );
        if (isSubscribed) {
          setPendingDispatches(assigned.length);
        }
      } catch {
        // Fallback silently if unauthenticated or offline
      }
    };

    fetchPendingCount();
    return () => {
      isSubscribed = false;
    };
  }, [propPendingCount]);

  const items: {
    key: DriverTab;
    label: string;
    route: string;
    renderIcon: (active: boolean) => React.ReactNode;
    badgeCount?: number;
  }[] = [
    {
      key: 'home',
      label: 'Home',
      route: '/DriverTaskDashboard',
      renderIcon: (a) => <HomeIcon active={a} />,
    },
    {
      key: 'tasks',
      label: 'Deliveries',
      route: '/DriverTaskPending',
      renderIcon: (a) => <DeliveryIcon active={a} />,
      badgeCount: pendingDispatches,
    },
    {
      key: 'schedule',
      label: 'Schedule',
      route: '/DriverSchedule',
      renderIcon: (a) => <CalendarIcon active={a} />,
    },
    {
      key: 'profile',
      label: 'Profile',
      route: '/WorkerProfile',
      renderIcon: (a) => <DriverProfileIcon active={a} />,
    },
  ];

  return (
    <View style={styles.navigationArea}>
      <View style={styles.navigation}>
        {items.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <Pressable
              accessibilityLabel={`Go to ${item.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              key={item.key}
              onPress={() => router.push(item.route as never)}
              style={({ pressed }) => [
                styles.button,
                isActive && styles.activeButton,
                pressed && styles.pressedButton,
              ]}>
              <View style={styles.iconSlot}>
                {item.renderIcon(isActive)}
                {item.badgeCount && item.badgeCount > 0 ? (
                  <View style={styles.dispatchBadge}>
                    <Text style={styles.dispatchBadgeText}>
                      {item.badgeCount > 99 ? '99+' : item.badgeCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={isActive ? styles.activeLabel : styles.label}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
