import { styles } from '@/styles/signup.styles';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
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

import { ConvexDomeCap } from '@/components/convex-dome-cap';
import { useAuth } from '@/context/auth-context';
import { publicApiRequest } from '@/lib/api';
import { postAuthenticationRoute } from '@/lib/mobile-routing';
import {
  getCityMunicipalityBarangays,
  getProvinceCitiesMunicipalities,
  getRegionCitiesMunicipalities,
  getRegionProvinces,
  getRegions,
  PsgcItem,
} from '@/lib/psgc';

type WorkerCategory = 'driver' | 'crop_management_worker' | 'seller';
type Choice = { code: string; name: string };

const steps = ['Personal', 'Security', 'Location'];
const workerCategories: Choice[] = [
  { code: 'crop_management_worker', name: 'Crop Management Worker' },
  { code: 'driver', name: 'Driver' },
  { code: 'seller', name: 'Seller' },
];

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
} & React.ComponentProps<typeof TextInput>) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...inputProps}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7F8982"
        style={[styles.input, isFocused && styles.inputFocused]}
        value={value}
      />
    </View>
  );
}

function ChoiceField({
  label,
  value,
  placeholder,
  disabled,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable disabled={disabled} onPress={onPress} style={[styles.choiceField, disabled && styles.choiceDisabled]}>
        <Text numberOfLines={1} style={[styles.choiceText, !value && styles.choicePlaceholder]}>
          {value || placeholder}
        </Text>
        <Text style={styles.choiceChevron}>⌄</Text>
      </Pressable>
    </View>
  );
}

