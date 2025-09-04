'use client';

import { useState } from 'react';
import apiClient from '@/lib/api-client';

interface StudentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStudentsAdded: () => void;
}

interface BatchStudent {
  email: string;
  username: string;
  user_program: string;
}

export default function StudentManagementModal({ 
  isOpen, 
  onClose, 
  onStudentsAdded 
}: StudentManagementModalProps) {
  const [activeTab, setActiveTab] = useState<'batch' | 'single' | 'reset'>('batch');
  const [loading, setLoading] = useState(false);
  
  // Batch registration state
  const [batchText, setBatchText] = useState('');
  const [defaultPassword, setDefaultPassword] = useState('Olympics2024!');
  const [batchResult, setBatchResult] = useState<any>(null);
  
  // Single student state
  const [singleStudent, setSingleStudent] = useState({
    email: '',
    username: '',
    user_program: '',
    temporary_password: 'GamePass123!'
  });
  
  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('NewPass123!');
  const [resetResult, setResetResult] = useState<string>('');

  if (!isOpen) return null;

  const handleBatchRegistration = async () => {
    setLoading(true);
    setBatchResult(null);
    
    try {
      // Parse batch text - expect format: email,username,program per line
      const lines = batchText.trim().split('\n').filter(line => line.trim());
      const students: BatchStudent[] = [];
      const errors: string[] = [];
      
      lines.forEach((line, index) => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 3) {
          students.push({
            email: parts[0],
            username: parts[1],
            user_program: parts[2]
          });
        } else {
          errors.push(`Line ${index + 1}: Invalid format (expected: email,username,program)`);
        }
      });
      
      if (errors.length > 0) {
        setBatchResult({
          success: false,
          message: 'Format errors found',
          data: { errors }
        });
        return;
      }
      
      if (students.length === 0) {
        setBatchResult({
          success: false,
          message: 'No valid students found'
        });
        return;
      }
      
      const response = await apiClient.batchRegisterStudents(students, defaultPassword);
      setBatchResult(response);
      
      if (response.success) {
        onStudentsAdded();
      }
      
    } catch (error) {
      setBatchResult({
        success: false,
        message: 'Registration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSingleStudentAdd = async () => {
    setLoading(true);
    
    try {
      const response = await apiClient.addSingleStudent(singleStudent);
      
      if (response.success) {
        setSingleStudent({
          email: '',
          username: '',
          user_program: '',
          temporary_password: 'GamePass123!'
        });
        onStudentsAdded();
      }
      
      setBatchResult(response);
      
    } catch (error) {
      setBatchResult({
        success: false,
        message: 'Failed to add student',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setLoading(true);
    setResetResult('');
    
    try {
      const response = await apiClient.resetStudentPassword(resetEmail, resetPassword);
      
      if (response.success) {
        setResetResult(`Password reset successful for ${resetEmail}. New password: ${resetPassword}`);
        setResetEmail('');
        setResetPassword('NewPass123!');
      } else {
        setResetResult(`Failed to reset password: ${response.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      setResetResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const generatePasswordList = () => {
    if (!batchResult?.success || !batchResult?.data?.successful) return '';
    
    return batchResult.data.successful
      .map((student: any) => `${student.username}: ${student.temporary_password}`)
      .join('\n');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex mb-6 border-b">
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'batch' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500'
              }`}
            >
              Batch Registration
            </button>
            <button
              onClick={() => setActiveTab('single')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'single' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500'
              }`}
            >
              Add Single Student
            </button>
            <button
              onClick={() => setActiveTab('reset')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'reset' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500'
              }`}
            >
              Reset Password
            </button>
          </div>

          {/* Batch Registration Tab */}
          {activeTab === 'batch' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Batch Student Registration</h3>
              <p className="text-sm text-gray-600 mb-4">
                Paste student data (one per line): email,username,program
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Password
                </label>
                <input
                  type="text"
                  value={defaultPassword}
                  onChange={(e) => setDefaultPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Olympics2024!"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Data
                </label>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm"
                  placeholder={`student1@laurentian.ca,Alice_Snow,Environmental Science
student2@laurentian.ca,Bob_Mountain,Physics
student3@laurentian.ca,Carol_Ice,Biology`}
                />
              </div>

              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={handleBatchRegistration}
                  disabled={loading || !batchText.trim()}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    loading || !batchText.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Processing...' : 'Register Students'}
                </button>
              </div>

              {/* Results */}
              {batchResult && (
                <div className={`p-4 rounded-md mb-4 ${
                  batchResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <h4 className={`font-medium ${batchResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {batchResult.success ? 'Registration Successful' : 'Registration Failed'}
                  </h4>
                  <p className={`text-sm ${batchResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {batchResult.message}
                  </p>
                  
                  {batchResult.success && batchResult.data && (
                    <div className="mt-3">
                      <p className="text-sm text-green-700">
                        Successful: {batchResult.data.successful?.length || 0} | 
                        Failed: {batchResult.data.failed?.length || 0}
                      </p>
                      
                      {batchResult.data.successful?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-green-800">Password List:</p>
                          <textarea
                            value={generatePasswordList()}
                            readOnly
                            rows={6}
                            className="w-full mt-1 p-2 text-xs font-mono bg-white border border-green-300 rounded"
                            placeholder="Student passwords will appear here"
                          />
                          <p className="text-xs text-green-600 mt-1">
                            Copy this list to give to students in class
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Single Student Tab */}
          {activeTab === 'single' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Add Single Student</h3>
              <p className="text-sm text-gray-600 mb-4">
                Add individual students manually for late enrollments
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={singleStudent.email}
                    onChange={(e) => setSingleStudent(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="student@laurentian.ca"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={singleStudent.username}
                    onChange={(e) => setSingleStudent(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Alice_Snow"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Program
                  </label>
                  <input
                    type="text"
                    value={singleStudent.user_program}
                    onChange={(e) => setSingleStudent(prev => ({ ...prev, user_program: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Environmental Science"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temporary Password
                  </label>
                  <input
                    type="text"
                    value={singleStudent.temporary_password}
                    onChange={(e) => setSingleStudent(prev => ({ ...prev, temporary_password: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="GamePass123!"
                  />
                </div>
              </div>

              <button
                onClick={handleSingleStudentAdd}
                disabled={loading || !singleStudent.email || !singleStudent.username || !singleStudent.user_program}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  loading || !singleStudent.email || !singleStudent.username || !singleStudent.user_program
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          )}

          {/* Password Reset Tab */}
          {activeTab === 'reset' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Reset Student Password</h3>
              <p className="text-sm text-gray-600 mb-4">
                Reset a student's password if they forget it
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Email
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="student@laurentian.ca"
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
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="NewPass123!"
                  />
                </div>
              </div>

              <button
                onClick={handlePasswordReset}
                disabled={loading || !resetEmail}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  loading || !resetEmail
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              {resetResult && (
                <div className={`mt-4 p-3 rounded-md ${
                  resetResult.includes('successful') 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {resetResult}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}