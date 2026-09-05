import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { useAuth } from '@/context/auth-context';
import { GREEN } from '@/styles/buyer-home.styles';
import { styles } from '@/styles/buyer-account.styles';

// Preview-only mock data — no backend wiring yet.
const PROFILE = {
  name: 'Juan Dela Cruz',
  email: 'juan.delacruz@email.com',
  phone: '+63 1234 567 8900',
  business: "Juan's Fresh Market",
  address: '123 Market Street, Manila City,\nMetro Manila, Philippines',
};

function UserIcon({ color = '#4E6A56' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
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

function MailIcon({ color = '#4E6A56' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect width={20} height={16} x={2} y={4} rx={2} stroke={color} strokeWidth={2} />
      <Path
        d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PhoneIcon({ color = '#4E6A56' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BriefcaseIcon({ color = '#4E6A56' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect width={20} height={14} x={2} y={7} rx={2} stroke={color} strokeWidth={2} />
      <Path
        d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MapPinIcon({ color = '#4E6A56' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function ReceiptIcon({ color = GREEN, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 7h8M8 11h8M8 15h4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ color = '#8B9B8E' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="m9 18 6-6-6-6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function BuyerAccountScreen() {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    try {
      await signOut();
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/login');
    } catch (caught) {
      Alert.alert(
        'Unable to sign out',
        caught instanceof Error ? caught.message : 'Please try again.',
      );
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader />

      <View style={styles.mainBodyContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.titleText}>My Account</Text>

        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <View style={styles.avatarHead} />
              <View style={styles.avatarBody} />
            </View>
            <View style={styles.avatarBadge}>
              <UserIcon color="#ffffff" />
            </View>
          </View>

          <View style={styles.infoRow}>
            <UserIcon />
            <Text style={styles.infoNameText}>{PROFILE.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <MailIcon />
            <Text style={styles.infoText}>{PROFILE.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <PhoneIcon />
            <Text style={styles.infoText}>{PROFILE.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <BriefcaseIcon />
            <Text style={styles.infoText}>{PROFILE.business}</Text>
          </View>
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <MapPinIcon />
            <Text style={styles.infoText}>{PROFILE.address}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View my purchases"
          onPress={() => router.push('/BuyerPurchaseHistory' as never)}
          style={({ pressed }) => [styles.purchasesCard, pressed && styles.purchasesPressed]}>
          <View style={styles.purchasesIconCircle}>
            <ReceiptIcon size={20} color={GREEN} />
          </View>
          <View style={styles.purchasesTextBlock}>
            <Text style={styles.purchasesTitle}>My Purchases</Text>
            <Text style={styles.purchasesSubtitle}>View your order history</Text>
          </View>
          <ChevronRightIcon />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          disabled={signingOut}
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.editButton,
            styles.signOutButton,
            pressed && styles.editButtonPressed,
            signingOut && styles.buttonDisabled,
          ]}>
          {signingOut ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <SymbolView
              name={{ android: 'logout', ios: 'rectangle.portrait.and.arrow.right', web: 'logout' }}
              size={20}
              tintColor="#ffffff"
            />
          )}
          <Text style={styles.editButtonText}>{signingOut ? 'Signing Out…' : 'Sign Out'}</Text>
        </Pressable>
      </ScrollView>
      </View>

      <BuyerBottomNavigation activeTab="account" />
    </SafeAreaView>
  );
}
