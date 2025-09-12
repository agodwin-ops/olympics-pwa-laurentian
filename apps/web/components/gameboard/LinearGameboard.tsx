'use client';

import React, { useState, useEffect } from 'react';
import { User, PlayerStats, PlayerSkills, PlayerInventory, GameboardState, LinearPosition } from '@/types/olympics';
import { LINEAR_PATH, GAMEBOARD_INTRODUCTION, SKILL_SUCCESS_RATES, SPECIAL_ITEMS } from '@/lib/gameboard-events';
import EventModal from './EventModal';
import InventoryPanel from './InventoryPanel';
import SkillUpgradePanel from './SkillUpgradePanel';

interface LinearGameboardProps {
  user: User;
  playerStats: PlayerStats;
  playerSkills: PlayerSkills;
  inventory: PlayerInventory;
  onStatsUpdate: (stats: Partial<PlayerStats>) => void;
  onSkillsUpdate: (skills: Partial<PlayerSkills>) => void;
  onInventoryUpdate: (inventory: Partial<PlayerInventory>) => void;
}

export default function LinearGameboard({ 
  user, 
  playerStats, 
  playerSkills, 
  inventory,
  onStatsUpdate,
  onSkillsUpdate,
  onInventoryUpdate
}: LinearGameboardProps) {
  const [gameboardState, setGameboardState] = useState<GameboardState>({
    currentPosition: playerStats.gameboardPosition || 0,
    availableMoves: playerStats.gameboardMoves || 0,
    completedEvents: [],
    failedEvents: [],
    hasSeenIntroduction: false,
    attemptedPositions: []
  });

  const [selectedPosition, setSelectedPosition] = useState<LinearPosition | null>(null);
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

  // Sync gameboardState with playerStats when they update
  useEffect(() => {
    setGameboardState(prev => ({
      ...prev,
      currentPosition: playerStats.gameboardPosition || 0,
      availableMoves: playerStats.gameboardMoves || 0,
    }));
  }, [playerStats.gameboardPosition, playerStats.gameboardMoves]);

  useEffect(() => {
    if (!gameboardState.hasSeenIntroduction) {
      setShowIntroduction(true);
    }
  }, [gameboardState.hasSeenIntroduction]);

  const handleIntroductionComplete = () => {
    setShowIntroduction(false);
    setGameboardState(prev => ({ ...prev, hasSeenIntroduction: true }));
  };

  const canMoveToPosition = (targetPositionId: number): boolean => {
    // Can only move forward by one position at a time
    const nextPosition = gameboardState.currentPosition + 1;
    return targetPositionId === nextPosition && gameboardState.availableMoves > 0;
  };

  const canAttemptPosition = (targetPositionId: number): boolean => {
    // Can attempt current position if not already attempted
    return targetPositionId === gameboardState.currentPosition && 
           !gameboardState.attemptedPositions.includes(targetPositionId);
  };

  const getPositionStatus = (positionId: number): 'current' | 'completed' | 'failed' | 'next' | 'locked' | 'attempted' => {
    if (positionId === gameboardState.currentPosition) return 'current';
    if (gameboardState.completedEvents.includes(positionId)) return 'completed';
    if (gameboardState.failedEvents.includes(positionId)) return 'failed';
    if (positionId === gameboardState.currentPosition + 1 && gameboardState.availableMoves > 0) return 'next';
    if (gameboardState.attemptedPositions.includes(positionId)) return 'attempted';
    return 'locked';
  };

  const handlePositionClick = (position: LinearPosition) => {
    const status = getPositionStatus(position.id);
    
    if (status === 'current' && canAttemptPosition(position.id)) {
      // Can attempt current position
      setSelectedPosition(position);
      setChallengePhase('story');
      setChallengeeDiceResult(null);
      setChallengeSuccess(null);
      setChallengeItemsWon([]);
    } else if (status === 'next' && canMoveToPosition(position.id)) {
      // Move to next position and consume a move
      console.log(`🎯 Moving from ${gameboardState.currentPosition} to ${position.id}`);
      
      setGameboardState(prev => ({
        ...prev,
        currentPosition: position.id,
        availableMoves: prev.availableMoves - 1
      }));
      
      // Update persistent position and moves
      onStatsUpdate({
        gameboardPosition: position.id,
        gameboardMoves: Math.max(0, (playerStats.gameboardMoves || 0) - 1)
      });
      
      // Auto-open the challenge
      setTimeout(() => {
        setSelectedPosition(position);
        setChallengePhase('story');
      }, 100);
    } else {
      // Show appropriate message for blocked positions
      if (status === 'locked') {
        alert('You must progress through positions in order. Complete previous positions first.');
      } else if (status === 'attempted') {
        alert('You have already attempted this position. You cannot retry.');
      } else if (status === 'completed') {
        alert('🎉 You successfully completed this challenge!');
      } else if (status === 'failed') {
        alert('❌ You failed this challenge. Continue forward - no going back!');
      } else if (gameboardState.availableMoves <= 0) {
        alert('You have no moves left. Complete assignments to earn more moves.');
      }
    }
  };

  const handleChallengeComplete = (success: boolean) => {
    const currentPos = selectedPosition!.id;
    const xpReward = success ? selectedPosition!.successOutcome.xpReward : selectedPosition!.failOutcome.xpReward;
    
    // Update gameboard state
    setGameboardState(prev => ({
      ...prev,
      completedEvents: success ? [...prev.completedEvents, currentPos] : prev.completedEvents,
      failedEvents: success ? prev.failedEvents : [...prev.failedEvents, currentPos],
      attemptedPositions: [...prev.attemptedPositions, currentPos]
    }));

    // Award XP
    onStatsUpdate({
      gameboardXP: (playerStats.gameboardXP || 0) + xpReward
    });

    // Award items if won
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
        }
      });
      onInventoryUpdate(inventoryUpdate);
    }

    setSelectedPosition(null);
  };

  const handleDiceRoll = () => {
    if (challengeLuckyNumbers.selectedNumbers.length !== challengeLuckyNumbers.allowedSelections) {
      return;
    }

    const roll = Math.floor(Math.random() * 10) + 1;
    const success = challengeLuckyNumbers.selectedNumbers.includes(roll);
    
    setChallengeeDiceResult(roll);
    setChallengeSuccess(success);

    // Award items on success
    if (success) {
      const items = ['Gatorade', 'Water', 'Skis', 'Toques'];
      const wonItem = items[Math.floor(Math.random() * items.length)];
      setChallengeItemsWon([wonItem]);
    }

    setChallengePhase('dice-roll');
  };

  const handleRestartGame = () => {
    const shouldRestart = confirm(
      '🔄 Restart Your Olympic Journey?\n\n' +
      'This will reset your position to the start, but you will keep:\n' +
      '✅ All your XP and levels\n' +
      '✅ All your skills and inventory\n' +
      '✅ Your progress history\n\n' +
      'You will get 5 bonus moves to start fresh!\n\n' +
      'Click OK to restart, or Cancel to continue.'
    );
    
    if (shouldRestart) {
      // Reset to start position
      setGameboardState(prev => ({
        ...prev,
        currentPosition: 0,
        completedEvents: [],
        failedEvents: [],
        attemptedPositions: []
      }));
      
      // Give bonus moves and reset position
      onStatsUpdate({
        gameboardPosition: 0,
        gameboardMoves: (playerStats.gameboardMoves || 0) + 5
      });
      
      alert('🏠 Welcome back to the Olympic Village!\n\n🎁 You received 5 bonus moves to restart your journey!');
    }
  };

  const renderPosition = (position: LinearPosition) => {
    const status = getPositionStatus(position.id);
    
    let bgColor = 'bg-gray-300'; // locked
    let borderColor = 'border-gray-400';
    let textColor = 'text-gray-600';
    let icon = '🔒';
    
    switch (status) {
      case 'current':
        bgColor = 'bg-orange-500 animate-pulse';
        borderColor = 'border-orange-600';
        textColor = 'text-white';
        icon = '👤';
        break;
      case 'completed':
        bgColor = 'bg-green-500';
        borderColor = 'border-green-600';
        textColor = 'text-white';
        icon = '✅';
        break;
      case 'failed':
        bgColor = 'bg-red-500';
        borderColor = 'border-red-600';
        textColor = 'text-white';
        icon = '❌';
        break;
      case 'next':
        bgColor = 'bg-blue-400 hover:bg-blue-500';
        borderColor = 'border-blue-600';
        textColor = 'text-white';
        icon = '➡️';
        break;
      case 'attempted':
        bgColor = 'bg-gray-500';
        borderColor = 'border-gray-600';
        textColor = 'text-white';
        icon = '⏸️';
        break;
    }

    const typeIcon = position.type === 'station' ? '🏟️' : 
                    position.type === 'start' ? '🏠' : '⚡';

    return (
      <div
        key={position.id}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer`}
        style={{
          left: `${position.position.x}%`,
          top: `${position.position.y}%`,
        }}
        onClick={() => handlePositionClick(position)}
      >
        <div
          className={`w-16 h-16 rounded-full border-4 ${bgColor} ${borderColor} ${textColor} flex items-center justify-center shadow-lg transition-all hover:scale-110`}
        >
          <div className="text-center">
            <div className="text-lg">{icon}</div>
            <div className="text-xs font-bold">{position.id}</div>
          </div>
        </div>
        
        {/* Position label */}
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-white/90 rounded-lg px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm whitespace-nowrap max-w-24">
            <div>{typeIcon}</div>
            <div className="truncate">{position.name}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-100 via-white to-blue-50 relative overflow-hidden">
      {/* Header with game info */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-oswald font-bold text-gray-900">Olympic Journey</h2>
              <p className="text-sm text-gray-600">Position {gameboardState.currentPosition} • Moves: {gameboardState.availableMoves}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowInventory(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
              >
                🎒 Inventory
              </button>
              <button
                onClick={() => setShowSkillUpgrade(true)}
                className="px-3 py-1 bg-purple-500 text-white rounded-md text-sm hover:bg-purple-600"
              >
                ⚡ Skills
              </button>
              <button
                onClick={handleRestartGame}
                className="px-3 py-1 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600"
              >
                🔄 Restart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game board */}
      <div className="w-full h-full relative" style={{ minHeight: '600px' }}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#0066cc" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Path connections */}
        <svg className="absolute inset-0 w-full h-full">
          {LINEAR_PATH.slice(0, -1).map((position, index) => {
            const nextPosition = LINEAR_PATH[index + 1];
            const x1 = `${position.position.x}%`;
            const y1 = `${position.position.y}%`;
            const x2 = `${nextPosition.position.x}%`;
            const y2 = `${nextPosition.position.y}%`;
            
            return (
              <line
                key={`path-${position.id}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#0066cc"
                strokeWidth="3"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            );
          })}
        </svg>

        {/* Positions */}
        {LINEAR_PATH.map(position => renderPosition(position))}
      </div>

      {/* Modals */}
      {showIntroduction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl mx-4">
            <h2 className="text-2xl font-oswald font-bold mb-4">Welcome to the XV Winter Olympics!</h2>
            <div className="prose max-w-none mb-6">
              <p className="text-gray-700">{GAMEBOARD_INTRODUCTION}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-blue-900 mb-2">🎮 How to Play:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use moves to advance one position at a time</li>
                <li>• 🟢 Green = Completed successfully</li>
                <li>• 🔴 Red = Failed (but you learned!)</li>
                <li>• 🟠 Orange = Your current position</li>
                <li>• Each position can only be attempted once</li>
                <li>• No going backwards - always forward!</li>
              </ul>
            </div>
            <button
              onClick={handleIntroductionComplete}
              className="w-full olympic-button py-3"
            >
              Begin Your Olympic Journey! 🏔️
            </button>
          </div>
        </div>
      )}

      {selectedPosition && (
        <EventModal
          event={{
            id: selectedPosition.id,
            name: selectedPosition.name,
            story: selectedPosition.story,
            challenge: selectedPosition.challenge,
            requiredSkill: selectedPosition.requiredSkill,
            successOutcome: selectedPosition.successOutcome,
            failOutcome: selectedPosition.failOutcome,
            position: selectedPosition.position,
            connectsTo: []
          }}
          phase={challengePhase}
          luckyNumbers={challengeLuckyNumbers}
          diceResult={challengeDiceResult}
          success={challengeSuccess}
          itemsWon={challengeItemsWon}
          onClose={() => setSelectedPosition(null)}
          onNext={() => {
            switch (challengePhase) {
              case 'story':
                setChallengePhase('challenge');
                break;
              case 'challenge':
                const skillLevel = playerSkills.tactics || 1;
                const successRate = SKILL_SUCCESS_RATES[skillLevel];
                setChallengeLuckyNumbers({
                  skillLevel,
                  allowedSelections: successRate.numbers,
                  selectedNumbers: [],
                });
                setChallengePhase('dice-selection');
                break;
              case 'dice-selection':
                break; // Handled by dice roll button
              case 'dice-roll':
                setChallengePhase('outcome');
                break;
              case 'outcome':
                handleChallengeComplete(challengeSuccess || false);
                break;
            }
          }}
          onSelectNumber={(number) => {
            if (challengeLuckyNumbers.selectedNumbers.includes(number)) {
              setChallengeLuckyNumbers(prev => ({
                ...prev,
                selectedNumbers: prev.selectedNumbers.filter(n => n !== number)
              }));
            } else if (challengeLuckyNumbers.selectedNumbers.length < challengeLuckyNumbers.allowedSelections) {
              setChallengeLuckyNumbers(prev => ({
                ...prev,
                selectedNumbers: [...prev.selectedNumbers, number]
              }));
            }
          }}
          onRollDice={handleDiceRoll}
        />
      )}

      {showInventory && (
        <InventoryPanel
          inventory={inventory}
          onClose={() => setShowInventory(false)}
        />
      )}

      {showSkillUpgrade && (
        <SkillUpgradePanel
          playerSkills={playerSkills}
          playerStats={playerStats}
          onClose={() => setShowSkillUpgrade(false)}
          onUpgradeSkill={(skill) => {
            // Implementation for skill upgrade
            console.log('Upgrade skill:', skill);
          }}
        />
      )}
    </div>
  );
}