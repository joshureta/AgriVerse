import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { useAuth } from '@/context/auth-context';
import { styles } from '@/styles/buyer-account.styles';

// Preview-only mock data — no backend wiring yet.
const PROFILE = {
  name: 'Juan Dela Cruz',
  email: 'juan.delacruz@email.com',
  phone: '+63 1234 567 8900',
  business: "Juan's Fresh Market",
  address: '123 Market Street, Manila City,\nMetro Manila, Philippines',
};

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
      router.replace({ pathname: '/authentication', params: { mode: 'login' } });
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
              <Text style={styles.avatarBadgeEmoji}>🍍</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👤</Text>
            <Text style={styles.infoNameText}>{PROFILE.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>✉️</Text>
            <Text style={styles.infoText}>{PROFILE.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📞</Text>
            <Text style={styles.infoText}>{PROFILE.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>💼</Text>
            <Text style={styles.infoText}>{PROFILE.business}</Text>
          </View>
          <View style={[styles.infoRow, { marginBottom: 0 }]}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>{PROFILE.address}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View my purchases"
          onPress={() => router.push('/BuyerPurchaseHistory' as never)}
          style={({ pressed }) => [styles.purchasesCard, pressed && styles.purchasesPressed]}>
          <View style={styles.purchasesIconCircle}>
            <Text style={styles.purchasesEmoji}>🧾</Text>
          </View>
          <View style={styles.purchasesTextBlock}>
            <Text style={styles.purchasesTitle}>My Purchases</Text>
            <Text style={styles.purchasesSubtitle}>View your order history</Text>
          </View>
          <Text style={styles.purchasesChevron}>›</Text>
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
