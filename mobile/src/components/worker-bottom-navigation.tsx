import {
  ACTIVE_ICON_COLOR,
  INACTIVE_ICON_COLOR,
  styles,
} from '@/styles/components/worker-bottom-navigation.styles';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useAuth } from '@/context/auth-context';

type WorkerTab = 'home' | 'tasks' | 'schedule' | 'profile';

function HomeIcon({ active }: { active: boolean }) { const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR; return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M9 21v-7h6v7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
function TasksIcon({ active }: { active: boolean }) { const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR; return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M9 4h6v3H9zM6 6H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Path d="m8 14 2 2 5-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
function DeliveryIcon({ active }: { active: boolean }) { const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR; return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M3 5h11v11H3V5Zm11 5h3l3 3v3h-6v-6Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={6.5} cy={18} r={1.5} stroke={color} strokeWidth={2} /><Circle cx={16.5} cy={18} r={1.5} stroke={color} strokeWidth={2} /></Svg>; }
function CalendarIcon({ active }: { active: boolean }) { const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR; return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Path d="M8 2v4m8-4v4M3 10h18" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>; }
function ProfileIcon({ active }: { active: boolean }) { const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR; return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"><Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} /><Path d="M4 21a8 8 0 0 1 16 0" stroke={color} strokeWidth={2} strokeLinecap="round" /></Svg>; }

export function WorkerBottomNavigation({ activeTab }: { activeTab?: WorkerTab }) {
  const { profile } = useAuth();
  const homeRoute = profile?.worker_category === 'driver' ? '/DriverTaskDashboard' : '/WorkerTaskDashboard';
  const tasksRoute = profile?.worker_category === 'driver' ? '/DriverTaskPending' : '/WorkerTaskPending';
  const scheduleRoute = profile?.worker_category === 'driver' ? '/DriverSchedule' : '/WorkerSchedule';

  const items: { key: WorkerTab; label: string; route: string; icon: (active: boolean) => React.ReactNode }[] = [
    { key: 'home', label: 'Home', route: homeRoute, icon: (a) => <HomeIcon active={a} /> },
    { key: 'tasks', label: profile?.worker_category === 'driver' ? 'Deliveries' : 'Tasks', route: tasksRoute, icon: (a) => profile?.worker_category === 'driver' ? <DeliveryIcon active={a} /> : <TasksIcon active={a} /> },
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
