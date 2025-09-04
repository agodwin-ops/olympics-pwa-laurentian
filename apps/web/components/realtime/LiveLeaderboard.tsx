'use client';

import { useState, useEffect } from 'react';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { User } from '@/types/olympics';

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    user_program: string;
    profile_picture_url?: string;
  };
  stats: {
    total_xp: number;
    current_level: number;
    current_rank: number;
    gold: number;
  };
}

interface LiveLeaderboardProps {
  currentUser: User;
  initialData?: LeaderboardEntry[];
  showFullLeaderboard?: boolean;
  maxEntries?: number;
}

export default function LiveLeaderboard({ 
  currentUser, 
  initialData = [], 
  showFullLeaderboard = false,
  maxEntries = 10 
}: LiveLeaderboardProps) {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(initialData);
  const [previousRanks, setPreviousRanks] = useState<{ [userId: string]: number }>({});
  const [animatingUsers, setAnimatingUsers] = useState<Set<string>>(new Set());
  
  const { leaderboard, connected, connectionStatus, refreshLeaderboard } = useRealTimeUpdates({
    autoConnect: true,
    showToastNotifications: true
  });

  // Update leaderboard data when real-time update arrives
  useEffect(() => {
    if (leaderboard && leaderboard.overall) {
      // Store previous ranks for animation
      const newPreviousRanks: { [userId: string]: number } = {};
      leaderboardData.forEach(entry => {
        newPreviousRanks[entry.user.id] = entry.rank;
      });
      setPreviousRanks(newPreviousRanks);

      // Set new data
      const newData = leaderboard.overall.slice(0, maxEntries);
      setLeaderboardData(newData);

      // Identify users whose ranks changed for animation
      const changedUsers = new Set<string>();
      newData.forEach((entry: LeaderboardEntry) => {
        const oldRank = newPreviousRanks[entry.user.id];
        if (oldRank && oldRank !== entry.rank) {
          changedUsers.add(entry.user.id);
        }
      });

      setAnimatingUsers(changedUsers);

      // Clear animations after delay
      if (changedUsers.size > 0) {
        setTimeout(() => setAnimatingUsers(new Set()), 2000);
      }
    }
  }, [leaderboard]);

  const getRankChangeIcon = (userId: string, currentRank: number) => {
    const previousRank = previousRanks[userId];
    if (!previousRank || previousRank === currentRank) return null;
    
    if (previousRank > currentRank) {
      return <span className="text-green-500 text-sm">↗️</span>;
    } else {
      return <span className="text-red-500 text-sm">↘️</span>;
    }
  };

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  const formatXP = (xp: number) => {
    if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
    if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
    return xp.toString();
  };

  return (
    <div className="chef-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-oswald font-bold text-gray-900">
            {showFullLeaderboard ? 'Live Leaderboard' : 'Top Performers'}
          </h3>
          {connected ? (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-xs text-gray-500 font-medium">
                {connectionStatus === 'connecting' ? 'CONNECTING...' : 'OFFLINE'}
              </span>
            </div>
          )}
        </div>
        
        <button
          onClick={refreshLeaderboard}
          disabled={!connected}
          className="olympic-button secondary text-sm px-3 py-1 disabled:opacity-50"
          title="Refresh leaderboard"
        >
          🔄
        </button>
      </div>

      {/* Connection Status */}
      {connectionStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">⚠️</span>
            <span className="text-sm text-red-700">
              Connection error. Showing cached data.
            </span>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="space-y-3">
        {leaderboardData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🏆</div>
            <p>No leaderboard data available</p>
            {!connected && (
              <p className="text-sm mt-1">Waiting for connection...</p>
            )}
          </div>
        ) : (
          leaderboardData.map((entry) => {
            const isCurrentUser = entry.user.id === currentUser.id;
            const isAnimating = animatingUsers.has(entry.user.id);
            const medal = getMedalEmoji(entry.rank);
            const rankChange = getRankChangeIcon(entry.user.id, entry.rank);

            return (
              <div
                key={entry.user.id}
                className={`flex items-center space-x-4 p-4 rounded-lg transition-all duration-500 ${
                  isCurrentUser 
                    ? 'bg-olympic-blue/10 border-2 border-olympic-blue' 
                    : 'bg-gray-50 hover:bg-gray-100'
                } ${
                  isAnimating ? 'ring-2 ring-olympic-yellow animate-pulse' : ''
                }`}
              >
                {/* Rank */}
                <div className="flex items-center space-x-2 min-w-[60px]">
                  <div className={`font-oswald font-bold text-lg ${
                    entry.rank <= 3 ? 'text-olympic-blue' : 'text-gray-600'
                  }`}>
                    #{entry.rank}
                  </div>
                  {medal && <span className="text-xl">{medal}</span>}
                  {rankChange}
                </div>

                {/* User Avatar */}
                <div className="flex-shrink-0">
                  {entry.user.profile_picture_url ? (
                    <img
                      src={entry.user.profile_picture_url}
                      alt={entry.user.username}
                      className="w-10 h-10 rounded-full border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-olympic-blue flex items-center justify-center border-2 border-gray-200">
                      <span className="text-white font-bold text-sm">
                        {entry.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className={`font-medium truncate ${
                      isCurrentUser ? 'text-olympic-blue font-bold' : 'text-gray-900'
                    }`}>
                      {entry.user.username}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs bg-olympic-blue text-white px-2 py-1 rounded-full">
                          YOU
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {entry.user.user_program} • Level {entry.stats.current_level}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-oswald font-bold text-olympic-blue">
                      {formatXP(entry.stats.total_xp)}
                    </div>
                    <div className="text-gray-500 text-xs">XP</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="font-oswald font-bold text-olympic-yellow">
                      {entry.stats.gold}
                    </div>
                    <div className="text-gray-500 text-xs">Gold</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {leaderboardData.length > 0 && !showFullLeaderboard && (
        <div className="mt-4 pt-4 border-t text-center">
          <button 
            className="text-olympic-blue hover:text-olympic-blue/80 text-sm font-medium"
            onClick={() => window.location.href = '#leaderboard'}
          >
            View Full Leaderboard →
          </button>
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-4 pt-2 border-t text-xs text-gray-400 text-center">
        {connected ? (
          <span>Updates automatically • Last update: just now</span>
        ) : (
          <span>Offline mode • Data may be outdated</span>
        )}
      </div>
    </div>
  );
}