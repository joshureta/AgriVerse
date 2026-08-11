import { styles } from '@/styles/components/worker-bottom-navigation.styles';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/context/auth-context';

type WorkerTab = 'home' | 'tasks' | 'profile';

function HomeIcon() {
  return (
    <View style={styles.homeIcon}>
      <View style={styles.homeRoofLeft} />
      <View style={styles.homeRoofRight} />
      <View style={styles.homeWallLeft} />
      <View style={styles.homeWallRight} />
      <View style={styles.homeBase} />
      <View style={styles.homeDoorLeft} />
      <View style={styles.homeDoorRight} />
      <View style={styles.homeDoorTop} />
    </View>
  );
}

function TasksIcon() {
  return (
    <View style={styles.clipboard}>
      <View style={styles.clipClip} />
      <View style={styles.checkStem} />
      <View style={styles.checkArm} />
    </View>
  );
}

function ProfileIcon() {
  return (
    <View style={styles.profileIcon}>
      <View style={styles.profileHead} />
      <View style={styles.profileBody}><View style={styles.profileBodyOval} /></View>
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

const ICON_COLOR = '#237e40';
