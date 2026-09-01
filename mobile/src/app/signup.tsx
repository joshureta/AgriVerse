import { styles } from '@/styles/signup.styles';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';
import { publicApiRequest } from '@/lib/api';
import { postAuthenticationRoute } from '@/lib/mobile-routing';
import {
  PsgcItem,
  getCityMunicipalityBarangays,
  getProvinceCitiesMunicipalities,
  getRegionCitiesMunicipalities,
  getRegionProvinces,
  getRegions,
} from '@/lib/psgc';

type WorkerCategory = 'driver' | 'crop_management_worker' | 'seller';
type Choice = { code: string; name: string };

const steps = ['Personal info', 'Security', 'Location'];
const workerCategories: Choice[] = [
  { code: 'crop_management_worker', name: 'Crop Management Worker' },
  { code: 'driver', name: 'Driver' },
  { code: 'seller', name: 'Seller' },
];

function FormField({ label, value, onChangeText, placeholder, ...inputProps }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
} & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...inputProps} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#879080" style={styles.input} value={value} /></View>;
}

function ChoiceField({ label, value, placeholder, disabled, onPress }: { label: string; value?: string; placeholder: string; disabled?: boolean; onPress: () => void }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable disabled={disabled} onPress={onPress} style={[styles.choiceField, disabled && styles.choiceDisabled]}><Text numberOfLines={1} style={[styles.choiceText, !value && styles.choicePlaceholder]}>{value || placeholder}</Text><Text style={styles.choiceChevron}>⌄</Text></Pressable></View>;
}

function ChoiceModal({ title, items, visible, onClose, onSelect }: { title: string; items: Choice[]; visible: boolean; onClose: () => void; onSelect: (item: Choice) => void }) {
  return <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
    <Pressable onPress={onClose} style={styles.modalBackdrop}>
      <Pressable style={styles.modalCard}>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{title}</Text><Pressable hitSlop={12} onPress={onClose}><Text style={styles.modalClose}>×</Text></Pressable></View>
        <ScrollView style={styles.modalList}>{items.map((item) => <Pressable key={item.code} onPress={() => onSelect(item)} style={styles.modalOption}><Text style={styles.modalOptionText}>{item.name}</Text></Pressable>)}</ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}

