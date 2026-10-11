import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  ShieldCheck,
} from 'lucide-react-native';

import { ConvexDomeCap } from '@/components/convex-dome-cap';
import { OnboardingStepper } from '@/components/onboarding-stepper';
import { useAuth } from '@/context/auth-context';
import { postAuthenticationRoute } from '@/lib/mobile-routing';
import { styles } from '@/styles/change-password.styles';

export default function ChangePasswordScreen() {
  const { changeInitialPassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'new' | 'confirm' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Password requirement tests
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const passedCount = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthScore = passedCount === 0 ? 0 : passedCount <= 2 ? 1 : passedCount === 3 ? 2 : 3;

  const strengthLabels = ['Too Weak', 'Weak', 'Good', 'Strong'];
  const strengthColors = ['#94A3B8', '#D97706', '#2563EB', '#166534'];

  async function submit() {
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecial) {
      setError(
        'Password must contain at least 8 characters, an uppercase letter, a number, and a special character.',
      );
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const profile = await changeInitialPassword(password);
      router.replace(postAuthenticationRoute(profile));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to change password.');
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
        {/* Banner Brand Header */}
        <View style={styles.bannerContainer}>
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
              <OnboardingStepper currentStep={1} />

              {/* Header Title & Subtitle */}
              <View style={styles.headerGroup}>
                <Text style={styles.title}>Change your password</Text>
                <Text style={styles.subtitle}>
                  Replace the temporary password before continuing to AgriVerse.
                </Text>
              </View>

              {/* New Password */}
              <Text style={styles.label}>New password</Text>
              <View
                style={[
                  styles.inputRow,
                  focusedField === 'new' && styles.inputRowFocused,
                ]}>
                <LockKeyhole
                  size={18}
                  color={focusedField === 'new' ? '#18753a' : '#94A3B8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!submitting}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocusedField('new')}
                  placeholder="Enter new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}>
                  {showPassword ? (
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </Pressable>
              </View>

              {/* Confirm Password */}
              <Text style={styles.label}>Confirm password</Text>
              <View
                style={[
                  styles.inputRow,
                  focusedField === 'confirm' && styles.inputRowFocused,
                ]}>
                <LockKeyhole
                  size={18}
                  color={focusedField === 'confirm' ? '#18753a' : '#94A3B8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!submitting}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (error) setError('');
                  }}
                  onFocus={() => setFocusedField('confirm')}
                  placeholder="Re-type new password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.input}
                  value={confirmPassword}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}>
                  {showConfirmPassword ? (
                    <EyeOff size={18} color="#64748B" />
                  ) : (
                    <Eye size={18} color="#64748B" />
                  )}
                </Pressable>
              </View>

              {/* Password Strength Card & Requirement Checklist */}
              <View style={styles.strengthCard}>
                <View style={styles.strengthHeader}>
                  <Text style={styles.strengthLabel}>Password Strength</Text>
                  <Text
                    style={[
                      styles.strengthScore,
                      { color: strengthColors[strengthScore] },
                    ]}>
                    {strengthLabels[strengthScore]}
                  </Text>
                </View>

                {/* 4-bar indicator */}
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((idx) => {
                    const isFilled = idx <= passedCount;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.strengthBarSegment,
                          isFilled && {
                            backgroundColor: strengthColors[strengthScore],
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                {/* Requirement items */}
                <View style={styles.requirementGrid}>
                  <View style={styles.requirementItem}>
                    <Check
                      size={13}
                      color={hasMinLength ? '#166534' : '#CBD5E1'}
                      strokeWidth={3}
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        hasMinLength && styles.requirementTextMet,
                      ]}>
                      8+ characters
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Check
                      size={13}
                      color={hasUppercase ? '#166534' : '#CBD5E1'}
                      strokeWidth={3}
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        hasUppercase && styles.requirementTextMet,
                      ]}>
                      Uppercase letter
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Check
                      size={13}
                      color={hasNumber ? '#166534' : '#CBD5E1'}
                      strokeWidth={3}
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        hasNumber && styles.requirementTextMet,
                      ]}>
                      One number
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Check
                      size={13}
                      color={hasSpecial ? '#166534' : '#CBD5E1'}
                      strokeWidth={3}
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        hasSpecial && styles.requirementTextMet,
                      ]}>
                      Special character
                    </Text>
                  </View>
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {/* Submit Button */}
              <Pressable
                disabled={submitting}
                onPress={submit}
                style={[styles.button, submitting && styles.buttonDisabled]}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Change Password</Text>
                )}
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
