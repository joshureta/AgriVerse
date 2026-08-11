import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

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
    height: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 46,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d9d9d9',
  },
  button: { width: 57, height: 55, borderRadius: 7, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  activeButton: {
    backgroundColor: '#b1d995',
    elevation: 5,
    shadowColor: '#65705e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: .28,
    shadowRadius: 6,
  },
  pressedButton: { opacity: .72 },
  homeIcon: { width: 40, height: 40, position: 'relative' },
  homeRoofLeft: { position: 'absolute', top: 9, left: 1, width: 23, height: 3, borderRadius: 2, backgroundColor: ICON_COLOR, transform: [{ rotate: '-43deg' }] },
  homeRoofRight: { position: 'absolute', top: 9, right: 1, width: 23, height: 3, borderRadius: 2, backgroundColor: ICON_COLOR, transform: [{ rotate: '43deg' }] },
  homeWallLeft: { position: 'absolute', left: 7, top: 18, width: 3, height: 19, borderRadius: 2, backgroundColor: ICON_COLOR },
  homeWallRight: { position: 'absolute', right: 7, top: 18, width: 3, height: 19, borderRadius: 2, backgroundColor: ICON_COLOR },
  homeBase: { position: 'absolute', left: 7, bottom: 2, width: 26, height: 3, borderRadius: 2, backgroundColor: ICON_COLOR },
  homeDoorLeft: { position: 'absolute', left: 16, bottom: 2, width: 2, height: 13, backgroundColor: ICON_COLOR },
  homeDoorRight: { position: 'absolute', right: 15, bottom: 2, width: 2, height: 13, backgroundColor: ICON_COLOR },
  homeDoorTop: { position: 'absolute', left: 16, bottom: 13, width: 9, height: 2, backgroundColor: ICON_COLOR },
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
  profileIcon: { width: 42, height: 43, alignItems: 'center', overflow: 'visible' },
  profileHead: { width: 19, height: 19, borderRadius: 10, borderWidth: 2.5, borderColor: ICON_COLOR },
  profileBody: { width: 40, height: 21, marginTop: 3, overflow: 'hidden' },
  profileBodyOval: { position: 'absolute', top: 0, left: 0, width: 40, height: 37, borderRadius: 20, borderWidth: 2.5, borderColor: ICON_COLOR },
});
