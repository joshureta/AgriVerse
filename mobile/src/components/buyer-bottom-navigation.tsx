import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  ACTIVE_ICON_COLOR,
  INACTIVE_ICON_COLOR,
  styles,
} from '@/styles/components/buyer-bottom-navigation.styles';

type BuyerTab = 'home' | 'order' | 'orders' | 'cart' | 'account';

function HomeIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5 12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 22V12h6v10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function OrderIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 6h18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 10a4 4 0 0 1-8 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CartIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={8} cy={21} r={1} stroke={color} strokeWidth={2} fill={active ? color : 'none'} />
      <Circle cx={19} cy={21} r={1} stroke={color} strokeWidth={2} fill={active ? color : 'none'} />
      <Path
        d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AccountIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_ICON_COLOR : INACTIVE_ICON_COLOR;
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={7} r={4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function BuyerBottomNavigation({ activeTab }: { activeTab: BuyerTab }) {
  const normalizedTab = activeTab === 'orders' ? 'order' : activeTab;
  const items: { key: 'home' | 'order' | 'cart' | 'account'; label: string; onPress: () => void; icon: (active: boolean) => React.ReactNode }[] = [
    { key: 'home', label: 'Home', onPress: () => router.push('/BuyerHome' as never), icon: (active) => <HomeIcon active={active} /> },
    { key: 'order', label: 'Order', onPress: () => router.push('/BuyerProductDetail' as never), icon: (active) => <OrderIcon active={active} /> },
    { key: 'cart', label: 'Cart', onPress: () => router.push('/BuyerCart' as never), icon: (active) => <CartIcon active={active} /> },
    { key: 'account', label: 'Account', onPress: () => router.push('/BuyerAccount' as never), icon: (active) => <AccountIcon active={active} /> },
  ];

  return (
    <View style={styles.navigationArea}>
      <View style={styles.navigation}>
        {items.map((item) => {
          const active = normalizedTab === item.key;
          return (
            <Pressable
              accessibilityLabel={`Go to ${item.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={item.key}
              onPress={item.onPress}
              style={({ pressed }) => [styles.button, active && styles.activeButton, pressed && styles.pressedButton]}>
              {item.icon(active)}
              <Text style={active ? styles.activeLabel : styles.label}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
