import { router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
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
  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader />

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
      </ScrollView>

      <BuyerBottomNavigation activeTab="account" />
    </SafeAreaView>
  );
}