export default function SignUpScreen({ embedded = false, onSignIn }: { embedded?: boolean; onSignIn?: () => void }) {
  const { signIn } = useAuth();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [workerCategory, setWorkerCategory] = useState<WorkerCategory | ''>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [regions, setRegions] = useState<PsgcItem[]>([]);
  const [provinces, setProvinces] = useState<PsgcItem[]>([]);
  const [cities, setCities] = useState<PsgcItem[]>([]);
  const [barangays, setBarangays] = useState<PsgcItem[]>([]);
  const [region, setRegion] = useState<PsgcItem | null>(null);
  const [province, setProvince] = useState<PsgcItem | null>(null);
  const [city, setCity] = useState<PsgcItem | null>(null);
  const [barangay, setBarangay] = useState<PsgcItem | null>(null);
  const [choice, setChoice] = useState<{ title: string; items: Choice[]; select: (item: Choice) => void } | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const passwordChecks = useMemo(() => [
    { label: '8+ characters', met: password.length >= 8 },
    { label: '1 uppercase letter', met: /[A-Z]/.test(password) },
    { label: '1 number', met: /\d/.test(password) },
    { label: '1 special character', met: /[^A-Za-z0-9]/.test(password) },
  ], [password]);
  const passwordScore = passwordChecks.filter((check) => check.met).length;
  const provinceNotApplicable = Boolean(region && !loadingAddress && provinces.length === 0);

  useEffect(() => {
    setLoadingAddress(true);
    getRegions().then(setRegions).catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load regions.')).finally(() => setLoadingAddress(false));
  }, []);

  async function selectRegion(item: Choice) {
    const selected = item as PsgcItem;
    setChoice(null); setRegion(selected); setProvince(null); setCity(null); setBarangay(null); setProvinces([]); setCities([]); setBarangays([]); setLoadingAddress(true); setError('');
    try {
      const [nextProvinces, regionCities] = await Promise.all([getRegionProvinces(selected.code), getRegionCitiesMunicipalities(selected.code)]);
      setProvinces(nextProvinces);
      if (!nextProvinces.length) setCities(regionCities);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load the selected region.'); }
    finally { setLoadingAddress(false); }
  }

  async function selectProvince(item: Choice) {
    const selected = item as PsgcItem;
    setChoice(null); setProvince(selected); setCity(null); setBarangay(null); setCities([]); setBarangays([]); setLoadingAddress(true); setError('');
    try { setCities(await getProvinceCitiesMunicipalities(selected.code)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load cities and municipalities.'); }
    finally { setLoadingAddress(false); }
  }

  async function selectCity(item: Choice) {
    const selected = item as PsgcItem;
    setChoice(null); setCity(selected); setBarangay(null); setBarangays([]); setLoadingAddress(true); setError('');
    try { setBarangays(await getCityMunicipalityBarangays(selected.code)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load barangays.'); }
    finally { setLoadingAddress(false); }
  }

  function validateStep() {
    setError('');
    if (step === 0) {
      if (fullName.trim().length < 2) return setError('Enter your full name.'), false;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email address.'), false;
      if (!mobileNumber.trim()) return setError('Enter your mobile number.'), false;
      if (!workerCategory) return setError('Select your farm worker category.'), false;
    }
    if (step === 1) {
      if (passwordScore !== passwordChecks.length) return setError('Create a password that meets all four security requirements.'), false;
      if (password !== confirmPassword) return setError('Passwords do not match.'), false;
    }
    if (step === 2) {
      if (!region || (!provinceNotApplicable && !province) || !city || !barangay) return setError('Complete all guided address fields.'), false;
      if (!termsAccepted) return setError('Accept the Terms of Service and Privacy Policy to continue.'), false;
    }
    return true;
  }

  async function submit() {
    if (!validateStep() || !region || !city || !barangay || !workerCategory) return;
    setSubmitting(true); setError('');
    try {
      await publicApiRequest('/api/mobile/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), mobile_number: mobileNumber.trim(), password, worker_category: workerCategory, region: region.name, province: province?.name ?? null, city_municipality: city.name, barangay: barangay.name }),
      });
      const profile = await signIn(email.trim(), password);
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace(postAuthenticationRoute(profile));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create your account.'); }
    finally { setSubmitting(false); }
  }

  function next() { if (validateStep()) setStep((current) => Math.min(2, current + 1)); }

  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, embedded && styles.embeddedSafeArea]}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, embedded && styles.embeddedCard]}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Complete three quick steps to get started.</Text>
          <View accessibilityLabel={`Step ${step + 1} of 3: ${steps[step]}`} style={styles.stepper}>{steps.map((label, index) => <View key={label} style={styles.stepItem}><View style={[styles.stepCircle, index <= step && styles.stepCircleActive]}><Text style={[styles.stepNumber, index <= step && styles.stepNumberActive]}>{index < step ? '✓' : index + 1}</Text></View><Text style={[styles.stepLabel, index === step && styles.stepLabelActive]}>{label}</Text>{index < 2 ? <View style={[styles.stepLine, index < step && styles.stepLineActive]} /> : null}</View>)}</View>

          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          {step === 0 ? <View><Text style={styles.sectionTitle}>Personal information</Text>
            <FormField autoCapitalize="words" autoComplete="name" label="Full name" onChangeText={setFullName} placeholder="Enter your full name" value={fullName} />
            <FormField autoCapitalize="none" autoComplete="email" keyboardType="email-address" label="Email address" onChangeText={setEmail} placeholder="you@example.com" value={email} />
            <FormField autoComplete="tel" keyboardType="phone-pad" label="Mobile number" maxLength={30} onChangeText={setMobileNumber} placeholder="+63 900 000 0000" value={mobileNumber} />
            <ChoiceField label="Farm worker category" onPress={() => setChoice({ title: 'Select worker category', items: workerCategories, select: (item) => { setWorkerCategory(item.code as WorkerCategory); setChoice(null); } })} placeholder="Select worker category" value={workerCategories.find((item) => item.code === workerCategory)?.name} />
          </View> : null}

          {step === 1 ? <View><Text style={styles.sectionTitle}>Security</Text>
            <View style={styles.field}><Text style={styles.label}>Password</Text><View style={styles.passwordRow}><TextInput autoCapitalize="none" autoComplete="new-password" onChangeText={setPassword} placeholder="Create a strong password" placeholderTextColor="#879080" secureTextEntry={!showPassword} style={styles.passwordInput} value={password} /><Pressable onPress={() => setShowPassword((visible) => !visible)} style={styles.showButton}><Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text></Pressable></View></View>
            <FormField autoCapitalize="none" autoComplete="new-password" label="Confirm password" onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry={!showPassword} value={confirmPassword} />
            <View style={styles.strengthBars}>{passwordChecks.map((check) => <View key={check.label} style={[styles.strengthBar, check.met && styles.strengthBarMet]} />)}</View>
            <Text style={styles.strengthText}>Password strength: {['Not set', 'Weak', 'Fair', 'Good', 'Strong'][passwordScore]}</Text>
            {passwordChecks.map((check) => <Text key={check.label} style={[styles.requirement, check.met && styles.requirementMet]}>{check.met ? '✓' : '○'} {check.label}</Text>)}
          </View> : null}

          {step === 2 ? <View><Text style={styles.sectionTitle}>Location</Text>
            <ChoiceField disabled label="Country" onPress={() => undefined} placeholder="Philippines" value="Philippines" />
            <ChoiceField disabled={loadingAddress} label="Region" onPress={() => setChoice({ title: 'Select region', items: regions, select: selectRegion })} placeholder={loadingAddress && !regions.length ? 'Loading regions…' : 'Select region'} value={region?.name} />
            <ChoiceField disabled={!region || loadingAddress || provinceNotApplicable} label="Province" onPress={() => setChoice({ title: 'Select province', items: provinces, select: selectProvince })} placeholder={provinceNotApplicable ? 'Not applicable' : 'Select province'} value={provinceNotApplicable ? 'Not applicable' : province?.name} />
            <ChoiceField disabled={!region || (!provinceNotApplicable && !province) || loadingAddress} label="City / Municipality" onPress={() => setChoice({ title: 'Select city or municipality', items: cities, select: selectCity })} placeholder="Select city or municipality" value={city?.name} />
            <ChoiceField disabled={!city || loadingAddress} label="Barangay" onPress={() => setChoice({ title: 'Select barangay', items: barangays, select: (item) => { setBarangay(item as PsgcItem); setChoice(null); } })} placeholder="Select barangay" value={barangay?.name} />
            {loadingAddress ? <ActivityIndicator color="#19713a" style={styles.addressLoader} /> : null}
            <Pressable onPress={() => setTermsAccepted((accepted) => !accepted)} style={styles.consent}><View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}><Text style={styles.checkmark}>{termsAccepted ? '✓' : ''}</Text></View><Text style={styles.consentText}>I agree to the <Text style={styles.consentStrong}>Terms of Service</Text> and <Text style={styles.consentStrong}>Privacy Policy</Text>.</Text></Pressable>
          </View> : null}

          <View style={styles.actions}>{step > 0 ? <Pressable disabled={submitting} onPress={() => { setError(''); setStep((current) => current - 1); }} style={styles.backButton}><Text style={styles.backButtonText}>Back</Text></Pressable> : null}<Pressable disabled={submitting} onPress={step === 2 ? submit : next} style={[styles.continueButton, submitting && styles.buttonDisabled]}>{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.continueButtonText}>{step === 2 ? 'Create Account' : 'Continue'}</Text>}</Pressable></View>
          <View style={styles.signInRow}><Text style={styles.signInPrompt}>Already have an account? </Text><Pressable hitSlop={10} onPress={onSignIn ?? (() => router.replace('/login'))}><Text style={styles.signInLink}>Sign in</Text></Pressable></View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    <ChoiceModal items={choice?.items ?? []} onClose={() => setChoice(null)} onSelect={(item) => choice?.select(item)} title={choice?.title ?? ''} visible={Boolean(choice)} />
  </SafeAreaView>;
}
