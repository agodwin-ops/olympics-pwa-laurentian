'use client';

import { useState } from 'react';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { WebSocketMessage } from '@/lib/websocket-client';

interface NotificationCenterProps {
  showInline?: boolean;
  maxVisible?: number;
}

export default function NotificationCenter({ 
  showInline = false, 
  maxVisible = 5 
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { 
    notifications, 
    connected, 
    hasNotifications, 
    unreadCount,
    clearNotifications,
    removeNotification 
  } = useRealTimeUpdates();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'achievement_notification': return '🏆';
      case 'award_notification': return '🎁';
      case 'system_announcement': return '📢';
      case 'progress_update': return '📈';
      case 'leaderboard_update': return '🏅';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'achievement_notification': return 'border-yellow-200 bg-yellow-50';
      case 'award_notification': return 'border-blue-200 bg-blue-50';
      case 'system_announcement': return 'border-red-200 bg-red-50';
      case 'progress_update': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatNotificationMessage = (notification: WebSocketMessage) => {
    switch (notification.type) {
      case 'achievement_notification':
        return {
          title: 'Achievement Unlocked!',
          message: notification.data?.description || 'You earned a new achievement!',
          details: notification.data?.name
        };
        
      case 'award_notification':
        return {
          title: 'Award Received!',
          message: `You received ${notification.data?.amount} ${notification.data?.type}`,
          details: notification.data?.description
        };
        
      case 'system_announcement':
        return {
          title: 'System Announcement',
          message: notification.data?.message || '',
          details: null
        };
        
      case 'progress_update':
        return {
          title: 'Progress Update',
          message: 'Your progress has been updated!',
          details: null
        };
        
      default:
        return {
          title: 'Notification',
          message: notification.message || 'New update available',
          details: null
        };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Inline notifications (for dashboard)
  if (showInline) {
    const recentNotifications = notifications.slice(0, maxVisible);
    
    if (recentNotifications.length === 0) {
      return null;
    }

    return (
      <div className="space-y-3">
        {recentNotifications.map((notification, index) => {
          const { title, message, details } = formatNotificationMessage(notification);
          
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${getNotificationColor(notification.type)} transition-all duration-500 hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{message}</p>
                    {details && (
                      <p className="text-xs text-gray-500 mt-1">{details}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    {formatTimeAgo(notification.timestamp!)}
                  </span>
                  <button
                    onClick={() => removeNotification(index)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Full notification center (dropdown/modal)
  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span className="text-xl">🔔</span>
        {hasNotifications && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900">Notifications</h3>
                  {connected && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
                
                {hasNotifications && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <span className="text-4xl mb-2 block">🔔</span>
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {connected ? 'You\'re connected to live updates' : 'Waiting for connection...'}
                  </p>
                </div>
              ) : (
                notifications.map((notification, index) => {
                  const { title, message, details } = formatNotificationMessage(notification);
                  
                  return (
                    <div
                      key={index}
                      className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-lg flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">
                            {title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {message}
                          </p>
                          {details && (
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {details}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(notification.timestamp!)}
                            </span>
                            <button
                              onClick={() => removeNotification(index)}
                              className="text-xs text-gray-400 hover:text-gray-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {connected ? 'Live updates enabled' : 'Offline mode'}
                </span>
                <span>
                  {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}