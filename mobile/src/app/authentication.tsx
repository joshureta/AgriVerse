import { styles } from '@/styles/authentication.styles';
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
  const panelHeight = Math.max(350, Math.min(height * 0.49, 430));
  const [choice, setChoice] = useState<AuthChoice | null>(mode === 'login' ? 'login' : null);
  const [signUpStep, setSignUpStep] = useState(0);
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const [keyboardActive, setKeyboardActive] = useState(false);

  const loginPanelHeight = Math.max(430, Math.min(height * 0.54, 465));
  const signupPersonalHeight = Math.max(490, Math.min(height * 0.65, 550));
  const signupSecurityHeight = Math.max(470, Math.min(height * 0.61, 515));
  const signupLocationHeight = Math.max(540, Math.min(height - 24, height * 0.78));

  const signupPanelHeight = signUpStep === 1
    ? signupSecurityHeight
    : signUpStep === 2
    ? signupLocationHeight
    : signupPersonalHeight;

  const finalPanelHeight = choice === 'login'
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
      // Allow panel to shift up with keyboard, keeping at least 48px from screen top
      const maxShift = Math.max(0, topSpace - 48);
      const targetShift = choice === 'login'
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
          source={require('@/assets/images/authentication-farm.png')}
          resizeMode="cover"
          style={styles.backgroundImage}
        />
        <View pointerEvents="none" style={styles.backgroundTint} />
      </Pressable>
      {choice && !keyboardActive ? (
        <View pointerEvents="none" style={styles.backgroundLogo}>
          <Image source={require('@/assets/images/toledo-trading-logo.png')} resizeMode="contain" style={styles.backgroundLogoImage} />
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
        {/* Convex Dome Arch Cap */}
        <View style={styles.domeCap}>
          <ConvexDomeCap color="#ffffd8" height={34} />
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
        </View>
      </Animated.View>
    </View>
  );
}
