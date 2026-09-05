import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BuyerBottomNavigation } from '@/components/buyer-bottom-navigation';
import { BuyerHeader } from '@/components/buyer-header';
import { useAuth } from '@/context/auth-context';
import { GREEN } from '@/styles/buyer-home.styles';
import { styles } from '@/styles/buyer-account.styles';

function getInitials(name?: string, email?: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'JD';
}

function PencilIcon({ color = '#176D34', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckShieldIcon({ size = 11 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        fill="#176D34"
        stroke="#ffffff"
        strokeWidth={2}
      />
      <Path
        d="m9 12 2 2 4-4"
        stroke="#ffffff"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon({ color = '#8A9C8E', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6 6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PhoneIcon({ color = '#176D34' }: { color?: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BriefcaseIcon({ color = '#176D34' }: { color?: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Rect width={20} height={14} x={2} y={7} rx={2} stroke={color} strokeWidth={2} />
      <Path
        d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MapPinIcon({ color = '#176D34' }: { color?: string }) {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

function ReceiptIcon({ color = GREEN, size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 7h8M8 11h8M8 15h4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRightIcon({ color = '#8B9B8E' }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="m9 18 6-6-6-6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LogoutIcon({ color = '#B4463A', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function BuyerAccountScreen() {
  const { profile, session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const initialName = profile?.full_name || 'Juan Dela Cruz';
  const initialEmail = session?.user?.email || 'juan.delacruz@email.com';
  const initialPhone = profile?.mobile_number || '+63 912 345 6789';
  const initialBusiness = "Juan's Fresh Market";
  const initialAddress =
    [profile?.barangay, profile?.city_municipality, profile?.province, profile?.country || 'Philippines']
      .filter(Boolean)
      .join(', ') || '123 Market Street, Manila City, Metro Manila';

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [business, setBusiness] = useState(initialBusiness);
  const [address, setAddress] = useState(initialAddress);

  // Edit draft inputs
  const [draftName, setDraftName] = useState(initialName);
  const [draftPhone, setDraftPhone] = useState(initialPhone);
  const [draftBusiness, setDraftBusiness] = useState(initialBusiness);
  const [draftAddress, setDraftAddress] = useState(initialAddress);

  const initials = useMemo(() => getInitials(name, initialEmail), [name, initialEmail]);

  function handleStartEditing() {
    setDraftName(name);
    setDraftPhone(phone);
    setDraftBusiness(business);
    setDraftAddress(address);
    setIsEditing(true);
  }

  function handleCancelEditing() {
    setIsEditing(false);
  }

  function handleSaveProfile() {
    if (!draftName.trim()) {
      Alert.alert('Validation Error', 'Full Name cannot be empty.');
      return;
    }
    setName(draftName.trim());
    setPhone(draftPhone.trim());
    setBusiness(draftBusiness.trim());
    setAddress(draftAddress.trim());
    setIsEditing(false);
    Alert.alert('Profile Updated', 'Your profile details have been successfully saved.');
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    try {
      await signOut();
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace({ pathname: '/authentication', params: { mode: 'login' } });
    } catch (caught) {
      Alert.alert(
        'Unable to sign out',
        caught instanceof Error ? caught.message : 'Please try again.',
      );
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <BuyerHeader />

      <View style={styles.mainBodyContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.titleText}>My Account</Text>

          {/* HERO PROFILE CARD (WITH PENCIL EDIT ICON) */}
          <View style={styles.profileHeroCard}>
            <Pressable
              accessibilityLabel={isEditing ? 'Cancel editing' : 'Edit profile'}
              accessibilityRole="button"
              hitSlop={8}
              onPress={isEditing ? handleCancelEditing : handleStartEditing}
              style={({ pressed }) => [styles.pencilButton, pressed && styles.pencilButtonPressed]}>
              {isEditing ? <CloseIcon size={16} /> : <PencilIcon size={16} />}
            </Pressable>

            <View style={styles.heroIdentity}>
              <View style={styles.avatarWrap}>
                <View style={styles.initialsCircle}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
                <View style={styles.avatarBadge}>
                  <CheckShieldIcon size={11} />
                </View>
              </View>

              <View style={styles.heroDetails}>
                <Text numberOfLines={1} style={styles.heroName}>
                  {name}
                </Text>
                <Text numberOfLines={1} style={styles.heroEmail}>
                  {initialEmail}
                </Text>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.verifiedChip}>
                    <CheckShieldIcon size={9} />
                    <Text style={styles.verifiedChipText}>Verified Buyer</Text>
                  </View>
                  <Text style={styles.memberSinceText}>May 2026</Text>
                </View>
              </View>
            </View>
          </View>

          {/* INLINE EDIT PROFILE FORM */}
          {isEditing ? (
            <View style={styles.editFormCard}>
              <View style={styles.editFormHeader}>
                <View style={styles.editFormTitleRow}>
                  <View style={styles.editFormDot} />
                  <Text style={styles.editFormTitle}>Edit Profile Details</Text>
                </View>
                <Pressable hitSlop={8} onPress={handleCancelEditing}>
                  <CloseIcon size={16} />
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                onChangeText={setDraftName}
                placeholder="Your full name"
                placeholderTextColor="#9AA99E"
                style={styles.fieldInput}
                value={draftName}
              />

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setDraftPhone}
                placeholder="+63 9XX XXX XXXX"
                placeholderTextColor="#9AA99E"
                style={styles.fieldInput}
                value={draftPhone}
              />

              <Text style={styles.fieldLabel}>Business / Store Name</Text>
              <TextInput
                onChangeText={setDraftBusiness}
                placeholder="e.g. Juan's Fresh Market"
                placeholderTextColor="#9AA99E"
                style={styles.fieldInput}
                value={draftBusiness}
              />

              <Text style={styles.fieldLabel}>Default Shipping Address</Text>
              <TextInput
                multiline
                numberOfLines={2}
                onChangeText={setDraftAddress}
                placeholder="Delivery address"
                placeholderTextColor="#9AA99E"
                style={[styles.fieldInput, styles.fieldInputMultiline]}
                value={draftAddress}
              />

              <View style={styles.formButtonsRow}>
                <Pressable
                  accessibilityLabel="Cancel editing"
                  accessibilityRole="button"
                  onPress={handleCancelEditing}
                  style={styles.cancelFormButton}>
                  <Text style={styles.cancelFormButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Save profile changes"
                  accessibilityRole="button"
                  onPress={handleSaveProfile}
                  style={styles.saveFormButton}>
                  <Text style={styles.saveFormButtonText}>Save Changes</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* ACCOUNT INFORMATION CARD */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsSectionTitle}>Account Information</Text>

            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <PhoneIcon />
              </View>
              <View style={styles.detailTextBlock}>
                <Text style={styles.detailLabel}>Mobile Phone</Text>
                <Text style={styles.detailValue}>{phone}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <BriefcaseIcon />
              </View>
              <View style={styles.detailTextBlock}>
                <Text style={styles.detailLabel}>Store / Business</Text>
                <Text style={styles.detailValue}>{business}</Text>
              </View>
            </View>

            <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
              <View style={[styles.detailIconBox, { marginTop: 2 }]}>
                <MapPinIcon />
              </View>
              <View style={styles.detailTextBlock}>
                <Text style={styles.detailLabel}>Default Shipping Address</Text>
                <Text style={[styles.detailValue, { lineHeight: 18 }]}>{address}</Text>
              </View>
            </View>
          </View>

          {/* MY PURCHASES ACTION CARD */}
          <Pressable
            accessibilityLabel="View my purchases"
            accessibilityRole="button"
            onPress={() => router.push('/BuyerPurchaseHistory' as never)}
            style={({ pressed }) => [styles.purchasesCard, pressed && styles.purchasesPressed]}>
            <View style={styles.purchasesIconCircle}>
              <ReceiptIcon color={GREEN} size={20} />
            </View>
            <View style={styles.purchasesTextBlock}>
              <Text style={styles.purchasesTitle}>My Purchases</Text>
              <Text style={styles.purchasesSubtitle}>View your order history and tracking</Text>
            </View>
            <ChevronRightIcon />
          </Pressable>

          {/* SIGN OUT BUTTON */}
          <Pressable
            accessibilityLabel="Sign out"
            accessibilityRole="button"
            disabled={signingOut}
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.signOutButtonPressed,
              signingOut && styles.buttonDisabled,
            ]}>
            {signingOut ? (
              <ActivityIndicator color="#B4463A" size="small" />
            ) : (
              <LogoutIcon color="#B4463A" size={16} />
            )}
            <Text style={styles.signOutButtonText}>{signingOut ? 'Signing Out…' : 'SIGN OUT'}</Text>
          </Pressable>
        </ScrollView>
      </View>

      <BuyerBottomNavigation activeTab="account" />
    </SafeAreaView>
  );
}
