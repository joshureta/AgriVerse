import { styles } from '@/styles/authentication.styles';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ImageBackground, Pressable, Text, useWindowDimensions, View } from 'react-native';

export default function AuthenticationScreen() {
  const { height } = useWindowDimensions();
  const panelHeight = Math.max(350, Math.min(height * 0.49, 430));

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ImageBackground
        source={require('@/assets/images/authentication-farm.png')}
        resizeMode="cover"
        style={styles.background}
        imageStyle={styles.backgroundImage}
      />
      <View pointerEvents="none" style={styles.backgroundTint} />

      <View style={[styles.contentPanel, { height: panelHeight }]}>
        <View pointerEvents="none" style={styles.curvedTop} />

        <View style={styles.pageIndicator}>
          <View style={[styles.indicatorDot, styles.indicatorDotFirst]} />
          <View style={[styles.indicatorDot, styles.indicatorDotSecond]} />
          <View style={[styles.indicatorDot, styles.indicatorDotActive]} />
        </View>

        <Text style={styles.title}>Set up your account</Text>

        <View style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Create Account</Text>
        </View>

        <Text style={styles.orText}>or</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in to AgriVerse"
          onPress={() => router.push('/login')}
          style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}>
          <Text style={styles.outlineButtonText}>Sign In</Text>
        </Pressable>

        <View style={styles.loginPrompt}>
          <Text style={styles.loginPromptText}>Already a user? </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Log in to AgriVerse"
            hitSlop={10}
            onPress={() => router.push('/login')}>
            <Text style={styles.loginLink}>Log in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
