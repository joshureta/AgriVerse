import type { Href } from 'expo-router';

type RoutingProfile = {
  must_change_password: boolean;
  name_confirmed_at: string | null;
  onboarding_completed_at: string | null;
  worker_category: string | null;
};

export function dashboardRoute(profile: RoutingProfile): Href {
  return profile.worker_category === 'driver'
    ? '/DriverTaskDashboard'
    : '/WorkerTaskPending';
}

export function requiredOnboardingRoute(profile: RoutingProfile): Href | null {
  if (profile.must_change_password) return '/change-password' as Href;
  if (!profile.name_confirmed_at) return '/confirm-name' as Href;
  if (!profile.onboarding_completed_at) return '/location-information' as Href;
  return null;
}

export function postAuthenticationRoute(profile: RoutingProfile): Href {
  return requiredOnboardingRoute(profile) || dashboardRoute(profile);
}
