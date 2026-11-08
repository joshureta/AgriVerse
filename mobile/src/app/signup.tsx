import { styles } from '@/styles/signup.styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { postAuthenticationRoute } from '@/lib/mobile-routing';
import { supabase } from '@/lib/supabase';
import {
  getCityMunicipalityBarangays,
  getProvinceCitiesMunicipalities,
  getRegionCitiesMunicipalities,
  getRegionProvinces,
  getRegions,
  PsgcItem,
} from '@/lib/psgc';

type Choice = { code: string; name: string };

const steps = ['Personal info', 'Security', 'Location'];
const pendingEmailKey = 'agriverse-pending-signup-email';
const verificationCodeLength = 6;
const emptyVerificationDigits = () => Array<string>(verificationCodeLength).fill('');

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
  const { refreshProfile } = useAuth();
  const [step, setStepState] = useState(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
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

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [verificationDigits, setVerificationDigits] = useState(emptyVerificationDigits);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [choice, setChoice] = useState<{
    title: string;
    items: Choice[];
    select: (item: Choice) => void;
  } | null>(null);

  const codeInputRefs = useRef<(React.ComponentRef<typeof TextInput> | null)[]>([]);

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

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(pendingEmailKey)
      .then((storedEmail) => {
        if (active && storedEmail) {
          setPendingEmail(storedEmail);
          onStepChange?.(3);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [onStepChange]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

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
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return setError('Enter a valid email address.'), false;
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
    setMessage('');
    try {
      const registrationEmail = email.trim();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: registrationEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            mobile_number: mobileNumber.trim(),
            country: 'Philippines',
            region: region!.name,
            province: provinceNotApplicable ? null : province!.name,
            city_municipality: city!.name,
            barangay: barangay!.name,
          },
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        const profile = await refreshProfile();
        if (router.canDismiss()) router.dismissAll();
        router.replace(postAuthenticationRoute(profile));
      } else {
        await AsyncStorage.setItem(pendingEmailKey, registrationEmail).catch(() => undefined);
        setPendingEmail(registrationEmail);
        setVerificationDigits(emptyVerificationDigits());
        setResendSeconds(60);
        setMessage('Code sent. Check your inbox or spam folder.');
        onStepChange?.(3);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyEmail() {
    if (submitting || verificationDigits.some((digit) => !digit)) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    let verified = false;
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: verificationDigits.join(''),
        type: 'email',
      });
      if (verifyError || !data?.user) {
        throw new Error(verifyError?.message || 'The code could not be verified. Please try again.');
      }
      verified = true;
      await AsyncStorage.removeItem(pendingEmailKey).catch(() => undefined);
      const profile = await refreshProfile();
      setPendingEmail('');
      if (router.canDismiss()) router.dismissAll();
      router.replace(postAuthenticationRoute(profile));
    } catch (caught) {
      if (verified) {
        setPendingEmail('');
        setStep(0);
        setMessage('Email verified. Sign in to continue.');
      } else {
        setError(caught instanceof Error ? caught.message : 'Could not verify the code. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function resendCode() {
    if (submitting || resendSeconds > 0) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
      });
      if (resendError) throw resendError;
      setVerificationDigits(emptyVerificationDigits());
      setResendSeconds(60);
      setMessage('New code sent. Check your inbox.');
      codeInputRefs.current[0]?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not resend the code. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function changeRegistrationEmail() {
    await AsyncStorage.removeItem(pendingEmailKey).catch(() => undefined);
    setPendingEmail('');
    setVerificationDigits(emptyVerificationDigits());
    setResendSeconds(0);
    setError('');
    setMessage('');
    setStep(0);
  }

  function changeCodeDigit(index: number, value: string) {
    const digits = value.replace(/\D/g, '');
    setVerificationDigits((current) => {
      const nextDigits = [...current];
      if (!digits) nextDigits[index] = '';
      for (let offset = 0; offset < digits.length && index + offset < verificationCodeLength; offset++) {
        nextDigits[index + offset] = digits[offset];
      }
      return nextDigits;
    });
    if (digits) codeInputRefs.current[Math.min(index + digits.length, verificationCodeLength - 1)]?.focus();
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
              <ConvexDomeCap color="#FFFFFF" height={54} />
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
              <Text style={styles.kicker}>CREATE ACCOUNT</Text>
              <Text style={styles.title}>{pendingEmail ? 'Verify your email' : 'Create Account'}</Text>
              <Text style={styles.subtitle}>
                {pendingEmail ? `Enter the 6-digit code sent to ${pendingEmail}.` : 'Complete three quick steps to get started.'}
              </Text>
              {/* 3-STEP PROGRESS STEPPER */}
              {!pendingEmail ? <View accessibilityLabel={`Step ${step + 1} of 3: ${steps[step]}`} style={styles.stepper}>
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
              </View> : null}

              {!pendingEmail ? <Text style={styles.sectionTitle}>
                {step === 0 ? 'Personal information' : step === 1 ? 'Security' : 'Location'}
              </Text> : null}
            </View>

            {/* SCROLLABLE AREA: Starts below the section title divider line */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={[styles.scrollContent, embedded && styles.embeddedScrollContent]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}>
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
              {message ? <Text accessibilityRole="alert" style={styles.success}>{message}</Text> : null}

              {pendingEmail ? (
                <View>
                  <Text style={styles.label}>Verification code</Text>
                  <View style={styles.codeInputs}>
                    {verificationDigits.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(input) => { codeInputRefs.current[index] = input; }}
                        accessibilityLabel={`Digit ${index + 1} of ${verificationCodeLength}`}
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        autoFocus={index === 0}
                        editable={!submitting}
                        keyboardType="number-pad"
                        maxLength={verificationCodeLength}
                        onChangeText={(value) => changeCodeDigit(index, value)}
                        onKeyPress={({ nativeEvent }) => {
                          if (nativeEvent.key === 'Backspace' && !verificationDigits[index] && index > 0) {
                            codeInputRefs.current[index - 1]?.focus();
                          }
                        }}
                        selectTextOnFocus
                        style={styles.codeInput}
                        value={digit}
                      />
                    ))}
                  </View>
                  <Pressable
                    disabled={submitting || verificationDigits.some((digit) => !digit)}
                    onPress={verifyEmail}
                    style={[styles.continueButtonWrapper, styles.verifyButton, (submitting || verificationDigits.some((digit) => !digit)) && styles.buttonDisabled]}>
                    <LinearGradient colors={['#3D9B43', '#185C35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientButton}>
                      {submitting ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.continueButtonText}>Verify email</Text>}
                    </LinearGradient>
                  </Pressable>
                  <View style={styles.verifyActions}>
                    <Pressable disabled={submitting || resendSeconds > 0} onPress={resendCode}>
                      <Text style={[styles.verifyActionText, (submitting || resendSeconds > 0) && styles.verifyActionDisabled]}>
                        {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend email'}
                      </Text>
                    </Pressable>
                    <Pressable disabled={submitting} onPress={changeRegistrationEmail}>
                      <Text style={[styles.verifyActionText, submitting && styles.verifyActionDisabled]}>Use another email</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* STEP 1: PERSONAL INFORMATION */}
              {!pendingEmail && step === 0 ? (
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
                </View>
              ) : null}

              {/* STEP 2: SECURITY CREDENTIALS */}
              {!pendingEmail && step === 1 ? (
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

              {/* STEP 3: LOCATION */}
              {!pendingEmail && step === 2 ? (
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
              {!pendingEmail ? <View style={styles.actions}>
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
                        {step < 2 ? 'Continue' : 'Sign up'}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View> : null}

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
