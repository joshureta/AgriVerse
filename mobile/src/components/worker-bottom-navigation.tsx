import {
  ACTIVE_ICON_COLOR,
  ACTIVE_PILL_BG,
  GREEN_NAV_BG,
  INACTIVE_ICON_COLOR,
  styles,
} from '@/styles/components/worker-bottom-navigation.styles';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';

type WorkerTab = 'home' | 'tasks' | 'schedule' | 'profile';

function HomeIcon({ active }: { active: boolean }) {
  const houseColor = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  const doorCutoutBg = active ? ACTIVE_PILL_BG : GREEN_NAV_BG;

  return (
    <View style={styles.homeIconWrapper}>
      <View style={styles.homeRoofStack}>
        <View style={[styles.homeRoofTriangle, { borderBottomColor: houseColor }]} />
      </View>
      <View style={[styles.homeHouseBody, { backgroundColor: houseColor }]}>
        <View style={[styles.homeDoorCutout, { backgroundColor: doorCutoutBg }]} />
      </View>
    </View>
  );
}

function TasksIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <View style={[styles.clipboard, { borderColor: color, backgroundColor: 'transparent' }]}>
      <View style={[styles.clipClip, { borderColor: color, backgroundColor: active ? ACTIVE_PILL_BG : GREEN_NAV_BG }]} />
      <Text style={[styles.clipCheckText, { color }]}>✓</Text>
    </View>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <View style={styles.calendarWrapper}>
      <View style={[styles.calendarRingLeft, { backgroundColor: color }]} />
      <View style={[styles.calendarRingRight, { backgroundColor: color }]} />
      <View style={[styles.calendarBox, { borderColor: color, backgroundColor: 'transparent' }]}>
        <View style={[styles.calendarHeaderLine, { backgroundColor: color }]} />
        <View style={styles.calendarGridRow}>
          <View style={[styles.calendarGridDot, { backgroundColor: color }]} />
          <View style={[styles.calendarGridDot, { backgroundColor: color }]} />
          <View style={[styles.calendarGridDot, { backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <View style={styles.profileIcon}>
      {active ? (
        <>
          <View style={[styles.profileHeadFilled, { backgroundColor: color }]} />
          <View style={[styles.profileBodyFilled, { backgroundColor: color }]} />
        </>
      ) : (
        <>
          <View style={[styles.profileHead, { borderColor: color, backgroundColor: 'transparent' }]} />
          <View style={[styles.profileBody, { borderColor: color, backgroundColor: 'transparent' }]} />
        </>
      )}
    </View>
  );
}

export function WorkerBottomNavigation({ activeTab }: { activeTab: WorkerTab }) {
  const { profile } = useAuth();
  const homeRoute = profile?.worker_category === 'driver' ? '/DriverTaskDashboard' : '/WorkerTaskDashboard';
  const tasksRoute = profile?.worker_category === 'driver' ? '/DriverTaskPending' : '/WorkerTaskPending';
  const scheduleRoute = profile?.worker_category === 'driver' ? '/DriverSchedule' : '/WorkerSchedule';

  const items: { key: WorkerTab; label: string; route: string; icon: (active: boolean) => React.ReactNode }[] = [
    { key: 'home', label: 'Home', route: homeRoute, icon: (a) => <HomeIcon active={a} /> },
    { key: 'tasks', label: 'Tasks', route: tasksRoute, icon: (a) => <TasksIcon active={a} /> },
    { key: 'schedule', label: 'Schedule', route: scheduleRoute, icon: (a) => <CalendarIcon active={a} /> },
    { key: 'profile', label: 'Profile', route: '/WorkerProfile', icon: (a) => <ProfileIcon active={a} /> },
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
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => [
                styles.button,
                isActive && styles.activeButton,
                pressed && styles.pressedButton,
              ]}>
              <View style={styles.iconSlot}>{item.icon(isActive)}</View>
              <Text style={isActive ? styles.activeLabel : styles.label}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
