// User and Authentication Types
export interface User {
  id: string;
  email: string;
  username: string;
  profilePicture?: string;
  userProgram: string;
  isAdmin: boolean;
  adminRole?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterForm) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

export interface RegisterForm {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  profilePicture?: File;
  userProgram: string;
  isAdmin: boolean;
  adminCode?: string;
  adminRole?: string;
}

// Rank System Types
export interface RankInfo {
  name: string;
  minPoints: number;
  maxPoints: number;
}

export interface QuestProgress {
  quest1: number; // Babies
  quest2: number; // Childhood  
  quest3: number; // Adolescence and Beyond
  currentQuest: 1 | 2 | 3;
}

export interface AssignmentAward {
  id: string;
  assignmentName: string;
  xpAwarded: number;
  questType: 1 | 2 | 3; // Which quest this XP goes to
  dateAwarded: Date;
  description?: string;
}

// Game Mechanics Types
export interface PlayerStats {
  id: string;
  userId: string;
  currentXP: number;
  totalXP: number;
  currentLevel: number;
  currentRank: number;
  gameboardXP: number;
  gameboardPosition: number;
  gameboardMoves: number;
  gold: number;
  unitXP: { [unitId: string]: number };
  questProgress: QuestProgress;
  assignmentAwards: AssignmentAward[];
  medals: Medal[];
}

export interface GameSkill {
  id: string;
  name: 'Strength' | 'Endurance' | 'Tactics' | 'Climbing' | 'Speed';
  level: number; // 1-5
  description: string;
  icon: string;
}

export interface PlayerSkills {
  id: string;
  userId: string;
  strength: number;
  endurance: number;
  tactics: number;
  climbing: number;
  speed: number;
}

export interface Medal {
  type: 'gold' | 'silver' | 'bronze';
  category: 'assignment' | 'gameboard' | 'special';
  earnedAt: Date;
  description?: string;
}

// Gameboard Types
export interface GameboardStation {
  id: number;
  name: string;
  description: string;
  narrative: string;
  requiredSkill: GameSkill['name'];
  completionReward: {
    xp: number;
    items?: SpecialItem[];
  };
  position: {
    x: number;
    y: number;
  };
}

export interface SpecialItem {
  id: string;
  name: 'Water' | 'Gatorade' | 'First Aid Kit' | 'Skis' | 'Toques';
  description: string;
  effect: string;
  icon: string;
  usable: boolean;
}

export interface PlayerInventory {
  id: string;
  userId: string;
  water: number;
  gatorade: number;
  firstAidKit: number;
  skis: number;
  toques: number;
}

export interface DiceRoll {
  result: number;
  success: boolean;
  skillLevel: number;
  successChance: number;
  station: GameboardStation;
  timestamp: Date;
}

// Olympic Gameboard Types
export interface GameboardEvent {
  id: number;
  name: string;
  story: string;
  challenge: string;
  requiredSkill: GameSkill['name'];
  successOutcome: EventOutcome;
  failOutcome: EventOutcome;
  position: {
    x: number;
    y: number;
  };
  connectsTo?: number[];
}

export interface EventOutcome {
  description: string;
  xpReward: number;
  specialItems?: SpecialItem['name'][];
  gameboardMoves?: number;
}

export interface GameboardState {
  currentPosition: number;
  availableMoves: number;
  completedEvents: number[];
  failedEvents: number[];
  hasSeenIntroduction: boolean;
}

export interface LuckyNumberSelection {
  skillLevel: number;
  allowedSelections: number;
  selectedNumbers: number[];
  rollResult?: number;
  success?: boolean;
}

// XP and Progression Types
export interface XPEntry {
  id: string;
  userId: string;
  amount: number;
  type: 'assignment' | 'bonus' | 'gameboard' | 'special';
  assignmentId?: string;
  assignmentName?: string;
  unitId?: string;
  awardedBy: string; // Admin user ID
  awardedAt: Date;
  description?: string;
}

export interface Assignment {
  id: string;
  name: string;
  description: string;
  unitId: string;
  questType: 1 | 2 | 3; // Which quest this assignment belongs to
  maxXP: number;
  createdBy: string;
  createdAt: Date;
}

export interface Unit {
  id: string;
  name: string;
  description: string;
  orderIndex: number;
  isActive: boolean;
  createdAt: Date;
}

// Admin Types
export interface AdminAward {
  type: 'xp' | 'bonus_xp' | 'gameboard_moves' | 'skill_points' | 'gold';
  targetUserId: string;
  amount: number;
  assignmentId?: string;
  questType?: 1 | 2 | 3; // Required for XP awards to specify which quest
  skillType?: GameSkill['name'];
  description?: string;
}

export interface AdminStats {
  totalStudents: number;
  totalXPAwarded: number;
  totalGoldAwarded: number;
  activeUnit: Unit | null;
  recentActivity: XPEntry[];
}

// Resource and File Management Types
export interface ResourceFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  folderId?: string;
  uploadedBy: string;
  uploadedAt: Date;
  downloadCount: number;
}

export interface ResourceFolder {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdBy: string;
  createdAt: Date;
  files: ResourceFile[];
  subfolders: ResourceFolder[];
}

// Leaderboard and Ranking Types
export interface LeaderboardEntry {
  rank: number;
  user: User;
  stats: PlayerStats;
  medal: Medal['type'] | null;
  change: 'up' | 'down' | 'same' | 'new';
}

export interface Leaderboard {
  overall: LeaderboardEntry[];
  gameboard: LeaderboardEntry[];
  unit: LeaderboardEntry[];
  lastUpdated: Date;
}

// Audit and Logging Types
export interface AdminActivityLog {
  id: string;
  adminId: string;
  adminUsername: string;
  adminRole: string;
  action: 'bulk_award' | 'single_award' | 'create_lecture' | 'publish_lecture' | 'delete_lecture' | 'create_assignment';
  targetType: 'student' | 'lecture' | 'assignment' | 'system';
  targetId?: string;
  targetName?: string;
  details: {
    awardType?: string;
    amount?: number;
    studentsAffected?: number;
    description?: string;
  };
  timestamp: Date;
}

// Assignment XP Tracking Types
export interface AssignmentXPSnapshot {
  id: string;
  userId: string;
  username: string;
  userProgram: string;
  currentXP: number;
  totalXP: number;
  currentLevel: number;
  currentRank: number;
  questProgress: QuestProgress;
  assignmentAwards: AssignmentAward[];
  medals: Medal[];
  snapshotDate: Date;
  academicPeriod: string; // e.g., "Fall 2024", "Winter 2025"
}

export interface XPBackupLog {
  id: string;
  backupDate: Date;
  studentCount: number;
  totalXPRecorded: number;
  academicPeriod: string;
  triggeredBy: 'automatic' | 'manual';
  adminId?: string;
  adminUsername?: string;
  checksumHash: string; // For data integrity verification
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Component Props Types
export interface TabNavigationProps {
  activeTab: 'dashboard' | 'gameboard' | 'resources' | 'admin';
  onTabChange: (tab: TabNavigationProps['activeTab']) => void;
}

export interface GameboardProps {
  user: User;
  playerStats: PlayerStats;
  playerSkills: PlayerSkills;
  inventory: PlayerInventory;
  stations: GameboardStation[];
}

export interface AdminPanelProps {
  user: User;
  students: User[];
  stats: AdminStats;
  onAward: (award: AdminAward) => Promise<void>;
}

// PWA and Offline Types
export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface OfflineQueueItem {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}