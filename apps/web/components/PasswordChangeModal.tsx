'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PasswordChangeModal({ 
  isOpen, 
  onClose 
}: PasswordChangeModalProps) {
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  if (!isOpen) return null;

  const validatePasswords = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!passwords.current_password) {
      newErrors.current_password = 'Current password is required';
    }
    
    if (!passwords.new_password) {
      newErrors.new_password = 'New password is required';
    } else if (passwords.new_password.length < 8) {
      newErrors.new_password = 'New password must be at least 8 characters';
    }
    
    if (!passwords.confirm_password) {
      newErrors.confirm_password = 'Password confirmation is required';
    } else if (passwords.new_password !== passwords.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }
    
    if (passwords.current_password === passwords.new_password) {
      newErrors.new_password = 'New password must be different from current password';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    
    if (!validatePasswords()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await apiClient.changePassword(passwords);
      
      if (response.success) {
        setResult({
          success: true,
          message: 'Password changed successfully! You can continue using the system with your new password.'
        });
        setPasswords({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        setErrors({});
      } else {
        setResult({
          success: false,
          message: response.message || 'Failed to change password'
        });
      }
      
    } catch (error) {
      setResult({
        success: false,
        message: 'An error occurred while changing your password'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPasswords({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setErrors({});
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {result && (
            <div className={`mb-4 p-3 rounded-md ${
              result.success 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {result.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwords.current_password}
                onChange={(e) => setPasswords(prev => ({ ...prev, current_password: e.target.value }))}
                className={`w-full p-3 border rounded-md ${
                  errors.current_password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your current password"
                disabled={loading}
              />
              {errors.current_password && (
                <p className="mt-1 text-sm text-red-600">{errors.current_password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords(prev => ({ ...prev, new_password: e.target.value }))}
                className={`w-full p-3 border rounded-md ${
                  errors.new_password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your new password"
                disabled={loading}
              />
              {errors.new_password && (
                <p className="mt-1 text-sm text-red-600">{errors.new_password}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Must be at least 8 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwords.confirm_password}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirm_password: e.target.value }))}
                className={`w-full p-3 border rounded-md ${
                  errors.confirm_password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm your new password"
                disabled={loading}
              />
              {errors.confirm_password && (
                <p className="mt-1 text-sm text-red-600">{errors.confirm_password}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-800">Password Requirements:</h4>
            <ul className="mt-1 text-xs text-blue-700 list-disc list-inside">
              <li>At least 8 characters long</li>
              <li>Different from your current password</li>
              <li>Should be memorable but secure</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}