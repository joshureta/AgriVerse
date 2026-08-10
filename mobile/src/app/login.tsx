import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
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
      await signIn(email.trim(), password);
      router.replace('/WorkerTaskPending');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.brand}>
          <Image source={require('@/assets/images/agriverse-loading.png')} style={styles.logo} />
          <Text style={styles.brandName}>AgriVerse</Text>
          <Text style={styles.tagline}>Farm Worker Portal</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to view your assigned farm tasks.</Text>

          <Text style={styles.label}>Email address</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="worker@example.com"
            placeholderTextColor="#8c968b"
            style={styles.input}
            value={email}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#8c968b"
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
              value={password}
            />
            <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
              <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable disabled={submitting} onPress={submit} style={styles.button}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef6df' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 22 },
  logo: { width: 112, height: 112, resizeMode: 'contain' },
  brandName: { color: '#176c35', fontSize: 31, fontWeight: '900', marginTop: -8 },
  tagline: { color: '#5d765f', fontSize: 14, marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 24,
    shadowColor: '#173d20',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 5,
  },
  title: { color: '#174e2b', fontSize: 27, fontWeight: '800' },
  subtitle: { color: '#657269', fontSize: 14, lineHeight: 20, marginTop: 5, marginBottom: 22 },
  label: { color: '#1d3424', fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#cddbc7',
    backgroundColor: '#fbfcf8',
    borderRadius: 12,
    paddingHorizontal: 15,
    color: '#101a13',
    fontSize: 15,
  },
  passwordRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cddbc7',
    backgroundColor: '#fbfcf8',
    borderRadius: 12,
  },
  passwordInput: { flex: 1, color: '#101a13', fontSize: 15, paddingHorizontal: 15 },
  eyeButton: { paddingHorizontal: 14, height: '100%', justifyContent: 'center' },
  eyeText: { color: '#18753a', fontSize: 13, fontWeight: '800' },
  error: { color: '#bb2828', fontSize: 13, marginTop: 13, lineHeight: 18 },
  button: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18753a',
    borderRadius: 13,
    marginTop: 22,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
