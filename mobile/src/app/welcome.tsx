import { styles } from '@/styles/welcome.styles';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image, ImageBackground, Pressable, Text, useWindowDimensions, View } from 'react-native';

export default function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 700;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ImageBackground
        source={require('@/assets/images/welcome-pineapple-farm.png')}
        resizeMode="cover"
        style={styles.background}>
        <View pointerEvents="none" style={styles.tint} />

        <Image
          source={require('@/assets/images/toledo-trading-logo.png')}
          resizeMode="contain"
          style={[styles.brandLogo, compact && styles.brandLogoCompact]}
        />

        <Text style={[styles.headline, compact && styles.headlineCompact]}>
          Fresh From{`\n`}The Source
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Get started with AgriVerse"
          onPress={() => router.push('/authentication')}
          style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}>
          <Text style={styles.startButtonText}>Let&apos;s Start!</Text>
        </Pressable>
      </ImageBackground>
    </View>
  );
}
