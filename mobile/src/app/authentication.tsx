import { styles } from '@/styles/authentication.styles';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Pressable, Text, useWindowDimensions, View } from 'react-native';

import LoginScreen from '@/app/login';
import SignUpScreen from '@/app/signup';

type AuthChoice = 'login' | 'signup';

export default function AuthenticationScreen() {
  const { height } = useWindowDimensions();
  const panelHeight = Math.max(350, Math.min(height * 0.49, 430));
  const [choice, setChoice] = useState<AuthChoice | null>(null);
  const transition = useRef(new Animated.Value(0)).current;
  const loginPanelHeight = Math.max(panelHeight, Math.min(height - 24, height * 0.72));
  const signupPanelHeight = Math.max(panelHeight, Math.min(height - 24, height * 0.82));
  const finalPanelHeight = choice === 'login' ? loginPanelHeight : choice === 'signup' ? signupPanelHeight : panelHeight;
  const activePage = choice === 'login' ? 0 : choice === 'signup' ? 1 : 2;

  useEffect(() => {
    if (!choice) return;
    Animated.timing(transition, {
      toValue: 1,
      duration: 420,
      useNativeDriver: false,
    }).start();
  }, [choice, transition]);

  function openAuth(nextChoice: AuthChoice) {
    transition.stopAnimation();
    transition.setValue(0);
    setChoice(nextChoice);
  }

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
      {choice ? (
        <View pointerEvents="none" style={styles.backgroundLogo}>
          <Image source={require('@/assets/images/toledo-trading-logo.png')} resizeMode="contain" style={styles.backgroundLogoImage} />
        </View>
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.panelBackdrop,
          {
            height: transition.interpolate({
              inputRange: [0, 1],
              outputRange: [panelHeight, finalPanelHeight],
            }),
          },
        ]}
      />

      <Animated.View
        style={[
          styles.contentPanel,
          {
            height: transition.interpolate({
              inputRange: [0, 1],
              outputRange: [panelHeight, finalPanelHeight],
            }),
            borderTopLeftRadius: transition.interpolate({ inputRange: [0, 1], outputRange: [118, 26] }),
            borderTopRightRadius: transition.interpolate({ inputRange: [0, 1], outputRange: [118, 26] }),
          },
        ]}>
        {choice ? (
          choice === 'login' ? <LoginScreen embedded onSignUp={() => openAuth('signup')} /> : <SignUpScreen embedded onSignIn={() => openAuth('login')} />
        ) : (
          <>
            <View pointerEvents="none" style={styles.curvedTop} />

            <View style={styles.pageIndicator}>
              {[0, 1, 2].map((page) => (
                <View
                  key={page}
                  style={[
                    styles.indicatorDot,
                    page === activePage
                      ? styles.indicatorDotActive
                      : page === 0
                        ? styles.indicatorDotFirst
                        : styles.indicatorDotSecond,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.title}>Set up your account</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create a farm worker account"
              onPress={() => openAuth('signup')}
              style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}>
              <Text style={styles.outlineButtonText}>Create Account</Text>
            </Pressable>

            <Text style={styles.orText}>or</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in to AgriVerse"
              onPress={() => openAuth('login')}
              style={({ pressed }) => [styles.outlineButton, pressed && styles.buttonPressed]}>
              <Text style={styles.outlineButtonText}>Sign In</Text>
            </Pressable>

            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>Already a user? </Text>
              <Pressable accessibilityRole="link" accessibilityLabel="Log in to AgriVerse" hitSlop={10} onPress={() => openAuth('login')}>
                <Text style={styles.loginLink}>Log in</Text>
              </Pressable>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}
