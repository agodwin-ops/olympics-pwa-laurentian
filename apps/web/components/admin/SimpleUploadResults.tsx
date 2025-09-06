'use client';

import React from 'react';
import { CheckCircle, XCircle, Users, Download, X } from 'lucide-react';

interface SimpleUploadResult {
  successful: Array<{
    email: string;
    password: string;
  }>;
  failed: Array<{
    email: string;
    error: string;
  }>;
  total_processed: number;
}

interface SimpleUploadResultsProps {
  results: SimpleUploadResult;
  onClose: () => void;
}

export default function SimpleUploadResults({ results, onClose }: SimpleUploadResultsProps) {
  const downloadCredentials = () => {
    const csvContent = [
      'Email,Password,Instructions',
      ...results.successful.map(s => `${s.email},${s.password},"Login at [your-app-url] and complete your profile"`),
      '',
      'DISTRIBUTION INSTRUCTIONS:',
      '1. Send each student their individual email and password',
      '2. Students will login and choose their username and program',
      '3. Students will upload their profile picture during setup',
      '4. All students start with Level 1 skills and 3 gold'
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_login_credentials_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadResults = () => {
    const csvContent = [
      'Status,Email,Password,Error',
      ...results.successful.map(s => `Success,${s.email},${s.password},`),
      ...results.failed.map(f => `Failed,${f.email},,${f.error}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_account_creation_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Student Account Creation Results</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{results.total_processed}</div>
              <div className="text-sm text-blue-700">Total Processed</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{results.successful.length}</div>
              <div className="text-sm text-green-700">Accounts Created</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{results.failed.length}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
          </div>

          {/* Download Options */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={downloadCredentials}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              disabled={results.successful.length === 0}
            >
              <Download className="h-4 w-4" />
              Download Login Credentials
            </button>
            <button
              onClick={downloadResults}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Download Full Results
            </button>
          </div>

          {/* Successful Students */}
          {results.successful.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-800">Successfully Created Accounts</h3>
              </div>
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="min-w-full border border-gray-300 rounded-lg">
                  <thead className="bg-green-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 border-r text-left text-sm font-medium">Email</th>
                      <th className="px-4 py-2 border-r text-left text-sm font-medium">Password</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.successful.map((student, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2 border-r text-sm">{student.email}</td>
                        <td className="px-4 py-2 border-r text-sm font-mono">{student.password}</td>
                        <td className="px-4 py-2 text-sm text-green-600">✓ Ready for first login</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Failed Students */}
          {results.failed.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-medium text-red-800">Failed to Create Accounts</h3>
              </div>
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="min-w-full border border-gray-300 rounded-lg">
                  <thead className="bg-red-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 border-r text-left text-sm font-medium">Email</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.failed.map((failure, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2 border-r text-sm">{failure.email}</td>
                        <td className="px-4 py-2 text-sm text-red-600">{failure.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-medium text-amber-800 mb-2">Student Login Process</h3>
            <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
              <li><strong>Distribute credentials:</strong> Give each student their individual email and password</li>
              <li><strong>Student login:</strong> Students use their email/password to login</li>
              <li><strong>Profile completion:</strong> On first login, students choose their username and program</li>
              <li><strong>Profile picture:</strong> Students can upload their profile picture during setup</li>
              <li><strong>Game ready:</strong> Students start with level 1 skills and 3 gold</li>
            </ol>
          </div>

          {/* Close Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}