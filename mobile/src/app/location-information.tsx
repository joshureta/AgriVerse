import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Building,
  ChevronLeft,
  Check,
  ChevronDown,
  Compass,
  Home,
  LogOut,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react-native';

import { ConvexDomeCap } from '@/components/convex-dome-cap';
import { OnboardingStepper } from '@/components/onboarding-stepper';
import { useAuth } from '@/context/auth-context';
import { postAuthenticationRoute } from '@/lib/mobile-routing';
import {
  getCityMunicipalityBarangays,
  getProvinceCitiesMunicipalities,
  getRegionCitiesMunicipalities,
  getRegionProvinces,
  getRegionSubMunicipalities,
  getRegions,
  type PsgcItem,
} from '@/lib/psgc';
import { styles } from '@/styles/change-password.styles';

type ChoiceConfig = {
  title: string;
  items: PsgcItem[];
  select: (item: PsgcItem) => void;
};

const CITY_OF_MANILA_CODE = '1380600000';

function ChoiceField({
  label,
  value,
  placeholder,
  disabled,
  icon,
  onPress,
}: {
  label: string;
  value?: string;
  placeholder: string;
  disabled?: boolean;
  icon?: ReactNode;
  onPress: () => void;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={[styles.inputRow, disabled && styles.choiceDisabled]}>
        {icon ? <View style={styles.inputIcon}>{icon}</View> : null}
        <Text numberOfLines={1} style={[styles.choiceText, !value && styles.choicePlaceholder]}>
          {value || placeholder}
        </Text>
        <ChevronDown color="#18753a" size={17} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

function ChoiceModal({ choice, onClose }: { choice: ChoiceConfig | null; onClose: () => void }) {
  if (!choice) return null;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={(event) => event.stopPropagation()} style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{choice.title}</Text>
            <Pressable
              accessibilityLabel="Close selection"
              hitSlop={8}
              onPress={onClose}
              style={styles.modalCloseButton}>
              <X color="#64748B" size={22} strokeWidth={2.5} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalListContent} showsVerticalScrollIndicator={false} style={styles.modalList}>
            {choice.items.map((item) => (
              <Pressable
                key={item.code}
                onPress={() => choice.select(item)}
                style={({ pressed }) => [styles.modalOption, pressed && styles.modalOptionPressed]}>
                <Text style={styles.modalOptionText}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
export default function LocationInformationScreen() {
  const { completeLocation, signOut } = useAuth();
  const [regions, setRegions] = useState<PsgcItem[]>([]);
  const [provinces, setProvinces] = useState<PsgcItem[]>([]);
  const [cities, setCities] = useState<PsgcItem[]>([]);
  const [districts, setDistricts] = useState<PsgcItem[]>([]);
  const [barangays, setBarangays] = useState<PsgcItem[]>([]);
  const [region, setRegion] = useState<PsgcItem | null>(null);
  const [province, setProvince] = useState<PsgcItem | null>(null);
  const [cityMunicipality, setCityMunicipality] = useState<PsgcItem | null>(null);
  const [district, setDistrict] = useState<PsgcItem | null>(null);
  const [barangay, setBarangay] = useState<PsgcItem | null>(null);
  const [provinceNotApplicable, setProvinceNotApplicable] = useState(false);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [choice, setChoice] = useState<ChoiceConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getRegions()
      .then(setRegions)
      .catch((caught) => setError(caught instanceof Error ? caught.message : 'Failed to load regions.'));
  }, []);

  async function selectRegion(selectedRegion: PsgcItem) {
    setRegion(selectedRegion);
    setProvince(null);
    setCityMunicipality(null);
    setDistrict(null);
    setBarangay(null);
    setProvinces([]);
    setCities([]);
    setDistricts([]);
    setBarangays([]);
    setProvinceNotApplicable(false);
    setChoice(null);
    setError('');
    setLoadingAddress(true);

    try {
      const provinceList = await getRegionProvinces(selectedRegion.code);
      setProvinces(provinceList);
      if (provinceList.length === 0) {
        setProvinceNotApplicable(true);
        setCities(await getRegionCitiesMunicipalities(selectedRegion.code));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load provinces.');
    } finally {
      setLoadingAddress(false);
    }
  }

  async function selectProvince(selectedProvince: PsgcItem) {
    setProvince(selectedProvince);
    setCityMunicipality(null);
    setDistrict(null);
    setBarangay(null);
    setCities([]);
    setDistricts([]);
    setBarangays([]);
    setChoice(null);
    setError('');
    setLoadingAddress(true);

    try {
      setCities(await getProvinceCitiesMunicipalities(selectedProvince.code));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load cities and municipalities.');
    } finally {
      setLoadingAddress(false);
    }
  }

  async function selectCity(selectedCity: PsgcItem) {
    setCityMunicipality(selectedCity);
    setDistrict(null);
    setBarangay(null);
    setDistricts([]);
    setBarangays([]);
    setChoice(null);
    setError('');
    setLoadingAddress(true);

    try {
      if (selectedCity.code === CITY_OF_MANILA_CODE) {
        if (!region) throw new Error('Select your region before choosing a Manila district.');
        const districtList = await getRegionSubMunicipalities(region.code);
        const cityCodePrefix = selectedCity.code.slice(0, 5);
        setDistricts(districtList.filter((item) => item.code.startsWith(cityCodePrefix)));
      } else {
        setBarangays(await getCityMunicipalityBarangays(selectedCity.code));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load location options.');
    } finally {
      setLoadingAddress(false);
    }
  }

  async function selectDistrict(selectedDistrict: PsgcItem) {
    setDistrict(selectedDistrict);
    setBarangay(null);
    setBarangays([]);
    setChoice(null);
    setError('');
    setLoadingAddress(true);

    try {
      setBarangays(await getCityMunicipalityBarangays(selectedDistrict.code));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load barangays.');
    } finally {
      setLoadingAddress(false);
    }
  }
  async function submit() {
    if (!region) return setError('Select your region.');
    if (!provinceNotApplicable && !province) return setError('Select your province.');
    if (!cityMunicipality) return setError('Select your city or municipality.');
    if (cityMunicipality.code === CITY_OF_MANILA_CODE && !district) return setError('Select your Manila district.');
    if (!barangay) return setError('Select your barangay.');

    setSubmitting(true);
    setError('');
    try {
      const updatedProfile = await completeLocation({
        region: region.name,
        province: provinceNotApplicable ? 'Not Applicable' : province?.name || '',
        city_municipality: cityMunicipality.name,
        barangay: barangay.name,
      });
      router.replace(postAuthenticationRoute(updatedProfile));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your location.');
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
        {/* Banner Brand Header with Back Button */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerNavRow}>
            <Pressable
              hitSlop={8}
              onPress={() => router.replace('/confirm-name')}
              style={styles.bannerBackBtn}>
              <ChevronLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.bannerBackBtnText}>Back</Text>
            </Pressable>

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
              <OnboardingStepper
                currentStep={3}
                onStepPress={(step) => {
                  if (step === 1) router.replace('/change-password');
                  if (step === 2) router.replace('/confirm-name');
                }}
              />

              {/* Header Title & Subtitle */}
              <View style={styles.headerGroup}>
                <Text style={styles.title}>Location information</Text>
                <Text style={styles.subtitle}>
                  Enter your home address. AgriVerse will not request your device location.
                </Text>
              </View>

              {/* Country (Read-Only Card) */}
              <Text style={styles.label}>Country</Text>
              <View style={styles.countryCard}>
                <View style={styles.countryLeft}>
                  <Text style={styles.countryFlag}>🇵🇭</Text>
                  <Text style={styles.countryText}>Philippines</Text>
                </View>
                <View style={styles.countryBadge}>
                  <Text style={styles.countryBadgeText}>Default</Text>
                </View>
              </View>

              {/* Region & Province */}
              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <ChoiceField
                    disabled={loadingAddress || submitting}
                    icon={<Compass color="#94A3B8" size={16} />}
                    label="Region *"
                    onPress={() => setChoice({ title: 'Select region', items: regions, select: selectRegion })}
                    placeholder={loadingAddress && !regions.length ? 'Loading regions…' : 'Select region'}
                    value={region?.name}
                  />
                </View>

                <View style={styles.halfInput}>
                  <ChoiceField
                    disabled={!region || loadingAddress || submitting || provinceNotApplicable}
                    label="Province (optional)"
                    onPress={() => setChoice({ title: 'Select province', items: provinces, select: selectProvince })}
                    placeholder={provinceNotApplicable ? 'Not applicable' : 'Select province'}
                    value={provinceNotApplicable ? 'Not applicable' : province?.name}
                  />
                </View>
              </View>

              <ChoiceField
                disabled={!region || (!provinceNotApplicable && !province) || loadingAddress || submitting}
                icon={<Building color="#94A3B8" size={16} />}
                label="City / Municipality *"
                onPress={() => setChoice({ title: 'Select city or municipality', items: cities, select: selectCity })}
                placeholder="Select city or municipality"
                value={cityMunicipality?.name}
              />

              {cityMunicipality?.code === CITY_OF_MANILA_CODE ? (
                <ChoiceField
                  disabled={loadingAddress || submitting || !districts.length}
                  icon={<MapPin color="#94A3B8" size={16} />}
                  label="District *"
                  onPress={() => setChoice({ title: 'Select Manila district', items: districts, select: selectDistrict })}
                  placeholder="Select Manila district"
                  value={district?.name}
                />
              ) : null}

              <ChoiceField
                disabled={
                  !cityMunicipality ||
                  loadingAddress ||
                  submitting ||
                  (cityMunicipality.code === CITY_OF_MANILA_CODE && !district)
                }
                icon={<Home color="#94A3B8" size={16} />}
                label="Barangay *"
                onPress={() =>
                  setChoice({
                    title: 'Select barangay',
                    items: barangays,
                    select: (selectedBarangay) => {
                      setBarangay(selectedBarangay);
                      setChoice(null);
                      setError('');
                    },
                  })
                }
                placeholder="Select barangay"
                value={barangay?.name}
              />

              {loadingAddress ? <ActivityIndicator color="#18753a" style={styles.addressLoader} /> : null}
              {error ? <Text style={styles.error}>{error}</Text> : null}

              {/* Complete Onboarding Button */}
              <Pressable
                disabled={submitting}
                onPress={submit}
                style={[styles.button, submitting && styles.buttonDisabled]}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" strokeWidth={3} />
                    <Text style={styles.buttonText}>Complete Onboarding</Text>
                  </>
                )}
              </Pressable>

              {/* Back to Previous Step button */}
              <Pressable
                disabled={submitting}
                onPress={() => router.replace('/confirm-name')}
                style={styles.backStepButton}>
                <ArrowLeft size={16} color="#166534" strokeWidth={2.5} />
                <Text style={styles.backStepButtonText}>Back to Previous Step</Text>
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
      <ChoiceModal choice={choice} onClose={() => setChoice(null)} />
    </SafeAreaView>
  );
}
