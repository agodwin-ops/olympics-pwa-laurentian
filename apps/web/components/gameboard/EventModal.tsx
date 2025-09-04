'use client';

import React, { useState } from 'react';
import { GameboardEvent, PlayerSkills, LuckyNumberSelection } from '@/types/olympics';
import { SKILL_SUCCESS_RATES, SPECIAL_ITEMS } from '@/lib/gameboard-events';

interface EventModalProps {
  event: GameboardEvent;
  playerSkills: PlayerSkills;
  onClose: () => void;
  onComplete: (eventId: number, success: boolean, xpGained: number, itemsWon?: string[]) => void;
}

type EventPhase = 'story' | 'challenge' | 'dice-selection' | 'dice-roll' | 'outcome';

export default function EventModal({ event, playerSkills, onClose, onComplete }: EventModalProps) {
  const [currentPhase, setCurrentPhase] = useState<EventPhase>('story');
  const [luckyNumbers, setLuckyNumbers] = useState<LuckyNumberSelection>({
    skillLevel: 1,
    allowedSelections: 2,
    selectedNumbers: [],
  });
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [eventSuccess, setEventSuccess] = useState<boolean | null>(null);
  const [itemsWon, setItemsWon] = useState<string[]>([]);

  // Get the skill level for the required skill
  const getSkillLevel = (skillName: string) => {
    const skillKey = skillName.toLowerCase() as keyof PlayerSkills;
    return (playerSkills[skillKey] as number) || 1;
  };

  const skillLevel = getSkillLevel(event.requiredSkill);
  const successRate = SKILL_SUCCESS_RATES[skillLevel];

  const handleNext = () => {
    switch (currentPhase) {
      case 'story':
        setCurrentPhase('challenge');
        break;
      case 'challenge':
        // Initialize dice selection based on skill level
        setLuckyNumbers({
          skillLevel,
          allowedSelections: successRate.numbers,
          selectedNumbers: [],
        });
        setCurrentPhase('dice-selection');
        break;
      case 'dice-selection':
        // This is handled by the dice roll button
        break;
      case 'dice-roll':
        setCurrentPhase('outcome');
        break;
      case 'outcome':
        // Complete the event
        handleComplete();
        break;
    }
  };

  const handleNumberSelection = (number: number) => {
    if (luckyNumbers.selectedNumbers.includes(number)) {
      // Remove number
      setLuckyNumbers(prev => ({
        ...prev,
        selectedNumbers: prev.selectedNumbers.filter(n => n !== number)
      }));
    } else if (luckyNumbers.selectedNumbers.length < luckyNumbers.allowedSelections) {
      // Add number
      setLuckyNumbers(prev => ({
        ...prev,
        selectedNumbers: [...prev.selectedNumbers, number]
      }));
    }
  };

  const handleDiceRoll = () => {
    if (luckyNumbers.selectedNumbers.length !== luckyNumbers.allowedSelections) {
      return;
    }

    // Roll the dice (1-10)
    const roll = Math.floor(Math.random() * 10) + 1;
    const success = luckyNumbers.selectedNumbers.includes(roll);
    
    setDiceResult(roll);
    setEventSuccess(success);

    // If successful, potentially win items from tactic challenges
    if (success && event.requiredSkill === 'Tactics') {
      // Random chance to win special items
      const wonItems: string[] = [];
      const itemChance = Math.random();
      
      if (itemChance > 0.5) { // 50% chance to win an item
        const randomItem = SPECIAL_ITEMS[Math.floor(Math.random() * SPECIAL_ITEMS.length)];
        wonItems.push(randomItem.name);
      }
      
      setItemsWon(wonItems);
    }

    setCurrentPhase('dice-roll');
  };

  const handleComplete = () => {
    const xpGained = eventSuccess ? event.successOutcome.xpReward : event.failOutcome.xpReward;
    onComplete(event.id, eventSuccess || false, xpGained, itemsWon);
  };

  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'Strength': return '💪';
      case 'Endurance': return '🏃';
      case 'Tactics': return '🧠';
      case 'Climbing': return '🧗';
      case 'Speed': return '⚡';
      default: return '🎯';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-olympic-blue text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getSkillIcon(event.requiredSkill)}</span>
              <div>
                <h2 className="text-xl font-oswald font-bold">{event.name}</h2>
                <p className="text-sm opacity-90">
                  {event.requiredSkill} Challenge • Level {skillLevel} ({successRate.percentage}% success rate)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Story Phase */}
          {currentPhase === 'story' && (
            <div className="space-y-4">
              <h3 className="text-lg font-oswald font-bold text-gray-900">The Story</h3>
              <p className="text-gray-700 leading-relaxed">{event.story}</p>
              <div className="text-center pt-4">
                <button onClick={handleNext} className="olympic-button primary">
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Challenge Phase */}
          {currentPhase === 'challenge' && (
            <div className="space-y-4">
              <h3 className="text-lg font-oswald font-bold text-gray-900">The Challenge</h3>
              <p className="text-gray-700 leading-relaxed">{event.challenge}</p>
              <div className="text-center pt-4">
                <button onClick={handleNext} className="olympic-button primary">
                  Face the Challenge →
                </button>
              </div>
            </div>
          )}

          {/* Dice Selection Phase */}
          {currentPhase === 'dice-selection' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-oswald font-bold text-gray-900 mb-2">
                  Choose Your Lucky Numbers
                </h3>
                <p className="text-gray-600 mb-4">
                  Your {event.requiredSkill} skill level {skillLevel} allows you to select {successRate.numbers} numbers (1-10)
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Success rate: {successRate.percentage}% • Selected: {luckyNumbers.selectedNumbers.length}/{luckyNumbers.allowedSelections}
                </p>
              </div>

              {/* Number Selection Grid */}
              <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    onClick={() => handleNumberSelection(number)}
                    className={`w-12 h-12 rounded-lg border-2 font-bold transition-all ${
                      luckyNumbers.selectedNumbers.includes(number)
                        ? 'bg-olympic-blue text-white border-olympic-blue'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-olympic-blue hover:bg-olympic-blue/10'
                    }`}
                    disabled={
                      !luckyNumbers.selectedNumbers.includes(number) && 
                      luckyNumbers.selectedNumbers.length >= luckyNumbers.allowedSelections
                    }
                  >
                    {number}
                  </button>
                ))}
              </div>

              {/* Roll Dice Button */}
              <div className="text-center pt-4">
                <button
                  onClick={handleDiceRoll}
                  disabled={luckyNumbers.selectedNumbers.length !== luckyNumbers.allowedSelections}
                  className="olympic-button primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🎲 Roll the Dice!
                </button>
              </div>
            </div>
          )}

          {/* Dice Roll Phase */}
          {currentPhase === 'dice-roll' && (
            <div className="space-y-6 text-center">
              <h3 className="text-lg font-oswald font-bold text-gray-900">Dice Roll Result</h3>
              
              {/* Dice Animation */}
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-white border-4 border-gray-300 rounded-lg shadow-lg flex items-center justify-center text-4xl font-bold animate-bounce">
                  {diceResult}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-gray-700">
                  Your lucky numbers: {luckyNumbers.selectedNumbers.join(', ')}
                </p>
                <p className="text-gray-700">
                  Dice rolled: <span className="font-bold text-2xl">{diceResult}</span>
                </p>
                <p className={`text-xl font-bold ${eventSuccess ? 'text-green-600' : 'text-red-600'}`}>
                  {eventSuccess ? '🎉 SUCCESS!' : '❌ FAILURE'}
                </p>
              </div>

              {/* Show items won if applicable */}
              {itemsWon.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-bold text-green-800 mb-2">Items Won!</h4>
                  <div className="flex justify-center space-x-2">
                    {itemsWon.map((item, index) => {
                      const itemData = SPECIAL_ITEMS.find(si => si.name === item);
                      return (
                        <div key={index} className="flex items-center space-x-1">
                          <span className="text-2xl">{itemData?.icon}</span>
                          <span className="font-medium">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-center pt-4">
                <button onClick={handleNext} className="olympic-button primary">
                  See Results →
                </button>
              </div>
            </div>
          )}

          {/* Outcome Phase */}
          {currentPhase === 'outcome' && (
            <div className="space-y-4">
              <h3 className={`text-lg font-oswald font-bold ${eventSuccess ? 'text-green-700' : 'text-red-700'}`}>
                {eventSuccess ? 'Victory!' : 'Setback'}
              </h3>
              
              <div className={`p-4 rounded-lg ${eventSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-gray-700 leading-relaxed">
                  {eventSuccess ? event.successOutcome.description : event.failOutcome.description}
                </p>
                
                {(eventSuccess ? event.successOutcome.xpReward : event.failOutcome.xpReward) > 0 && (
                  <div className="mt-3 flex items-center space-x-2">
                    <span className="text-green-600 font-bold">+{eventSuccess ? event.successOutcome.xpReward : event.failOutcome.xpReward} XP</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-4">
                <button onClick={handleComplete} className="olympic-button primary">
                  Continue Journey
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}