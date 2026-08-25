import { styles } from '@/styles/components/worker-bottom-navigation.styles';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';

type WorkerTab = 'home' | 'tasks' | 'schedule' | 'profile';

function HomeIcon() {
  return (
    <View style={styles.homeIconWrapper}>
      <View style={styles.homeRoofTriangle} />
      <View style={styles.homeHouseBody}>
        <View style={styles.homeDoorCutout} />
      </View>
    </View>
  );
}

function TasksIcon() {
  return (
    <View style={styles.clipboard}>
      <View style={styles.clipClip} />
      <Text style={styles.clipCheckText}>✓</Text>
    </View>
  );
}

function CalendarIcon() {
  return (
    <View style={styles.calendarWrapper}>
      <View style={styles.calendarRingLeft} />
      <View style={styles.calendarRingRight} />
      <View style={styles.calendarBox}>
        <View style={styles.calendarGridRow}>
          <View style={styles.calendarGridDot} />
          <View style={styles.calendarGridDot} />
          <View style={styles.calendarGridDot} />
        </View>
        <View style={styles.calendarGridRow}>
          <View style={styles.calendarGridDot} />
          <View style={styles.calendarGridDot} />
          <View style={styles.calendarGridDot} />
        </View>
      </View>
    </View>
  );
}

function ProfileIcon() {
  return (
    <View style={styles.profileIcon}>
      <View style={styles.profileHead} />
      <View style={styles.profileBody} />
    </View>
  );
}

export function WorkerBottomNavigation({ activeTab }: { activeTab: WorkerTab }) {
  const { profile } = useAuth();
  const homeRoute = profile?.worker_category === 'driver' ? '/DriverTaskDashboard' : '/WorkerTaskDashboard';
  const tasksRoute = profile?.worker_category === 'driver' ? '/DriverTaskPending' : '/WorkerTaskPending';

  const items: { key: WorkerTab; label: string; onPress: () => void; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', onPress: () => router.push(homeRoute), icon: <HomeIcon /> },
    { key: 'tasks', label: 'Tasks', onPress: () => router.push(tasksRoute), icon: <TasksIcon /> },
    { key: 'schedule', label: 'Schedule', onPress: () => router.push(tasksRoute), icon: <CalendarIcon /> },
    { key: 'profile', label: 'Profile', onPress: () => router.push('/explore'), icon: <ProfileIcon /> },
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
