'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import OlympicsWebSocketClient, { WebSocketMessage } from '@/lib/websocket-client';
import { useOlympicsAuth } from '@/contexts/OlympicsAuthContext';

interface RealTimeState {
  connected: boolean;
  leaderboard: any | null;
  userProgress: any | null;
  notifications: WebSocketMessage[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

interface UseRealTimeUpdatesOptions {
  autoConnect?: boolean;
  showToastNotifications?: boolean;
}

export function useRealTimeUpdates(options: UseRealTimeUpdatesOptions = {}) {
  const { autoConnect = true, showToastNotifications = true } = options;
  const { user } = useOlympicsAuth();
  const wsClient = useRef<OlympicsWebSocketClient | null>(null);
  
  const [state, setState] = useState<RealTimeState>({
    connected: false,
    leaderboard: null,
    userProgress: null,
    notifications: [],
    connectionStatus: 'disconnected'
  });

  // Initialize WebSocket client
  useEffect(() => {
    if (!user || !autoConnect) return;

    const token = localStorage.getItem('olympics_auth_token');
    if (!token) return;

    // Create WebSocket client
    wsClient.current = new OlympicsWebSocketClient(user.id, token, {
      onConnect: () => {
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          connectionStatus: 'connected' 
        }));
        console.log('Real-time updates connected');
      },

      onDisconnect: () => {
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connectionStatus: 'disconnected' 
        }));
        console.log('Real-time updates disconnected');
      },

      onError: (error) => {
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connectionStatus: 'error' 
        }));
        console.error('Real-time connection error:', error);
      },

      onLeaderboardUpdate: (data) => {
        setState(prev => ({ ...prev, leaderboard: data }));
        console.log('Leaderboard updated:', data);
      },

      onProgressUpdate: (data) => {
        setState(prev => ({ ...prev, userProgress: data }));
        console.log('User progress updated:', data);
      },

      onAchievementNotification: (data) => {
        const notification = {
          type: 'achievement_notification',
          data,
          timestamp: new Date().toISOString()
        };
        
        setState(prev => ({ 
          ...prev, 
          notifications: [notification, ...prev.notifications].slice(0, 50) // Keep last 50
        }));

        if (showToastNotifications) {
          showAchievementToast(data);
        }
      },

      onAwardNotification: (data) => {
        const notification = {
          type: 'award_notification',
          data,
          timestamp: new Date().toISOString()
        };
        
        setState(prev => ({ 
          ...prev, 
          notifications: [notification, ...prev.notifications].slice(0, 50)
        }));

        if (showToastNotifications) {
          showAwardToast(data);
        }
      },

      onSystemAnnouncement: (data) => {
        const notification = {
          type: 'system_announcement',
          data,
          timestamp: new Date().toISOString()
        };
        
        setState(prev => ({ 
          ...prev, 
          notifications: [notification, ...prev.notifications].slice(0, 50)
        }));

        if (showToastNotifications) {
          showAnnouncementToast(data);
        }
      },

      onMessage: (message) => {
        // Handle any other messages
        console.log('WebSocket message received:', message);
      }
    });

    // Set initial connection status
    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));

    // Connect
    wsClient.current.connect();

    // Cleanup on unmount
    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect();
      }
    };
  }, [user, autoConnect]);

  // Connect manually
  const connect = useCallback(() => {
    if (wsClient.current) {
      setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
      wsClient.current.connect();
    }
  }, []);

  // Disconnect manually
  const disconnect = useCallback(() => {
    if (wsClient.current) {
      wsClient.current.disconnect();
      setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
    }
  }, []);

  // Request fresh leaderboard
  const refreshLeaderboard = useCallback(() => {
    if (wsClient.current && wsClient.current.isConnected()) {
      wsClient.current.requestLeaderboard();
    }
  }, []);

  // Request fresh user profile
  const refreshProfile = useCallback(() => {
    if (wsClient.current && wsClient.current.isConnected()) {
      wsClient.current.requestProfile();
    }
  }, []);

  // Join a room for targeted updates
  const joinRoom = useCallback((roomName: string) => {
    if (wsClient.current && wsClient.current.isConnected()) {
      wsClient.current.joinRoom(roomName);
    }
  }, []);

  // Leave a room
  const leaveRoom = useCallback((roomName: string) => {
    if (wsClient.current && wsClient.current.isConnected()) {
      wsClient.current.leaveRoom(roomName);
    }
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setState(prev => ({ ...prev, notifications: [] }));
  }, []);

  // Remove specific notification
  const removeNotification = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.filter((_, i) => i !== index)
    }));
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    connect,
    disconnect,
    refreshLeaderboard,
    refreshProfile,
    joinRoom,
    leaveRoom,
    clearNotifications,
    removeNotification,
    
    // Utilities
    isConnected: state.connected,
    hasNotifications: state.notifications.length > 0,
    unreadCount: state.notifications.length
  };
}

// Toast notification functions (you can replace these with your preferred toast library)
function showAchievementToast(data: any) {
  // Simple browser notification
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🏆 Achievement Unlocked!', {
      body: data.description || 'You earned a new achievement!',
      icon: '/icon-192x192.png'
    });
  } else {
    // Fallback to console for now - replace with your toast system
    console.log('🏆 Achievement:', data);
  }
}

function showAwardToast(data: any) {
  const message = `You received ${data.amount} ${data.type}${data.description ? ': ' + data.description : ''}`;
  
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('🎁 Award Received!', {
      body: message,
      icon: '/icon-192x192.png'
    });
  } else {
    console.log('🎁 Award:', message);
  }
}

function showAnnouncementToast(data: any) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('📢 Announcement', {
      body: data.message,
      icon: '/icon-192x192.png'
    });
  } else {
    console.log('📢 Announcement:', data.message);
  }
}

// Request notification permission
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}