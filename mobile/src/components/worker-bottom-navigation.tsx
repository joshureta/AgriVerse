import { DriverBottomNavigation, DriverTab } from '@/components/driver-bottom-navigation';
import { useAuth } from '@/context/auth-context';
import {
  ACTIVE_ICON_COLOR,
  INACTIVE_ICON_COLOR,
  styles,
} from '@/styles/components/worker-bottom-navigation.styles';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type WorkerTab = 'home' | 'tasks' | 'schedule' | 'profile';

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
        fill={active ? 'rgba(255, 255, 255, 0.25)' : 'none'}
      />
      <Path
        d="M9 21.5V14a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? 'rgba(255, 255, 255, 0.4)' : 'none'}
      />
    </Svg>
  );
}

function TasksIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Rect
        x={4}
        y={5}
        width={16}
        height={16}
        rx={3}
        stroke={color}
        strokeWidth={2}
        fill={active ? 'rgba(255, 255, 255, 0.22)' : 'none'}
      />
      <Path
        d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? color : 'none'}
      />
      <Path
        d="m8.5 12 2.5 2.5 4.5-4.5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DeliveryIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 5h11v11H3V5Zm11 5h3l3 3v3h-6v-6Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? 'rgba(255, 255, 255, 0.22)' : 'none'}
      />
      <Circle cx={6.5} cy={18} r={1.5} stroke={color} strokeWidth={2} fill={active ? color : 'none'} />
      <Circle cx={16.5} cy={18} r={1.5} stroke={color} strokeWidth={2} fill={active ? color : 'none'} />
    </Svg>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3.5}
        y={4.5}
        width={17}
        height={16.5}
        rx={3}
        stroke={color}
        strokeWidth={2}
        fill={active ? 'rgba(255, 255, 255, 0.22)' : 'none'}
      />
      <Path
        d="M16 2.5v4M8 2.5v4M3.5 9.5h17"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={8} cy={13.5} r={1.2} fill={color} />
      <Circle cx={12} cy={13.5} r={1.2} fill={color} />
      <Circle cx={16} cy={13.5} r={1.2} fill={color} />
      <Circle cx={8} cy={17} r={1.2} fill={color} />
      <Circle cx={12} cy={17} r={1.2} fill={color} />
    </Svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={7.5}
        r={3.8}
        stroke={color}
        strokeWidth={2}
        fill={active ? 'rgba(255, 255, 255, 0.35)' : 'none'}
      />
      <Path
        d="M4.5 20.5a7.5 7.5 0 0 1 15 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        fill={active ? 'rgba(255, 255, 255, 0.22)' : 'none'}
      />
    </Svg>
  );
}

export function WorkerBottomNavigation({ activeTab }: { activeTab?: WorkerTab }) {
  const { profile } = useAuth();

  if (profile?.worker_category === 'driver') {
    return <DriverBottomNavigation activeTab={activeTab as DriverTab} />;
  }

  const homeRoute = '/WorkerTaskDashboard';
  const tasksRoute = '/WorkerTaskPending';
  const scheduleRoute = '/WorkerSchedule';

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
