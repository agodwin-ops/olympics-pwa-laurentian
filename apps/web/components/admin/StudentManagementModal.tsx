'use client';

import { useState } from 'react';
import { X, User, Key, AlertCircle, CheckCircle } from 'lucide-react';

interface StudentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentsAdded: () => void;
}

export default function StudentManagementModal({ 
  isOpen, 
  onClose, 
  onStudentsAdded 
}: StudentManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'reset'>('single');
  const [loading, setLoading] = useState(false);
  
  // Single student state (incomplete profile flow)
  const [singleStudent, setSingleStudent] = useState({
    email: '',
    temporary_password: 'ChangeMe123!'
  });
  const [singleResult, setSingleResult] = useState<string>('');
  
  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('NewPass123!');
  const [resetResult, setResetResult] = useState<string>('');

  if (!isOpen) return null;

  const handleSingleStudentCreation = async () => {
    setLoading(true);
    setSingleResult('');
    
    try {
      if (!singleStudent.email || !singleStudent.temporary_password) {
        setSingleResult('❌ Please enter both email and password');
        setLoading(false);
        return;
      }
      
      // Call the incomplete student creation API
      const response = await fetch('/api/admin/add-incomplete-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: singleStudent.email,
          temporary_password: singleStudent.temporary_password
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setSingleResult(`✅ Account created for ${singleStudent.email}. Student will complete their profile on first login.`);
        onStudentsAdded();
        // Clear form after success
        setSingleStudent({
          email: '',
          temporary_password: 'ChangeMe123!'
        });
      } else {
        setSingleResult(`❌ Failed to create account: ${result.error || result.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Single student creation error:', error);
      setSingleResult(`❌ Error: ${error.message || 'Failed to create student account'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    setResetResult('');
    
    try {
      if (!resetEmail || !resetPassword) {
        setResetResult('❌ Please enter both email and new password');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_email: resetEmail,
          new_temporary_password: resetPassword
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setResetResult(`✅ Password reset for ${resetEmail}. New password: ${resetPassword}`);
        // Clear form after success
        setResetEmail('');
        setResetPassword('NewPass123!');
      } else {
        setResetResult(`❌ Failed to reset password: ${result.error || result.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setResetResult(`❌ Error: ${error.message || 'Failed to reset password'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Student Management</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'single'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="h-4 w-4" />
                Add Individual Student
              </div>
            </button>
            <button
              onClick={() => setActiveTab('reset')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'reset'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Key className="h-4 w-4" />
                Reset Password
              </div>
            </button>
          </div>

          {/* Single Student Tab */}
          {activeTab === 'single' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">How This Works</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Create a student account with email and password. The student will login and complete their profile by choosing their username, program, and profile picture.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Email
                </label>
                <input
                  type="email"
                  value={singleStudent.email}
                  onChange={(e) => setSingleStudent({ ...singleStudent, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="student@university.ca"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password
                </label>
                <input
                  type="text"
                  value={singleStudent.temporary_password}
                  onChange={(e) => setSingleStudent({ ...singleStudent, temporary_password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="Enter temporary password"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Student will use this password for their first login
                </p>
              </div>

              {singleResult && (
                <div className={`p-4 rounded-lg ${
                  singleResult.startsWith('✅') 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${
                    singleResult.startsWith('✅') ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {singleResult}
                  </p>
                </div>
              )}

              <button
                onClick={handleSingleStudentCreation}
                disabled={loading || !singleStudent.email || !singleStudent.temporary_password}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Creating Account...' : 'Create Student Account'}
              </button>
            </div>
          )}

          {/* Password Reset Tab */}
          {activeTab === 'reset' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Key className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-amber-900">Reset Student Password</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Reset a student's password if they forgot their login credentials or need a new temporary password.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Email
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="student@university.ca"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Temporary Password
                </label>
                <input
                  type="text"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
                  placeholder="Enter new password"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Provide this new password to the student
                </p>
              </div>

              {resetResult && (
                <div className={`p-4 rounded-lg ${
                  resetResult.startsWith('✅') 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm ${
                    resetResult.startsWith('✅') ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {resetResult}
                  </p>
                </div>
              )}

              <button
                onClick={handlePasswordReset}
                disabled={loading || !resetEmail || !resetPassword}
                className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-8 pt-6 border-t">
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}