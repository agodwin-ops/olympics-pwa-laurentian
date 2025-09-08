'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useOlympicsAuth } from '@/contexts/OlympicsAuthContext';
import apiClient from '@/lib/api-client';

interface ProfileForm {
  username: string;
  userProgram: string;
  profilePicture: File | null;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, updateProfile, loading: authLoading } = useOlympicsAuth();
  const [form, setForm] = useState<ProfileForm>({
    username: '',
    userProgram: '',
    profilePicture: null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, profilePicture: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Use context's updateProfile method which handles API call and state updates
      if (updateProfile) {
        // Convert File to data URL if present
        let profilePictureUrl: string | undefined = undefined;
        if (form.profilePicture) {
          profilePictureUrl = await fileToBase64(form.profilePicture);
        }
        
        const success = await updateProfile({
          username: form.username,
          userProgram: form.userProgram,
          profilePicture: profilePictureUrl
        });
        
        if (success) {
          // Redirect to dashboard
          router.push('/dashboard');
        } else {
          throw new Error('Profile update failed');
        }
      } else {
        throw new Error('Profile update service not available');
      }
    } catch (error: any) {
      console.error('Profile setup error:', error);
      alert('Failed to complete profile setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const programs = [
    'BPHE Kinesiology',
    'BPHE Health Promotion', 
    'BPHE Outdoor Adventure',
    'BPHE Sport Psychology',
    'EDPH',
    'BSc Kinesiology'
  ];

  // Show loading spinner while auth context is loading user data
  if (authLoading) {
    return (
      <div className="min-h-screen winter-bg flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-olympic-blue rounded-full mb-4 shadow-lg">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full"></div>
          </div>
          <p className="text-xl text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  // If user is not available after loading, something went wrong
  if (!user) {
    return (
      <div className="min-h-screen winter-bg flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500 rounded-full mb-4 shadow-lg">
            <span className="text-white text-2xl">⚠️</span>
          </div>
          <p className="text-xl text-gray-600 mb-4">Unable to load your account</p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="px-6 py-2 bg-olympic-blue text-white rounded-lg hover:bg-blue-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen winter-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-olympic-blue rounded-full mb-6 shadow-lg">
            <span className="text-white text-3xl font-oswald font-bold">🏔️</span>
          </div>
          <h1 className="text-4xl font-oswald font-bold text-gray-900 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Welcome to the XV Winter Olympic Saga Game!
          </p>
          <p className="text-gray-500">
            Set up your athlete profile to begin your Olympic journey
          </p>
        </div>

        {/* Form */}
        <div className="chef-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-oswald font-semibold text-center text-gray-900 mb-6">
              Create Your Athlete Profile
            </h2>

            {/* Profile Picture */}
            <div className="text-center">
              <div className="mb-6">
                {profilePreview ? (
                  <img
                    src={profilePreview}
                    alt="Profile Preview"
                    className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-olympic-blue shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full mx-auto bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                    <span className="text-4xl text-gray-400">👤</span>
                  </div>
                )}
              </div>
              
              <label className="inline-block olympic-button secondary cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {profilePreview ? 'Change Picture' : 'Upload Picture'}
              </label>
              
              <p className="text-sm text-gray-500 mt-2">
                Upload a profile picture (optional)
              </p>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Your Username
              </label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                placeholder="Enter your athlete username"
              />
              <p className="text-sm text-gray-500 mt-1">
                This will be your display name in the game
              </p>
            </div>

            {/* Program */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Your Program
              </label>
              <select
                required
                value={form.userProgram}
                onChange={(e) => setForm({ ...form, userProgram: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
              >
                <option value="">Choose your academic program</option>
                {programs.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>
            </div>

            {/* Current email display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Account Information</h3>
              <p className="text-sm text-gray-600">
                Email: <span className="font-mono">{user?.email || 'Loading...'}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Your login email cannot be changed
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !form.username || !form.userProgram}
              className="w-full olympic-button py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up your profile...' : 'Start Your Olympic Journey'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© XV Winter Olympics • Olympic Saga Game • Educational Use</p>
        </div>
      </div>
    </div>
  );
}