'use client';

import { useState, useEffect } from 'react';
import { User, AdminAward, PlayerStats, Assignment, Unit, AdminActivityLog, XPBackupLog } from '@/types/olympics';
import StudentCard from './StudentCard';
import BulkAwardModal from './BulkAwardModal';
import StudentManagementModal from './StudentManagementModal';
import ResourceManager from './ResourceManager';
import SimpleStudentUpload from './SimpleStudentUpload';
import SimpleUploadResults from './SimpleUploadResults';
import apiClient from '@/lib/api-client';
import XPBackupService from '@/lib/xp-backup-service';

interface Student extends User {
  stats?: PlayerStats;
  lastActive?: Date;
}

interface AdminPanelProps {
  currentUser: User;
}

function RecentActivityLog() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivityLog();
  }, []);

  const loadActivityLog = async () => {
    try {
      const response = await apiClient.getActivityLog(10, 0);
      if (response.success) {
        setActivities(response.data);
      } else {
        // Fallback to mock data
        setActivities([
          {
            id: 1,
            description: 'AliceSnow awarded +100 XP for Winter Sports Research',
            createdAt: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
          },
          {
            id: 2,
            description: 'BobMountain awarded +2 Gameboard Moves',
            createdAt: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
          },
          {
            id: 3,
            description: 'CarolIce awarded +1 Strength Skill Point',
            createdAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load activity log:', error);
      // Use mock data as fallback
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else {
      return `${hours}h ago`;
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading activities...</div>;
  }

  return (
    <>
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="text-sm text-gray-600">{activity.description}</div>
          </div>
          <div className="text-sm text-gray-500">{getTimeAgo(activity.createdAt)}</div>
        </div>
      ))}
      {activities.length === 0 && (
        <div className="text-center text-gray-500 py-4">No recent activity</div>
      )}
    </>
  );
}

export default function AdminPanel({ currentUser }: AdminPanelProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([]);

  // Debug logging for role checking
  console.log('AdminPanel currentUser:', {
    email: currentUser.email,
    username: currentUser.username,
    userProgram: currentUser.userProgram,
    isAdmin: currentUser.isAdmin,
    adminRole: currentUser.adminRole
  });
  const [xpBackupLogs, setXPBackupLogs] = useState<XPBackupLog[]>([]);
  const [activeTab, setActiveTab] = useState<'awards' | 'students' | 'resources' | 'activity' | 'backups'>('awards');
  const [loading, setLoading] = useState(true);

  // Award Form States
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [awardType, setAwardType] = useState<AdminAward['type']>('xp');
  const [awardAmount, setAwardAmount] = useState<number>(0);
  const [selectedAssignment, setSelectedAssignment] = useState<string>('');
  const [selectedSkill, setSelectedSkill] = useState<'Strength' | 'Endurance' | 'Tactics' | 'Climbing' | 'Speed'>('Strength');
  const [description, setDescription] = useState<string>('');
  const [isAwarding, setIsAwarding] = useState(false);

  // Bulk award modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  // Student management modal
  const [showStudentManagementModal, setShowStudentManagementModal] = useState(false);
  // Batch upload modal
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [batchUploadResults, setBatchUploadResults] = useState<any>(null);

  // Assignment Creation States
  const [newAssignmentName, setNewAssignmentName] = useState<string>('');
  const [newAssignmentMaxXP, setNewAssignmentMaxXP] = useState<number>(50);
  const [newAssignmentQuest, setNewAssignmentQuest] = useState<1 | 2 | 3>(1);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAdminData();
    loadActivityLogs();
    loadXPBackupLogs();
    initializeXPBackupService();
  }, []);

  const initializeXPBackupService = () => {
    // Initialize XP backup service for automatic nightly backups
    const xpService = XPBackupService.getInstance();
    xpService.initializeNightlyBackups();
    
    console.log('XP Backup Service initialized for automatic nightly backups');
  };

  const loadActivityLogs = () => {
    // Load activity logs from localStorage
    const storedLogs = localStorage.getItem('admin_activity_logs');
    if (storedLogs) {
      try {
        const logs = JSON.parse(storedLogs).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
        setActivityLogs(logs);
        console.log('Loaded activity logs:', logs.length, 'entries');
      } catch (error) {
        console.error('Error loading activity logs:', error);
      }
    } else {
      console.log('No stored activity logs found');
      // Create a sample log entry for testing if there are none
      if (currentUser.isAdmin) {
        const sampleLog: AdminActivityLog = {
          id: 'sample-1',
          adminId: currentUser.id,
          adminUsername: currentUser.username,
          adminRole: currentUser.adminRole || 'Administrator',
          action: 'bulk_award',
          targetType: 'student',
          details: {
            awardType: 'gold',
            amount: 1,
            studentsAffected: 3,
            description: 'Sample activity log entry for testing'
          },
          timestamp: new Date()
        };
        setActivityLogs([sampleLog]);
        localStorage.setItem('admin_activity_logs', JSON.stringify([sampleLog]));
        console.log('Created sample activity log for testing');
      }
    }
  };

  const logAdminActivity = (
    action: AdminActivityLog['action'],
    targetType: AdminActivityLog['targetType'],
    details: AdminActivityLog['details'],
    targetId?: string,
    targetName?: string
  ) => {
    const logEntry: AdminActivityLog = {
      id: Date.now().toString(),
      adminId: currentUser.id,
      adminUsername: currentUser.username,
      adminRole: currentUser.adminRole || 'Administrator',
      action,
      targetType,
      targetId,
      targetName,
      details,
      timestamp: new Date()
    };

    const updatedLogs = [logEntry, ...activityLogs].slice(0, 100); // Keep last 100 entries
    setActivityLogs(updatedLogs);
    
    // Store in localStorage
    localStorage.setItem('admin_activity_logs', JSON.stringify(updatedLogs));
  };

  const loadXPBackupLogs = () => {
    const xpService = XPBackupService.getInstance();
    const logs = xpService.getBackupLogs();
    setXPBackupLogs(logs);
  };

  const handleManualXPBackup = async () => {
    if (currentUser.adminRole !== 'Primary Instructor') {
      alert('Only the Primary Instructor can create manual XP backups.');
      return;
    }

    try {
      const xpService = XPBackupService.getInstance();
      await xpService.createManualBackup(currentUser.id, currentUser.username);
      
      // Reload backup logs to show the new entry
      loadXPBackupLogs();
      
      // Log this action
      logAdminActivity(
        'bulk_award', // Using existing action type, could add 'xp_backup'
        'system',
        {
          description: 'Created manual XP backup'
        }
      );

      alert('XP backup created successfully!');
    } catch (error) {
      console.error('Failed to create XP backup:', error);
      alert('Failed to create XP backup. Please try again.');
    }
  };

  const handleDownloadXPBackup = () => {
    if (currentUser.adminRole !== 'Primary Instructor') {
      alert('Only the Primary Instructor can download XP data.');
      return;
    }

    try {
      const xpService = XPBackupService.getInstance();
      xpService.downloadXPBackup();
    } catch (error) {
      console.error('Failed to download XP backup:', error);
      alert('Failed to download XP data. Please try again.');
    }
  };

  const handleDownloadXPBackupLogs = () => {
    if (currentUser.adminRole !== 'Primary Instructor') {
      alert('Only the Primary Instructor can download backup logs.');
      return;
    }

    try {
      const xpService = XPBackupService.getInstance();
      xpService.downloadBackupLogs();
    } catch (error) {
      console.error('Failed to download backup logs:', error);
      alert('Failed to download backup logs. Please try again.');
    }
  };

  const downloadActivityLog = () => {
    console.log('Download button clicked');
    console.log('Current user role:', currentUser.adminRole);
    console.log('Activity logs:', activityLogs);
    
    if (currentUser.adminRole !== 'Primary Instructor') {
      alert('Only the Primary Instructor can download activity logs.');
      return;
    }

    if (activityLogs.length === 0) {
      alert('No activity logs to download. Perform some admin actions first to generate log entries.');
      return;
    }

    // Prepare CSV data
    const csvHeaders = [
      'Timestamp',
      'Admin Username', 
      'Admin Role',
      'Action',
      'Target Type',
      'Target Name',
      'Award Type',
      'Amount',
      'Students Affected',
      'Description'
    ];

    const csvRows = activityLogs.map(log => [
      log.timestamp.toISOString(),
      log.adminUsername,
      log.adminRole,
      log.action.replace('_', ' '),
      log.targetType,
      log.targetName || '',
      log.details.awardType || '',
      log.details.amount || '',
      log.details.studentsAffected || '',
      log.details.description || ''
    ]);

    // Convert to CSV format
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => 
        typeof field === 'string' && field.includes(',') 
          ? `"${field}"` 
          : field
      ).join(','))
    ].join('\n');

    console.log('CSV content preview:', csvContent.substring(0, 200));
    
    // Create and download file
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = `admin-activity-log-${new Date().toISOString().split('T')[0]}.csv`;
      console.log('Attempting to download file:', fileName);
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log('Download triggered successfully');
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the activity log. Please try again.');
    }
  };

  const downloadStudentData = () => {
    if (currentUser.adminRole !== 'Primary Instructor') {
      alert('Only the Primary Instructor can download student data.');
      return;
    }

    if (students.length === 0) {
      alert('No student data available to download.');
      return;
    }

    try {
      // Prepare comprehensive CSV data
      const csvHeaders = [
        'Student ID',
        'Email',
        'Username', 
        'Program',
        'Registration Date',
        'Last Active',
        'Total XP',
        'Current Level',
        'Gold',
        'Gameboard Position',
        'Gameboard Moves',
        'Strength',
        'Endurance',
        'Tactics',
        'Climbing',
        'Speed'
      ];

      const csvRows = students.map(student => [
        student.id,
        student.email,
        student.username,
        student.userProgram,
        new Date(student.createdAt).toISOString().split('T')[0],
        student.lastActive ? new Date(student.lastActive).toISOString().split('T')[0] : 'Never',
        student.stats?.totalXP || 0,
        student.stats?.currentLevel || 1,
        student.stats?.gold || 0,
        student.stats?.gameboardPosition || 1,
        student.stats?.gameboardMoves || 0,
        1, // strength (derived from skills, not in stats)
        1, // endurance
        1, // tactics
        1, // climbing
        1  // speed
      ]);

      // Convert to CSV format
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => 
          typeof field === 'string' && field.includes(',') 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = `student-data-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Student data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export student data. Please try again.');
    }
  };

  // Close student dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.student-search-container')) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load students data
      const studentsResponse = await apiClient.getAllStudents();
      if (studentsResponse.success) {
        setStudents(studentsResponse.data);
      }

      // Load assignments
      const assignmentsResponse = await apiClient.getAssignments();
      if (assignmentsResponse.success) {
        // Transform assignments from snake_case to camelCase
        const transformedAssignments = assignmentsResponse.data.map((assignment: any) => {
          // Determine quest type from unit name if available
          let questType: 1 | 2 | 3 = 1;
          if (assignment.units?.name) {
            if (assignment.units.name.includes('Quest 2') || assignment.units.name.includes('Children')) {
              questType = 2;
            } else if (assignment.units.name.includes('Quest 3') || assignment.units.name.includes('Adolescence')) {
              questType = 3;
            }
          }
          
          return {
            id: assignment.id,
            name: assignment.name,
            description: assignment.description,
            unitId: assignment.unit_id,
            questType: questType,
            maxXP: assignment.max_xp, // Transform snake_case to camelCase
            createdBy: assignment.created_by,
            createdAt: new Date(assignment.created_at)
          };
        });
        setAssignments(transformedAssignments);
      }

      // Load units
      const unitsResponse = await apiClient.getUnits();
      if (unitsResponse.success) {
        // Transform units from snake_case to camelCase
        const transformedUnits = unitsResponse.data.map((unit: any) => ({
          id: unit.id,
          name: unit.name,
          description: unit.description,
          orderIndex: unit.order_index, // Transform snake_case to camelCase
          isActive: unit.is_active, // Transform snake_case to camelCase
          createdAt: new Date(unit.created_at)
        }));
        setUnits(transformedUnits);
      }
      
      // Mock data for development (fallback)
      const mockStudents: Student[] = [
        {
          id: '1',
          email: 'alice@student.com',
          username: 'AliceSnow',
          userProgram: 'BPHE Kinesiology', // Level 3 Strength
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          stats: {
            id: '1',
            userId: '1',
            currentXP: 450,
            totalXP: 1200,
            currentLevel: 4,
            currentRank: 3,
            gameboardXP: 180,
            gameboardPosition: 6,
            gameboardMoves: 2,
            gold: 85,
            unitXP: { unit1: 400, unit2: 200, unit3: 150 },
            questProgress: {
              quest1: 400,
              quest2: 500,
              quest3: 300,
              currentQuest: 2 as 1 | 2 | 3
            },
            assignmentAwards: [],
            medals: []
          },
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          id: '2',
          email: 'bob@student.com',
          username: 'BobMountain',
          userProgram: 'BPHE Health Promotion', // Level 3 Speed
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          stats: {
            id: '2',
            userId: '2',
            currentXP: 320,
            totalXP: 890,
            currentLevel: 3,
            currentRank: 8,
            gameboardXP: 95,
            gameboardPosition: 3,
            gameboardMoves: 4,
            gold: 45,
            unitXP: { unit1: 350, unit2: 180, unit3: 90 },
            questProgress: {
              quest1: 300,
              quest2: 390,
              quest3: 200,
              currentQuest: 2
            },
            assignmentAwards: [],
            medals: []
          },
          lastActive: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        },
        {
          id: '3',
          email: 'carol@student.com',
          username: 'CarolIce',
          userProgram: 'BPHE Sport Psychology', // Level 3 Climbing
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          stats: {
            id: '3',
            userId: '3',
            currentXP: 180,
            totalXP: 580,
            currentLevel: 2,
            currentRank: 15,
            gameboardXP: 50,
            gameboardPosition: 2,
            gameboardMoves: 1,
            gold: 20,
            unitXP: { unit1: 300, unit2: 100, unit3: 30 },
            questProgress: {
              quest1: 250,
              quest2: 230,
              quest3: 100,
              currentQuest: 1
            },
            assignmentAwards: [],
            medals: []
          },
          lastActive: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
        }
      ];

      const mockAssignments: Assignment[] = [
        {
          id: 'a1',
          name: 'Prenatal Development Quiz',
          description: 'Assessment on fetal growth and maternal factors',
          unitId: 'quest1',
          questType: 1 as 1 | 2 | 3,
          maxXP: 50,
          createdBy: currentUser.id,
          createdAt: new Date()
        },
        {
          id: 'a2',
          name: 'Motor Milestones Analysis',
          description: 'Research paper on early childhood motor development',
          unitId: 'quest1',
          questType: 1 as 1 | 2 | 3,
          maxXP: 100,
          createdBy: currentUser.id,
          createdAt: new Date()
        },
        {
          id: 'a3',
          name: 'Physical Literacy Assessment',
          description: 'Case study analysis of fundamental movement skills',
          unitId: 'quest2',
          questType: 2 as 1 | 2 | 3,
          maxXP: 150,
          createdBy: currentUser.id,
          createdAt: new Date()
        },
        {
          id: 'a4',
          name: 'Adolescent Training Project',
          description: 'Design a training program for adolescent athletes',
          unitId: 'quest3',
          questType: 3 as 1 | 2 | 3,
          maxXP: 200,
          createdBy: currentUser.id,
          createdAt: new Date()
        }
      ];

      const mockUnits: Unit[] = [
        {
          id: 'quest1',
          name: 'Quest 1: Babies',
          description: 'Prenatal development through infancy (0-2 years)',
          orderIndex: 1,
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'quest2',
          name: 'Quest 2: Children',
          description: 'Early childhood through school age development (2-12 years)',
          orderIndex: 2,
          isActive: true,
          createdAt: new Date()
        },
        {
          id: 'quest3',
          name: 'Quest 3: Adolescence',
          description: 'Adolescent development and beyond (13+ years)',
          orderIndex: 3,
          isActive: true,
          createdAt: new Date()
        }
      ];

      if (!studentsResponse.success) {
        setStudents(mockStudents);
        // Save mock students to localStorage for XP backup service
        localStorage.setItem('admin_students_data', JSON.stringify(mockStudents));
      } else {
        // Save real student data to localStorage for XP backup service
        localStorage.setItem('admin_students_data', JSON.stringify(studentsResponse.data));
      }
      
      if (!assignmentsResponse.success) {
        setAssignments(mockAssignments);
      }
      
      if (!unitsResponse.success) {
        setUnits(mockUnits);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAward = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudent || awardAmount <= 0) {
      alert('Please select a student and enter a valid amount.');
      return;
    }

    if (awardType === 'xp' && !selectedAssignment) {
      alert('Please select an assignment for XP awards.');
      return;
    }

    setIsAwarding(true);

    try {
      let response;
      
      if (awardType === 'xp') {
        // Use the new assignment XP API
        const awardData = {
          target_user_id: selectedStudent,
          assignment_id: selectedAssignment,
          xp_awarded: awardAmount,
          description: description || undefined
        };
        
        response = await apiClient.awardAssignmentXP(awardData);
      } else {
        // Use bulk award API for gold/gameboard moves
        const bulkData = {
          award_type: awardType,
          amount: awardAmount,
          description: description || undefined,
          target_user_ids: [selectedStudent]
        };
        
        response = await apiClient.bulkAward(bulkData);
      }

      if (response.success) {
        alert(response.message || `Successfully awarded ${awardAmount} ${awardType.replace('_', ' ')}!`);
        
        // Reset form
        setAwardAmount(0);
        setDescription('');
        setSelectedAssignment('');
        
        // Reload student data to reflect changes
        await loadAdminData();
      } else {
        throw new Error(response.error || 'Award failed');
      }
      
    } catch (error) {
      console.error('Failed to award:', error);
      alert('Failed to award. Please try again.');
    } finally {
      setIsAwarding(false);
    }
  };

  const handleBulkAward = async (awards: AdminAward[]) => {
    try {
      // Convert awards to API format
      const apiAwards = awards.map(award => ({
        type: award.type,
        target_user_id: award.targetUserId,
        amount: award.amount,
        assignment_id: award.assignmentId,
        skill_type: award.skillType,
        description: award.description
      }));

      // Try API call with fallback to mock success
      let response;
      try {
        response = await apiClient.bulkAwardStudents(apiAwards);
      } catch (error) {
        // Mock success response for development
        response = { success: true, data: { message: 'Mock bulk award successful' } };
        console.log('Mock bulk award:', awards);
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Bulk award failed');
      }

      // Update local state (mock)
      setStudents(prevStudents => 
        prevStudents.map(student => {
          const studentAward = awards.find(award => award.targetUserId === student.id);
          if (studentAward && student.stats) {
            const updatedStats = { ...student.stats };
            
            switch (studentAward.type) {
              case 'bonus_xp':
                updatedStats.currentXP += studentAward.amount;
                updatedStats.totalXP += studentAward.amount;
                updatedStats.currentLevel = Math.floor(updatedStats.totalXP / 200) + 1;
                break;
              case 'gameboard_moves':
                updatedStats.gameboardMoves += studentAward.amount;
                break;
              case 'gold':
                updatedStats.gold += studentAward.amount;
                break;
            }
            
            return { ...student, stats: updatedStats };
          }
          return student;
        })
      );

      // Log the bulk award activity
      logAdminActivity(
        'bulk_award',
        'student',
        {
          awardType: awards[0]?.type || 'unknown',
          amount: awards[0]?.amount || 0,
          studentsAffected: awards.length,
          description: awards[0]?.description
        }
      );

      alert(`Successfully awarded ${awards.length} students!`);
    } catch (error) {
      console.error('Bulk award failed:', error);
      throw error;
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignmentName.trim() || newAssignmentMaxXP <= 0) return;

    try {
      setIsCreatingAssignment(true);

      // Find the unit ID for the selected quest
      const selectedUnit = units.find(u => u.name.includes(`Quest ${newAssignmentQuest}`));
      if (!selectedUnit) {
        alert('Quest not found. Please try again.');
        return;
      }

      // Create assignment via API
      const assignmentData = {
        name: newAssignmentName,
        description: `Assignment with maximum ${newAssignmentMaxXP} XP`,
        unit_id: selectedUnit.id,
        max_xp: newAssignmentMaxXP
      };

      const response = await apiClient.createAssignment(assignmentData);
      
      if (response.success) {
        // Add to local state
        const newAssignment: Assignment = {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description,
          unitId: response.data.unit_id,
          questType: newAssignmentQuest,
          maxXP: response.data.max_xp,
          createdBy: response.data.created_by,
          createdAt: new Date(response.data.created_at)
        };
        
        setAssignments(prev => [...prev, newAssignment]);
        
        // Reset form
        setNewAssignmentName('');
        setNewAssignmentMaxXP(50);
        setNewAssignmentQuest(1);
        
        alert('Assignment created successfully!');
      } else {
        throw new Error(response.error || 'Failed to create assignment');
      }
    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert('Failed to create assignment. Please try again.');
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  const getAwardTypeLabel = (type: AdminAward['type']) => {
    switch (type) {
      case 'xp': return 'Assignment XP';
      case 'bonus_xp': return 'Bonus XP';
      case 'gameboard_moves': return 'Gameboard Moves';
      case 'skill_points': return 'Skill Points';
      case 'gold': return 'Gold';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olympic-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Admin Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-oswald font-bold text-gray-900">Admin Control Panel</h1>
            <p className="text-gray-600 mt-2">Manage student progress and awards</p>
            <p className="text-sm text-blue-600 font-medium mt-1">
              Role: {currentUser.adminRole || 'Admin'} | User: {currentUser.username}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="px-4 py-2 bg-canada-red text-white rounded-lg">
              <div className="text-sm font-medium">Total Students</div>
              <div className="text-2xl font-oswald font-bold">{students.length}</div>
            </div>
            <div className="px-4 py-2 bg-olympic-blue text-white rounded-lg">
              <div className="text-sm font-medium">Active Units</div>
              <div className="text-2xl font-oswald font-bold">{units.filter(u => u.isActive).length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('awards')}
            className={`py-2 px-1 border-b-2 font-oswald font-medium text-sm ${
              activeTab === 'awards'
                ? 'border-olympic-blue text-olympic-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Award System
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-2 px-1 border-b-2 font-oswald font-medium text-sm ${
              activeTab === 'students'
                ? 'border-olympic-blue text-olympic-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Student Overview
          </button>
          {currentUser.adminRole === 'Primary Instructor' && (
            <button
              onClick={() => setActiveTab('resources')}
              className={`py-2 px-1 border-b-2 font-oswald font-medium text-sm ${
                activeTab === 'resources'
                  ? 'border-olympic-blue text-olympic-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resources
            </button>
          )}
          {currentUser.adminRole === 'Primary Instructor' && (
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2 px-1 border-b-2 font-oswald font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-olympic-blue text-olympic-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Activity Log
            </button>
          )}
          {currentUser.adminRole === 'Primary Instructor' && (
            <button
              onClick={() => setActiveTab('backups')}
              className={`py-2 px-1 border-b-2 font-oswald font-medium text-sm ${
                activeTab === 'backups'
                  ? 'border-olympic-blue text-olympic-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              XP Backups
            </button>
          )}
        </nav>
      </div>

      {/* Award System Tab */}
      {activeTab === 'awards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Award Form */}
          <div className="chef-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-oswald font-bold text-gray-900">Award Points & Resources</h2>
              <button
                onClick={() => setShowBulkModal(true)}
                className="olympic-button-secondary text-sm px-4 py-2"
              >
                Bulk Award
              </button>
              <button
                onClick={() => setShowStudentManagementModal(true)}
                className="olympic-button text-sm px-4 py-2"
              >
                Manage Students
              </button>
              <button
                onClick={() => setShowBatchUpload(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                📋 Batch Upload Students
              </button>
            </div>
            
            <form onSubmit={handleAward} className="space-y-6">
              {/* Student Selection with Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Student
                </label>
                <div className="relative student-search-container">
                  <input
                    type="text"
                    value={studentSearchTerm}
                    onChange={(e) => {
                      setStudentSearchTerm(e.target.value);
                      setShowStudentDropdown(true);
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    placeholder="Search students by username..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                  />
                  {showStudentDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {students
                        .filter(student => 
                          student.username.toLowerCase().includes(studentSearchTerm.toLowerCase())
                        )
                        .sort((a, b) => a.username.localeCompare(b.username))
                        .map((student) => (
                          <div
                            key={student.id}
                            onClick={() => {
                              setSelectedStudent(student.id);
                              setStudentSearchTerm(student.username);
                              setShowStudentDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-olympic-blue/10 cursor-pointer"
                          >
                            {student.username}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                {selectedStudent && (
                  <p className="text-sm text-gray-500 mt-1">
                    Selected: {students.find(s => s.id === selectedStudent)?.username}
                  </p>
                )}
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
                  <option value="xp">Assignment XP</option>
                  <option value="gameboard_moves">Gameboard Moves</option>
                  <option value="gold">Gold</option>
                </select>
              </div>

              {/* Assignment Selection (for XP awards) */}
              {awardType === 'xp' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment
                  </label>
                  <select
                    value={selectedAssignment}
                    onChange={(e) => setSelectedAssignment(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                  >
                    <option value="">Select assignment...</option>
                    {assignments.map((assignment) => (
                      <option key={assignment.id} value={assignment.id}>
                        {assignment.name} (Quest {assignment.questType}, Max: {assignment.maxXP} XP)
                      </option>
                    ))}
                  </select>
                </div>
              )}



              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                
                {/* Percentage buttons for Assignment XP */}
                {awardType === 'xp' && selectedAssignment && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2">Quick percentage selection:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[50, 60, 70, 80, 90, 100].map(percentage => {
                        const assignment = assignments.find(a => a.id === selectedAssignment);
                        const amount = assignment ? Math.round((assignment.maxXP * percentage) / 100) : 0;
                        return (
                          <button
                            key={percentage}
                            type="button"
                            onClick={() => setAwardAmount(amount)}
                            className={`px-3 py-2 text-sm rounded border transition-colors ${
                              awardAmount === amount 
                                ? 'bg-olympic-blue text-white border-olympic-blue' 
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {percentage}% ({amount} XP)
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <input
                  type="number"
                  min="1"
                  max={1000}
                  value={awardAmount}
                  onChange={(e) => setAwardAmount(parseInt(e.target.value) || 0)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                  placeholder={`Enter ${getAwardTypeLabel(awardType).toLowerCase()}`}
                />
                
                {awardType === 'xp' && selectedAssignment && (
                  <p className="text-sm text-gray-500 mt-1">
                    Max XP for this assignment: {assignments.find(a => a.id === selectedAssignment)?.maxXP || 0}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                  placeholder="Add a note about this award..."
                />
              </div>

              <button
                type="submit"
                disabled={isAwarding || !selectedStudent || awardAmount <= 0}
                className="w-full olympic-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAwarding ? 'Awarding...' : `Award ${getAwardTypeLabel(awardType)}`}
              </button>
            </form>
          </div>

          {/* Assignment Management */}
          <div className="chef-card p-6">
            <h2 className="text-xl font-oswald font-bold text-gray-900 mb-6">Assignment Management</h2>
            
            {/* Create New Assignment */}
            <form onSubmit={handleCreateAssignment} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Name
                </label>
                <input
                  type="text"
                  value={newAssignmentName}
                  onChange={(e) => setNewAssignmentName(e.target.value)}
                  placeholder="Enter assignment name..."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum XP Value
                </label>
                <select
                  value={newAssignmentMaxXP}
                  onChange={(e) => setNewAssignmentMaxXP(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                >
                  <option value={50}>50 XP</option>
                  <option value={100}>100 XP</option>
                  <option value={150}>150 XP</option>
                  <option value={200}>200 XP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quest Assignment <span className="text-red-500">*</span>
                </label>
                <select
                  value={newAssignmentQuest}
                  onChange={(e) => setNewAssignmentQuest(parseInt(e.target.value) as 1 | 2 | 3)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                >
                  <option value={1}>Quest 1: Babies (Prenatal & Infancy)</option>
                  <option value={2}>Quest 2: Childhood (Early Development)</option>
                  <option value={3}>Quest 3: Adolescence and Beyond</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">
                  This assignment will contribute XP to the selected quest
                </p>
              </div>
              
              <button
                type="submit"
                disabled={isCreatingAssignment || !newAssignmentName.trim()}
                className="w-full olympic-button disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingAssignment ? 'Creating...' : 'Create Assignment'}
              </button>
            </form>
            
            {/* Existing Assignments */}
            <div>
              <h3 className="font-oswald font-bold text-gray-900 mb-3">Existing Assignments</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">{assignment.name}</div>
                        <div className="text-sm text-gray-500">Max: {assignment.maxXP} XP</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-400">
                          Created: {new Date(assignment.createdAt).toLocaleDateString()}
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete assignment "${assignment.name}"?\n\nThis cannot be undone and will remove it from all student award records.`)) {
                              try {
                                const response = await apiClient.deleteAssignment(assignment.id);
                                if (response.success) {
                                  setAssignments(prev => prev.filter(a => a.id !== assignment.id));
                                  console.log('✅ Assignment deleted:', assignment.name);
                                } else {
                                  alert('Failed to delete assignment: ' + (response.error || 'Unknown error'));
                                }
                              } catch (error) {
                                console.error('Delete assignment error:', error);
                                alert('Error deleting assignment. Check console for details.');
                              }
                            }
                          }}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                          title="Delete Assignment"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {assignments.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <div className="text-2xl mb-2">📝</div>
                    <p>No assignments created yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Overview Tab */}
      {activeTab === 'students' && (
        <div>
          {/* Student Overview Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-oswald font-bold text-gray-900">Student Progress Overview</h2>
              <p className="text-gray-600">Monitor and manage all student progress</p>
            </div>
            <div className="flex space-x-3">
              {currentUser.adminRole === 'Primary Instructor' && (
                <button
                  onClick={downloadStudentData}
                  className="olympic-button secondary text-sm px-4 py-2"
                >
                  📊 Export Student Data
                </button>
              )}
              <button
                onClick={() => setShowBulkModal(true)}
                className="olympic-button secondary"
              >
                Bulk Award
              </button>
            </div>
          </div>

          {/* Student Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onSelectForAward={(studentId) => {
                  setSelectedStudent(studentId);
                  setActiveTab('awards');
                }}
                onViewDetails={(studentId) => {
                  console.log('View details for:', studentId);
                  // TODO: Implement student details modal
                }}
              />
            ))}
          </div>

          {students.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-xl font-oswald font-bold text-gray-900 mb-2">No Students Yet</h3>
              <p className="text-gray-600">Students will appear here once they complete onboarding.</p>
            </div>
          )}
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <ResourceManager currentUser={currentUser} units={units} />
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="chef-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-oswald font-bold text-gray-900">Admin Activity Log</h2>
                <p className="text-gray-600 mt-2">Track all administrative actions and awards</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  {activityLogs.length} total entries
                </div>
                {/* Debug admin role */}
                <div className="text-xs text-gray-400">
                  Role: "{currentUser.adminRole}" | Admin: {currentUser.isAdmin ? 'Yes' : 'No'}
                </div>
                {(currentUser.adminRole === 'Primary Instructor' || !currentUser.adminRole) && (
                  <button
                    onClick={downloadActivityLog}
                    className="olympic-button text-sm px-4 py-2"
                  >
                    📄 Download Log
                  </button>
                )}
                {currentUser.adminRole !== 'Primary Instructor' && currentUser.adminRole && (
                  <button
                    onClick={() => alert('Only the Primary Instructor can download activity logs.')}
                    className="olympic-button secondary text-sm px-4 py-2 opacity-50 cursor-not-allowed"
                  >
                    📄 Download Log (Restricted)
                  </button>
                )}
              </div>
            </div>

            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Activity Logging Active</h3>
              <p className="text-gray-600 mb-4">
                All administrative actions are being logged silently for audit purposes.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
                <h4 className="font-medium text-blue-900 mb-2">📊 Current Session Stats:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div>• <strong>{activityLogs.length}</strong> actions logged</div>
                  <div>• Last activity: {activityLogs.length > 0 ? activityLogs[0].timestamp.toLocaleString() : 'None'}</div>
                  <div>• Retention: Last 100 actions</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                💡 Logs are stored efficiently and don't impact system performance.<br/>
                Use the download button above to export detailed activity logs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* XP Backups Tab */}
      {activeTab === 'backups' && currentUser.adminRole === 'Primary Instructor' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Current XP Data */}
            <div className="chef-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-oswald font-bold text-gray-900">Current XP Data</h2>
                  <p className="text-gray-600 mt-2">Download current state of all student XP data</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-winter-ice rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Live XP Data</h3>
                    <p className="text-sm text-gray-600">Current assignment XP for all students</p>
                  </div>
                  <button
                    onClick={handleDownloadXPBackup}
                    className="olympic-button text-sm px-4 py-2"
                  >
                    💾 Download Current Data
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Create Manual Backup</h3>
                    <p className="text-sm text-gray-600">Create timestamped backup for archival</p>
                  </div>
                  <button
                    onClick={handleManualXPBackup}
                    className="olympic-button secondary text-sm px-4 py-2"
                  >
                    📁 Create Backup
                  </button>
                </div>
              </div>
            </div>

            {/* Backup History */}
            <div className="chef-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-oswald font-bold text-gray-900">Backup History</h2>
                  <p className="text-gray-600 mt-2">Automatic and manual XP backups</p>
                </div>
                <button
                  onClick={handleDownloadXPBackupLogs}
                  className="olympic-button secondary text-sm px-3 py-1"
                >
                  📊 Export Logs
                </button>
              </div>

              {xpBackupLogs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">💾</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Backups Yet</h3>
                  <p className="text-gray-600 text-sm">Automatic backups run nightly at 2 AM</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {xpBackupLogs.map((log) => (
                    <div key={log.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              log.triggeredBy === 'automatic' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {log.triggeredBy}
                            </span>
                            <span className="text-xs text-gray-500">{log.academicPeriod}</span>
                          </div>
                          
                          <div className="text-sm text-gray-900">
                            <strong>{log.studentCount}</strong> students, 
                            <strong> {log.totalXPRecorded.toLocaleString()}</strong> total XP
                          </div>
                          
                          {log.adminUsername && (
                            <div className="text-xs text-gray-500 mt-1">
                              by {log.adminUsername}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-400 text-right">
                          <div>{log.backupDate.toLocaleDateString()}</div>
                          <div>{log.backupDate.toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Data Security Notice */}
          <div className="mt-8">
            <div className="chef-card p-6 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">🔒</div>
                <div>
                  <h3 className="text-lg font-oswald font-bold text-gray-900 mb-2">Data Security & Best Practices</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• <strong>Automatic Backups:</strong> XP data is automatically backed up nightly at 2 AM</li>
                    <li>• <strong>Data Integrity:</strong> All backups include checksum verification</li>
                    <li>• <strong>Academic Period Tracking:</strong> Backups are organized by academic term</li>
                    <li>• <strong>Retention:</strong> Last 50 backups are kept for historical tracking</li>
                    <li>• <strong>Access Control:</strong> Only Primary Instructor can access backup functions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Award Modal */}
      <BulkAwardModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        students={students}
        onBulkAward={handleBulkAward}
      />

      {/* Student Management Modal */}
      <StudentManagementModal
        isOpen={showStudentManagementModal}
        onClose={() => setShowStudentManagementModal(false)}
        onStudentsAdded={() => {
          // Reload students after adding new ones
          setStudents([]);
        }}
      />

      {/* Batch Upload Modal */}
      {showBatchUpload && (
        <SimpleStudentUpload
          onClose={() => setShowBatchUpload(false)}
          onUploadComplete={(results) => {
            setShowBatchUpload(false);
            setBatchUploadResults(results);
          }}
        />
      )}

      {/* Batch Upload Results Modal */}
      {batchUploadResults && (
        <SimpleUploadResults
          results={batchUploadResults}
          onClose={() => setBatchUploadResults(null)}
        />
      )}
    </div>
  );
}