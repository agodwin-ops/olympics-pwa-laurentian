'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthContextType, RegisterForm } from '@/types/olympics';
import apiClient from '@/lib/api-client';

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
    if (apiUser.user_program === 'Course Instructor' || apiUser.email === 'instructor@olympics.com') {
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
    createdAt: new Date(apiUser.created_at),
    updatedAt: new Date(apiUser.updated_at)
  };
}

export function OlympicsAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for existing JWT token
      const storedToken = localStorage.getItem('olympics_auth_token');
      
      if (storedToken) {
        console.log('Found stored token, validating with server...');
        
        // Set token for API client
        apiClient.setToken(storedToken);
        
        // Validate token with server and get current user data
        const response = await apiClient.getCurrentUser();
        
        if (response.success && response.data) {
          console.log('Token valid, user authenticated:', response.data);
          
          // Transform API response to match frontend User type
          const userData = transformApiUserToFrontendUser(response.data);
          setUser(userData);
          
          // Update localStorage with transformed user data
          localStorage.setItem('olympics_user', JSON.stringify(userData));
        } else {
          console.log('Token invalid or expired, clearing auth data');
          // Token is invalid or expired, clear everything
          localStorage.removeItem('olympics_user');
          localStorage.removeItem('olympics_auth_token');
          apiClient.setToken(null);
          setUser(null);
        }
      } else {
        console.log('No stored token found');
        // No token found, user needs to login
        apiClient.setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear potentially corrupted auth data
      localStorage.removeItem('olympics_user');
      localStorage.removeItem('olympics_auth_token');
      apiClient.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.login(email, password);

      if (response.success && response.data) {
        console.log('Login successful:', response.data);
        
        // Transform and set user data
        const userData = transformApiUserToFrontendUser(response.data.user);
        setUser(userData);
        localStorage.setItem('olympics_user', JSON.stringify(userData));
        
        return true;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
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
        
        // Transform and set user data
        const userData = transformApiUserToFrontendUser(response.data.user);
        setUser(userData);
        localStorage.setItem('olympics_user', JSON.stringify(userData));
        
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
    } catch (error) {
      console.error('Failed to initialize player data:', error);
    }
  };

  const logout = () => {
    console.log('Logging out user');
    setUser(null);
    localStorage.removeItem('olympics_user');
    localStorage.removeItem('olympics_auth_token');
    apiClient.logout();
    window.location.href = '/onboarding';
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading,
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