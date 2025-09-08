'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthContextType, RegisterForm } from '@/types/olympics';
import apiClient from '@/lib/api-client';
import type { ApiResponse } from '@/lib/api-client';
import XPBackupService from '@/lib/xp-backup-service';

const OlympicsAuthContext = createContext<AuthContextType | undefined>(undefined);

// Transform API response to match frontend User type
function transformApiUserToFrontendUser(apiUser: any): User {
  // Determine admin role based on user program or email
  let adminRole: string | undefined = undefined;
  if (apiUser.is_admin) {
    console.log('Admin user detected:', {
      email: apiUser.email,
      user_program: apiUser.user_program,
      is_admin: apiUser.is_admin
    });
    if (apiUser.user_program === 'Primary Instructor' || 
        apiUser.user_program === 'Course Instructor' || 
        apiUser.email === 'agodwin@laurentian.ca' || 
        apiUser.email === 'mcuza@laurentian.ca') {
      adminRole = 'Primary Instructor';
      console.log('Assigned Primary Instructor role');
    } else {
      adminRole = 'Admin';
      console.log('Assigned Admin role');
    }
  }

  return {
    id: apiUser.id,
    email: apiUser.email,
    username: apiUser.username,
    profilePicture: apiUser.profile_picture_url,
    userProgram: apiUser.user_program,
    isAdmin: apiUser.is_admin, // Transform snake_case to camelCase
    adminRole: adminRole,
    profileComplete: apiUser.profile_complete ?? true, // Default to true for existing users
    createdAt: new Date(apiUser.created_at),
    updatedAt: new Date(apiUser.updated_at)
  };
}

