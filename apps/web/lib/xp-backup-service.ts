'use client';

import { AssignmentXPSnapshot, XPBackupLog, User } from '@/types/olympics';

class XPBackupService {
  private static instance: XPBackupService;
  private backupIntervalId: NodeJS.Timeout | null = null;

  static getInstance(): XPBackupService {
    if (!XPBackupService.instance) {
      XPBackupService.instance = new XPBackupService();
    }
    return XPBackupService.instance;
  }

  // Initialize automatic nightly backups
  initializeNightlyBackups(): void {
    // Clear any existing interval
    if (this.backupIntervalId) {
      clearInterval(this.backupIntervalId);
    }

    // Check every hour if it's time for nightly backup (2 AM)
    this.backupIntervalId = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      
      // Run backup at 2 AM daily
      if (hour === 2) {
        const lastBackupDate = localStorage.getItem('last_xp_backup_date');
        const today = now.toDateString();
        
        // Only run once per day
        if (lastBackupDate !== today) {
          this.performNightlyBackup();
          localStorage.setItem('last_xp_backup_date', today);
        }
      }
    }, 60 * 60 * 1000); // Check every hour

    console.log('XP Backup Service: Nightly backups initialized');
  }

  // Stop automatic backups (cleanup)
  stopNightlyBackups(): void {
    if (this.backupIntervalId) {
      clearInterval(this.backupIntervalId);
      this.backupIntervalId = null;
    }
  }

  // Get current academic period
  private getCurrentAcademicPeriod(): string {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    
    if (month >= 8) { // September and later = Fall
      return `Fall ${year}`;
    } else if (month <= 4) { // January to May = Winter/Spring
      return `Winter ${year}`;
    } else { // Summer
      return `Summer ${year}`;
    }
  }

  // Generate data integrity hash
  private generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Perform automatic nightly backup
  async performNightlyBackup(): Promise<void> {
    try {
      console.log('XP Backup Service: Starting automatic nightly backup');
      await this.createXPSnapshot('automatic');
    } catch (error: unknown) {
      console.error('XP Backup Service: Nightly backup failed:', error);
    }
  }

  // Create manual backup (triggered by Primary Instructor)
  async createManualBackup(adminId: string, adminUsername: string): Promise<void> {
    try {
      console.log('XP Backup Service: Starting manual backup');
      await this.createXPSnapshot('manual', adminId, adminUsername);
    } catch (error: unknown) {
      console.error('XP Backup Service: Manual backup failed:', error);
      throw error;
    }
  }

  // Core backup creation function
  private async createXPSnapshot(
    triggeredBy: 'automatic' | 'manual', 
    adminId?: string, 
    adminUsername?: string
  ): Promise<void> {
    // Get all student data (in a real app, this would be from API)
    const studentsData = this.getAllStudentXPData();
    const academicPeriod = this.getCurrentAcademicPeriod();
    const snapshotDate = new Date();

    // Create snapshots for each student
    const snapshots: AssignmentXPSnapshot[] = studentsData.map(student => ({
      id: `${student.id}-${snapshotDate.toISOString()}`,
      userId: student.id,
      username: student.username,
      userProgram: student.userProgram,
      currentXP: student.stats?.currentXP || 0,
      totalXP: student.stats?.totalXP || 0,
      currentLevel: student.stats?.currentLevel || 1,
      currentRank: student.stats?.currentRank || 1,
      questProgress: student.stats?.questProgress || {
        quest1: 0,
        quest2: 0,
        quest3: 0,
        currentQuest: 1
      },
      assignmentAwards: student.stats?.assignmentAwards || [],
      medals: student.stats?.medals || [],
      snapshotDate,
      academicPeriod
    }));

    // Calculate totals and generate checksum
    const totalXP = snapshots.reduce((sum, s) => sum + s.totalXP, 0);
    const dataString = JSON.stringify(snapshots);
    const checksumHash = this.generateChecksum(dataString);

    // Create backup log entry
    const backupLog: XPBackupLog = {
      id: `backup-${snapshotDate.toISOString()}`,
      backupDate: snapshotDate,
      studentCount: snapshots.length,
      totalXPRecorded: totalXP,
      academicPeriod,
      triggeredBy,
      adminId,
      adminUsername,
      checksumHash
    };

    // Save to localStorage with versioning
    const backupKey = `xp_backup_${snapshotDate.getFullYear()}_${snapshotDate.getMonth() + 1}_${snapshotDate.getDate()}`;
    localStorage.setItem(backupKey, JSON.stringify(snapshots));
    
    // Update backup logs
    const existingLogs = this.getBackupLogs();
    const updatedLogs = [backupLog, ...existingLogs].slice(0, 50); // Keep last 50 backups
    localStorage.setItem('xp_backup_logs', JSON.stringify(updatedLogs));

    console.log(`XP Backup Service: ${triggeredBy} backup completed - ${snapshots.length} students, ${totalXP} total XP`);
  }

  // Get all student XP data from the admin panel
  private getAllStudentXPData(): any[] {
    // Try to get student data from the admin panel context
    // This would normally come from a proper API, but for now we'll use localStorage
    
    // First, try to get real student data from admin panel localStorage
    const adminStudentsKey = 'admin_students_data';
    const storedAdminStudents = localStorage.getItem(adminStudentsKey);
    
    if (storedAdminStudents) {
      try {
        return JSON.parse(storedAdminStudents);
      } catch (error: unknown) {
        console.error('Error parsing admin students data:', error);
      }
    }

    // Fallback: Try to reconstruct from olympics_user data (current logged-in users)
    const currentUser = localStorage.getItem('olympics_user');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        // For now, return the current user as sample data
        // In a real implementation, this would fetch all students from API
        return [
          {
            id: user.id,
            username: user.username,
            email: user.email,
            userProgram: user.userProgram,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt,
            // Add mock stats for demonstration
            stats: {
              currentXP: 450,
              totalXP: 1200,
              currentLevel: 4,
              currentRank: 3,
              gold: 85,
              gameboardMoves: 3,
              gameboardPosition: 6,
              questProgress: { quest1: 400, quest2: 500, quest3: 300, currentQuest: 2 },
              assignmentAwards: [
                { 
                  id: '1', 
                  assignmentName: 'Quest 1 Final Assessment', 
                  xpAwarded: 100, 
                  questType: 1, 
                  dateAwarded: new Date('2024-08-15'),
                  description: 'Comprehensive assessment of prenatal and infant development'
                },
                { 
                  id: '2', 
                  assignmentName: 'Reflexes Analysis Paper', 
                  xpAwarded: 75, 
                  questType: 1, 
                  dateAwarded: new Date('2024-08-20'),
                  description: 'Analysis of primitive reflexes in newborns'
                }
              ],
              medals: [
                { type: 'bronze', category: 'assignment', earnedAt: new Date('2024-08-15'), description: 'Quest 1 Completion' }
              ],
              unitXP: { quest1: 400, quest2: 500, quest3: 300 }
            }
          }
        ];
      } catch (error: unknown) {
        console.error('Error parsing current user data:', error);
      }
    }

    // Last resort: return empty array
    console.warn('No student data available for backup');
    return [];
  }

  // Get backup logs
  getBackupLogs(): XPBackupLog[] {
    const logs = localStorage.getItem('xp_backup_logs');
    if (!logs) return [];
    
    try {
      return JSON.parse(logs).map((log: any) => ({
        ...log,
        backupDate: new Date(log.backupDate)
      }));
    } catch (error: unknown) {
      console.error('Error parsing backup logs:', error);
      return [];
    }
  }

  // Download comprehensive XP backup data as CSV
  downloadXPBackup(backupDate?: string): void {
    try {
      let studentsData: any[];
      let fileName: string;

      if (backupDate) {
        // Download specific backup
        const backupKey = `xp_backup_${backupDate}`;
        const backupData = localStorage.getItem(backupKey);
        if (!backupData) {
          throw new Error('Backup not found');
        }
        studentsData = JSON.parse(backupData);
        fileName = `xp-backup-${backupDate}.csv`;
      } else {
        // Download current state
        const currentData = this.getAllStudentXPData();
        studentsData = currentData;
        fileName = `current-xp-data-${new Date().toISOString().split('T')[0]}.csv`;
      }

      // Create comprehensive CSV with all student XP details
      const csvHeaders = [
        'Student ID',
        'Username',
        'Email',
        'User Program',
        'Current XP',
        'Total XP',
        'Current Level',
        'Current Rank',
        'Gold',
        'Gameboard Moves',
        'Gameboard Position',
        'Quest 1 XP',
        'Quest 2 XP', 
        'Quest 3 XP',
        'Current Quest',
        'Assignment Awards Count',
        'Assignment Awards Details',
        'Medals Count',
        'Medals Details',
        'Account Created',
        'Backup Date',
        'Academic Period'
      ];

      const csvRows = studentsData.map(student => {
        const stats = student.stats || {};
        const questProgress = stats.questProgress || {};
        const assignmentAwards = stats.assignmentAwards || [];
        const medals = stats.medals || [];
        
        // Format assignment awards as detailed string
        const assignmentDetails = assignmentAwards.map((award: any) => 
          `${award.assignmentName}: ${award.xpAwarded}XP (${new Date(award.dateAwarded).toLocaleDateString()})`
        ).join('; ');

        // Format medals as detailed string
        const medalDetails = medals.map((medal: any) =>
          `${medal.type} ${medal.category} (${new Date(medal.earnedAt).toLocaleDateString()})`
        ).join('; ');

        return [
          student.id || '',
          student.username || '',
          student.email || '',
          student.userProgram || '',
          stats.currentXP || 0,
          stats.totalXP || 0,
          stats.currentLevel || 1,
          stats.currentRank || 1,
          stats.gold || 0,
          stats.gameboardMoves || 0,
          stats.gameboardPosition || 0,
          questProgress.quest1 || 0,
          questProgress.quest2 || 0,
          questProgress.quest3 || 0,
          questProgress.currentQuest || 1,
          assignmentAwards.length,
          assignmentDetails,
          medals.length,
          medalDetails,
          student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '',
          new Date().toLocaleDateString(),
          this.getCurrentAcademicPeriod()
        ];
      });

      // Convert to CSV format with proper escaping
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => 
          row.map(field => {
            // Escape fields that contain commas, quotes, or newlines
            const stringField = String(field);
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
              return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log(`XP Backup Service: Downloaded comprehensive CSV ${fileName} with ${studentsData.length} students`);
    } catch (error: unknown) {
      console.error('XP Backup Service: Download failed:', error);
      throw error;
    }
  }

  // Download backup logs as CSV
  downloadBackupLogs(): void {
    try {
      const logs = this.getBackupLogs();
      
      const csvHeaders = [
        'Backup Date',
        'Student Count',
        'Total XP',
        'Academic Period',
        'Triggered By',
        'Admin Username',
        'Checksum Hash'
      ];

      const csvRows = logs.map(log => [
        log.backupDate.toISOString(),
        log.studentCount.toString(),
        log.totalXPRecorded.toString(),
        log.academicPeriod,
        log.triggeredBy,
        log.adminUsername || 'System',
        log.checksumHash
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.href = url;
      link.download = `xp-backup-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error: unknown) {
      console.error('XP Backup Service: Backup logs download failed:', error);
      throw error;
    }
  }
}

export default XPBackupService;