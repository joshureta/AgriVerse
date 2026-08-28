import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ICON_MUTED, styles } from '@/styles/components/buyer-bottom-navigation.styles';

type BuyerTab = 'home' | 'orders' | 'cart' | 'account';

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? '#ffffff' : ICON_MUTED;
  return (
    <View style={styles.homeIcon}>
      <View style={[styles.homeRoof, { borderBottomColor: color }]} />
      <View style={[styles.homeBody, { backgroundColor: color }]} />
    </View>
  );
}

function OrdersIcon({ active }: { active: boolean }) {
  const color = active ? '#ffffff' : ICON_MUTED;
  return (
    <View style={styles.boxIcon}>
      <View style={[styles.boxBody, { borderColor: color }]} />
      <View style={[styles.boxLid, { backgroundColor: color }]} />
    </View>
  );
}

function CartIcon({ active }: { active: boolean }) {
  const color = active ? '#ffffff' : ICON_MUTED;
  return (
    <View style={styles.cartIcon}>
      <View style={[styles.cartHandle, { borderColor: color }]} />
      <View style={[styles.cartBasket, { borderColor: color }]} />
      <View style={styles.cartWheels}>
        <View style={[styles.cartWheel, { backgroundColor: color }]} />
        <View style={[styles.cartWheel, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

function AccountIcon({ active }: { active: boolean }) {
  const color = active ? '#ffffff' : ICON_MUTED;
  return (
    <View style={styles.profileIcon}>
      <View style={[styles.profileHead, { borderColor: color }]} />
      <View style={[styles.profileBody, { borderColor: color }]} />
    </View>
  );
}

export function BuyerBottomNavigation({ activeTab }: { activeTab: BuyerTab }) {
  const items: { key: BuyerTab; label: string; onPress: () => void; icon: (active: boolean) => React.ReactNode }[] = [
    { key: 'home', label: 'Home', onPress: () => router.push('/BuyerHome' as never), icon: (active) => <HomeIcon active={active} /> },
    { key: 'orders', label: 'Orders', onPress: () => router.push('/BuyerProductDetail' as never), icon: (active) => <OrdersIcon active={active} /> },
    { key: 'cart', label: 'Cart', onPress: () => router.push('/BuyerCart' as never), icon: (active) => <CartIcon active={active} /> },
    { key: 'account', label: 'Account', onPress: () => router.push('/BuyerAccount' as never), icon: (active) => <AccountIcon active={active} /> },
  ];

  return (
    <View style={styles.navigation}>
      {items.map((item) => {
        const active = activeTab === item.key;
        return (
          <Pressable
            accessibilityLabel={`Go to ${item.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }) => [styles.button, active && styles.activeButton, pressed && styles.pressedButton]}>
            {item.icon(active)}
            <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
