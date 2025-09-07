'use client';

import { useState } from 'react';
import { User, AdminAward } from '@/types/olympics';

interface Student extends User {
  selected?: boolean;
}

interface BulkAwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onBulkAward: (awards: AdminAward[]) => Promise<void>;
}

export default function BulkAwardModal({ isOpen, onClose, students, onBulkAward }: BulkAwardModalProps) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [awardType, setAwardType] = useState<AdminAward['type']>('gold');
  const [awardAmount, setAwardAmount] = useState<number>(1);
  const [description, setDescription] = useState<string>('');
  const [isAwarding, setIsAwarding] = useState(false);

  if (!isOpen) return null;

  const handleStudentToggle = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedStudents.size === 0) {
      alert('Please select at least one student.');
      return;
    }

    setIsAwarding(true);

    try {
      const awards: AdminAward[] = Array.from(selectedStudents).map(studentId => ({
        type: awardType,
        targetUserId: studentId,
        amount: awardAmount,
        description: description || `Bulk award: ${awardAmount} ${awardType.replace('_', ' ')}`
      }));

      await onBulkAward(awards);
      
      // Reset form
      setSelectedStudents(new Set());
      setAwardAmount(1);
      setDescription('');
      
      onClose();
    } catch (error: unknown) {
      console.error('Bulk award failed:', error);
      alert('Bulk award failed. Please try again.');
    } finally {
      setIsAwarding(false);
    }
  };

  const presetAwards = [
    { type: 'gold' as const, amount: 1, label: 'Gold Coin', icon: '🪙' },
    { type: 'gold' as const, amount: 2, label: 'Gold Bonus', icon: '🪙' },
    { type: 'gameboard_moves' as const, amount: 1, label: 'Single Move', icon: '🎲' },
    { type: 'gameboard_moves' as const, amount: 2, label: 'Double Move', icon: '🎲' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="modal-content max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-oswald font-bold text-gray-900">Bulk Award System</h2>
              <p className="text-gray-600">Award multiple students simultaneously</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-oswald font-bold text-gray-900">
                  Select Students ({selectedStudents.size} of {students.length})
                </h3>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-olympic-blue hover:text-olympic-blue/80"
                >
                  {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className={`p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                      selectedStudents.has(student.id) ? 'bg-winter-ice' : ''
                    }`}
                    onClick={() => handleStudentToggle(student.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => handleStudentToggle(student.id)}
                        className="text-olympic-blue focus:ring-olympic-blue"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{student.username}</div>
                        <div className="text-sm text-gray-500">{student.userProgram}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Award Configuration */}
            <div>
              <h3 className="text-lg font-oswald font-bold text-gray-900 mb-4">Award Configuration</h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Preset Awards */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {presetAwards.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setAwardType(preset.type);
                          setAwardAmount(preset.amount);
                          setDescription(preset.label);
                        }}
                        className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-center transition-colors"
                      >
                        <div className="text-xl mb-1">{preset.icon}</div>
                        <div className="text-sm font-medium">{preset.label}</div>
                        <div className="text-xs text-gray-500">
                          +{preset.amount} {preset.type.replace('_', ' ')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Award Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Award Type
                  </label>
                  <select
                    value={awardType}
                    onChange={(e) => setAwardType(e.target.value as AdminAward['type'])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                  >
                    <option value="gold">Gold</option>
                    <option value="gameboard_moves">Gameboard Moves</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount per Student
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAwardAmount(Math.max(1, awardAmount - 1))}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      ▼
                    </button>
                    <div className="flex-1 px-4 py-2 text-center font-medium bg-white">
                      {awardAmount}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAwardAmount(Math.min(2, awardAmount + 1))}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      ▲
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason/Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                    placeholder="e.g., Excellent participation in today's discussion"
                  />
                </div>

                {/* Summary */}
                <div className="p-4 bg-winter-ice rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Award Summary</h4>
                  <div className="text-sm text-gray-600">
                    <div>• {selectedStudents.size} students selected</div>
                    <div>• {awardAmount} {awardType.replace('_', ' ')} per student</div>
                    <div>• Total: {selectedStudents.size * awardAmount} {awardType.replace('_', ' ')}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAwarding || selectedStudents.size === 0 || awardAmount <= 0}
                    className="flex-1 olympic-button disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAwarding ? 'Awarding...' : `Award ${selectedStudents.size} Students`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}