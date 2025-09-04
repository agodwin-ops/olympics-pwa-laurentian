'use client';

import React from 'react';
import { PlayerSkills } from '@/types/olympics';
import { SKILL_SUCCESS_RATES } from '@/lib/gameboard-events';

interface SkillUpgradePanelProps {
  playerSkills: PlayerSkills;
  goldCoins: number;
  onClose: () => void;
  onUpgrade: (skill: string) => void;
}

export default function SkillUpgradePanel({ 
  playerSkills, 
  goldCoins, 
  onClose, 
  onUpgrade 
}: SkillUpgradePanelProps) {
  
  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'strength': return '💪';
      case 'endurance': return '🏃';
      case 'tactics': return '🧠';
      case 'climbing': return '🧗';
      case 'speed': return '⚡';
      default: return '🎯';
    }
  };

  const getSkillDisplayName = (skill: string) => {
    return skill.charAt(0).toUpperCase() + skill.slice(1);
  };

  const getSkillDescription = (skill: string) => {
    switch (skill) {
      case 'strength':
        return 'Physical power and determination. Used in negotiations and confrontations.';
      case 'endurance':
        return 'Mental and physical stamina. Helps with long-term strategic decisions.';
      case 'tactics':
        return 'Strategic thinking and planning. Increases chances of winning special items.';
      case 'climbing':
        return 'Technical skill and precision. Useful for complex diplomatic situations.';
      case 'speed':
        return 'Quick thinking and reflexes. Essential for time-sensitive decisions.';
      default:
        return 'A valuable Olympic skill.';
    }
  };

  const canUpgradeSkill = (skillLevel: number) => {
    return skillLevel < 5 && goldCoins > 0;
  };

  const getSuccessRateInfo = (level: number) => {
    const rateInfo = SKILL_SUCCESS_RATES[level];
    return rateInfo ? `${rateInfo.percentage}% success rate` : 'Max level';
  };

  const skills = [
    'strength',
    'endurance', 
    'tactics',
    'climbing',
    'speed'
  ].filter(skill => skill !== 'id' && skill !== 'userId');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-olympic-yellow text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">💪</span>
              <div>
                <h2 className="text-xl font-oswald font-bold">Game Skill Upgrades</h2>
                <p className="text-sm opacity-90">
                  Gold Coins Available: {goldCoins} 💰 (1 coin = +1 skill level)
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
          {goldCoins === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-xl font-oswald font-bold text-gray-900 mb-2">
                No Gold Coins
              </h3>
              <p className="text-gray-600">
                Earn gold coins by completing events and challenges to upgrade your skills!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-bold text-yellow-900 mb-2">How skill upgrades work:</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Each skill can be upgraded from level 1 to 5</li>
                  <li>• Higher levels give better success rates in challenges</li>
                  <li>• Cost: 1 gold coin per skill level upgrade</li>
                  <li>• Upgrades are permanent and apply immediately</li>
                </ul>
              </div>

              {/* Skills Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {skills.map((skill) => {
                  const skillLevel = playerSkills[skill as keyof PlayerSkills] as number;
                  const canUpgrade = canUpgradeSkill(skillLevel);
                  const nextLevel = skillLevel + 1;
                  const currentRate = getSuccessRateInfo(skillLevel);
                  const nextRate = skillLevel < 5 ? getSuccessRateInfo(nextLevel) : null;

                  return (
                    <div
                      key={skill}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      {/* Skill Header */}
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-3xl">{getSkillIcon(skill)}</span>
                        <div className="flex-1">
                          <h4 className="font-oswald font-bold text-gray-900">
                            {getSkillDisplayName(skill)}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Level {skillLevel}/5
                          </p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-4">
                        {getSkillDescription(skill)}
                      </p>

                      {/* Skill Level Visual */}
                      <div className="mb-4">
                        <div className="flex space-x-1 mb-2">
                          {[1, 2, 3, 4, 5].map(level => (
                            <div
                              key={level}
                              className={`flex-1 h-2 rounded ${
                                level <= skillLevel 
                                  ? 'bg-olympic-yellow' 
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Current: {currentRate}</span>
                          {nextRate && <span>Next: {nextRate}</span>}
                        </div>
                      </div>

                      {/* Upgrade Button */}
                      {skillLevel < 5 ? (
                        <button
                          onClick={() => onUpgrade(skill)}
                          disabled={!canUpgrade}
                          className={`w-full py-2 px-4 rounded font-medium transition-colors ${
                            canUpgrade
                              ? 'bg-olympic-yellow text-white hover:bg-olympic-yellow/90'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {canUpgrade 
                            ? `Upgrade to Level ${nextLevel} (1 💰)` 
                            : 'Need Gold Coins'
                          }
                        </button>
                      ) : (
                        <div className="w-full py-2 px-4 rounded bg-green-100 text-green-800 text-center font-medium">
                          ✓ Maximum Level
                        </div>
                      )}

                      {/* Success Rate Comparison */}
                      {skillLevel < 5 && (
                        <div className="mt-2 text-xs text-gray-500 text-center">
                          {currentRate} → {nextRate}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary Stats */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-3">Skill Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-olympic-blue">
                      {skills.reduce((sum, skill) => sum + (playerSkills[skill as keyof PlayerSkills] as number), 0)}
                    </div>
                    <div className="text-gray-600">Total Levels</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {skills.filter(skill => (playerSkills[skill as keyof PlayerSkills] as number) === 5).length}
                    </div>
                    <div className="text-gray-600">Maxed Skills</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {goldCoins}
                    </div>
                    <div className="text-gray-600">Gold Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {Math.round(skills.reduce((sum, skill) => {
                        const level = playerSkills[skill as keyof PlayerSkills] as number;
                        const rate = SKILL_SUCCESS_RATES[level];
                        return sum + (rate ? rate.percentage : 0);
                      }, 0) / skills.length)}%
                    </div>
                    <div className="text-gray-600">Avg Success</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}