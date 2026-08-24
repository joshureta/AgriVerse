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

    const requiredRoute = requiredOnboardingRoute(profile);
    if (requiredRoute && pathname !== requiredRoute) {
      router.replace(requiredRoute);
      return;
    }

    if (!requiredRoute && onboardingPaths.has(pathname)) {
      router.replace(dashboardRoute(profile));
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
            options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
          />
          <Stack.Screen
            name="signup"
            options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
          />
          <Stack.Screen
            name="WorkerTaskCompletion"
            options={{ contentStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
          />
          <Stack.Screen
            name="DriverTaskCompletion"
            options={{ contentStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
          />
        </Stack>
      </OnboardingGuard>
    </AuthProvider>
  );
}
