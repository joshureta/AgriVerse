import { styles } from '@/styles/login.styles';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { ConvexDomeCap } from '@/components/convex-dome-cap';
import { useAuth } from '@/context/auth-context';
import { postAuthenticationRoute } from '@/lib/mobile-routing';

export default function LoginScreen({ embedded = false, onSignUp }: { embedded?: boolean; onSignUp?: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const profile = await signIn(email.trim(), password);
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace(postAuthenticationRoute(profile));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleForgotPassword() {
    Alert.alert(
      'Reset Password',
      'Please contact your Toledo Trading farm administrator or dispatch supervisor to reset your account password.',
      [{ text: 'OK' }]
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, embedded && styles.embeddedSafeArea]}>
      <StatusBar style="dark" />
      {!embedded ? (
        <ImageBackground
          source={require('@/assets/images/auth-banner-haze-v2.png')}
          resizeMode="cover"
          style={styles.background}>
          <View style={styles.backgroundFade} />
        </ImageBackground>
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={!embedded}
        style={styles.flex}>
        <View style={[styles.cardContainer, embedded && styles.embeddedCardContainer]}>
          {!embedded ? (
            <View style={styles.domeCap}>
              <ConvexDomeCap color="#FFFFFF" height={34} />
            </View>
          ) : null}
          <View style={[styles.card, embedded && styles.embeddedCard]}>
            {/* Bottom-left leaf decoration matching web */}
            <View pointerEvents="none" style={styles.leafContainer}>
              <Image
                source={require('@/assets/images/sign-in-up-bg.png')}
                style={styles.leafImage}
                resizeMode="cover"
              />
            </View>

            {/* FIXED HEADER: Remains intact and does not scroll */}
            <View style={[styles.fixedHeader, embedded && styles.embeddedFixedHeader]}>
              <Text style={styles.kicker}>Welcome back</Text>
              <Text style={styles.title}>Sign in to your{`\n`}account</Text>
              <Text style={styles.subtitle}>Enter your Toledo Trading credentials to continue.</Text>
            </View>

            {/* SCROLLABLE CONTENT: Only content below header scrolls */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollArea}
              contentContainerStyle={[styles.scrollContent, embedded && styles.embeddedScrollContent]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}>
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

              <Text style={styles.label}>Email address</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onFocus={() => {
                  setFocusedField('email');
                  scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                }}
                onBlur={() => setFocusedField(null)}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#7f8982"
                style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                value={email}
              />

              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordRow, focusedField === 'password' && styles.passwordRowFocused]}>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="current-password"
                  onFocus={() => {
                    setFocusedField('password');
                    scrollViewRef.current?.scrollTo({ y: 55, animated: true });
                  }}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#7f8982"
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                  value={password}
                />
                <Pressable
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setShowPassword((value) => !value)}
                  style={styles.eyeButton}>
                  <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>

              {/* Remember me & Forgot password row */}
              <View style={styles.optionsRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                  hitSlop={6}
                  onPress={() => setRememberMe(!rememberMe)}
                  style={styles.rememberRow}>
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe ? <Text style={styles.checkboxCheckmark}>✓</Text> : null}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </Pressable>

                <Pressable accessibilityRole="button" hitSlop={6} onPress={handleForgotPassword}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>

              {/* Primary Signature Gradient CTA Button */}
              <Pressable
                disabled={submitting}
                onPress={submit}
                style={({ pressed }) => [
                  styles.buttonWrapper,
                  pressed && styles.buttonPressed,
                  submitting && styles.buttonDisabled,
                ]}>
                <LinearGradient
                  colors={['#3D9B43', '#185C35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}>
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <View style={styles.registerRow}>
                <Text style={styles.registerPrompt}>Don't have an account? </Text>
                <Pressable accessibilityRole="link" hitSlop={8} onPress={onSignUp ?? (() => router.replace('/signup'))}>
                  <Text style={styles.registerLink}>Sign up</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
