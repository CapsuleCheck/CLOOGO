import React, {
  createContext, useContext, useState, useEffect, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL!;

// Show notifications while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface User {
  id: string;
  name: string;
  email: string;
  neighborhood: string;
}

interface AuthCtx {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  authHeader: { Authorization: string } | {};
  API: string;
}

const AuthContext = createContext<AuthCtx | null>(null);

async function registerForPushNotifications(apiUrl: string, token: string) {
  if (!Device.isDevice) return; // simulator - skip
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const pushToken = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await axios.post(`${apiUrl}/api/push/expo-token`, { token: pushToken.data }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.warn('Push registration failed:', err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('cloogo_token');
        if (saved) {
          const res = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${saved}` },
          });
          setToken(saved);
          setUser(res.data);
          registerForPushNotifications(API_URL, saved);
        }
      } catch {
        await AsyncStorage.removeItem('cloogo_token');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (t: string, u: User) => {
    await AsyncStorage.setItem('cloogo_token', t);
    setToken(t);
    setUser(u);
    registerForPushNotifications(API_URL, t);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('cloogo_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, logout,
      authHeader: token ? { Authorization: `Bearer ${token}` } : {},
      API: `${API_URL}/api`,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
