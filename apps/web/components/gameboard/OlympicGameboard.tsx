'use client';

import React, { useState, useEffect } from 'react';
import { User, PlayerStats, PlayerSkills, PlayerInventory, GameboardState, GameboardEvent } from '@/types/olympics';
import { GAMEBOARD_INTRODUCTION, GAMEBOARD_EVENTS, MAIN_STATIONS, CHALLENGE_SPOTS, START_POSITION, SKILL_SUCCESS_RATES, SPECIAL_ITEMS } from '@/lib/gameboard-events';
import EventModal from './EventModal';
import InventoryPanel from './InventoryPanel';
import SkillUpgradePanel from './SkillUpgradePanel';

interface OlympicGameboardProps {
  user: User;
  playerStats: PlayerStats;
  playerSkills: PlayerSkills;
  inventory: PlayerInventory;
  onStatsUpdate: (stats: Partial<PlayerStats>) => void;
  onSkillsUpdate: (skills: Partial<PlayerSkills>) => void;
  onInventoryUpdate: (inventory: Partial<PlayerInventory>) => void;
}

export default function OlympicGameboard({ 
  user, 
  playerStats, 
  playerSkills, 
  inventory,
  onStatsUpdate,
  onSkillsUpdate,
  onInventoryUpdate
}: OlympicGameboardProps) {
  const [gameboardState, setGameboardState] = useState<GameboardState>({
    currentPosition: 0,
    availableMoves: playerStats.gameboardMoves || 0,
    completedEvents: [],
    failedEvents: [],
    hasSeenIntroduction: false
  });
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [isOnPath, setIsOnPath] = useState(false);
  const [completedPathSpots, setCompletedPathSpots] = useState<number[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<GameboardEvent | null>(null);
  const [selectedChallengeSpot, setSelectedChallengeSpot] = useState<any>(null);
  const [challengePhase, setChallengePhase] = useState<'story' | 'challenge' | 'dice-selection' | 'dice-roll' | 'outcome'>('story');
  const [challengeLuckyNumbers, setChallengeLuckyNumbers] = useState({
    skillLevel: 1,
    allowedSelections: 2,
    selectedNumbers: [] as number[],
  });
  const [challengeDiceResult, setChallengeeDiceResult] = useState<number | null>(null);
  const [challengeSuccess, setChallengeSuccess] = useState<boolean | null>(null);
  const [challengeItemsWon, setChallengeItemsWon] = useState<string[]>([]);
  const [showIntroduction, setShowIntroduction] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showSkillUpgrade, setShowSkillUpgrade] = useState(false);

  useEffect(() => {
    // Check if user needs to see introduction
    if (!gameboardState.hasSeenIntroduction) {
      setShowIntroduction(true);
    }
  }, [gameboardState.hasSeenIntroduction]);

  const handleIntroductionComplete = () => {
    setShowIntroduction(false);
    setGameboardState(prev => ({ ...prev, hasSeenIntroduction: true }));
  };

  const handleEventComplete = (eventId: number, success: boolean, xpGained: number, itemsWon?: string[]) => {
    // Update gameboard state
    setGameboardState(prev => ({
      ...prev,
      completedEvents: success ? [...prev.completedEvents, eventId] : prev.completedEvents,
      failedEvents: success ? prev.failedEvents : [...prev.failedEvents, eventId]
    }));

    // Update player stats
    onStatsUpdate({
      gameboardXP: (playerStats.gameboardXP || 0) + xpGained
    });

    // Update inventory if items were won
    if (itemsWon && itemsWon.length > 0) {
      const inventoryUpdate: Partial<PlayerInventory> = {};
      itemsWon.forEach(item => {
        switch (item) {
          case 'Water':
            inventoryUpdate.water = (inventory.water || 0) + 1;
            break;
          case 'Gatorade':
            inventoryUpdate.gatorade = (inventory.gatorade || 0) + 1;
            break;
          case 'Skis':
            inventoryUpdate.skis = (inventory.skis || 0) + 1;
            break;
          case 'Toques':
            inventoryUpdate.toques = (inventory.toques || 0) + 1;
            break;
        }
      });
      onInventoryUpdate(inventoryUpdate);
    }

    // Check if this is the final station (Station 11)
    if (eventId === 11 && success) {
      // Show completion message and offer to restart
      setTimeout(() => {
        const shouldRestart = confirm(
          '🎉 Congratulations! You have completed the entire Calgary Olympics journey!\n\n' +
          'All stations have been conquered! Would you like to restart your journey from the home base?\n\n' +
          '✅ You will keep all your inventory, skills, and XP\n' +
          '✅ You can replay the entire Olympics experience\n' +
          '✅ Your progress and achievements are preserved\n\n' +
          'Click OK to return to the starting position, or Cancel to stay here.'
        );
        
        if (shouldRestart) {
          handleRestartJourney();
        }
      }, 500);
    }

    setSelectedEvent(null);
  };

  const handleRestartJourney = () => {
    // Reset position and path state while keeping all progress
    setGameboardState(prev => ({
      ...prev,
      currentPosition: 0, // Return to start
      // Keep completedEvents and failedEvents - player keeps their achievements
    }));
    
    // Reset path tracking
    setIsOnPath(false);
    setCurrentPath([]);
    setCompletedPathSpots([]);
    
    // Add bonus moves for completing the full journey
    onStatsUpdate({
      gameboardMoves: (playerStats.gameboardMoves || 0) + 10 // Bonus moves for completing
    });
    
    // Show welcome back message
    setTimeout(() => {
      alert('🏠 Welcome back to the Olympic Village!\n\n' +
            '🎁 You\'ve received 10 bonus moves for completing your Olympic journey!\n' +
            '🏆 All your achievements, inventory, and skills have been preserved.\n\n' +
            'Ready to begin another Olympic adventure?');
    }, 100);
  };

  const handleMoveToPosition = (positionId: number) => {
    if (gameboardState.availableMoves > 0) {
      setGameboardState(prev => ({
        ...prev,
        currentPosition: positionId,
        availableMoves: prev.availableMoves - 1
      }));
      
      // Update player stats
      onStatsUpdate({
        gameboardMoves: Math.max(0, (playerStats.gameboardMoves || 0) - 1)
      });
    }
  };

  const handleEventClick = (event: GameboardEvent) => {
    // Check if player can access this event
    if (gameboardState.failedEvents.includes(event.id)) {
      // Player failed this event and must complete all events before retrying
      const totalEvents = GAMEBOARD_EVENTS.length;
      const completedEvents = gameboardState.completedEvents.length;
      
      if (completedEvents < totalEvents) {
        alert('You must complete all other events before retrying a failed event.');
        return;
      }
    }

    setSelectedEvent(event);
  };

  const handleChallengeSpotClick = (challengeSpot: any) => {
    // Check if this challenge spot has already been completed on the current path
    if (isOnPath && completedPathSpots.includes(challengeSpot.id)) {
      alert('You have already completed this challenge spot on the current path. Move forward to the next spot.');
      return;
    }
    
    // Player can interact with challenge spots freely (no adjacency requirement)
    setSelectedChallengeSpot(challengeSpot);
    setChallengePhase('story');
    // Reset challenge state
    setChallengeeDiceResult(null);
    setChallengeSuccess(null);
    setChallengeItemsWon([]);
  };

  const handleChallengeNext = () => {
    switch (challengePhase) {
      case 'story':
        setChallengePhase('challenge');
        break;
      case 'challenge':
        // Initialize dice selection based on Tactics skill level
        const tacticsLevel = playerSkills.tactics || 1;
        const successRate = SKILL_SUCCESS_RATES[tacticsLevel];
        setChallengeLuckyNumbers({
          skillLevel: tacticsLevel,
          allowedSelections: successRate.numbers,
          selectedNumbers: [],
        });
        setChallengePhase('dice-selection');
        break;
      case 'dice-selection':
        // This is handled by the dice roll button
        break;
      case 'dice-roll':
        setChallengePhase('outcome');
        break;
      case 'outcome':
        // Complete the challenge
        handleChallengeComplete();
        break;
    }
  };

  const handleChallengeNumberSelection = (number: number) => {
    if (challengeLuckyNumbers.selectedNumbers.includes(number)) {
      // Remove number
      setChallengeLuckyNumbers(prev => ({
        ...prev,
        selectedNumbers: prev.selectedNumbers.filter(n => n !== number)
      }));
    } else if (challengeLuckyNumbers.selectedNumbers.length < challengeLuckyNumbers.allowedSelections) {
      // Add number
      setChallengeLuckyNumbers(prev => ({
        ...prev,
        selectedNumbers: [...prev.selectedNumbers, number]
      }));
    }
  };

  const handleChallengeDiceRoll = () => {
    if (challengeLuckyNumbers.selectedNumbers.length !== challengeLuckyNumbers.allowedSelections) {
      return;
    }

    // Roll the dice (1-10)
    const roll = Math.floor(Math.random() * 10) + 1;
    const success = challengeLuckyNumbers.selectedNumbers.includes(roll);
    
    setChallengeeDiceResult(roll);
    setChallengeSuccess(success);

    // If successful, win random item
    if (success) {
      const items = ['Gatorade', 'Water', 'Skis', 'Toques', 'First Aid Kit'];
      const wonItem = items[Math.floor(Math.random() * items.length)];
      setChallengeItemsWon([wonItem]);
    }

    setChallengePhase('dice-roll');
  };

  const handleChallengeComplete = () => {
    // Award Gameboard XP for completing challenge (regardless of success/failure)
    const baseXP = challengeSuccess ? 25 : 10; // More XP for success
    onStatsUpdate({
      gameboardXP: (playerStats.gameboardXP || 0) + baseXP
    });

    // Update inventory if items were won
    if (challengeItemsWon.length > 0) {
      const inventoryUpdate: Partial<PlayerInventory> = {};
      challengeItemsWon.forEach(item => {
        switch (item) {
          case 'Water':
            inventoryUpdate.water = (inventory.water || 0) + 1;
            break;
          case 'Gatorade':
            inventoryUpdate.gatorade = (inventory.gatorade || 0) + 1;
            break;
          case 'Skis':
            inventoryUpdate.skis = (inventory.skis || 0) + 1;
            break;
          case 'Toques':
            inventoryUpdate.toques = (inventory.toques || 0) + 1;
            break;
          case 'First Aid Kit':
            inventoryUpdate.firstAidKit = (inventory.firstAidKit || 0) + 1;
            break;
        }
      });
      onInventoryUpdate(inventoryUpdate);
    }

    // Mark current challenge spot as completed on this path
    if (selectedChallengeSpot && isOnPath) {
      setCompletedPathSpots(prev => {
        if (!prev.includes(selectedChallengeSpot.id)) {
          return [...prev, selectedChallengeSpot.id];
        }
        return prev;
      });
    }

    // Close the modal
    setSelectedChallengeSpot(null);
  };

  const canAccessEvent = (event: GameboardEvent) => {
    // Player can access if they haven't failed it, or if they've completed all other events
    if (!gameboardState.failedEvents.includes(event.id)) return true;
    
    const totalEvents = GAMEBOARD_EVENTS.length;
    const completedEvents = gameboardState.completedEvents.length;
    return completedEvents >= totalEvents;
  };

  const canMoveTo = (positionId: number) => {
    // Allow free movement along any path as long as player has moves
    return gameboardState.availableMoves > 0;
  };

  const getAllPositions = () => {
    return [START_POSITION, ...MAIN_STATIONS, ...CHALLENGE_SPOTS];
  };

  // Define linear paths between main stations (removed non-linear paths)
  const getPathBetweenStations = (fromStation: number, toStation: number): number[] => {
    const pathMappings: {[key: string]: number[]} = {
      '0-1': [101], // Start to Station 1
      '1-2': [102, 103, 104], // Station 1 to 2
      '2-3': [105, 106, 107], // Station 2 to 3
      '3-4': [109, 110, 111], // Station 3 to 4
      '4-5': [112, 113, 114, 115], // Station 4 to 5
      '5-6': [117, 118, 119], // Station 5 to 6
      '6-7': [121, 122, 123], // Station 6 to 7
      '7-8': [124, 125, 126], // Station 7 to 8
      '8-9': [128, 129], // Station 8 to 9
      '9-10': [131, 132, 133, 134], // Station 9 to 10
      '10-11': [135, 136, 137], // Station 10 to 11
    };

    const key = `${fromStation}-${toStation}`;
    
    // Only allow forward linear progression - no reverse paths
    if (pathMappings[key]) {
      return pathMappings[key];
    }
    return [];
  };

  // Check if player is currently at a main station
  const isAtMainStation = (positionId: number): boolean => {
    return [START_POSITION.id, ...MAIN_STATIONS.map(s => s.id)].includes(positionId);
  };

  // Get the next expected position on current path
  const getNextPathPosition = (): number | null => {
    if (!isOnPath || currentPath.length === 0) return null;
    
    const currentIndex = currentPath.indexOf(gameboardState.currentPosition);
    if (currentIndex === -1) return null;
    
    if (currentIndex < currentPath.length - 1) {
      return currentPath[currentIndex + 1];
    }
    
    // At end of path, should go to destination station
    return null;
  };

  // Linear movement system - only allow forward progression
  const isMoveAllowed = (targetPosition: number): boolean => {
    // If not on a path, can only start new paths from main stations
    if (!isOnPath) {
      return isAtMainStation(gameboardState.currentPosition);
    }
    
    // If on a path, only allow movement to the immediate next position
    const currentIndex = currentPath.indexOf(gameboardState.currentPosition);
    if (currentIndex === -1) return false;
    
    const nextIndex = currentIndex + 1;
    if (nextIndex >= currentPath.length) return false;
    
    return targetPosition === currentPath[nextIndex];
  };

  const handlePositionClick = (positionId: number, isMainStation: boolean, isStartPosition: boolean = false) => {
    if (isStartPosition) {
      // Start position - show welcome message only if player is actually here
      if (gameboardState.currentPosition === positionId) {
        alert('You are at the starting position. Welcome to the Olympics!');
      } else {
        alert('You cannot return to the start once you have begun your journey.');
      }
    } else if (isMainStation) {
      // Main station logic
      const station = MAIN_STATIONS.find(s => s.id === positionId);
      if (station) {
        const isCompleted = gameboardState.completedEvents.includes(station.id);
        
        if (gameboardState.currentPosition === positionId) {
          // Already at this station
          if (isCompleted) {
            alert(`You have already completed ${station.name}. You can choose a new path from here.`);
          } else {
            // Not completed, show event dialogue
            handleEventClick(station);
          }
        } else {
          // Not at this station - check if this is the next allowed position
          if (isOnPath) {
            // On path - can only go to destination station if at end of path
            const currentIndex = currentPath.indexOf(gameboardState.currentPosition);
            const isDestination = currentIndex === currentPath.length - 2 && positionId === currentPath[currentPath.length - 1];
            
            if (!isDestination) {
              alert('You are on a path and must complete all challenge spots before reaching the destination station.');
              return;
            }
          } else {
            // Not on path - can only start new paths from current main station
            if (!isAtMainStation(gameboardState.currentPosition)) {
              alert('You can only travel to other stations from main stations.');
              return;
            }
          }
          
          if (gameboardState.availableMoves > 0) {
            // Start new path if moving from a main station to another main station
            if (!isOnPath && isAtMainStation(gameboardState.currentPosition)) {
              const pathSpots = getPathBetweenStations(gameboardState.currentPosition, positionId);
              if (pathSpots.length > 0) {
                setCurrentPath([gameboardState.currentPosition, ...pathSpots, positionId]);
                setIsOnPath(true);
                setCompletedPathSpots([]);
                // Move to first challenge spot on path
                handleMoveToPosition(pathSpots[0]);
                setTimeout(() => {
                  const spot = CHALLENGE_SPOTS.find(s => s.id === pathSpots[0]);
                  if (spot) handleChallengeSpotClick(spot);
                }, 100);
                return;
              } else {
                alert('No path available to that station.');
                return;
              }
            }
            
            // Move to destination station
            handleMoveToPosition(positionId);
            // Reset path when reaching a main station
            setIsOnPath(false);
            setCurrentPath([]);
            setCompletedPathSpots([]);
            
            // Show station event if not completed
            if (!isCompleted) {
              setTimeout(() => handleEventClick(station), 100);
            }
          } else {
            alert('You have no moves remaining to travel to this station.');
          }
        }
      }
    } else {
      // Challenge spot - strict linear progression
      const spot = CHALLENGE_SPOTS.find(s => s.id === positionId);
      if (spot) {
        // Only allow interaction with current position or next position on path
        if (gameboardState.currentPosition === positionId) {
          // At this spot - only allow if not already completed on this path
          if (completedPathSpots.includes(positionId)) {
            alert('You have already completed this challenge spot. Move forward to continue your path.');
            return;
          }
          handleChallengeSpotClick(spot);
        } else {
          // Not at this spot - check if it's the next allowed position
          if (!isOnPath) {
            alert('You can only interact with challenge spots while on a path.');
            return;
          }
          
          const currentIndex = currentPath.indexOf(gameboardState.currentPosition);
          const targetIndex = currentPath.indexOf(positionId);
          
          // Only allow forward movement to immediate next position
          if (targetIndex !== currentIndex + 1) {
            if (targetIndex <= currentIndex) {
              alert('No backtracking allowed. You must move forward through the path.');
            } else {
              alert('You must move to challenge spots in sequence. No jumping ahead.');
            }
            return;
          }
          
          if (gameboardState.availableMoves > 0) {
            handleMoveToPosition(positionId);
            setTimeout(() => handleChallengeSpotClick(spot), 100);
          } else {
            alert('You have no moves remaining.');
          }
        }
      }
    }
  };

  const getEventStatus = (event: GameboardEvent) => {
    if (gameboardState.completedEvents.includes(event.id)) return 'completed';
    if (gameboardState.failedEvents.includes(event.id)) return 'failed';
    if (gameboardState.currentPosition === event.id) return 'current';
    return 'available';
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-winter-gradient overflow-hidden">
      {/* Header with stats - Mobile Responsive */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-200 p-3 sm:p-4 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Layout (sm and below) - Improved Spacing */}
          <div className="sm:hidden">
            {/* Top row - Title and action buttons */}
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-oswald font-bold text-gray-900 truncate">
                🏔️ Calgary '88
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowInventory(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm"
                >
                  🎒
                </button>
                <button
                  onClick={() => setShowSkillUpgrade(true)}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm"
                >
                  💪
                </button>
                {gameboardState.currentPosition !== 0 && (
                  <button
                    onClick={() => {
                      const shouldRestart = confirm('Return to Olympic Village? You will keep all items and skills.');
                      if (shouldRestart) {
                        handleRestartJourney();
                      }
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm"
                  >
                    🏠
                  </button>
                )}
              </div>
            </div>
            
            {/* Bottom row - Stats with better mobile layout */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="bg-olympic-blue text-white px-2.5 py-1 rounded-lg text-sm font-bold shadow-sm">
                    {gameboardState.availableMoves}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 font-medium">Moves</div>
                </div>
                <div className="text-center">
                  <div className="bg-olympic-yellow text-white px-2.5 py-1 rounded-lg text-sm font-bold shadow-sm">
                    {playerStats.gold}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 font-medium">Gold</div>
                </div>
                <div className="text-center">
                  <div className="bg-green-600 text-white px-2.5 py-1 rounded-lg text-sm font-bold shadow-sm">
                    {playerStats.gameboardXP || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 font-medium">XP</div>
                </div>
              </div>
              {isOnPath && (
                <div className="text-center">
                  <div className="bg-purple-600 text-white px-2.5 py-1 rounded-lg text-sm font-bold shadow-sm">
                    {currentPath.indexOf(gameboardState.currentPosition) + 1}/{currentPath.length}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 font-medium">Path</div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Layout (sm and above) */}
          <div className="hidden sm:flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <h2 className="text-2xl font-oswald font-bold text-gray-900">
                🏔️ Calgary Olympics 1988
              </h2>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <span className="text-olympic-blue font-bold">Moves:</span>
                  <span className="bg-olympic-blue text-white px-2 py-1 rounded">
                    {gameboardState.availableMoves}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-olympic-yellow font-bold">Gold:</span>
                  <span className="bg-olympic-yellow text-white px-2 py-1 rounded">
                    {playerStats.gold}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-green-600 font-bold">Game XP:</span>
                  <span className="bg-green-600 text-white px-2 py-1 rounded">
                    {playerStats.gameboardXP || 0}
                  </span>
                </div>
                {isOnPath && (
                  <div className="flex items-center space-x-1">
                    <span className="text-purple-600 font-bold">Path:</span>
                    <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">
                      Active ({currentPath.indexOf(gameboardState.currentPosition) + 1}/{currentPath.length})
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowInventory(true)}
                className="olympic-button secondary text-sm"
              >
                🎒 Inventory
              </button>
              <button
                onClick={() => setShowSkillUpgrade(true)}
                className="olympic-button primary text-sm"
              >
                💪 Upgrade Game Skills
              </button>
              {gameboardState.currentPosition !== 0 && (
                <button
                  onClick={() => {
                    const shouldRestart = confirm(
                      '🏠 Return to Olympic Village?\n\n' +
                      '✅ You will keep all inventory, skills, and XP\n' +
                      '✅ You will return to the starting position\n' +
                      '⚠️ Current path progress will be reset\n\n' +
                      'Click OK to return home, or Cancel to stay here.'
                    );
                    if (shouldRestart) {
                      handleRestartJourney();
                    }
                  }}
                  className="olympic-button secondary text-sm"
                >
                  🏠 Return Home
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gameboard - Improved Mobile Spacing */}
      <div className="pt-24 sm:pt-20 pb-6 sm:pb-8 px-3 sm:px-4">
        <div className="max-w-6xl mx-auto">
          <div 
            className="relative w-full bg-gradient-to-br from-blue-100 to-white rounded-xl border-2 border-olympic-blue shadow-lg"
            style={{ 
              minHeight: '450px',
              height: 'calc(100vh - 180px)',
              maxHeight: '650px'
            }}
          >
            {/* Gameboard path/trail */}
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e40af" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              
              {/* Draw connecting paths between start, main stations and challenge spots */}
              {START_POSITION.connectsTo?.map(connectedId => {
                const connectedSpot = [...MAIN_STATIONS, ...CHALLENGE_SPOTS].find(s => s.id === connectedId);
                if (!connectedSpot) return null;
                
                return (
                  <line
                    key={`path-start-${connectedId}`}
                    x1={`${START_POSITION.position.x}%`}
                    y1={`${START_POSITION.position.y}%`}
                    x2={`${connectedSpot.position.x}%`}
                    y2={`${connectedSpot.position.y}%`}
                    stroke="url(#pathGradient)"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                  />
                );
              })}
              {MAIN_STATIONS.map((station) => {
                return station.connectsTo?.map(connectedId => {
                  const connectedStation = [START_POSITION, ...MAIN_STATIONS, ...CHALLENGE_SPOTS].find(s => s.id === connectedId);
                  if (!connectedStation) return null;
                  
                  return (
                    <line
                      key={`path-${station.id}-${connectedId}`}
                      x1={`${station.position.x}%`}
                      y1={`${station.position.y}%`}
                      x2={`${connectedStation.position.x}%`}
                      y2={`${connectedStation.position.y}%`}
                      stroke="url(#pathGradient)"
                      strokeWidth="2"
                      strokeDasharray="3,3"
                    />
                  );
                }) || [];
              })}
              {CHALLENGE_SPOTS.map((spot) => {
                return spot.connectsTo?.map(connectedId => {
                  const connectedSpot = [START_POSITION, ...MAIN_STATIONS, ...CHALLENGE_SPOTS].find(s => s.id === connectedId);
                  if (!connectedSpot) return null;
                  
                  return (
                    <line
                      key={`path-${spot.id}-${connectedId}`}
                      x1={`${spot.position.x}%`}
                      y1={`${spot.position.y}%`}
                      x2={`${connectedSpot.position.x}%`}
                      y2={`${connectedSpot.position.y}%`}
                      stroke="url(#pathGradient)"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      strokeOpacity="0.6"
                    />
                  );
                }) || [];
              })}
            </svg>

            {/* Start position - Mobile Responsive */}
            <div
              key="start-position"
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110 touch-manipulation`}
              style={{
                left: `${START_POSITION.position.x}%`,
                top: `${START_POSITION.position.y}%`,
                minWidth: '44px', // iOS minimum touch target
                minHeight: '44px'
              }}
              onClick={() => handlePositionClick(START_POSITION.id, false, true)}
            >
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full border-3 sm:border-4 flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg transition-all ${
                  gameboardState.currentPosition === START_POSITION.id ? 'bg-olympic-green border-olympic-green text-white animate-pulse' :
                  'bg-olympic-green border-olympic-green text-white hover:bg-green-600'
                }`}
              >
                🏠
              </div>
              
              {/* Start position tooltip - Hidden on mobile */}
              <div className="hidden sm:block absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {START_POSITION.name}
              </div>
              
              {/* Mobile label */}
              <div className="sm:hidden absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700 bg-white/80 px-2 py-0.5 rounded">
                Home
              </div>
            </div>

            {/* Main stations */}
            {MAIN_STATIONS.map((station) => {
              const status = getEventStatus(station);
              const accessible = canAccessEvent(station) && (isMoveAllowed(station.id) || gameboardState.currentPosition === station.id);
              const isCompleted = status === 'completed';
              const isAtThisStation = gameboardState.currentPosition === station.id;
              
              return (
                <div
                  key={`main-${station.id}`}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${
                    accessible ? (isCompleted && isAtThisStation ? 'hover:scale-105' : 'hover:scale-110') : 'opacity-50 cursor-not-allowed'
                  }`}
                  style={{
                    left: `${station.position.x}%`,
                    top: `${station.position.y}%`
                  }}
                  onClick={() => handlePositionClick(station.id, true)}
                >
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 sm:border-4 flex items-center justify-center text-lg sm:text-2xl font-bold shadow-lg transition-all ${
                      status === 'completed' ? 'bg-green-500 border-green-600 text-white opacity-80' :
                      status === 'failed' ? 'bg-red-500 border-red-600 text-white' :
                      status === 'current' ? 'bg-olympic-yellow border-olympic-yellow text-white animate-pulse' :
                      'bg-white border-olympic-blue text-olympic-blue hover:bg-olympic-blue hover:text-white'
                    }`}
                  >
                    {status === 'completed' ? '✓' :
                     status === 'failed' ? '✗' :
                     station.id}
                  </div>
                  
                  {/* Station name tooltip - Hidden on mobile */}
                  <div className="hidden sm:block absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {station.name} {isCompleted ? '(Completed - Pass Through)' : ''}
                  </div>
                  
                  {/* Mobile label */}
                  <div className="sm:hidden absolute -bottom-7 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700 bg-white/90 px-2 py-0.5 rounded shadow-sm">
                    Station {station.id}
                  </div>
                </div>
              );
            })}
            
            {/* Challenge spots */}
            {CHALLENGE_SPOTS.map((spot) => {
              const isCurrentPosition = gameboardState.currentPosition === spot.id;
              const isOnCurrentPath = currentPath.includes(spot.id);
              const isCompletedOnPath = completedPathSpots.includes(spot.id);
              
              // Linear progression logic
              const currentIndex = currentPath.indexOf(gameboardState.currentPosition);
              const spotIndex = currentPath.indexOf(spot.id);
              const isNextSpot = isOnPath && spotIndex === currentIndex + 1;
              const isPastSpot = isOnPath && spotIndex < currentIndex;
              const isFutureSpot = isOnPath && spotIndex > currentIndex + 1;
              
              // Determine accessibility
              const isAccessible = isCurrentPosition || isNextSpot;
              
              return (
                <div
                  key={`challenge-${spot.id}`}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                    isAccessible ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-50'
                  }`}
                  style={{
                    left: `${spot.position.x}%`,
                    top: `${spot.position.y}%`
                  }}
                  onClick={() => isAccessible && handlePositionClick(spot.id, false)}
                >
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-bold shadow-md transition-all ${
                      isCompletedOnPath ? 'bg-red-500 border-red-600 text-white' :
                      isCurrentPosition ? 'bg-canada-red border-canada-red text-white animate-pulse' :
                      isNextSpot ? 'bg-olympic-yellow border-olympic-yellow text-white animate-bounce' :
                      isPastSpot ? 'bg-gray-400 border-gray-500 text-white' :
                      isFutureSpot ? 'bg-gray-200 border-gray-300 text-gray-400' :
                      isOnCurrentPath ? 'bg-olympic-blue border-olympic-blue text-white' :
                      'bg-winter-ice border-olympic-blue text-olympic-blue'
                    }`}
                  >
                    ⚡
                  </div>
                  
                  {/* Challenge spot tooltip - Hidden on mobile */}
                  <div className="hidden sm:block absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-1 py-0.5 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {spot.name} {
                      isCompletedOnPath ? '(Completed)' :
                      isCurrentPosition ? '(Current)' :
                      isNextSpot ? '(Next)' :
                      isPastSpot ? '(Past)' :
                      isFutureSpot ? '(Future)' : ''
                    }
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend - Improved Mobile Layout */}
          <div className="mt-6 sm:mt-6 px-2">
            {/* Mobile Layout - Better spaced grid */}
            <div className="sm:hidden">
              <h3 className="text-sm font-bold text-gray-800 mb-3 text-center">Game Guide</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center space-x-2 p-2 bg-white/60 rounded-lg">
                  <div className="w-4 h-4 bg-green-500 rounded-full opacity-80 flex-shrink-0"></div>
                  <span className="font-medium">Station Done</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-white/60 rounded-lg">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
                  <span className="font-medium">Step Done</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-white/60 rounded-lg">
                  <div className="w-4 h-4 bg-canada-red rounded-full animate-pulse flex-shrink-0"></div>
                  <span className="font-medium">You Are Here</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-white/60 rounded-lg">
                  <div className="w-4 h-4 bg-olympic-yellow rounded-full animate-bounce flex-shrink-0"></div>
                  <span className="font-medium">Next Step</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-white/60 rounded-lg">
                  <div className="w-4 h-4 bg-olympic-blue rounded-full flex-shrink-0"></div>
                  <span className="font-medium">On Path</span>
                </div>
                <div className="flex items-center space-x-2 p-2 bg-white/60 rounded-lg">
                  <div className="w-4 h-4 bg-gray-200 border-2 border-gray-400 rounded-full flex-shrink-0"></div>
                  <span className="font-medium">Blocked</span>
                </div>
              </div>
            </div>
            
            {/* Desktop Layout */}
            <div className="hidden sm:flex justify-center space-x-3 text-sm flex-wrap">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full opacity-80"></div>
                <span>Station Completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span>Step Completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-canada-red rounded-full animate-pulse"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-olympic-yellow rounded-full animate-bounce"></div>
                <span>Next Step</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-olympic-blue rounded-full"></div>
                <span>On Path</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-200 border-2 border-gray-300 rounded-full"></div>
                <span>Blocked</span>
              </div>
            </div>
          </div>
          
          {isOnPath && (
            <div className="mt-3 sm:mt-4 text-center px-2 sm:px-0">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 sm:p-3 max-w-md mx-auto">
                <p className="text-xs sm:text-sm text-purple-800 font-medium">
                  📍 Path Mode Active - Move forward in sequence only
                </p>
                <p className="text-xs text-purple-600 mt-1 hidden sm:block">
                  ⚠️ No jumping ahead, going backwards, or visiting other stations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showIntroduction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-oswald font-bold text-center mb-4 text-olympic-blue">
              Welcome to the XV Olympic Saga Game
            </h2>
            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {GAMEBOARD_INTRODUCTION}
              </p>
            </div>
            <div className="text-center">
              <button
                onClick={handleIntroductionComplete}
                className="olympic-button primary px-8 py-3"
              >
                Begin Your Olympic Journey
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          playerSkills={playerSkills}
          onClose={() => setSelectedEvent(null)}
          onComplete={handleEventComplete}
        />
      )}
      
      {selectedChallengeSpot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-olympic-blue text-white p-3 sm:p-4 rounded-t-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  <span className="text-xl sm:text-2xl">🧠</span>
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-oswald font-bold truncate">{selectedChallengeSpot.name}</h2>
                    <p className="text-xs sm:text-sm opacity-90">
                      Level {challengeLuckyNumbers.skillLevel} • {SKILL_SUCCESS_RATES[challengeLuckyNumbers.skillLevel]?.percentage || 20}% rate
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedChallengeSpot(null)}
                  className="text-white hover:text-gray-300 text-xl sm:text-2xl font-bold ml-2"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Story Phase */}
              {challengePhase === 'story' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-oswald font-bold text-gray-900">The Story</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedChallengeSpot.story}</p>
                  <div className="text-center pt-4">
                    <button onClick={handleChallengeNext} className="olympic-button primary">
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* Challenge Phase */}
              {challengePhase === 'challenge' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-oswald font-bold text-gray-900">The Challenge</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedChallengeSpot.challenge}</p>
                  <div className="text-center pt-4">
                    <button onClick={handleChallengeNext} className="olympic-button primary">
                      Face the Challenge →
                    </button>
                  </div>
                </div>
              )}

              {/* Dice Selection Phase */}
              {challengePhase === 'dice-selection' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-oswald font-bold text-gray-900 mb-2">
                      Choose Your Lucky Numbers
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Your Tactics skill level {challengeLuckyNumbers.skillLevel} allows you to select {challengeLuckyNumbers.allowedSelections} numbers (1-10)
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      Success rate: {SKILL_SUCCESS_RATES[challengeLuckyNumbers.skillLevel]?.percentage || 20}% • Selected: {challengeLuckyNumbers.selectedNumbers.length}/{challengeLuckyNumbers.allowedSelections}
                    </p>
                  </div>

                  {/* Number Selection Grid */}
                  <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-md mx-auto">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(number => (
                      <button
                        key={number}
                        onClick={() => handleChallengeNumberSelection(number)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 font-bold transition-all text-sm sm:text-base ${
                          challengeLuckyNumbers.selectedNumbers.includes(number)
                            ? 'bg-olympic-blue text-white border-olympic-blue'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-olympic-blue hover:bg-olympic-blue/10'
                        }`}
                        disabled={
                          !challengeLuckyNumbers.selectedNumbers.includes(number) && 
                          challengeLuckyNumbers.selectedNumbers.length >= challengeLuckyNumbers.allowedSelections
                        }
                      >
                        {number}
                      </button>
                    ))}
                  </div>

                  {/* Roll Dice Button */}
                  <div className="text-center pt-4">
                    <button
                      onClick={handleChallengeDiceRoll}
                      disabled={challengeLuckyNumbers.selectedNumbers.length !== challengeLuckyNumbers.allowedSelections}
                      className="olympic-button primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      🎲 Roll the Dice!
                    </button>
                  </div>
                </div>
              )}

              {/* Dice Roll Phase */}
              {challengePhase === 'dice-roll' && (
                <div className="space-y-6 text-center">
                  <h3 className="text-lg font-oswald font-bold text-gray-900">Dice Roll Result</h3>
                  
                  {/* Dice Animation */}
                  <div className="flex justify-center">
                    <div className="w-24 h-24 bg-white border-4 border-gray-300 rounded-lg shadow-lg flex items-center justify-center text-4xl font-bold animate-bounce">
                      {challengeDiceResult}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-gray-700">
                      Your lucky numbers: {challengeLuckyNumbers.selectedNumbers.join(', ')}
                    </p>
                    <p className="text-gray-700">
                      Dice rolled: <span className="font-bold text-2xl">{challengeDiceResult}</span>
                    </p>
                    <p className={`text-xl font-bold ${challengeSuccess ? 'text-green-600' : 'text-red-600'}`}>
                      {challengeSuccess ? '🎉 SUCCESS!' : '❌ FAILURE'}
                    </p>
                  </div>

                  {/* Show items won if applicable */}
                  {challengeItemsWon.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-bold text-green-800 mb-2">Items Won!</h4>
                      <div className="flex justify-center space-x-2">
                        {challengeItemsWon.map((item, index) => {
                          const itemIcons: {[key: string]: string} = {
                            'Gatorade': '🥤',
                            'Water': '💧', 
                            'Skis': '🎿',
                            'Toques': '🧢',
                            'First Aid Kit': '🏥'
                          };
                          return (
                            <div key={index} className="flex items-center space-x-1">
                              <span className="text-2xl">{itemIcons[item] || '🎁'}</span>
                              <span className="font-medium">{item}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="text-center pt-4">
                    <button onClick={handleChallengeNext} className="olympic-button primary">
                      See Results →
                    </button>
                  </div>
                </div>
              )}

              {/* Outcome Phase */}
              {challengePhase === 'outcome' && (
                <div className="space-y-4">
                  <h3 className={`text-lg font-oswald font-bold ${challengeSuccess ? 'text-green-700' : 'text-red-700'}`}>
                    {challengeSuccess ? 'Lucky Find!' : 'Better Luck Next Time'}
                  </h3>
                  
                  <div className={`p-4 rounded-lg ${challengeSuccess ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <p className="text-gray-700 leading-relaxed">
                      {challengeSuccess 
                        ? `You successfully found loot while digging in the snow! Your tactics paid off and you discovered valuable items.`
                        : `You didn't find anything useful this time. The snow was too deep or maybe someone else got here first.`
                      }
                    </p>
                  </div>

                  <div className="text-center pt-4">
                    <button onClick={handleChallengeComplete} className="olympic-button primary">
                      Continue Journey
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showInventory && (
        <InventoryPanel
          inventory={inventory}
          gameboardXP={playerStats.gameboardXP || 0}
          onClose={() => setShowInventory(false)}
          onPurchaseMove={(xpCost) => {
            // Purchase move with Gameboard XP (250 XP = 1 move)
            if ((playerStats.gameboardXP || 0) >= xpCost) {
              onStatsUpdate({
                gameboardXP: Math.max(0, (playerStats.gameboardXP || 0) - xpCost),
                gameboardMoves: (playerStats.gameboardMoves || 0) + 1
              });
              
              // Update gameboard state
              setGameboardState(prev => ({
                ...prev,
                availableMoves: prev.availableMoves + 1
              }));
            }
          }}
        />
      )}

      {showSkillUpgrade && (
        <SkillUpgradePanel
          playerSkills={playerSkills}
          goldCoins={playerStats.gold}
          onClose={() => setShowSkillUpgrade(false)}
          onUpgrade={(skill) => {
            // Spend 1 gold to upgrade skill
            if (playerStats.gold > 0) {
              const currentLevel = playerSkills[skill as keyof PlayerSkills] as number;
              if (currentLevel < 5) {
                onSkillsUpdate({ [skill]: currentLevel + 1 });
                onStatsUpdate({ gold: playerStats.gold - 1 });
              }
            }
          }}
        />
      )}
    </div>
  );
}