import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { token, authHeader, API, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/notifications`, { headers: authHeader });
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  }, [token, API]);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user, fetchNotifications]);

  // Real-time WebSocket for notifications, with polling fallback
  useEffect(() => {
    if (!token || !user) return;
    const wsBase = process.env.REACT_APP_BACKEND_URL
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
    let ws;
    let reconnectTimer;
    let pollInterval;
    let wsWorking = false;

    const startPolling = () => {
      if (!pollInterval) {
        pollInterval = setInterval(fetchNotifications, 15000); // poll every 15s as fallback
      }
    };

    const connect = () => {
      ws = new WebSocket(`${wsBase}/api/ws/notifications?token=${token}`);
      ws.onopen = () => {
        wsWorking = true;
        clearInterval(pollInterval);
        pollInterval = null;
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification') {
            setNotifications(prev => [data, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        } catch (e) { /* ignore */ }
      };
      ws.onerror = () => { if (!wsWorking) startPolling(); };
      ws.onclose = () => {
        startPolling();
        reconnectTimer = setTimeout(connect, 10000);
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(pollInterval);
      ws?.close();
    };
  }, [token, user, fetchNotifications]);

  const markAllRead = async () => {
    try {
      await axios.patch(`${API}/notifications/read-all`, {}, { headers: authHeader });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  const markRead = async (notifId) => {
    try {
      await axios.patch(`${API}/notifications/${notifId}/read`, {}, { headers: authHeader });
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
