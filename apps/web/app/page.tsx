'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOlympicsAuth } from '@/contexts/OlympicsAuthContext';

export default function HomePage() {
  const router = useRouter();
  const { login } = useOlympicsAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    setAdminError('');

    try {
      const result = await login(adminForm.email, adminForm.password);
      if (result === true) {
        // Admin login successful - go to dashboard
        router.push('/dashboard');
      } else if (result === 'incomplete-profile') {
        // Admins should not have incomplete profiles - this is an error
        setAdminError('Admin account configuration error. Contact system administrator.');
      } else {
        setAdminError('Invalid admin credentials');
      }
    } catch (error: any) {
      setAdminError(error?.message || 'Admin login failed');
    } finally {
      setAdminLoading(false);
    }
  };

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
            Educational Olympic Experience
          </p>
        </div>

        {/* Main Navigation */}
        <div className="chef-card p-8 mb-6">
          <div className="space-y-6">
            {/* Student Portal */}
            <div className="text-center">
              <h2 className="text-2xl font-oswald font-semibold text-gray-900 mb-4">
                🎮 Student Portal
              </h2>
              <p className="text-gray-600 mb-6">
                Experience the XV Winter Olympics and compete with your classmates
              </p>
              <Link
                href="/student-login"
                className="inline-block w-full olympic-button py-4 text-lg font-oswald font-semibold mb-4"
              >
                Student Login
              </Link>
              <Link
                href="/onboarding"
                className="inline-block text-olympic-blue hover:text-olympic-blue-dark font-medium"
              >
                New Student? Register Here
              </Link>
            </div>

            <div className="border-t border-gray-200 my-6"></div>

            {/* Admin Login Section */}
            <div className="text-center">
              <h2 className="text-2xl font-oswald font-semibold text-gray-900 mb-4">
                🎓 Instructor Portal
              </h2>
              
              {!showAdminLogin ? (
                <button
                  onClick={() => setShowAdminLogin(true)}
                  className="inline-block px-6 py-3 bg-canada-red text-white font-oswald font-semibold rounded-lg hover:bg-red-700 transition-all"
                >
                  Admin Login
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <h3 className="font-oswald font-semibold text-gray-900 mb-4">
                      Administrator Access
                    </h3>
                    
                    {adminError && (
                      <div className="bg-red-100 border border-red-300 rounded p-3">
                        <p className="text-red-800 text-sm">{adminError}</p>
                      </div>
                    )}
                    
                    <input
                      type="email"
                      placeholder="Admin Email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                      className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-canada-red focus:border-canada-red"
                      required
                    />
                    
                    <input
                      type="password"
                      placeholder="Admin Password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                      className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-canada-red focus:border-canada-red"
                      required
                    />
                    
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={() => setShowAdminLogin(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={adminLoading}
                        className="flex-1 px-4 py-2 bg-canada-red text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {adminLoading ? 'Signing In...' : 'Login'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>© XV Winter Olympics • Olympic Saga Game • Educational Use</p>
        </div>
      </div>
    </div>
  );
}