import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  Lock,
  LogOut,
  ShieldCheck,
  Sprout,
  Truck,
  User,
  X,
} from 'lucide-react-native';

import { ConvexDomeCap } from '@/components/convex-dome-cap';
import { OnboardingStepper } from '@/components/onboarding-stepper';
import { useAuth } from '@/context/auth-context';
import { postAuthenticationRoute } from '@/lib/mobile-routing';
import { styles } from '@/styles/change-password.styles';

function formatWorkerCategory(category?: string | null): string {
  if (!category) return 'Crop Management Worker';
  const mapping: Record<string, string> = {
    crop_management_worker: 'Crop Management Worker',
    driver: 'Logistics Driver',
    seller: 'Seller / Commercial',
  };
  const normalized = category.trim().toLowerCase();
  if (mapping[normalized]) return mapping[normalized];

  return category
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function ConfirmNameScreen() {
  const { confirmName, profile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isFocused, setIsFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  // Compute initials for avatar preview
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'WK';

  const isDriver =
    profile?.worker_category?.toLowerCase().includes('driver') ||
    profile?.worker_category?.toLowerCase().includes('logistics');

  async function submit() {
    const name = fullName.trim();
    if (name.length < 2) {
      setError('Enter your complete name before continuing.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const updatedProfile = await confirmName(name);
      router.replace(postAuthenticationRoute(updatedProfile));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to confirm your name.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Top Pineapple Farm Hero Banner */}
      <ImageBackground
        source={require('@/assets/images/auth-banner-haze-v2.png')}
        resizeMode="cover"
        style={styles.background}>
        <View style={styles.backgroundFade} />
      </ImageBackground>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        {/* Banner Brand Header with Back Button */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerNavRow}>
            <Pressable
              hitSlop={8}
              onPress={() => router.replace('/change-password')}
              style={styles.bannerBackBtn}>
              <ChevronLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.bannerBackBtnText}>Back</Text>
            </Pressable>

            <View style={styles.bannerBrandRow}>
              <View style={styles.bannerLogo}>
                <ShieldCheck size={18} color="#FFFFFF" strokeWidth={2.5} />
              </View>
              <View>
                <Text style={styles.bannerKicker}>TOLEDO TRADING</Text>
                <Text style={styles.bannerTitle}>Worker Onboarding</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Elevated Form Card Sheet */}
        <View style={styles.cardContainer}>
          <View style={styles.domeCap}>
            <ConvexDomeCap color="#FFFFFF" height={52} />
          </View>

          <View style={styles.card}>
            {/* Bottom-left leaf illustration */}
            <View pointerEvents="none" style={styles.leafContainer}>
              <Image
                source={require('@/assets/images/sign-in-up-bg.png')}
                style={styles.leafImage}
                resizeMode="cover"
              />
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              
              {/* Stepper Progress Indicator */}
              <OnboardingStepper
                currentStep={2}
                onStepPress={(step) => {
                  if (step === 1) router.replace('/change-password');
                }}
              />

              {/* Header Title & Subtitle */}
              <View style={styles.headerGroup}>
                <Text style={styles.title}>Confirm your information</Text>
                <Text style={styles.subtitle}>
                  Check the name provided by your administrator. Correct it if needed, then continue.
                </Text>
              </View>

              {/* Worker Profile Badge Card */}
              <View style={styles.avatarCard}>
                <View style={styles.avatarInitials}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.avatarInfo}>
                  <Text style={styles.avatarName}>
                    {fullName.trim() || 'Worker Personnel'}
                  </Text>
                  <Text style={styles.avatarRole}>Active Field Personnel</Text>
                </View>
                <View style={styles.avatarBadge}>
                  <Text style={styles.avatarBadgeText}>Step 2 of 3</Text>
                </View>
              </View>

              {/* Full Name Input */}
              <Text style={styles.label}>Full name</Text>
              <View
                style={[
                  styles.inputRow,
                  isFocused && styles.inputRowFocused,
                ]}>
                <User
                  size={18}
                  color={isFocused ? '#18753a' : '#94A3B8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!submitting}
                  maxLength={100}
                  onBlur={() => setIsFocused(false)}
                  onChangeText={(val) => {
                    setFullName(val);
                    if (error) setError('');
                  }}
                  onFocus={() => setIsFocused(true)}
                  placeholder="Enter your complete full name"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                  value={fullName}
                />
                {fullName.length > 0 && !submitting ? (
                  <Pressable
                    onPress={() => setFullName('')}
                    style={styles.eyeButton}>
                    <X size={16} color="#94A3B8" />
                  </Pressable>
                ) : null}
              </View>

              {/* Worker Category Locked Badge Card */}
              <Text style={styles.label}>Worker category</Text>
              <View style={styles.categoryCard}>
                <View style={styles.categoryLeft}>
                  <View style={styles.categoryIconWrapper}>
                    {isDriver ? (
                      <Truck size={20} color="#166534" strokeWidth={2.2} />
                    ) : (
                      <Sprout size={20} color="#166534" strokeWidth={2.2} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryTitle}>
                      {formatWorkerCategory(profile?.worker_category)}
                    </Text>
                    <Text style={styles.categoryDesc}>
                      {isDriver
                        ? 'Produce dispatch & delivery logistics'
                        : 'Crop planting, maintenance & harvest'}
                    </Text>
                  </View>
                </View>
                <View style={styles.categoryBadge}>
                  <Check size={12} color="#166534" strokeWidth={3} />
                  <Text style={styles.categoryBadgeText}>Verified</Text>
                </View>
              </View>
              <Text style={styles.categoryHelpText}>
                Your worker category is managed by your administrator and cannot be changed here.
              </Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {/* Submit Button */}
              <Pressable
                disabled={submitting}
                onPress={submit}
                style={[styles.button, submitting && styles.buttonDisabled]}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Confirm and Continue</Text>
                )}
              </Pressable>

              {/* Back to Previous Step button */}
              <Pressable
                disabled={submitting}
                onPress={() => router.replace('/change-password')}
                style={styles.backStepButton}>
                <ArrowLeft size={16} color="#166534" strokeWidth={2.5} />
                <Text style={styles.backStepButtonText}>Back to Previous Step</Text>
              </Pressable>

              {/* Sign out link */}
              <Pressable
                disabled={submitting}
                onPress={async () => {
                  await signOut();
                  router.replace('/login');
                }}
                style={styles.signOut}>
                <LogOut size={15} color="#64748B" />
                <Text style={styles.signOutText}>Sign out</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
