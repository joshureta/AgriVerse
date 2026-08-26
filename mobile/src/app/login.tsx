import { styles } from '@/styles/login.styles';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { postAuthenticationRoute } from '@/lib/mobile-routing';

export default function LoginScreen({ embedded = false, onSignUp }: { embedded?: boolean; onSignUp?: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <SafeAreaView style={[styles.safeArea, embedded && styles.embeddedSafeArea]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, embedded && styles.embeddedCard]}>
            <View style={styles.headingGroup}>
              <Text style={styles.kicker}>Welcome back</Text>
              <Text style={styles.title}>Sign in to your{`\n`}account</Text>
              <Text style={styles.subtitle}>Enter your account details.</Text>
            </View>

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

            <Text style={styles.label}>Email address</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#7f8982"
              style={styles.input}
              value={email}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                autoCapitalize="none"
                autoComplete="current-password"
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#7f8982"
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
                value={password}
              />
              <Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} accessibilityRole="button" hitSlop={8} onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </Pressable>
            </View>

            <Pressable disabled={submitting} onPress={submit} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, submitting && styles.buttonDisabled]}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
            </Pressable>

            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Don't have an account? </Text>
              <Pressable accessibilityRole="link" hitSlop={8} onPress={onSignUp ?? (() => router.replace('/signup'))}>
                <Text style={styles.registerLink}>Sign up</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
