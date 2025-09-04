import { RankInfo } from '@/types/olympics';

// Rank system based on total Class XP
export const RANK_SYSTEM: RankInfo[] = [
  { name: 'Healthy Fetus', minPoints: 0, maxPoints: 599 },
  { name: 'Crawling Baby', minPoints: 600, maxPoints: 899 },
  { name: 'Walking Baby', minPoints: 900, maxPoints: 1199 },
  { name: 'Active Toddler', minPoints: 1200, maxPoints: 1499 },
  { name: 'Risk Taking Youngster', minPoints: 1500, maxPoints: 1799 },
  { name: 'Physically Literate Child', minPoints: 1800, maxPoints: 2099 },
  { name: 'Unique Mover', minPoints: 2100, maxPoints: 2399 },
  { name: 'Growing Adolescent', minPoints: 2400, maxPoints: 2699 },
  { name: 'Strong Young Adult', minPoints: 2700, maxPoints: 2999 },
  { name: 'Fit Grandparent', minPoints: 3000, maxPoints: 3500 }
];

// Quest information
export const QUEST_INFO = {
  1: { name: 'Quest 1: Babies', color: '#FFE4E1' },
  2: { name: 'Quest 2: Childhood', color: '#E1F5FE' },
  3: { name: 'Quest 3: Adolescence and Beyond', color: '#E8F5E8' }
};

// Get rank based on total XP
export function getRankByXP(totalXP: number): RankInfo {
  for (const rank of RANK_SYSTEM) {
    if (totalXP >= rank.minPoints && totalXP <= rank.maxPoints) {
      return rank;
    }
  }
  // If above max, return the highest rank
  return RANK_SYSTEM[RANK_SYSTEM.length - 1];
}

// Get progress within current rank (0-100%)
export function getRankProgress(totalXP: number): number {
  const currentRank = getRankByXP(totalXP);
  const progressWithinRank = totalXP - currentRank.minPoints;
  const rankRange = currentRank.maxPoints - currentRank.minPoints;
  return Math.min(100, (progressWithinRank / rankRange) * 100);
}

// Get next rank information
export function getNextRank(totalXP: number): RankInfo | null {
  const currentRank = getRankByXP(totalXP);
  const currentIndex = RANK_SYSTEM.findIndex(rank => rank.name === currentRank.name);
  
  if (currentIndex < RANK_SYSTEM.length - 1) {
    return RANK_SYSTEM[currentIndex + 1];
  }
  return null; // Already at max rank
}

// Calculate XP needed for next rank
export function getXPForNextRank(totalXP: number): number {
  const nextRank = getNextRank(totalXP);
  if (nextRank) {
    return nextRank.minPoints - totalXP;
  }
  return 0; // Already at max rank
}

// Get total quest XP
export function getTotalQuestXP(quest1: number, quest2: number, quest3: number): number {
  return quest1 + quest2 + quest3;
}

// Calculate quest completion percentages for pie chart
export function getQuestPercentages(quest1: number, quest2: number, quest3: number) {
  const total = getTotalQuestXP(quest1, quest2, quest3);
  if (total === 0) return { quest1: 0, quest2: 0, quest3: 0 };
  
  return {
    quest1: Math.round((quest1 / total) * 100),
    quest2: Math.round((quest2 / total) * 100),
    quest3: Math.round((quest3 / total) * 100)
  };
}