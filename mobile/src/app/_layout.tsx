import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { dashboardRoute, requiredOnboardingRoute } from '@/lib/mobile-routing';

const onboardingPaths = new Set([
  '/change-password',
  '/confirm-name',
  '/location-information',
]);

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, profile } = useAuth();

  useEffect(() => {
    if (loading || !profile) return;

    // Once onboarding is completed, redirect away from onboarding paths
    if (profile.onboarding_completed_at) {
      if (onboardingPaths.has(pathname)) {
        router.replace(dashboardRoute(profile));
      }
      return;
    }

    // Initial password change is mandatory before proceeding to subsequent steps
    if (profile.must_change_password) {
      if (pathname !== '/change-password') {
        router.replace('/change-password');
      }
      return;
    }

    // Name confirmation is required before location information
    if (!profile.name_confirmed_at && pathname === '/location-information') {
      router.replace('/confirm-name');
      return;
    }

    // If attempting to access routes outside of onboarding before onboarding is finished
    if (!onboardingPaths.has(pathname)) {
      const requiredRoute = requiredOnboardingRoute(profile);
      if (requiredRoute) {
        router.replace(requiredRoute);
      }
    }
  }, [loading, pathname, profile]);

  return children;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingGuard>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen
            name="login"
            options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#FFFFFF' }, presentation: 'card' }}
          />
          <Stack.Screen
            name="signup"
            options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
          />
          <Stack.Screen
            name="change-password"
            options={{
              animation: 'slide_from_bottom',
              animationTypeForReplace: 'push',
              contentStyle: { backgroundColor: '#FFFFFF' },
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="confirm-name"
            options={{
              animation: 'slide_from_bottom',
              animationTypeForReplace: 'push',
              contentStyle: { backgroundColor: '#FFFFFF' },
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="location-information"
            options={{
              animation: 'slide_from_bottom',
              animationTypeForReplace: 'push',
              contentStyle: { backgroundColor: '#FFFFFF' },
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="WorkerTaskCompletion"
            options={{ animation: 'none', contentStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
          />
          <Stack.Screen
            name="DriverTaskCompletion"
            options={{ animation: 'none', contentStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
          />
          <Stack.Screen
            name="WorkerCompletedTaskDetails"
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="DriverCompletedDeliveryDetails"
            options={{ animation: 'slide_from_right' }}
          />
        </Stack>
      </OnboardingGuard>
    </AuthProvider>
  );
}
