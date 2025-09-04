'use client';

import { User, PlayerStats, PlayerSkills } from '@/types/olympics';

interface StudentExtended extends User {
  stats?: PlayerStats;
  skills?: PlayerSkills;
  lastActive?: Date;
}

interface StudentCardProps {
  student: StudentExtended;
  onSelectForAward: (studentId: string) => void;
  onViewDetails: (studentId: string) => void;
}

export default function StudentCard({ student, onSelectForAward, onViewDetails }: StudentCardProps) {

  return (
    <div className="chef-card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        {/* Student Info */}
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="relative">
            {student.profilePicture ? (
              <img
                src={student.profilePicture}
                alt={student.username}
                className="w-12 h-12 rounded-full border-2 border-olympic-blue"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-olympic-blue flex items-center justify-center text-white font-oswald font-bold text-lg">
                {student.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-oswald font-bold text-gray-900">{student.username}</h3>
            <p className="text-sm text-gray-600">{student.userProgram}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="text-right">
          <div className="flex items-center space-x-4 mb-2">
            <div className="text-center">
              <div className="text-xl font-oswald font-bold text-olympic-blue">
                {student.stats?.currentLevel || 1}
              </div>
              <div className="text-xs text-gray-500">Level</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-oswald font-bold text-canada-red">
                #{student.stats?.currentRank || '?'}
              </div>
              <div className="text-xs text-gray-500">Rank</div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onSelectForAward(student.id)}
              className="px-3 py-1 bg-olympic-blue text-white rounded-md text-xs font-medium hover:bg-olympic-blue/90 transition-colors"
            >
              Award
            </button>
            <button
              onClick={() => onViewDetails(student.id)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-300 transition-colors"
            >
              Details
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        {/* First Row - Game Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-oswald font-bold text-olympic-green">
              {student.stats?.gameboardXP || 0}
            </div>
            <div className="text-xs text-gray-500">Game XP</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-oswald font-bold text-olympic-yellow">
              {student.stats?.gold || 0}
            </div>
            <div className="text-xs text-gray-500">Gold</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-oswald font-bold text-olympic-red">
              {student.stats?.gameboardPosition || 0}
            </div>
            <div className="text-xs text-gray-500">Station</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-oswald font-bold text-olympic-black">
              {student.stats?.gameboardMoves || 0}
            </div>
            <div className="text-xs text-gray-500">Moves</div>
          </div>
        </div>

        {/* Second Row - Quest XP */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-oswald font-bold text-blue-600">
              {student.stats?.questProgress?.quest1 || 0}
            </div>
            <div className="text-xs text-gray-500">Quest 1 XP</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-oswald font-bold text-purple-600">
              {student.stats?.questProgress?.quest2 || 0}
            </div>
            <div className="text-xs text-gray-500">Quest 2 XP</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-oswald font-bold text-indigo-600">
              {student.stats?.questProgress?.quest3 || 0}
            </div>
            <div className="text-xs text-gray-500">Quest 3 XP</div>
          </div>
        </div>
      </div>

      {/* Skills Preview */}
      {student.skills && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-700">Skills</h4>
            <span className="text-xs text-gray-500">
              Avg Level: {(
                (student.skills.strength + student.skills.endurance + student.skills.tactics + 
                 student.skills.climbing + student.skills.speed) / 5
              ).toFixed(1)}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {(['strength', 'endurance', 'tactics', 'climbing', 'speed'] as const).map((skill) => (
              <div key={skill} className="text-center">
                <div className="text-xs font-medium text-gray-600 capitalize truncate">
                  {skill.substring(0, 4)}
                </div>
                <div className="text-sm font-oswald font-bold text-olympic-blue">
                  {student.skills![skill]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}