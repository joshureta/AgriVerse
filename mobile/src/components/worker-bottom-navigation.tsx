import { styles } from '@/styles/components/worker-bottom-navigation.styles';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';

type WorkerTab = 'home' | 'tasks' | 'schedule' | 'profile';

// Active tab: icon renders fully filled in the app's existing green.
// Inactive tab: icon keeps its existing white-fill / green-outline look.
const GREEN = '#176D34';
const WHITE = '#ffffff';

function HomeIcon({ active }: { active: boolean }) {
  return (
    <View style={styles.homeIconWrapper}>
      <View style={styles.homeRoofStack}>
        <View style={styles.homeRoofTriangle} />
        {!active ? <View style={styles.homeRoofInner} /> : null}
      </View>
      <View
        style={[
          styles.homeHouseBody,
          active ? { backgroundColor: GREEN } : { backgroundColor: WHITE, borderWidth: 2.5, borderColor: GREEN },
        ]}>
        {active ? <View style={styles.homeDoorCutout} /> : null}
      </View>
    </View>
  );
}

function TasksIcon({ active }: { active: boolean }) {
  const fill = active ? GREEN : WHITE;
  return (
    <View style={[styles.clipboard, { backgroundColor: fill, borderColor: GREEN }]}>
      <View style={[styles.clipClip, { backgroundColor: fill, borderColor: GREEN }]} />
      <Text style={[styles.clipCheckText, { color: active ? WHITE : GREEN }]}>✓</Text>
    </View>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const boxFill = active ? GREEN : WHITE;
  const dotColor = active ? WHITE : GREEN;
  return (
    <View style={styles.calendarWrapper}>
      <View style={styles.calendarRingLeft} />
      <View style={styles.calendarRingRight} />
      <View style={[styles.calendarBox, { backgroundColor: boxFill, borderColor: GREEN }]}>
        <View style={styles.calendarGridRow}>
          <View style={[styles.calendarGridDot, { backgroundColor: dotColor }]} />
          <View style={[styles.calendarGridDot, { backgroundColor: dotColor }]} />
          <View style={[styles.calendarGridDot, { backgroundColor: dotColor }]} />
        </View>
        <View style={styles.calendarGridRow}>
          <View style={[styles.calendarGridDot, { backgroundColor: dotColor }]} />
          <View style={[styles.calendarGridDot, { backgroundColor: dotColor }]} />
          <View style={[styles.calendarGridDot, { backgroundColor: dotColor }]} />
        </View>
      </View>
    </View>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const fill = active ? GREEN : WHITE;
  return (
    <View style={styles.profileIcon}>
      <View style={[styles.profileHead, { backgroundColor: fill, borderColor: GREEN }]} />
      <View style={[styles.profileBody, { backgroundColor: fill, borderColor: GREEN }]} />
    </View>
  );
}

export function WorkerBottomNavigation({ activeTab }: { activeTab: WorkerTab }) {
  const { profile } = useAuth();
  const homeRoute = profile?.worker_category === 'driver' ? '/DriverTaskDashboard' : '/WorkerTaskDashboard';
  const tasksRoute = profile?.worker_category === 'driver' ? '/DriverTaskPending' : '/WorkerTaskPending';
  const scheduleRoute = profile?.worker_category === 'driver' ? '/DriverSchedule' : '/WorkerSchedule';

  const items: { key: WorkerTab; label: string; onPress: () => void; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', onPress: () => router.push(homeRoute), icon: <HomeIcon active={activeTab === 'home'} /> },
    { key: 'tasks', label: 'Tasks', onPress: () => router.push(tasksRoute), icon: <TasksIcon active={activeTab === 'tasks'} /> },
    { key: 'schedule', label: 'Schedule', onPress: () => router.push(scheduleRoute), icon: <CalendarIcon active={activeTab === 'schedule'} /> },
    { key: 'profile', label: 'Profile', onPress: () => router.push('/explore'), icon: <ProfileIcon active={activeTab === 'profile'} /> },
  ];

  return (
    <View style={styles.navigation}>
      {items.map((item) => (
        <Pressable
          accessibilityLabel={`Go to ${item.label}`}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === item.key }}
          key={item.key}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.button,
            activeTab === item.key && styles.activeButton,
            pressed && styles.pressedButton,
          ]}>
          {item.icon}
        </Pressable>
      ))}
    </View>
  );
}
