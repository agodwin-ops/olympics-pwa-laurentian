'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOlympicsAuth } from '@/contexts/OlympicsAuthContext';

interface OnboardingForm {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  profilePicture: File | null;
  userProgram: string;
  adminCode?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { register } = useOlympicsAuth();
  const [step, setStep] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState<OnboardingForm>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    profilePicture: null,
    userProgram: '',
    adminCode: ''
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

  const validatePassword = (password: string): string[] => {
    const errors = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/\d/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Password must contain at least one special character');
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Client-side validation
    const passwordErrors = validatePassword(form.password);
    if (passwordErrors.length > 0) {
      alert('Password requirements:\n' + passwordErrors.join('\n'));
      setLoading(false);
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await register({
        email: form.email,
        username: form.username,
        password: form.password,
        confirmPassword: form.confirmPassword,
        userProgram: form.userProgram,
        profilePicture: form.profilePicture || undefined,
        isAdmin: isAdmin,
        adminCode: form.adminCode
      });

      // If we reach here, registration was successful
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Show specific error message if available
      const errorMessage = error?.message || 'Registration failed. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const programs = [
    'BPHE Kinesiology',
    'BPHE Health Promotion', 
    'BPHE Outdoor Adventure',
    'BPHE Sport Psychology',
    'EDPH',
    'BSc Kinesiology'
  ];

  return (
    <div className="min-h-screen winter-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-olympic-blue rounded-full mb-6 shadow-lg">
            <span className="text-white text-3xl font-oswald font-bold">🏔️</span>
          </div>
          <h1 className="text-4xl font-oswald font-bold text-gray-900 mb-2">
            XV Winter Olympic Saga Game
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Canadian Winter Olympic Team
          </p>
          <p className="text-gray-500">
            Welcome to the Olympics RPG classroom experience
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-olympic-blue' : 'bg-gray-300'}`} />
            <div className={`w-8 h-1 ${step >= 2 ? 'bg-olympic-blue' : 'bg-gray-300'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-olympic-blue' : 'bg-gray-300'}`} />
            <div className={`w-8 h-1 ${step >= 3 ? 'bg-olympic-blue' : 'bg-gray-300'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-olympic-blue' : 'bg-gray-300'}`} />
          </div>
        </div>

        {/* Form */}
        <div className="chef-card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-oswald font-semibold text-center text-gray-900 mb-6">
                  Basic Information
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                    placeholder="Choose a username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                    placeholder="Create a strong password"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must contain 8+ characters, uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                    placeholder="Confirm your password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Program
                  </label>
                  <select
                    required
                    value={form.userProgram}
                    onChange={(e) => setForm({ ...form, userProgram: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                  >
                    <option value="">Select your program</option>
                    {programs.map((program) => (
                      <option key={program} value={program}>
                        {program}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full olympic-button py-3"
                  disabled={!form.email || !form.username || !form.userProgram}
                >
                  Continue
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-oswald font-semibold text-center text-gray-900 mb-6">
                  Profile Picture
                </h2>
                
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

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 olympic-button py-3"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-oswald font-semibold text-center text-gray-900 mb-6">
                  Account Type
                </h2>
                
                <div className="space-y-4">
                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      !isAdmin
                        ? 'border-olympic-blue bg-winter-ice'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setIsAdmin(false)}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="accountType"
                        checked={!isAdmin}
                        onChange={() => setIsAdmin(false)}
                        className="mr-3 text-olympic-blue"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">Student</h3>
                        <p className="text-sm text-gray-600">
                          Experience the XV Winter Olympics and compete with classmates
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isAdmin
                        ? 'border-canada-red bg-red-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setIsAdmin(true)}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="accountType"
                        checked={isAdmin}
                        onChange={() => setIsAdmin(true)}
                        className="mr-3 text-canada-red"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">Administrator</h3>
                        <p className="text-sm text-gray-600">
                          Teacher or GTA access (requires admin code)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Code
                    </label>
                    <input
                      type="password"
                      required={isAdmin}
                      value={form.adminCode}
                      onChange={(e) => setForm({ ...form, adminCode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-canada-red focus:border-canada-red"
                      placeholder="Enter admin access code"
                    />
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (isAdmin && !form.adminCode)}
                    className="flex-1 olympic-button py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating Account...' : 'Start Your Olympic Journey'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Login Link for Returning Users */}
        <div className="text-center mt-6">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <p className="text-gray-700 mb-2 font-medium">
              🏔️ Already have an account?
            </p>
            <Link 
              href="/login" 
              className="inline-flex items-center px-6 py-2 text-olympic-blue hover:text-white hover:bg-olympic-blue border-2 border-olympic-blue rounded-lg transition-all font-oswald font-semibold"
            >
              Sign In Here
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© XV Winter Olympics • Olympic Saga Game • Educational Use</p>
        </div>
      </div>
    </div>
  );
}