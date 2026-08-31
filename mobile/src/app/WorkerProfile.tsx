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

type ProfileRowProps = {
  androidIcon: 'mail' | 'phone' | 'eco' | 'location_on';
  iosIcon: 'envelope.fill' | 'phone.fill' | 'leaf.fill' | 'location.fill';
  label: string;
  value: string;
};

function ProfileRow({ androidIcon, iosIcon, label, value }: ProfileRowProps) {
  return (
    <View style={styles.profileRow}>
      <View style={styles.rowIcon}>
        <SymbolView
          name={{ android: androidIcon, ios: iosIcon, web: androidIcon }}
          size={21}
          tintColor="#176D34"
        />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
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

          <View style={styles.profileCard}>
            <View style={styles.identitySection}>
              <View style={styles.avatar}>
                <SymbolView
                  name={{ android: 'account_circle', ios: 'person.crop.circle.fill', web: 'account_circle' }}
                  size={88}
                  tintColor="#176D34"
                />
              </View>
            </View>

            <View style={styles.informationCard}>
              <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={styles.fullName}>
                {profile.full_name || 'AgriVerse Worker'}
              </Text>

              <View style={styles.profileRows}>
                <ProfileRow
                  androidIcon="mail"
                  iosIcon="envelope.fill"
                  label="Email"
                  value={session?.user.email || 'Not provided'}
                />
                <ProfileRow
                  androidIcon="phone"
                  iosIcon="phone.fill"
                  label="Phone"
                  value={profile.mobile_number || 'Not provided'}
                />
                <ProfileRow
                  androidIcon="eco"
                  iosIcon="leaf.fill"
                  label="Worker Type"
                  value={formatWorkerCategory(profile.worker_category)}
                />
                <ProfileRow
                  androidIcon="location_on"
                  iosIcon="location.fill"
                  label="Address"
                  value={address || 'Not provided'}
                />
              </View>
            </View>
          </View>

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
              <ActivityIndicator color="#176D34" size="small" />
            ) : (
              <SymbolView
                name={{
                  android: 'logout',
                  ios: 'rectangle.portrait.and.arrow.right',
                  web: 'logout',
                }}
                size={21}
                tintColor="#176D34"
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