export function OlympicsAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Start with loading: false for SSR, will be updated on client
  const [loading, setLoading] = useState(typeof window === 'undefined' ? false : true);

  // Check for existing session on mount - CLIENT SIDE ONLY
  useEffect(() => {
    // Only run on client-side to avoid SSR issues
    if (typeof window !== 'undefined') {
      // Set loading to true on client-side mount, then check auth
      setLoading(true);
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    // Ensure we're on the client-side
    if (typeof window === 'undefined') {
      console.log('⚠️ PWA Session Recovery: Skipping on server-side');
      setLoading(false);
      return;
    }
    
    try {
      console.log('🔍 PWA Session Recovery: Checking for existing authentication...');
      
      // Check multiple storage locations for better mobile PWA persistence
      const storedToken = localStorage.getItem('olympics_auth_token') || 
                         sessionStorage.getItem('olympics_auth_token');
      const storedUser = localStorage.getItem('olympics_user') || 
                        sessionStorage.getItem('olympics_user');
      
      if (storedToken) {
        console.log('✅ Found stored token, validating with server...');
        
        // Set token for API client
        apiClient.setToken(storedToken);
        
        try {
          // Validate token with server and get current user data
          const response = await apiClient.getCurrentUser();
          
          if (response.success && response.data) {
            console.log('✅ Token valid, user authenticated:', response.data.email || response.data.username);
            
            // Transform API response to match frontend User type
            const userData = transformApiUserToFrontendUser(response.data);
            setUser(userData);
            
            // Store in both localStorage and sessionStorage for redundancy
            const userDataString = JSON.stringify(userData);
            localStorage.setItem('olympics_user', userDataString);
            localStorage.setItem('olympics_auth_token', storedToken);
            sessionStorage.setItem('olympics_user', userDataString);
            sessionStorage.setItem('olympics_auth_token', storedToken);
            
            console.log('🎯 PWA Session Recovery: Successfully restored user session');
          } else {
            throw new Error('Token validation failed');
          }
        } catch (apiError) {
          console.log('❌ Token invalid or expired, checking for cached user data...');
          
          // If API call fails but we have cached user data, try to use it temporarily
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              console.log('⚠️ Using cached user data (offline mode):', userData.email || userData.username);
              setUser(userData);
              
              // Keep the token in case network comes back
              return;
            } catch (parseError) {
              console.log('❌ Cached user data corrupted');
            }
          }
          
          // Clear everything if token is invalid and no valid cache
          localStorage.removeItem('olympics_user');
          localStorage.removeItem('olympics_auth_token');
          sessionStorage.removeItem('olympics_user');
          sessionStorage.removeItem('olympics_auth_token');
          apiClient.setToken(null);
          setUser(null);
        }
      } else {
        console.log('❌ No stored token found - user needs to login');
        // No token found, user needs to login
        apiClient.setToken(null);
        setUser(null);
      }
    } catch (error: unknown) {
      console.error('❌ PWA Session Recovery failed:', error);
      // Clear potentially corrupted auth data
      localStorage.removeItem('olympics_user');
      localStorage.removeItem('olympics_auth_token');
      sessionStorage.removeItem('olympics_user');
      sessionStorage.removeItem('olympics_auth_token');
      apiClient.setToken(null);
      setUser(null);
    } finally {
      console.log('🔧 PWA Session Recovery: Setting loading to false');
      setLoading(false);
      console.log('✅ PWA Session Recovery: Complete');
    }
  };

  const login = async (email: string, password: string): Promise<boolean | string> => {
    try {
      const response = await apiClient.login(email, password);

      if (response.success && response.data) {
        console.log('Login successful:', response.data);
        
        // Store authentication token for session persistence (multiple storage methods)
        if (response.data.access_token) {
          localStorage.setItem('olympics_auth_token', response.data.access_token);
          sessionStorage.setItem('olympics_auth_token', response.data.access_token);
          apiClient.setToken(response.data.access_token);
          console.log('🔐 PWA Session: Token stored in both localStorage and sessionStorage');
        }
        
        // Transform and set user data
        const userData = transformApiUserToFrontendUser(response.data.user);
        setUser(userData);
        
        // Store user data in both storage methods for PWA persistence
        const userDataString = JSON.stringify(userData);
        localStorage.setItem('olympics_user', userDataString);
        sessionStorage.setItem('olympics_user', userDataString);
        console.log('👤 PWA Session: User data stored for:', userData.email);
        
        // Check if profile needs completion (students with temporary usernames or incomplete profiles)
        if (!userData.isAdmin) {
          const hasIncompleteProfile = (
            userData.profileComplete === false || 
            userData.username.startsWith('temp_') || 
            userData.userProgram === 'Pending Profile Completion'
          );
          
          if (hasIncompleteProfile) {
            console.log('New student detected - redirecting to profile setup:', {
              username: userData.username,
              userProgram: userData.userProgram,
              profileComplete: userData.profileComplete
            });
            // New/batch students need to complete profile - redirect to profile setup
            return 'incomplete-profile';
          } else {
            console.log('Returning student detected - profile already complete:', {
              username: userData.username,
              userProgram: userData.userProgram,
              profileComplete: userData.profileComplete
            });
            // Returning student with complete profile - go directly to dashboard
            return 'returning-student';
          }
        }
        
        // Admin users go directly to dashboard
        return true;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      // Re-throw the error so the component can display the proper message
      throw new Error(error?.message || error || 'Login failed. Please check your credentials.');
    }
  };

  const register = async (userData: RegisterForm): Promise<boolean> => {
    try {
      console.log('Real registration initiated', userData);
      
      // Create FormData for API request
      const formData = new FormData();
      formData.append('email', userData.email);
      formData.append('username', userData.username);
      formData.append('password', userData.password);
      formData.append('confirm_password', userData.confirmPassword);
      formData.append('user_program', userData.userProgram);
      formData.append('is_admin', userData.isAdmin.toString());
      
      // Add admin code if provided
      if (userData.adminCode) {
        formData.append('admin_code', userData.adminCode);
      }
      
      // Add profile picture if provided
      if (userData.profilePicture) {
        formData.append('profile_picture', userData.profilePicture);
      }
      
      console.log('Calling API register endpoint...');
      
      // Call the real API endpoint
      const response = await apiClient.register(formData);
      
      if (response.success && response.data) {
        console.log('Registration successful:', response.data);
        
        // Store authentication token for session persistence (multiple storage methods)
        if (response.data.access_token) {
          localStorage.setItem('olympics_auth_token', response.data.access_token);
          sessionStorage.setItem('olympics_auth_token', response.data.access_token);
          apiClient.setToken(response.data.access_token);
          console.log('🔐 PWA Registration: Token stored in both storage methods');
        }
        
        // Transform and set user data
        const userData = transformApiUserToFrontendUser(response.data.user);
        setUser(userData);
        
        // Store user data in both storage methods for PWA persistence
        const userDataString = JSON.stringify(userData);
        localStorage.setItem('olympics_user', userDataString);
        sessionStorage.setItem('olympics_user', userDataString);
        console.log('👤 PWA Registration: User data stored for:', userData.email);
        
        // Initialize player data
        if (response.data.user && response.data.user.id) {
          await initializePlayerData(response.data.user.id);
        }
        
        return true;
      } else {
        console.error('Registration failed:', response.error);
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      // Re-throw the error with the message so it can be caught by the component
      throw error;
    }
  };

  const initializePlayerData = async (userId: string) => {
    try {
      await apiClient.initializePlayerData(userId);
    } catch (error: unknown) {
      console.error('Failed to initialize player data:', error);
    }
  };

  const updateProfile = async (profileData: { username: string; userProgram: string; profilePicture?: string }): Promise<boolean> => {
    try {
      // Use the completeProfile method from ApiClient
      const response: ApiResponse<any> = await apiClient.completeProfile({
        username: profileData.username,
        user_program: profileData.userProgram,
        profile_picture_url: profileData.profilePicture
      });

      if (response.success && response.data) {
        // Transform and update user data
        const updatedUser = transformApiUserToFrontendUser(response.data);
        setUser(updatedUser);
        localStorage.setItem('olympics_user', JSON.stringify(updatedUser));
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw new Error(error?.message || 'Failed to update profile');
    }
  };

  const logout = () => {
    console.log('🚪 PWA Session: Logging out user');
    setUser(null);
    
    // Clear authentication data from both storage methods
    localStorage.removeItem('olympics_user');
    localStorage.removeItem('olympics_auth_token');
    sessionStorage.removeItem('olympics_user');
    sessionStorage.removeItem('olympics_auth_token');
    
    // Clear admin-specific data to prevent cross-session contamination
    localStorage.removeItem('admin_created_lectures');
    localStorage.removeItem('admin_activity_logs');
    localStorage.removeItem('admin_students_data');
    
    // Stop XP backup service to prevent background processes
    const xpService = XPBackupService.getInstance();
    xpService.stopNightlyBackups();
    
    apiClient.logout();
    console.log('✅ PWA Session: All authentication data cleared');
    window.location.href = '/';
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
    updateProfile,
  };

  return (
    <OlympicsAuthContext.Provider value={value}>
      {children}
    </OlympicsAuthContext.Provider>
  );
}

export function useOlympicsAuth(): AuthContextType {
  const context = useContext(OlympicsAuthContext);
  if (context === undefined) {
    throw new Error('useOlympicsAuth must be used within an OlympicsAuthProvider');
  }
  return context;
}