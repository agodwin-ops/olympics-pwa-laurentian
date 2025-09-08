'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOlympicsAuth } from '@/contexts/OlympicsAuthContext';

export default function StudentLoginPage() {
  const router = useRouter();
  const { login } = useOlympicsAuth();
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use email for login (batch authentication system)
      const result = await login(form.email, form.password);
      if (result === true) {
        // Admin user - go to dashboard  
        router.push('/dashboard');
      } else if (result === 'incomplete-profile') {
        // New/batch student needs to complete profile - redirect to profile setup
        router.push('/profile-setup');
      } else if (result === 'returning-student') {
        // Returning student with complete profile - go directly to dashboard
        router.push('/dashboard');
      } else {
        setError('Login failed. Please check your credentials or contact your instructor.');
      }
    } catch (error: any) {
      console.error('Student login error:', error);
      setError(error?.message || 'Login failed. Please try again or contact your instructor.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen winter-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-olympic-blue rounded-full mb-6 shadow-lg">
            <span className="text-white text-3xl font-oswald font-bold">🏔️</span>
          </div>
          <h1 className="text-4xl font-oswald font-bold text-gray-900 mb-2">
            Student Portal
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            XV Winter Olympic Saga Game
          </p>
          <p className="text-gray-500">
            Enter your class credentials to continue
          </p>
        </div>

        {/* Login Type Toggle */}
        <div className="chef-card p-6 mb-6">
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setIsFirstTime(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                isFirstTime
                  ? 'bg-olympic-blue text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              First Time Login
            </button>
            <button
              type="button"
              onClick={() => setIsFirstTime(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                !isFirstTime
                  ? 'bg-olympic-blue text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Returning Student
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-oswald font-semibold text-center text-gray-900 mb-6">
              {isFirstTime ? 'First Time Setup' : 'Welcome Back'}
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-blue-400">ℹ️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    {isFirstTime 
                      ? 'Use the email and password provided by your instructor. You will choose your username and setup your profile after login.'
                      : 'Enter the same email, username, and password you used to access the Olympic game before.'
                    }
                  </p>
                </div>
              </div>
            </div>

            {!isFirstTime && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  required={!isFirstTime}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                  placeholder="Enter your chosen username"
                  value={form.username}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-gray-500 mt-1">
                  The username you chose during profile setup
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                placeholder="your.email@example.com"
                value={form.email}
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                Email address provided by your instructor
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleInputChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                {isFirstTime 
                  ? 'Class password provided by your instructor'
                  : 'Same password you used before'
                }
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full olympic-button py-3 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Logging in...' : (isFirstTime ? 'Start Olympic Journey' : 'Continue Journey')}
            </button>
          </form>

          {/* Help Section */}
          <div className="mt-6 text-center space-y-4">
            <div className="text-sm text-gray-600">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
                <p className="text-xs text-gray-600 mb-2">
                  • Contact your instructor if you forgot your credentials
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  • Make sure you're using the exact username and email provided
                </p>
                <p className="text-xs text-gray-600">
                  • Check if your password includes special characters
                </p>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              <Link 
                href="/"
                className="text-olympic-blue hover:text-olympic-blue-dark"
              >
                ← Back to Main Menu
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm">
          <p>© XV Winter Olympics • Canadian Team • Educational Use</p>
        </div>
      </div>
    </div>
  );
}