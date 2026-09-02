import { SymbolView } from 'expo-symbols';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { useAuth } from '@/context/auth-context';
import { styles } from '@/styles/worker-profile.styles';

function InfoRow({ icon, text, bold }: { icon: string; text: string; bold?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={bold ? styles.infoNameText : styles.infoText}>{text}</Text>
    </View>
  );
}

function formatWorkerCategory(category: string | null) {
  if (!category) return 'Crop Management Worker';

  return category
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function WorkerProfileScreen() {
  const { width } = useWindowDimensions();
  const { loading, profile, session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const horizontalPadding = width < 360 ? 14 : 18;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#176D34" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) return <Redirect href="/login" />;

  const isDriver = profile.worker_category === 'driver';
  const address = [
    profile.barangay,
    profile.city_municipality,
    profile.province,
    profile.region,
    profile.country,
  ]
    .filter(Boolean)
    .join(', ');

  async function handleLogout() {
    if (signingOut) return;

    setSigningOut(true);
    try {
      await signOut();
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
      <WorkerHeader />

      <View style={styles.mainBodyContainer}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>My Profile</Text>

          <View style={styles.card}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                <View style={styles.avatarHead} />
                <View style={styles.avatarBody} />
              </View>
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeEmoji}>{isDriver ? '🚚' : '🌾'}</Text>
              </View>
            </View>

            <InfoRow icon="👤" text={profile.full_name || 'AgriVerse Worker'} bold />
            <InfoRow icon="✉️" text={session?.user.email || 'Not provided'} />
            <InfoRow icon="📞" text={profile.mobile_number || 'Not provided'} />
            <InfoRow icon="🌿" text={formatWorkerCategory(profile.worker_category)} />
            <InfoRow icon="📍" text={address || 'Not provided'} />
          </View>

          <Pressable
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
            style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Sign out"
            accessibilityRole="button"
            disabled={signingOut}
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.logoutButtonPressed,
              signingOut && styles.logoutButtonDisabled,
            ]}>
            {signingOut ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <SymbolView
                name={{
                  android: 'logout',
                  ios: 'rectangle.portrait.and.arrow.right',
                  web: 'logout',
                }}
                size={20}
                tintColor="#ffffff"
              />
            )}
            <Text style={styles.logoutText}>{signingOut ? 'Signing out…' : 'Sign Out'}</Text>
          </Pressable>
        </ScrollView>
      </View>

      <WorkerBottomNavigation activeTab="profile" />
    </SafeAreaView>
  );
}
