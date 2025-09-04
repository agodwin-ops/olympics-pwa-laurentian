'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOlympicsAuth } from '@/contexts/OlympicsAuthContext';
import { User, PlayerStats, PlayerSkills, PlayerInventory, QuestProgress } from '@/types/olympics';
import { getRankByXP, getRankProgress, getNextRank, getXPForNextRank, getQuestPercentages, QUEST_INFO } from '@/lib/rank-system';
import AdminPanel from '@/components/admin/AdminPanel';
import OlympicGameboard from '@/components/gameboard/OlympicGameboard';
import PasswordChangeModal from '@/components/PasswordChangeModal';
import apiClient from '@/lib/api-client';

interface TabNavigationProps {
  activeTab: 'dashboard' | 'gameboard' | 'resources' | 'admin';
  onTabChange: (tab: TabNavigationProps['activeTab']) => void;
}

function TabNavigation({ activeTab, onTabChange, user }: TabNavigationProps & { user: User }) {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8" role="tablist">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`py-4 px-1 border-b-2 font-oswald font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-olympic-blue text-olympic-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onTabChange('gameboard')}
            className={`py-4 px-1 border-b-2 font-oswald font-medium text-sm ${
              activeTab === 'gameboard'
                ? 'border-olympic-blue text-olympic-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Gameboard
          </button>
          <button
            onClick={() => onTabChange('resources')}
            className={`py-4 px-1 border-b-2 font-oswald font-medium text-sm ${
              activeTab === 'resources'
                ? 'border-olympic-blue text-olympic-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Resources
          </button>
          {user.isAdmin && (
            <button
              onClick={() => onTabChange('admin')}
              className={`py-4 px-1 border-b-2 font-oswald font-medium text-sm ${
                activeTab === 'admin'
                  ? 'border-olympic-blue text-olympic-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Admin
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

interface DashboardViewProps {
  user: User;
  userProgress: any;
}

function DashboardView({ user, userProgress }: DashboardViewProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [skills, setSkills] = useState<PlayerSkills | null>(null);
  const [inventory, setInventory] = useState<PlayerInventory | null>(null);
  
  // Update stats when real-time progress update arrives
  useEffect(() => {
    if (userProgress && userProgress.stats) {
      setStats(prev => ({ ...prev, ...userProgress.stats }));
    }
    if (userProgress && userProgress.skills) {
      setSkills(prev => ({ ...prev, ...userProgress.skills }));
    }
    if (userProgress && userProgress.inventory) {
      setInventory(prev => ({ ...prev, ...userProgress.inventory }));
    }
  }, [userProgress]);

  // Load real data from API
  useEffect(() => {
    loadPlayerData();
  }, [user]);

  const loadPlayerData = async () => {
    try {
      // Load player profile
      const profileResponse = await apiClient.getMyProfile();
      if (profileResponse.success) {
        setStats(profileResponse.data.stats);
        setSkills(profileResponse.data.skills);
        
        return; // Exit early if API calls succeed
      }
    } catch (error) {
      console.error('Failed to load player data:', error);
    }

    // Fallback to mock data for development
    const mockStats = {
      id: '1',
      userId: user.id,
      currentXP: 250,
      totalXP: 1350, // Updated to show \"Active Toddler\" rank
      currentLevel: 3,
      currentRank: 12,
      gameboardXP: 120,
      gameboardPosition: 4,
      gameboardMoves: 3,
      gold: 45,
      unitXP: { unit1: 200, unit2: 50 },
      questProgress: {
        quest1: 450,
        quest2: 600,
        quest3: 300,
        currentQuest: 2 as 1 | 2 | 3
      },
      assignmentAwards: [
        {
          id: '1',
          assignmentName: 'Growth and Development Quiz',
          xpAwarded: 50,
          questType: 1 as 1 | 2 | 3,
          dateAwarded: new Date('2024-01-15'),
          description: 'Prenatal and infant development assessment'
        },
        {
          id: '2', 
          assignmentName: 'Motor Skills Analysis',
          xpAwarded: 75,
          questType: 1 as 1 | 2 | 3,
          dateAwarded: new Date('2024-01-22'),
          description: 'Early childhood movement patterns'
        },
        {
          id: '3',
          assignmentName: 'Cognitive Development Essay',
          xpAwarded: 100,
          questType: 2 as 1 | 2 | 3,
          dateAwarded: new Date('2024-02-05'),
          description: 'Analysis of childhood learning stages'
        }
      ],
      medals: [
        { type: 'silver' as const, category: 'assignment' as const, earnedAt: new Date(), description: 'First Assignment Complete' }
      ]
    };

    setStats(mockStats);

    // Mock skills
    setSkills({
      id: '1',
      userId: user.id,
      strength: 2,
      endurance: 3,
      tactics: 1,
      climbing: 2,
      speed: 1
    });

    // Mock inventory
    setInventory({
      id: '1',
      userId: user.id,
      water: 3,
      gatorade: 2,
      firstAidKit: 1,
      skis: 4,
      toques: 2
    });

  };

  const getSkillSuccessRate = (level: number) => level * 20;
  const getXPToNextLevel = (currentXP: number) => Math.ceil(currentXP / 200) * 200 - currentXP;
  
  // Helper function to get quest progress with defaults
  const getQuestProgress = (stats: PlayerStats): QuestProgress => {
    return stats.questProgress || {
      quest1: 0,
      quest2: 0,
      quest3: 0,
      currentQuest: 1
    };
  };
  
  // Helper function to calculate medal based on Gameboard XP class ranking
  const getGameboardMedal = (gameboardXP: number, totalClassSize: number = 30) => {
    // Simulate class ranking based on Gameboard XP (mock data)
    // In real implementation, this would query all students' Gameboard XP
    const mockClassGameboardXPs = [
      200, 180, 150, 140, 130, 120, 110, 100, 95, 90,  // Top 10
      85, 80, 75, 70, 65, 60, 55, 50, 45, 40,          // Middle 10
      35, 30, 25, 20, 15, 10, 8, 5, 3, 0               // Bottom 10
    ];
    
    // Find player's position in class
    let position = 1;
    for (let i = 0; i < mockClassGameboardXPs.length; i++) {
      if (gameboardXP >= mockClassGameboardXPs[i]) {
        position = i + 1;
        break;
      }
      if (i === mockClassGameboardXPs.length - 1) {
        position = mockClassGameboardXPs.length + 1;
      }
    }
    
    // Determine medal based on position
    const topThird = Math.ceil(totalClassSize / 3);
    const middleThird = Math.ceil((totalClassSize * 2) / 3);
    
    if (position <= topThird) {
      return { type: 'gold', emoji: '🥇', position };
    } else if (position <= middleThird) {
      return { type: 'silver', emoji: '🥈', position };
    } else {
      return { type: 'bronze', emoji: '🥉', position };
    }
  };

  if (!stats || !skills || !inventory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olympic-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your Olympic progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Section */}
        <div className="lg:col-span-1">
          <div className="chef-card p-6">
            <div className="text-center">
              {user.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user.username}
                  className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-olympic-blue shadow-lg"
                  onError={(e) => {
                    // Hide the image and show fallback if it fails to load
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-24 h-24 rounded-full mx-auto mb-4 bg-olympic-blue flex items-center justify-center border-4 border-white shadow-lg ${user.profilePicture ? 'hidden' : ''}`}>
                <span className="text-white text-3xl font-oswald font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              
              <h2 className="text-xl font-oswald font-bold text-gray-900 mb-1">
                Olympic Athlete {user.username}
              </h2>
              <p className="text-gray-600 mb-4">{user.userProgram}</p>
              
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="text-center">
                  <div className="font-oswald font-bold text-lg text-olympic-blue">
                    {stats.currentLevel}
                  </div>
                  <div className="text-gray-500">Level</div>
                </div>
                <div className="text-center">
                  <div className="font-oswald font-bold text-lg text-canada-red">
                    #{stats.currentRank}
                  </div>
                  <div className="text-gray-500">Rank</div>
                </div>
                <div className="text-center">
                  <div className="font-oswald font-bold text-lg text-olympic-yellow">
                    {stats.gold}
                  </div>
                  <div className="text-gray-500">Gold</div>
                </div>
              </div>
            </div>
          </div>

          {/* Skills Section */}
          <div className="chef-card p-6 mt-6">
            <h3 className="font-oswald font-bold text-lg text-gray-900 mb-4">Game Skills</h3>
            <div className="space-y-4">
              {Object.entries(skills).filter(([key]) => key !== 'id' && key !== 'userId').map(([skill, level]) => (
                <div key={skill}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700 capitalize">{skill}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Level {level as number}</span>
                      <span className="text-xs text-olympic-blue">
                        ({getSkillSuccessRate(level as number)}% success)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="skill-bar rounded-full"
                      style={{ width: `${(level as number) * 20}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gameboard Status */}
          <div className="chef-card p-6 mt-6">
            <h3 className="font-oswald font-bold text-lg text-gray-900 mb-4">Gameboard Status</h3>
            <div className="space-y-4">
              <div className="text-center p-4 bg-winter-ice rounded-lg border border-olympic-blue">
                <div className="text-2xl mb-2">🏔️</div>
                <div className="font-oswald font-bold text-lg text-olympic-blue">Station {stats?.gameboardPosition || 0}</div>
                <div className="text-gray-600 text-sm">Current Position</div>
              </div>
              <div className="text-center p-4 bg-winter-ice rounded-lg border border-olympic-blue">
                <div className="text-2xl mb-2">🎲</div>
                <div className="font-oswald font-bold text-lg text-olympic-blue">{stats?.gameboardMoves || 0}</div>
                <div className="text-gray-600 text-sm">Moves Available</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-300">
                <div className="text-2xl mb-2">{stats?.gameboardXP ? getGameboardMedal(stats.gameboardXP).emoji : '🥉'}</div>
                <div className="font-oswald font-bold text-lg text-yellow-700">
                  Rank {stats?.gameboardXP ? getGameboardMedal(stats.gameboardXP).position : 'N/A'}
                </div>
                <div className="text-gray-600 text-sm capitalize">{stats?.gameboardXP ? getGameboardMedal(stats.gameboardXP).type : 'bronze'} Medal</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats */}
        <div className="lg:col-span-2">
          {/* Experience Progress with Rank System */}
          <div className="chef-card p-6 mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-oswald font-bold text-lg text-gray-900">Experience Progress</h3>
              <span className="text-sm text-gray-600">
                {(() => {
                  const questProgress = getQuestProgress(stats);
                  const totalClassXP = questProgress.quest1 + questProgress.quest2 + questProgress.quest3;
                  const nextRank = getNextRank(totalClassXP);
                  const xpNeeded = getXPForNextRank(totalClassXP);
                  
                  return nextRank ? `${xpNeeded} XP to Next Level` : 'Max Level Achieved';
                })()}
              </span>
            </div>
            
            {/* Current Rank Display */}
            <div className="bg-gradient-to-r from-olympic-blue to-olympic-green p-4 rounded-lg mb-4 text-white text-center">
              <div className="font-oswald font-bold text-2xl">
                {(() => {
                  const questProgress = getQuestProgress(stats);
                  const totalClassXP = questProgress.quest1 + questProgress.quest2 + questProgress.quest3;
                  return getRankByXP(totalClassXP).name;
                })()}
              </div>
              <div className="text-sm opacity-90">
                Rank {stats.currentRank} of all players
              </div>
            </div>
            
            {/* Rank Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                className="bg-gradient-to-r from-olympic-blue to-olympic-green rounded-full h-4 transition-all duration-500"
                style={{ 
                  width: `${(() => {
                    const questProgress = getQuestProgress(stats);
                    const totalClassXP = questProgress.quest1 + questProgress.quest2 + questProgress.quest3;
                    return getRankProgress(totalClassXP);
                  })()}%` 
                }}
              ></div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="font-oswald font-bold text-2xl text-olympic-blue">
                  {(() => {
                    const questProgress = getQuestProgress(stats);
                    // Show current quest XP only
                    switch(questProgress.currentQuest) {
                      case 1: return questProgress.quest1;
                      case 2: return questProgress.quest2;
                      case 3: return questProgress.quest3;
                      default: return questProgress.quest1;
                    }
                  })()}
                </div>
                <div className="text-gray-500 text-sm">Quest XP</div>
              </div>
              <div>
                <div className="font-oswald font-bold text-2xl text-olympic-green">
                  {(() => {
                    const questProgress = getQuestProgress(stats);
                    return questProgress.quest1 + questProgress.quest2 + questProgress.quest3;
                  })()}
                </div>
                <div className="text-gray-500 text-sm">Total Class XP</div>
              </div>
              <div>
                <div className="font-oswald font-bold text-2xl text-olympic-yellow">{stats.gameboardXP}</div>
                <div className="text-gray-500 text-sm">Gameboard XP</div>
              </div>
            </div>
          </div>
          
          {/* Quest Progress Tracking */}
          <div className="chef-card p-6 mb-6">
            <h3 className="font-oswald font-bold text-lg text-gray-900 mb-4">Quest Progress</h3>
            
            {/* Current Quest Indicator */}
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: QUEST_INFO[getQuestProgress(stats).currentQuest].color }}>
              <div className="font-medium text-gray-800">
                Currently Active: {QUEST_INFO[getQuestProgress(stats).currentQuest].name}
              </div>
            </div>
            
            {/* Quest XP Totals with Individual Progress Wheels */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Quest 1 */}
              <div className="text-center p-3 bg-pink-50 rounded-lg">
                <div className="font-oswald font-bold text-xl text-pink-600">{getQuestProgress(stats).quest1}</div>
                <div className="text-xs text-gray-600">Quest 1: Babies</div>
                <div className="flex justify-center mt-2">
                  <div className="w-16 h-16 relative">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke="#fce7f3"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke="#ec4899"
                        strokeWidth="8"
                        strokeDasharray={`${Math.min(251, (getQuestProgress(stats).quest1 / 1000) * 251)} ${251 - Math.min(251, (getQuestProgress(stats).quest1 / 1000) * 251)}`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs font-bold text-pink-600">
                        {Math.round((getQuestProgress(stats).quest1 / 1000) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quest 2 */}
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="font-oswald font-bold text-xl text-blue-600">{getQuestProgress(stats).quest2}</div>
                <div className="text-xs text-gray-600">Quest 2: Childhood</div>
                <div className="flex justify-center mt-2">
                  <div className="w-16 h-16 relative">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke="#dbeafe"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke="#3b82f6"
                        strokeWidth="8"
                        strokeDasharray={`${Math.min(251, (getQuestProgress(stats).quest2 / 1000) * 251)} ${251 - Math.min(251, (getQuestProgress(stats).quest2 / 1000) * 251)}`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs font-bold text-blue-600">
                        {Math.round((getQuestProgress(stats).quest2 / 1000) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Quest 3 */}
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="font-oswald font-bold text-xl text-green-600">{getQuestProgress(stats).quest3}</div>
                <div className="text-xs text-gray-600">Quest 3: Adolescence+</div>
                <div className="flex justify-center mt-2">
                  <div className="w-16 h-16 relative">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke="#dcfce7"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="8"
                        strokeDasharray={`${Math.min(251, (getQuestProgress(stats).quest3 / 1000) * 251)} ${251 - Math.min(251, (getQuestProgress(stats).quest3 / 1000) * 251)}`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-xs font-bold text-green-600">
                        {Math.round((getQuestProgress(stats).quest3 / 1000) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


          {/* Olympic Achievements */}
          <div className="chef-card p-6">
            <h3 className="font-oswald font-bold text-lg text-gray-900 mb-4">Olympic Achievements</h3>
            
            {/* Assignment-based XP Awards */}
            <div className="space-y-3">
              {stats.assignmentAwards && stats.assignmentAwards.length > 0 ? (
                <>
                  <h4 className="font-medium text-gray-900 mb-3">Assignment XP Awards</h4>
                  {stats.assignmentAwards.map((award) => (
                    <div key={award.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <div className="text-xl">📚</div>
                        <div>
                          <div className="font-medium text-gray-900">{award.assignmentName}</div>
                          <div className="text-sm text-gray-500">
                            Awarded {award.dateAwarded.toLocaleDateString()} • Quest {award.questType}
                          </div>
                          {award.description && (
                            <div className="text-xs text-gray-400 mt-1">{award.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-oswald font-bold text-lg text-green-600">+{award.xpAwarded}</div>
                        <div className="text-xs text-gray-500">XP Awarded</div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-3">🎯</div>
                  <p>No assignments completed yet</p>
                  <p className="text-sm">XP awards will appear here as you complete assignments</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

function StudentResourcesView({ user }: { user: User }) {
  const [lectures, setLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    loadResourcesData();
  }, [selectedUnit]);

  const loadResourcesData = async () => {
    try {
      setLoading(true);
      
      // Load lectures
      const lecturesResponse = await apiClient.getLectures(selectedUnit || undefined, true); // Only published for students
      if (lecturesResponse.success) {
        setLectures(lecturesResponse.data);
      }

      // Load units
      const unitsResponse = await apiClient.getUnits();
      if (unitsResponse.success) {
        setUnits(unitsResponse.data);
      }

      // Students see empty state until proper API integration - no admin localStorage access
      if (!lecturesResponse.success) {
        setLectures([]);
      }

      if (!unitsResponse.success) {
        const mockUnits = [
          {
            id: 'quest1',
            name: 'Quest 1: Babies',
            description: 'Prenatal development through infancy (0-2 years)',
            is_active: true
          },
          {
            id: 'quest2',
            name: 'Quest 2: Children',
            description: 'Early childhood and physical literacy development (2-12 years)',
            is_active: true
          },
          {
            id: 'quest3',
            name: 'Quest 3: Adolescence',
            description: 'Adolescent development and beyond (12+ years)',
            is_active: true
          }
        ];
        setUnits(mockUnits);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📊';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📈';
    if (fileType.includes('zip') || fileType.includes('archive')) return '🗜️';
    return '📎';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olympic-blue mx-auto mb-4"></div>
            <p className="text-gray-600">Loading learning resources...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-oswald font-bold text-gray-900">Learning Resources</h2>
            <p className="text-gray-600 mt-2">Access course materials, assignments, and study guides</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-oswald font-bold text-olympic-blue">{lectures.length}</div>
            <div className="text-sm text-gray-500">Available Lectures</div>
          </div>
        </div>
      </div>

      {/* Unit Filter */}
      {units.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Quest
          </label>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
          >
            <option value="">All Quests</option>
            {units.filter(unit => unit.is_active).map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Lectures List */}
      <div className="space-y-6">
        {lectures.map((lecture, index) => (
          <div key={lecture.id} className="chef-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-olympic-blue rounded-full flex items-center justify-center">
                    <span className="text-white font-oswald font-bold text-lg">{index + 1}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-oswald font-bold text-gray-900 mb-2">
                    {lecture.title}
                  </h3>
                  {lecture.description && (
                    <p className="text-gray-600 mb-2">{lecture.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {lecture.unit_id && (
                      <span>Quest: {units.find(u => u.id === lecture.unit_id)?.name || 'Unknown'}</span>
                    )}
                    <span>Resources: {lecture.resources?.length || 0}</span>
                    <span>Published: {new Date(lecture.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Resources */}
            {lecture.resources && lecture.resources.length > 0 ? (
              <div className="border-t pt-4">
                <h4 className="font-oswald font-bold text-gray-900 mb-4">📎 Course Materials</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lecture.resources.filter((resource: any) => resource.is_public).map((resource: any) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-4 bg-winter-ice rounded-lg border border-olympic-blue/20 hover:bg-olympic-blue/5 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getFileIcon(resource.file_type)}</div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {resource.original_filename}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(resource.file_size)}
                          </div>
                          {resource.description && (
                            <div className="text-xs text-olympic-blue mt-1 font-medium">
                              {resource.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => {
                            alert(`Download functionality is disabled in development mode.\n\nFile: ${resource.original_filename}\nSize: ${formatFileSize(resource.file_size)}\nType: ${resource.file_type}`);
                          }}
                          className="olympic-button text-sm px-3 py-1"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-t pt-4 text-center text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm">Resources will be added by your instructor</p>
                <p className="text-xs text-gray-400 mt-1">
                  PDFs, videos, images, spreadsheets, and web links will appear here
                </p>
              </div>
            )}
          </div>
        ))}

        {lectures.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-oswald font-bold text-gray-900 mb-2">No Resources Available</h3>
            <p className="text-gray-600 mb-4">
              Your instructor hasn't published any learning materials yet.
            </p>
            <p className="text-gray-500 text-sm">
              Check back later or contact your instructor for more information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useOlympicsAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gameboard' | 'resources' | 'admin'>('dashboard');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Shared states for gameboard and dashboard
  const [sharedStats, setSharedStats] = useState<PlayerStats | null>(null);
  const [sharedSkills, setSharedSkills] = useState<PlayerSkills | null>(null);
  const [sharedInventory, setSharedInventory] = useState<PlayerInventory | null>(null);
  
  // Mock user progress data
  const userProgress = {
    quest1: 0,
    quest2: 0,
    quest3: 0,
    currentQuest: 1 as 1 | 2 | 3
  };

  // Function to get program-specific skill bonus
  const getProgramSkillBonus = (program: string): Partial<PlayerSkills> => {
    switch (program) {
      case 'BPHE Kinesiology':
        return { strength: 3 };
      case 'BPHE Health Promotion':
        return { speed: 3 };
      case 'BPHE Outdoor Adventure':
        return { strength: 3 };
      case 'BPHE Sport Psychology':
        return { climbing: 3 };
      case 'EDPH':
        return { strength: 3 };
      case 'BSc Kinesiology':
        return { endurance: 3 };
      default:
        return {};
    }
  };

  // Initialize shared data
  useEffect(() => {
    if (user && !sharedStats) {
      console.log('🎮 Initializing new user with starting stats, including 3 gold');
      // Initialize starting stats - all users start with these base stats
      const mockStats: PlayerStats = {
        id: '1',
        userId: user.id,
        currentXP: 0, // Start with 0 XP
        totalXP: 0, // Start with 0 total XP
        currentLevel: 1, // Start at level 1
        currentRank: 100, // Start at bottom rank
        gameboardXP: 0, // No gameboard XP initially
        gameboardPosition: 0, // Start at position 0
        gameboardMoves: 3, // All users start with 3 moves
        gold: 3, // All users start with 3 gold
        unitXP: { unit1: 0, unit2: 0 }, // No unit XP initially
        questProgress: { // Initialize quest tracking
          quest1: 0,
          quest2: 0, 
          quest3: 0,
          currentQuest: 1 as 1 | 2 | 3 // Start with Quest 1: Babies
        },
        assignmentAwards: [], // No assignment awards initially
        medals: [] // No medals initially
      };

      // Get program-specific skill bonus
      const programBonus = getProgramSkillBonus(user.userProgram);
      
      // All users start with Level 1 skills across the board
      const mockSkills: PlayerSkills = {
        id: '1',
        userId: user.id,
        strength: 1,
        endurance: 1,
        tactics: 1,
        climbing: 1,
        speed: 1,
        ...programBonus // Apply program-specific Level 3 bonus
      };

      // All users start with empty inventory
      const mockInventory: PlayerInventory = {
        id: '1',
        userId: user.id,
        water: 0,
        gatorade: 0,
        firstAidKit: 0,
        skis: 0,
        toques: 0
      };

      setSharedStats(mockStats);
      setSharedSkills(mockSkills);
      setSharedInventory(mockInventory);
    }
  }, [user, sharedStats]);

  // Handlers for updating shared states
  const handleStatsUpdate = (updates: Partial<PlayerStats>) => {
    setSharedStats(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleSkillsUpdate = (updates: Partial<PlayerSkills>) => {
    setSharedSkills(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleInventoryUpdate = (updates: Partial<PlayerInventory>) => {
    setSharedInventory(prev => prev ? { ...prev, ...updates } : null);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/onboarding');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen winter-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-olympic-blue rounded-full mb-4 shadow-lg animate-pulse">
            <span className="text-white text-2xl font-oswald font-bold">🏔️</span>
          </div>
          <h1 className="text-2xl font-oswald font-bold text-gray-900 mb-2">
            Loading Olympics RPG...
          </h1>
          <p className="text-gray-600">
            Preparing your Olympic dashboard
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to onboarding
  }

  const handleLogout = () => {
    // Will be implemented when we add the logout functionality
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen winter-bg">
      {/* Header */}
      <div className="olympics-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🏔️</span>
                <div>
                  <h1 className="font-oswald font-bold text-xl text-gray-900">
                    XV Winter Olympic Saga Game
                  </h1>
                  <p className="text-sm text-gray-600">XV Winter Olympics Experience</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user.isAdmin && (
                <div className="px-3 py-1 bg-canada-red text-white rounded-full text-xs font-oswald font-bold">
                  {user.adminRole || 'ADMIN'}
                </div>
              )}
              {!user.isAdmin && (
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="olympic-button-secondary text-sm"
                >
                  Change Password
                </button>
              )}
              <button
                onClick={handleLogout}
                className="olympic-button secondary text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} user={user} />

      {/* Content */}
      {activeTab === 'dashboard' && <DashboardView user={user} userProgress={userProgress} />}
      
      {activeTab === 'gameboard' && sharedStats && sharedSkills && sharedInventory && (
        <OlympicGameboard
          user={user}
          playerStats={sharedStats}
          playerSkills={sharedSkills}
          inventory={sharedInventory}
          onStatsUpdate={handleStatsUpdate}
          onSkillsUpdate={handleSkillsUpdate}
          onInventoryUpdate={handleInventoryUpdate}
        />
      )}
      
      {activeTab === 'gameboard' && (!sharedStats || !sharedSkills || !sharedInventory) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olympic-blue mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your Olympic gameboard...</p>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'resources' && (
        <StudentResourcesView user={user} />
      )}
      
      {activeTab === 'admin' && user.isAdmin && (
        <div>
          <AdminPanel currentUser={user} />
        </div>
      )}
      
      {activeTab === 'admin' && !user.isAdmin && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <div className="chef-card p-12">
            <div className="text-6xl mb-4">🚫</div>
            <h3 className="text-xl font-oswald font-bold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">This section is only available to administrators.</p>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
}