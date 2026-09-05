import { styles } from '@/styles/welcome.styles';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, ImageBackground, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export default function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height < 720;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* Full Background Farm Image */}
      <ImageBackground
        source={require('../../assets/images/welcome-pineapple-farm.png')}
        resizeMode="cover"
        style={styles.background}
      />

      {/* Light-Yellowish Seamless Gradient Overlays */}
      <Svg style={styles.gradientLayer} preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="topYellowFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFD9" stopOpacity="1" />
            <Stop offset="28%" stopColor="#FFFFD9" stopOpacity="1" />
            <Stop offset="36%" stopColor="#FFFFD9" stopOpacity="0.97" />
            <Stop offset="45%" stopColor="#FFFFD9" stopOpacity="0.84" />
            <Stop offset="55%" stopColor="#FFFFD9" stopOpacity="0.55" />
            <Stop offset="65%" stopColor="#FFFFD9" stopOpacity="0.22" />
            <Stop offset="74%" stopColor="#FFFFD9" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="bottomVignette" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0%" stopColor="#14180F" stopOpacity="0.38" />
            <Stop offset="26%" stopColor="#14180F" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#topYellowFade)" />
        <Rect x="0" y="70" width="100" height="30" fill="url(#bottomVignette)" />
      </Svg>

      {/* Foreground Content */}
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + (compact ? 6 : 14),
            paddingBottom: insets.bottom + (compact ? 12 : 20),
          },
        ]}>
        {/* Brand Logo */}
        <View style={[styles.logoContainer, compact && styles.logoContainerCompact]}>
          <Image
            source={require('@/assets/images/toledo-trading-logo.png')}
            resizeMode="contain"
            style={[styles.brandLogo, compact && styles.brandLogoCompact]}
          />
        </View>

        {/* Modern Headline */}
        <View style={styles.headlineWrap}>
          <Text style={[styles.headlineLine1, compact && styles.headlineLine1Compact]}>
            FRESH FROM
          </Text>
          <Text style={[styles.headlineLine2Text, compact && styles.headlineLine2TextCompact]}>
            THE SOURCE
          </Text>
        </View>

        {/* Subtitle */}
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
          Growing sweeter pineapples today for a greener tomorrow.
        </Text>

        {/* Bottom Glassmorphic CTA Button */}
        <View style={styles.buttonContainer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get started with AgriVerse"
            onPress={() => router.push('/authentication')}
            style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}>
            <BlurView intensity={35} tint="light" style={styles.startButtonBlur}>
              <Text style={styles.startButtonText}>Get Started</Text>
            </BlurView>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
