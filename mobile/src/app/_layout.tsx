import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '@/context/auth-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen
          name="WorkerTaskCompletion"
          options={{ contentStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
        />
        <Stack.Screen
          name="DriverTaskCompletion"
          options={{ contentStyle: { backgroundColor: 'transparent' }, presentation: 'transparentModal' }}
        />
      </Stack>
    </AuthProvider>
  );
}
