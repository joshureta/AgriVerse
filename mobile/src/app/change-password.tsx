import { styles } from '@/styles/change-password.styles';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth-context';
import { postAuthenticationRoute } from '@/lib/mobile-routing';

export default function ChangePasswordScreen() {
  const { changeInitialPassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (
      password.length < 8
      || !/[A-Z]/.test(password)
      || !/\d/.test(password)
      || !/[^A-Za-z0-9]/.test(password)
    ) {
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Change your password</Text>
          <Text style={styles.subtitle}>
            Replace the temporary password before continuing to AgriVerse.
          </Text>

          <Text style={styles.label}>New password</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!submitting}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!submitting}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
          />

          <Text style={styles.requirements}>
            At least 8 characters, one uppercase letter, one number, and one special character.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={submitting} onPress={submit} style={styles.button}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Change Password</Text>}
          </Pressable>

          <Pressable
            disabled={submitting}
            onPress={async () => {
              await signOut();
              router.replace('/login');
            }}
            style={styles.signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
