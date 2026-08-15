import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { styles } from '@/styles/change-password.styles';

export default function ConfirmNameScreen() {
  const { confirmName, profile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Confirm your information</Text>
          <Text style={styles.subtitle}>
            Check the name provided by your administrator. Correct it if needed, then continue.
          </Text>

          <Text style={styles.label}>Full name</Text>
          <TextInput
            autoCapitalize="words"
            autoComplete="name"
            editable={!submitting}
            maxLength={100}
            onChangeText={setFullName}
            style={styles.input}
            value={fullName}
          />

          <Text style={styles.label}>Worker category</Text>
          <TextInput
            editable={false}
            style={[styles.input, styles.readOnly]}
            value={profile?.worker_category || 'Not assigned'}
          />
          <Text style={styles.requirements}>
            Your worker category is managed by your administrator and cannot be changed here.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={submitting} onPress={submit} style={styles.button}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Confirm and Continue</Text>}
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