function ChoiceModal({
  choice,
  onClose,
}: {
  choice: { title: string; items: Choice[]; select: (item: Choice) => void } | null;
  onClose: () => void;
}) {
  if (!choice) return null;
  return (
    <Modal animationType="fade" transparent visible={Boolean(choice)}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{choice.title}</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Text style={styles.modalClose}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalList}>
            {choice.items.map((item) => (
              <Pressable
                key={item.code}
                onPress={() => choice.select(item)}
                style={styles.modalOption}>
                <Text style={styles.modalOptionText}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function SignUpScreen({
  embedded = false,
  onSignIn,
  onStepChange,
}: {
  embedded?: boolean;
  onSignIn?: () => void;
  onStepChange?: (step: number) => void;
}) {
  const { signIn } = useAuth();
  const [step, setStepState] = useState(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [workerCategory, setWorkerCategory] = useState<WorkerCategory>('crop_management_worker');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [regions, setRegions] = useState<PsgcItem[]>([]);
  const [provinces, setProvinces] = useState<PsgcItem[]>([]);
  const [cities, setCities] = useState<PsgcItem[]>([]);
  const [barangays, setBarangays] = useState<PsgcItem[]>([]);

  const [region, setRegion] = useState<PsgcItem | null>(null);
  const [province, setProvince] = useState<PsgcItem | null>(null);
  const [city, setCity] = useState<PsgcItem | null>(null);
  const [barangay, setBarangay] = useState<PsgcItem | null>(null);
  const [provinceNotApplicable, setProvinceNotApplicable] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState<{
    title: string;
    items: Choice[];
    select: (item: Choice) => void;
  } | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const setStep = (newStep: number | ((curr: number) => number)) => {
    setStepState((curr) => {
      const nextStep = typeof newStep === 'function' ? newStep(curr) : newStep;
      onStepChange?.(nextStep);
      return nextStep;
    });
  };

  useEffect(() => {
    getRegions()
      .then(setRegions)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Failed to load regions.'));
  }, []);

  async function selectRegion(selectedRegion: Choice) {
    setRegion(selectedRegion as PsgcItem);
    setProvince(null);
    setCity(null);
    setBarangay(null);
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    setProvinceNotApplicable(false);
    setChoice(null);
    setLoadingAddress(true);

    try {
      const provList = await getRegionProvinces(selectedRegion.code);
      setProvinces(provList);
      if (provList.length === 0) {
        setProvinceNotApplicable(true);
        const cityList = await getRegionCitiesMunicipalities(selectedRegion.code);
        setCities(cityList);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load provinces.');
    } finally {
      setLoadingAddress(false);
    }
  }

  async function selectProvince(selectedProvince: Choice) {
    setProvince(selectedProvince as PsgcItem);
    setCity(null);
    setBarangay(null);
    setCities([]);
    setBarangays([]);
    setChoice(null);
    setLoadingAddress(true);

    try {
      const cityList = await getProvinceCitiesMunicipalities(selectedProvince.code);
      setCities(cityList);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load cities.');
    } finally {
      setLoadingAddress(false);
    }
  }

  async function selectCity(selectedCity: Choice) {
    setCity(selectedCity as PsgcItem);
    setBarangay(null);
    setBarangays([]);
    setChoice(null);
    setLoadingAddress(true);

    try {
      const brgyList = await getCityMunicipalityBarangays(selectedCity.code);
      setBarangays(brgyList);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load barangays.');
    } finally {
      setLoadingAddress(false);
    }
  }

  const passwordChecks = useMemo(
    () => [
      { label: '8+ characters', met: password.length >= 8 },
      { label: '1 uppercase letter', met: /[A-Z]/.test(password) },
      { label: '1 number', met: /\d/.test(password) },
      { label: '1 special character', met: /[^A-Za-z0-9]/.test(password) },
    ],
    [password]
  );

  function validateStep() {
    setError('');
    if (step === 0) {
      if (!fullName.trim()) return setError('Enter your full name.'), false;
      if (!email.trim()) return setError('Enter your email address.'), false;
      if (!mobileNumber.trim()) return setError('Enter your mobile number.'), false;
    }
    if (step === 1) {
      if (!password) return setError('Create a password.'), false;
      if (passwordChecks.some((item) => !item.met))
        return setError('Password does not meet all security requirements.'), false;
      if (password !== confirmPassword) return setError('Passwords do not match.'), false;
    }
    if (step === 2) {
      if (!region) return setError('Select your region.'), false;
      if (!provinceNotApplicable && !province) return setError('Select your province.'), false;
      if (!city) return setError('Select your city or municipality.'), false;
      if (!barangay) return setError('Select your barangay.'), false;
      if (!termsAccepted) return setError('Please accept the Terms of Service and Privacy Policy.'), false;
    }
    return true;
  }

  async function submit() {
    if (!validateStep()) return;

    setSubmitting(true);
    setError('');
    try {
      const registrationPayload = {
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        role: 'worker' as const,
        workerCategory,
        country: 'Philippines',
        region: region?.name || '',
        province: provinceNotApplicable ? 'Not Applicable' : province?.name || '',
        cityMunicipality: city?.name || '',
        barangay: barangay?.name || '',
      };

      await publicApiRequest<{
        sessionToken: string;
        user: { id: string; email: string; role: 'worker' | 'driver' | 'buyer' | 'admin' };
      }>('/api/auth/register-mobile', {
        method: 'POST',
        body: JSON.stringify(registrationPayload),
      });

      const profile = await signIn(email.trim(), password);
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace(postAuthenticationRoute(profile));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (validateStep()) setStep((current) => Math.min(2, current + 1));
  }

  return (
    <SafeAreaView style={[styles.safeArea, embedded && styles.embeddedSafeArea]}>
      <StatusBar style="dark" />
      {!embedded ? (
        <ImageBackground
          source={require('@/assets/images/auth-banner-haze-v2.png')}
          resizeMode="cover"
          style={styles.background}>
          <View style={styles.backgroundTint} />
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
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Complete three quick steps to get started.</Text>

              {/* 3-STEP PROGRESS STEPPER */}
              <View accessibilityLabel={`Step ${step + 1} of 3: ${steps[step]}`} style={styles.stepper}>
                {steps.map((label, index) => {
                  const isCompleted = index < step;
                  const isActive = index === step;
                  const isReached = index <= step;

                  return (
                    <View key={label} style={styles.stepItem}>
                      <View style={styles.stepCircleWrapper}>
                        {isReached ? (
                          <LinearGradient
                            colors={['#3D9B43', '#185C35']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.stepCircleGradient}>
                            <Text style={[styles.stepNumber, styles.stepNumberActive]}>
                              {isCompleted ? '✓' : index + 1}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View style={styles.stepCircle}>
                            <Text style={styles.stepNumber}>{index + 1}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.stepLabel, (isActive || isCompleted) && styles.stepLabelActive]}>
                        {label}
                      </Text>
                      {index < 2 ? (
                        <View style={[styles.stepLine, isCompleted && styles.stepLineActive]} />
                      ) : null}
                    </View>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>
                {step === 0 ? 'Personal Details' : step === 1 ? 'Security Credentials' : 'Farm Region & Location'}
              </Text>
            </View>

            {/* SCROLLABLE AREA: Starts below the section title divider line */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollArea}
              contentContainerStyle={[styles.scrollContent, embedded && styles.embeddedScrollContent]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}>
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

              {/* STEP 1: PERSONAL INFORMATION */}
              {step === 0 ? (
                <View>
                  <FormField
                    autoCapitalize="words"
                    autoComplete="name"
                    label="Full name"
                    onChangeText={setFullName}
                    placeholder="Enter your full name"
                    value={fullName}
                  />
                  <FormField
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    label="Email address"
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    value={email}
                  />
                  <FormField
                    autoComplete="tel"
                    keyboardType="phone-pad"
                    label="Mobile number"
                    maxLength={30}
                    onChangeText={setMobileNumber}
                    placeholder="+63 900 000 0000"
                    value={mobileNumber}
                  />
                  <ChoiceField
                    label="Farm worker category"
                    onPress={() =>
                      setChoice({
                        title: 'Select worker category',
                        items: workerCategories,
                        select: (item) => {
                          setWorkerCategory(item.code as WorkerCategory);
                          setChoice(null);
                        },
                      })
                    }
                    placeholder="Select worker category"
                    value={workerCategories.find((item) => item.code === workerCategory)?.name}
                  />
                </View>
              ) : null}

              {/* STEP 2: SECURITY CREDENTIALS */}
              {step === 1 ? (
                <View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Create password</Text>
                    <View style={styles.passwordRow}>
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="new-password"
                        onChangeText={setPassword}
                        placeholder="Create a strong password"
                        placeholderTextColor="#7F8982"
                        secureTextEntry={!showPassword}
                        style={styles.passwordInput}
                        value={password}
                      />
                      <Pressable
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        accessibilityRole="button"
                        hitSlop={8}
                        onPress={() => setShowPassword((visible) => !visible)}
                        style={styles.showButton}>
                        <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* 2x2 Password Requirement Badges */}
                  <View style={styles.requirementsGrid}>
                    {passwordChecks.map((check) => (
                      <View
                        key={check.label}
                        style={[
                          styles.requirementBadge,
                          check.met && styles.requirementBadgeMet,
                        ]}>
                        <Text
                          style={[
                            styles.requirementBadgeIcon,
                            check.met && styles.requirementBadgeIconMet,
                          ]}>
                          {check.met ? '✓' : '○'}
                        </Text>
                        <Text
                          style={[
                            styles.requirementBadgeText,
                            check.met && styles.requirementBadgeTextMet,
                          ]}>
                          {check.label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <FormField
                    autoCapitalize="none"
                    autoComplete="new-password"
                    label="Confirm password"
                    onChangeText={setConfirmPassword}
                    placeholder="Repeat password"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                  />
                </View>
              ) : null}

              {/* STEP 3: FARM REGION & LOCATION */}
              {step === 2 ? (
                <View>
                  <ChoiceField disabled label="Country" onPress={() => undefined} placeholder="Philippines" value="Philippines" />
                  <ChoiceField
                    disabled={loadingAddress}
                    label="Region"
                    onPress={() => setChoice({ title: 'Select region', items: regions, select: selectRegion })}
                    placeholder={loadingAddress && !regions.length ? 'Loading regions…' : 'Select region'}
                    value={region?.name}
                  />
                  <ChoiceField
                    disabled={!region || loadingAddress || provinceNotApplicable}
                    label="Province"
                    onPress={() => setChoice({ title: 'Select province', items: provinces, select: selectProvince })}
                    placeholder={provinceNotApplicable ? 'Not applicable' : 'Select province'}
                    value={provinceNotApplicable ? 'Not applicable' : province?.name}
                  />
                  <ChoiceField
                    disabled={!region || (!provinceNotApplicable && !province) || loadingAddress}
                    label="City / Municipality"
                    onPress={() => setChoice({ title: 'Select city or municipality', items: cities, select: selectCity })}
                    placeholder="Select city or municipality"
                    value={city?.name}
                  />
                  <ChoiceField
                    disabled={!city || loadingAddress}
                    label="Barangay"
                    onPress={() =>
                      setChoice({
                        title: 'Select barangay',
                        items: barangays,
                        select: (item) => {
                          setBarangay(item as PsgcItem);
                          setChoice(null);
                        },
                      })
                    }
                    placeholder="Select barangay"
                    value={barangay?.name}
                  />
                  {loadingAddress ? <ActivityIndicator color="#185C35" style={styles.addressLoader} /> : null}

                  {/* Terms & Privacy Agreement */}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: termsAccepted }}
                    onPress={() => setTermsAccepted((accepted) => !accepted)}
                    style={styles.consent}>
                    <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                      {termsAccepted ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={styles.consentText}>
                      I agree to the <Text style={styles.consentStrong}>Terms of Service</Text> and{' '}
                      <Text style={styles.consentStrong}>Privacy Policy</Text>.
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.actions}>
                {step > 0 ? (
                  <Pressable
                    disabled={submitting}
                    onPress={() => {
                      setError('');
                      setStep((current) => Math.max(0, current - 1));
                    }}
                    style={styles.backButton}>
                    <Text style={styles.backButtonText}>Back</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  disabled={submitting}
                  onPress={step < 2 ? next : submit}
                  style={({ pressed }) => [
                    styles.continueButtonWrapper,
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
                      <Text style={styles.continueButtonText}>
                        {step < 2 ? 'Continue' : 'Create Account'}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={styles.signInRow}>
                <Text style={styles.signInPrompt}>Already have an account? </Text>
                <Pressable accessibilityRole="link" hitSlop={8} onPress={onSignIn ?? (() => router.replace('/login'))}>
                  <Text style={styles.signInLink}>Sign in</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ChoiceModal choice={choice} onClose={() => setChoice(null)} />
    </SafeAreaView>
  );
}
