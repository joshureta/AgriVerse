import { styles } from '@/styles/authentication.styles';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardEvent,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import LoginScreen from '@/app/login';
import SignUpScreen from '@/app/signup';
import { ConvexDomeCap } from '@/components/convex-dome-cap';

type AuthChoice = 'login' | 'signup';

export default function AuthenticationScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { height } = useWindowDimensions();
  const panelHeight = Math.max(430, Math.min(height * 0.58, 500));
  const [choice, setChoice] = useState<AuthChoice | null>(mode === 'login' ? 'login' : null);
  const [signUpStep, setSignUpStep] = useState(0);
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const [keyboardActive, setKeyboardActive] = useState(false);

  const loginPanelHeight = Math.max(535, Math.min(height * 0.68, 600));
  const signupPersonalHeight = Math.max(590, Math.min(height * 0.74, 650));
  const signupSecurityHeight = Math.max(560, Math.min(height * 0.70, 620));
  const signupLocationHeight = Math.max(610, Math.min(height - 18, height * 0.80));

  const signupPanelHeight =
    signUpStep === 1
      ? signupSecurityHeight
      : signUpStep === 2
      ? signupLocationHeight
      : signupPersonalHeight;

  const finalPanelHeight =
    choice === 'login'
      ? loginPanelHeight
      : choice === 'signup'
      ? signupPanelHeight
      : panelHeight;

  const animatedHeight = useRef(new Animated.Value(panelHeight)).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: finalPanelHeight,
      duration: 380,
      useNativeDriver: false,
    }).start();
  }, [finalPanelHeight, animatedHeight]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      setKeyboardActive(true);
      const kHeight = e.endCoordinates.height;
      const topSpace = height - finalPanelHeight;
      const maxShift = Math.max(0, topSpace - 48);
      const targetShift =
        choice === 'login'
          ? Math.min(kHeight - 30, maxShift)
          : Math.min(kHeight * 0.55, maxShift);

      Animated.timing(keyboardOffset, {
        toValue: -targetShift,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 200,
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e: KeyboardEvent) => {
      setKeyboardActive(false);
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e?.duration || 250) : 200,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [choice, height, finalPanelHeight, keyboardOffset]);

  function openAuth(nextChoice: AuthChoice) {
    Keyboard.dismiss();
    setSignUpStep(0);
    setChoice(nextChoice);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <Pressable onPress={Keyboard.dismiss} style={styles.background}>
        <ImageBackground
          source={require('@/assets/images/auth-banner-haze-v2.png')}
          resizeMode="cover"
          style={styles.backgroundImage}
        />
        <View pointerEvents="none" style={styles.backgroundTint} />
      </Pressable>

      {choice && !keyboardActive ? (
        <View pointerEvents="none" style={styles.backgroundLogo}>
          <Image
            source={require('@/assets/images/toledo-trading-logo.png')}
            resizeMode="contain"
            style={styles.backgroundLogoImage}
          />
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.panelContainer,
          {
            height: animatedHeight,
            transform: [{ translateY: keyboardOffset }],
          },
        ]}>
        {/* Soft agricultural wave connecting the farm hero to the form. */}
        <View style={styles.domeCap}>
          <ConvexDomeCap color="#FEFFFB" height={54} />
        </View>

        {/* Panel Body */}
        <View style={[styles.panelBody, !choice && styles.landingContent]}>
          {choice ? (
            choice === 'login' ? (
              <LoginScreen embedded onSignUp={() => openAuth('signup')} />
            ) : (
              <SignUpScreen embedded onSignIn={() => openAuth('login')} onStepChange={setSignUpStep} />
            )
          ) : (
            <>
              {/* Bottom-left leaf decoration matching web */}
              <View pointerEvents="none" style={styles.leafContainer}>
                <Image
                  source={require('@/assets/images/sign-in-up-bg.png')}
                  style={styles.leafImage}
                  resizeMode="cover"
                />
              </View>

              <Text style={styles.kicker}>TOLEDO TRADING</Text>
              <Text style={styles.title}>Set up your account</Text>
              <Text style={styles.subtitle}>Choose how you’d like to get started with AgriVerse.</Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create a farm worker account"
                onPress={() => openAuth('signup')}
                style={({ pressed }) => [
                  styles.gradientButtonWrapper,
                  pressed && styles.buttonPressed,
                ]}>
                <LinearGradient
                  colors={['#3D9B43', '#185C35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}>
                  <Text style={styles.gradientButtonText}>Create Account</Text>
                </LinearGradient>
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
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Log in to AgriVerse"
                  hitSlop={10}
                  onPress={() => openAuth('login')}>
                  <Text style={styles.loginLink}>Log in</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
