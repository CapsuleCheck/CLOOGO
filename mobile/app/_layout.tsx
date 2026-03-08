import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="errand/[id]"
            options={{
              headerShown: true,
              headerTitle: 'Errand Details',
              headerBackTitle: 'Back',
              headerTintColor: '#10b981',
              headerStyle: { backgroundColor: '#fff' },
              headerShadowVisible: false,
              presentation: 'card',
            }}
          />
        </Stack>
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
