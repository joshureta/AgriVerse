import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';

import { useAuth } from '@/context/auth-context';
import { postAuthenticationRoute } from '@/lib/mobile-routing';
import { styles } from '@/styles/change-password.styles';

export default function LocationInformationScreen() {
  const { completeLocation, profile, signOut } = useAuth();
  const [region, setRegion] = useState(profile?.region || '');
  const [province, setProvince] = useState(profile?.province || '');
  const [cityMunicipality, setCityMunicipality] = useState(profile?.city_municipality || '');
  const [barangay, setBarangay] = useState(profile?.barangay || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!region.trim() || !cityMunicipality.trim() || !barangay.trim()) {
      setError('Region, city or municipality, and barangay are required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const updatedProfile = await completeLocation({
        region: region.trim(),
        province: province.trim(),
        city_municipality: cityMunicipality.trim(),
        barangay: barangay.trim(),
      });
      router.replace(postAuthenticationRoute(updatedProfile));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your location.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Location information</Text>
          <Text style={styles.subtitle}>
            Enter your home address. AgriVerse will not request your device location.
          </Text>

          <Text style={styles.label}>Country</Text>
          <TextInput editable={false} style={[styles.input, styles.readOnly]} value="Philippines" />

          <Text style={styles.label}>Region</Text>
          <TextInput
            autoCapitalize="words"
            editable={!submitting}
            maxLength={120}
            onChangeText={setRegion}
            placeholder="e.g. Region X"
            style={styles.input}
            value={region}
          />

          <Text style={styles.label}>Province (optional)</Text>
          <TextInput
            autoCapitalize="words"
            editable={!submitting}
            maxLength={120}
            onChangeText={setProvince}
            placeholder="e.g. Misamis Oriental"
            style={styles.input}
            value={province}
          />

          <Text style={styles.label}>City / Municipality</Text>
          <TextInput
            autoCapitalize="words"
            editable={!submitting}
            maxLength={120}
            onChangeText={setCityMunicipality}
            placeholder="Enter city or municipality"
            style={styles.input}
            value={cityMunicipality}
          />

          <Text style={styles.label}>Barangay</Text>
          <TextInput
            autoCapitalize="words"
            editable={!submitting}
            maxLength={120}
            onChangeText={setBarangay}
            placeholder="Enter barangay"
            style={styles.input}
            value={barangay}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={submitting} onPress={submit} style={styles.button}>
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Complete Onboarding</Text>}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
