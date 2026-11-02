import { Redirect, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { WorkerBottomNavigation } from '@/components/worker-bottom-navigation';
import { WorkerHeader } from '@/components/worker-header';
import { BuyerInlineNotice } from '@/components/buyer-inline-notice';
import { PhilippineAddressFields } from '@/components/philippine-address-fields';
import { useBuyerFeedback } from '@/context/buyer-feedback-context';
import { useAuth } from '@/context/auth-context';
import type { DeliveryAddressInput } from '@/lib/buyer-marketplace';
import { styles } from '@/styles/buyer-account.styles';

const GREEN = '#176D34';

function initials(name?: string, email?: string) {
  if (name?.trim()) {
    const words = name.trim().split(/\s+/);
    return `${words[0][0]}${words.length > 1 ? words[words.length - 1][0] : ''}`.toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() || 'DR';
}

function PencilIcon({ color = GREEN }: { color?: string }) {
  return <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="m15.2 5.2 3.6 3.6M16.7 3.7a2.5 2.5 0 0 1 3.6 3.6L6.5 21H3v-3.5L16.7 3.7Z" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function CloseIcon() {
  return <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Path d="m6 6 12 12M18 6 6 18" stroke="#8A9C8E" strokeWidth={2.2} strokeLinecap="round" /></Svg>;
}
function ShieldIcon({ size = 10 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" fill={GREEN} stroke="#fff" strokeWidth={2} /><Path d="m9 12 2 2 4-4" stroke="#fff" strokeWidth={2} strokeLinecap="round" /></Svg>;
}
function PhoneIcon() { return <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4.1 2h3A2 2 0 0 1 9 3.7a12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.7 2.1Z" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
function MailIcon() { return <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Path d="M4 5h16v14H4zM4 7l8 6 8-6" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
function MapIcon() { return <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Path d="M12 22s8-6.5 8-12a8 8 0 1 0-16 0c0 5.5 8 12 8 12Z" stroke={GREEN} strokeWidth={2} /><Circle cx={12} cy={10} r={2.5} stroke={GREEN} strokeWidth={2} /></Svg>; }
function TruckIcon() { return <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M3 5h11v11H3V5Zm11 5h3l3 3v3h-6v-6Z" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /><Circle cx={6.5} cy={18} r={1.5} stroke={GREEN} strokeWidth={2} /><Circle cx={16.5} cy={18} r={1.5} stroke={GREEN} strokeWidth={2} /></Svg>; }
function LeafIcon() { return <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><Path d="M20 4C11 4 5 8 5 15c0 2.5 1.8 4 4.2 4C16 19 20 11 20 4ZM4 20c3-4 7-6 12-8" stroke={GREEN} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>; }
function LogoutIcon() { return <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" stroke="#B4463A" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>; }

function profileAddress(profile: ReturnType<typeof useAuth>['profile']): DeliveryAddressInput {
  return {
    full_name: profile?.full_name || '', mobile_number: profile?.mobile_number || '',
    country: 'Philippines', region: profile?.region || '', province: profile?.province || '',
    city_municipality: profile?.city_municipality || '', barangay: profile?.barangay || '',
  };
}

export default function WorkerProfileScreen() {
  const { loading, profile, session, signOut, updateProfile } = useAuth();
  const { showToast } = useBuyerFeedback();
  const [signingOut, setSigningOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [addressValid, setAddressValid] = useState(false);
  const [editing, setEditing] = useState(false);
  const name = profile?.full_name || 'Farm Worker';
  const phone = profile?.mobile_number || 'Not provided';
  const address = [profile?.barangay, profile?.city_municipality, profile?.province, profile?.region, profile?.country].filter(Boolean).join(', ') || 'Not provided';
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftAddress, setDraftAddress] = useState<DeliveryAddressInput>(() => profileAddress(profile));
  const changeAddress = useCallback((changes: Partial<DeliveryAddressInput>) => {
    setDraftAddress((current) => ({ ...current, ...changes }));
  }, []);
  const email = session?.user.email || 'Not provided';
  const workerRole = profile?.worker_category === 'driver' ? 'Delivery Driver' : profile?.worker_category === 'seller' ? 'Seller' : 'Crop Management Worker';
  const avatarInitials = useMemo(() => initials(name, email), [name, email]);

  if (loading) return <SafeAreaView style={styles.safeArea}><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F7F1' }}><ActivityIndicator color={GREEN} size="large" /></View></SafeAreaView>;
  if (!profile) return <Redirect href={{ pathname: '/authentication', params: { mode: 'login' } }} />;

  function startEditing() {
    setProfileError('');
    setDraftName(name);
    setDraftPhone(profile?.mobile_number || '');
    setDraftAddress(profileAddress(profile));
    setAddressValid(false);
    setEditing(true);
  }
  async function saveProfile() {
    if (draftName.trim().length < 2 || !addressValid) {
      setProfileError(draftName.trim().length < 2 ? 'Enter a full name with at least 2 characters.' : 'Select a complete base address.');
      return;
    }
    setSaving(true);
    setProfileError('');
    try {
      await updateProfile({ ...draftAddress, full_name: draftName.trim(), mobile_number: draftPhone.trim() });
      setEditing(false);
      showToast({ title: 'Profile saved', body: 'Your contact details and base address are up to date.', tone: 'success' });
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }
  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      router.replace({ pathname: '/authentication', params: { mode: 'login' } });
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : 'Unable to sign out. Please try again.');
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <WorkerHeader
        logoPosition="left"
        logoSize={48}
        logoSource={require('@/assets/images/driver-dashboard-emblem.png')}
      />
      <View style={[styles.mainBodyContainer, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.titleText}>My Profile</Text>
          {profileError && !editing ? <BuyerInlineNotice title="Action needed" message={profileError} tone="error" /> : null}
          <View style={styles.profileHeroCard}>
            <Pressable accessibilityLabel={editing ? 'Cancel editing' : 'Edit profile'} onPress={editing ? () => setEditing(false) : startEditing} style={styles.pencilButton}>
              {editing ? <CloseIcon /> : <PencilIcon />}
            </Pressable>
            <View style={styles.heroIdentity}>
              <View style={styles.avatarWrap}>
                <View style={styles.initialsCircle}><Text style={styles.initialsText}>{avatarInitials}</Text></View>
                <View style={styles.avatarBadge}><ShieldIcon /></View>
              </View>
              <View style={styles.heroDetails}>
                <Text numberOfLines={1} style={styles.heroName}>{name}</Text>
                <Text numberOfLines={1} style={styles.heroEmail}>{email}</Text>
                <View style={styles.heroBadgeRow}><View style={styles.verifiedChip}><ShieldIcon size={9} /><Text style={styles.verifiedChipText}>{profile.worker_category === 'driver' ? 'Verified Driver' : profile.worker_category === 'seller' ? 'Verified Seller' : 'Verified Crop Worker'}</Text></View></View>
              </View>
            </View>
          </View>

          {editing ? <View style={styles.editFormCard}>
            {profileError ? <BuyerInlineNotice title="Profile not saved" message={profileError} tone="error" /> : null}
            <View style={styles.editFormHeader}><View style={styles.editFormTitleRow}><View style={styles.editFormDot} /><Text style={styles.editFormTitle}>Edit Profile Details</Text></View><Pressable hitSlop={8} onPress={() => setEditing(false)}><CloseIcon /></Pressable></View>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput onChangeText={setDraftName} placeholder="Your full name" placeholderTextColor="#9AA99E" style={styles.fieldInput} value={draftName} />
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput keyboardType="phone-pad" onChangeText={setDraftPhone} placeholder="+63 9XX XXX XXXX" placeholderTextColor="#9AA99E" style={styles.fieldInput} value={draftPhone} />
            <Text style={styles.fieldLabel}>Base Address</Text>
            <PhilippineAddressFields address={draftAddress} onChange={changeAddress} onValidityChange={setAddressValid} />
            <View style={styles.formButtonsRow}><Pressable onPress={() => setEditing(false)} style={styles.cancelFormButton}><Text style={styles.cancelFormButtonText}>Cancel</Text></Pressable><Pressable disabled={saving} onPress={saveProfile} style={styles.saveFormButton}><Text style={styles.saveFormButtonText}>{saving ? 'Saving…' : 'Save Changes'}</Text></Pressable></View>
          </View> : null}

          <View style={styles.detailsCard}>
            <Text style={styles.detailsSectionTitle}>Account Information</Text>
            <View style={styles.detailRow}><View style={styles.detailIconBox}><MailIcon /></View><View style={styles.detailTextBlock}><Text style={styles.detailLabel}>Email Address</Text><Text style={styles.detailValue}>{email}</Text></View></View>
            <View style={styles.detailRow}><View style={styles.detailIconBox}><PhoneIcon /></View><View style={styles.detailTextBlock}><Text style={styles.detailLabel}>Mobile Phone</Text><Text style={styles.detailValue}>{phone}</Text></View></View>
            <View style={styles.detailRow}><View style={styles.detailIconBox}>{profile.worker_category === 'driver' ? <TruckIcon /> : <LeafIcon />}</View><View style={styles.detailTextBlock}><Text style={styles.detailLabel}>Role</Text><Text style={styles.detailValue}>{workerRole}</Text></View></View>
            <View style={[styles.detailRow, { alignItems: 'flex-start' }]}><View style={[styles.detailIconBox, { marginTop: 2 }]}><MapIcon /></View><View style={styles.detailTextBlock}><Text style={styles.detailLabel}>Base Address</Text><Text style={[styles.detailValue, { lineHeight: 18 }]}>{address}</Text></View></View>
          </View>

          <Pressable accessibilityLabel="Sign out" disabled={signingOut} onPress={handleSignOut} style={[styles.signOutButton, signingOut && styles.buttonDisabled]}>
            {signingOut ? <ActivityIndicator color="#B4463A" size="small" /> : <LogoutIcon />}
            <Text style={styles.signOutButtonText}>{signingOut ? 'Signing Out…' : 'SIGN OUT'}</Text>
          </Pressable>
        </ScrollView>
      </View>
      <WorkerBottomNavigation activeTab="profile" />
    </SafeAreaView>
  );
}
