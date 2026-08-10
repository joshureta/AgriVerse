import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

type WorkerTab = 'home' | 'tasks' | 'profile';

function HomeIcon() {
  return (
    <View style={styles.homeIcon}>
      <View style={styles.homeRoof} />
      <View style={styles.homeBox}><View style={styles.homeDoor} /></View>
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
      <View style={styles.profileBody} />
    </View>
  );
}

export function WorkerBottomNavigation({ activeTab }: { activeTab: WorkerTab }) {
  const items: { key: WorkerTab; label: string; onPress: () => void; icon: React.ReactNode }[] = [
    { key: 'home', label: 'Home', onPress: () => router.push('/WorkerTaskDashboard'), icon: <HomeIcon /> },
    { key: 'tasks', label: 'Tasks', onPress: () => router.push('/WorkerTaskPending'), icon: <TasksIcon /> },
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

const styles = StyleSheet.create({
  navigation: {
    height: 79,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 48,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d9d9d9',
  },
  button: { width: 62, height: 57, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  activeButton: {
    backgroundColor: '#b1d995',
    elevation: 5,
    shadowColor: '#65705e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: .28,
    shadowRadius: 6,
  },
  pressedButton: { opacity: .72 },
  homeIcon: { width: 39, height: 39, position: 'relative' },
  homeRoof: {
    position: 'absolute', top: 2, left: 7, width: 25, height: 25,
    borderTopWidth: 3, borderLeftWidth: 3, borderColor: ICON_COLOR,
    transform: [{ rotate: '45deg' }], borderTopLeftRadius: 2,
  },
  homeBox: {
    position: 'absolute', left: 7, bottom: 1, width: 27, height: 23,
    borderWidth: 3, borderTopWidth: 0, borderColor: ICON_COLOR,
    borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
  },
  homeDoor: {
    position: 'absolute', width: 8, height: 13, bottom: 0, left: 7,
    borderWidth: 2, borderBottomWidth: 0, borderColor: ICON_COLOR,
  },
  clipboard: { width: 32, height: 39, borderWidth: 3, borderColor: ICON_COLOR, borderRadius: 3 },
  clipClip: {
    position: 'absolute', top: -7, left: 7, width: 14, height: 9,
    borderRadius: 2, borderWidth: 3, borderColor: ICON_COLOR, backgroundColor: '#fff',
  },
  checkStem: {
    position: 'absolute', left: 8, top: 20, width: 10, height: 3,
    borderRadius: 2, backgroundColor: ICON_COLOR, transform: [{ rotate: '45deg' }],
  },
  checkArm: {
    position: 'absolute', left: 13, top: 17, width: 13, height: 3,
    borderRadius: 2, backgroundColor: ICON_COLOR, transform: [{ rotate: '-48deg' }],
  },
  profileIcon: { width: 43, height: 45, alignItems: 'center' },
  profileHead: { width: 20, height: 20, borderRadius: 11, borderWidth: 3, borderColor: ICON_COLOR },
  profileBody: {
    width: 39, height: 21, marginTop: 2, borderWidth: 3, borderColor: ICON_COLOR,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomWidth: 0,
  },
});
