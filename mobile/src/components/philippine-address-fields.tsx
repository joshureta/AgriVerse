import { ChevronDown } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { DeliveryAddressInput } from '@/lib/buyer-marketplace';
import {
  getCityMunicipalityBarangays,
  getProvinceCitiesMunicipalities,
  getRegionCitiesMunicipalities,
  getRegionProvinces,
  getRegionSubMunicipalities,
  getRegions,
  type PsgcItem,
} from '@/lib/psgc';
import { GREEN, styles } from '@/styles/buyer-checkout.styles';

type PlaceField = 'region' | 'province' | 'city' | 'district' | 'barangay';
type Props = {
  address: DeliveryAddressInput;
  onChange: (changes: Partial<DeliveryAddressInput>) => void;
  onValidityChange: (valid: boolean) => void;
};

const MANILA_CODE = '1380600000';
const MANILA_PREFIX = MANILA_CODE.slice(0, 5);

function matchingLocation(items: PsgcItem[], name: string) {
  const normalized = String(name || '').trim().toLocaleLowerCase();
  return items.find((item) => item.name.trim().toLocaleLowerCase() === normalized);
}

function manilaDistricts(items: PsgcItem[]) {
  return items.filter((item) => item.code.startsWith(MANILA_PREFIX) && item.code !== MANILA_CODE)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function normalizedCities(items: PsgcItem[]) {
  const includesManila = items.some((item) => item.code === MANILA_CODE || item.code.startsWith(MANILA_PREFIX));
  const cities = items.filter((item) => !item.code.startsWith(MANILA_PREFIX) || item.code === MANILA_CODE);
  if (includesManila && !cities.some((item) => item.code === MANILA_CODE)) {
    cities.push({ code: MANILA_CODE, name: 'City of Manila' });
  }
  return cities.sort((a, b) => a.name.localeCompare(b.name));
}

export function PhilippineAddressFields({ address, onChange, onValidityChange }: Props) {
  const [regions, setRegions] = useState<PsgcItem[]>([]);
  const [provinces, setProvinces] = useState<PsgcItem[]>([]);
  const [cities, setCities] = useState<PsgcItem[]>([]);
  const [districts, setDistricts] = useState<PsgcItem[]>([]);
  const [barangays, setBarangays] = useState<PsgcItem[]>([]);
  const [regionCode, setRegionCode] = useState('');
  const [provinceCode, setProvinceCode] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [barangayCode, setBarangayCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [manualEntry, setManualEntry] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [expanded, setExpanded] = useState<PlaceField | null>(null);
  const [search, setSearch] = useState('');
  const mounted = useRef(true);
  const requestVersion = useRef(0);
  const initialAddress = useRef(address);

  const provinceNotApplicable = Boolean(regionCode) && !loading && provinces.length === 0;
  const manilaSelected = cityCode === MANILA_CODE;

  useEffect(() => {
    const valid = manualEntry
      ? Boolean(address.region.trim() && address.city_municipality.trim() && address.barangay.trim())
      : Boolean(regionCode && cityCode && barangayCode && (provinceNotApplicable || provinceCode)
        && (!manilaSelected || districtCode));
    onValidityChange(valid);
  }, [address.barangay, address.city_municipality, address.region, barangayCode, cityCode,
    districtCode, manilaSelected, manualEntry, onValidityChange, provinceCode, provinceNotApplicable, regionCode]);

  useEffect(() => {
    mounted.current = true;
    const version = ++requestVersion.current;
    const saved = initialAddress.current;

    async function loadSavedLocation() {
      try {
        const regionItems = await getRegions();
        if (!mounted.current || requestVersion.current !== version) return;
        setRegions(regionItems);
        const region = matchingLocation(regionItems, saved.region);
        if (!region) return;
        setRegionCode(region.code);

        const provinceItems = await getRegionProvinces(region.code);
        if (!mounted.current || requestVersion.current !== version) return;
        setProvinces(provinceItems);
        const province = matchingLocation(provinceItems, saved.province);
        if (provinceItems.length && !province) return;
        if (province) setProvinceCode(province.code);

        const cityItems = normalizedCities(province
          ? await getProvinceCitiesMunicipalities(province.code)
          : await getRegionCitiesMunicipalities(region.code));
        if (!mounted.current || requestVersion.current !== version) return;
        setCities(cityItems);
        let city = matchingLocation(cityItems, saved.city_municipality);
        let district = null;
        if (!city && cityItems.some((item) => item.code === MANILA_CODE)) {
          const districtItems = manilaDistricts(await getRegionSubMunicipalities(region.code));
          if (!mounted.current || requestVersion.current !== version) return;
          setDistricts(districtItems);
          district = matchingLocation(districtItems, saved.city_municipality) || null;
          if (district) city = cityItems.find((item) => item.code === MANILA_CODE);
        }
        if (!city) return;
        setCityCode(city.code);
        if (city.code === MANILA_CODE) {
          if (!district) {
            const districtItems = manilaDistricts(await getRegionSubMunicipalities(region.code));
            if (!mounted.current || requestVersion.current !== version) return;
            setDistricts(districtItems);
            district = matchingLocation(districtItems, saved.city_municipality) || null;
          }
          if (!district) return;
          setDistrictCode(district.code);
        }
        const barangayItems = await getCityMunicipalityBarangays(district?.code || city.code);
        if (!mounted.current || requestVersion.current !== version) return;
        setBarangays(barangayItems);
        const barangay = matchingLocation(barangayItems, saved.barangay);
        if (barangay) setBarangayCode(barangay.code);
      } catch {
        if (mounted.current && requestVersion.current === version) {
          setManualEntry(true);
          setLocationError('Location choices are unavailable. Enter your location manually.');
        }
      } finally {
        if (mounted.current && requestVersion.current === version) setLoading(false);
      }
    }

    loadSavedLocation();
    return () => { mounted.current = false; requestVersion.current += 1; };
  }, []);

  function unavailable(version: number) {
    if (mounted.current && requestVersion.current === version) {
      setManualEntry(true);
      setLocationError('Location choices are unavailable. Enter your location manually.');
      setExpanded(null);
    }
  }

  async function chooseRegion(item: PsgcItem) {
    const version = ++requestVersion.current;
    setRegionCode(item.code);
    setProvinceCode(''); setCityCode(''); setDistrictCode(''); setBarangayCode('');
    setProvinces([]); setCities([]); setDistricts([]); setBarangays([]);
    onChange({ region: item.name, province: '', city_municipality: '', barangay: '' });
    setExpanded(null); setLoading(true);
    try {
      const provinceItems = await getRegionProvinces(item.code);
      if (!mounted.current || requestVersion.current !== version) return;
      setProvinces(provinceItems);
      if (!provinceItems.length) {
        const cityItems = await getRegionCitiesMunicipalities(item.code);
        if (mounted.current && requestVersion.current === version) setCities(normalizedCities(cityItems));
      }
    } catch { unavailable(version); }
    finally { if (mounted.current && requestVersion.current === version) setLoading(false); }
  }

  async function chooseProvince(item: PsgcItem) {
    const version = ++requestVersion.current;
    setProvinceCode(item.code); setCityCode(''); setDistrictCode(''); setBarangayCode('');
    setCities([]); setDistricts([]); setBarangays([]);
    onChange({ province: item.name, city_municipality: '', barangay: '' });
    setExpanded(null); setLoading(true);
    try {
      const cityItems = await getProvinceCitiesMunicipalities(item.code);
      if (mounted.current && requestVersion.current === version) setCities(normalizedCities(cityItems));
    } catch { unavailable(version); }
    finally { if (mounted.current && requestVersion.current === version) setLoading(false); }
  }

  async function chooseCity(item: PsgcItem) {
    const version = ++requestVersion.current;
    setCityCode(item.code); setDistrictCode(''); setBarangayCode('');
    setDistricts([]); setBarangays([]);
    onChange({ city_municipality: item.name, barangay: '' });
    setExpanded(null); setLoading(true);
    try {
      if (item.code === MANILA_CODE) {
        const districtItems = manilaDistricts(await getRegionSubMunicipalities(regionCode));
        if (mounted.current && requestVersion.current === version) setDistricts(districtItems);
      } else {
        const barangayItems = await getCityMunicipalityBarangays(item.code);
        if (mounted.current && requestVersion.current === version) setBarangays(barangayItems);
      }
    } catch { unavailable(version); }
    finally { if (mounted.current && requestVersion.current === version) setLoading(false); }
  }

  async function chooseDistrict(item: PsgcItem) {
    const version = ++requestVersion.current;
    setDistrictCode(item.code); setBarangayCode(''); setBarangays([]);
    onChange({ city_municipality: item.name, barangay: '' });
    setExpanded(null); setLoading(true);
    try {
      const barangayItems = await getCityMunicipalityBarangays(item.code);
      if (mounted.current && requestVersion.current === version) setBarangays(barangayItems);
    } catch { unavailable(version); }
    finally { if (mounted.current && requestVersion.current === version) setLoading(false); }
  }

  function chooseBarangay(item: PsgcItem) {
    setBarangayCode(item.code);
    onChange({ barangay: item.name });
    setExpanded(null);
  }

  function choiceField(field: PlaceField, label: string, value: string, options: PsgcItem[],
    onSelect: (item: PsgcItem) => void, disabled = false) {
    const open = expanded === field;
    const filtered = options.filter((item) => item.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
    return <View style={styles.fieldBlock} key={field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Select ${label}`} disabled={disabled || loading}
        onPress={() => { setExpanded(open ? null : field); setSearch(''); }}
        style={[styles.fieldInput, styles.locationChoice, (disabled || loading) && styles.locationChoiceDisabled]}>
        <Text numberOfLines={1} style={[styles.locationChoiceText, !value && styles.locationPlaceholder]}>
          {value || (loading ? 'Loading choices…' : `Select ${label.toLowerCase()}`)}
        </Text>
        <ChevronDown size={17} color={GREEN} />
      </Pressable>
      {open && <View style={styles.locationOptions}>
        <TextInput style={styles.locationSearch} value={search} onChangeText={setSearch}
          placeholder={`Search ${label.toLowerCase()}`} placeholderTextColor="#879888" autoCorrect={false} />
        <ScrollView nestedScrollEnabled style={styles.locationOptionsScroll} keyboardShouldPersistTaps="handled">
          {filtered.slice(0, 100).map((item) => <Pressable key={item.code} onPress={() => onSelect(item)} style={styles.locationOption}>
            <Text style={styles.locationOptionText}>{item.name}</Text>
          </Pressable>)}
          {!filtered.length && <Text style={styles.locationHelp}>No matching places found.</Text>}
          {filtered.length > 100 && <Text style={styles.locationHelp}>Search to see more places.</Text>}
        </ScrollView>
      </View>}
    </View>;
  }

  if (manualEntry) return <>
    {([
      ['region', 'Region'], ['province', 'Province (optional)'],
      ['city_municipality', 'City / Municipality'], ['barangay', 'Barangay'],
    ] as const).map(([key, label]) => <View key={key} style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.fieldInput} value={address[key]} onChangeText={(value) => onChange({ [key]: value })}
        placeholder={`Enter ${label.toLowerCase()}`} placeholderTextColor="#9AA79C" maxLength={150} />
    </View>)}
    <Text style={styles.locationHelp}>{locationError}</Text>
  </>;

  return <>
    {choiceField('region', 'Region *', address.region, regions, chooseRegion)}
    {provinceNotApplicable
      ? <View style={styles.fieldBlock}><Text style={styles.fieldLabel}>Province</Text><Text style={styles.locationHelp}>Not applicable for this region</Text></View>
      : choiceField('province', 'Province *', address.province, provinces, chooseProvince, !regionCode)}
    {choiceField('city', 'City / Municipality *',
      cities.find((item) => item.code === cityCode)?.name || address.city_municipality, cities, chooseCity,
      !regionCode || (!provinceNotApplicable && !provinceCode))}
    {manilaSelected && choiceField('district', 'Manila District *',
      districts.find((item) => item.code === districtCode)?.name || '', districts, chooseDistrict)}
    {choiceField('barangay', 'Barangay *', address.barangay, barangays, chooseBarangay,
      !cityCode || (manilaSelected && !districtCode))}
  </>;
}
