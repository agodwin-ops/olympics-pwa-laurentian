'use client';

import React, { useState } from 'react';
import { PlayerInventory } from '@/types/olympics';
import { SPECIAL_ITEMS } from '@/lib/gameboard-events';

interface InventoryPanelProps {
  inventory: PlayerInventory;
  gameboardXP: number; // Current Gameboard XP for purchasing moves
  onClose: () => void;
  onPurchaseMove?: (xpCost: number) => void; // For buying moves with XP
}

export default function InventoryPanel({ inventory, gameboardXP, onClose, onPurchaseMove }: InventoryPanelProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Get inventory items with their data
  const getInventoryItems = () => {
    const items = [
      { name: 'water', display: 'Water', icon: '💧', count: inventory.water || 0 },
      { name: 'gatorade', display: 'Gatorade', icon: '🥤', count: inventory.gatorade || 0 },
      { name: 'firstAidKit', display: 'First Aid Kit', icon: '🏥', count: inventory.firstAidKit || 0 },
      { name: 'skis', display: 'Skis', icon: '🎿', count: inventory.skis || 0 },
      { name: 'toques', display: 'Toques', icon: '🧢', count: inventory.toques || 0 }
    ].filter(item => item.count > 0);
    
    return items;
  };

  const inventoryItems = getInventoryItems();

  const handlePurchaseMove = () => {
    if (gameboardXP >= 250 && onPurchaseMove) {
      onPurchaseMove(250);
      onClose();
    }
  };


  const canPurchaseMove = () => {
    return gameboardXP >= 250;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-olympic-blue text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🎒</span>
              <h2 className="text-xl font-oswald font-bold">Inventory</h2>
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
          <div className="space-y-6">
            {/* Gameboard XP Purchase Section - Always visible */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-green-900 mb-2">Purchase Moves</h3>
                  <p className="text-sm text-green-800 mb-3">
                    Spend your Gameboard XP to buy additional moves
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    Current XP: {gameboardXP}
                  </p>
                </div>
                <button
                  onClick={handlePurchaseMove}
                  disabled={!canPurchaseMove()}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    canPurchaseMove()
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Buy 1 Move (250 XP)
                  {!canPurchaseMove() && ' - Need more XP'}
                </button>
              </div>
            </div>

            {inventoryItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-oswald font-bold text-gray-900 mb-2">
                  Empty Collection
                </h3>
                <p className="text-gray-600">
                  Complete Tactic challenges to earn special items!
                </p>
              </div>
            ) : (
              <>
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-bold text-blue-900 mb-2">Your Collection:</h3>
                  <p className="text-sm text-blue-800">
                    These special items show your progress through Tactic challenges. Keep them for your final exam!
                  </p>
                </div>

              {/* Item Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventoryItems.map((item) => (
                  <div
                    key={item.name}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-3xl">{item.icon}</span>
                      <div>
                        <h4 className="font-bold text-gray-900">{item.display}</h4>
                        <p className="text-sm text-gray-600">Quantity: {item.count}</p>
                      </div>
                    </div>

                    {/* Collection display only - no conversion buttons */}
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-500">
                        Save for final exam
                      </p>
                    </div>
                  </div>
                ))}
              </div>

                {/* Summary Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2">Collection Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Items:</span>
                      <span className="ml-2 font-bold">
                        {inventoryItems.reduce((sum, item) => sum + item.count, 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Unique Items:</span>
                      <span className="ml-2 font-bold text-blue-600">
                        {inventoryItems.length} types
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Gameboard XP:</span>
                      <span className="ml-2 font-bold text-blue-600">
                        {gameboardXP} XP
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Moves Available to Buy:</span>
                      <span className="ml-2 font-bold text-purple-600">
                        {Math.floor(gameboardXP / 250)} moves
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}