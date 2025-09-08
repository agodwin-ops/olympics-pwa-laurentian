'use client';

import React, { useState, useRef } from 'react';
import { Upload, Download, Users, AlertCircle, CheckCircle, X } from 'lucide-react';
import apiClient from '@/lib/api-client';

interface BatchUploadResult {
  successful: Array<{
    email: string;
    username: string;
    password: string;
  }>;
  failed: Array<{
    email: string;
    error: string;
  }>;
  total_processed: number;
}

interface BatchStudentUploadProps {
  onClose: () => void;
  onUploadComplete: (result: BatchUploadResult) => void;
}

export default function BatchStudentUpload({ onClose, onUploadComplete }: BatchStudentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<Array<any>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    
    // Preview first few rows
    const text = await selectedFile.text();
    const rows = text.split('\n').map(row => row.split(','));
    const headers = rows[0];
    const data = rows.slice(1, 6).map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = row[index]?.trim() || '';
      });
      return obj;
    });
    
    setPreview(data.filter(row => row.email)); // Filter out empty rows
    setShowPreview(true);
  };

  const validateCSV = (data: Array<any>): string[] => {
    const errors: string[] = [];
    const requiredFields = ['email', 'username', 'user_program', 'password'];
    
    if (data.length === 0) {
      errors.push('CSV file is empty');
      return errors;
    }

    const firstRow = data[0];
    const missingFields = requiredFields.filter(field => !(field in firstRow));
    if (missingFields.length > 0) {
      errors.push(`Missing required columns: ${missingFields.join(', ')}`);
    }

    // Check for duplicate emails
    const emails = data.map(row => row.email).filter(email => email);
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate emails found: ${[...new Set(duplicates)].join(', ')}`);
    }

    return errors;
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];
      
      const students = rows.slice(1)
        .filter(row => row.length >= headers.length && row[0]?.trim()) // Filter empty rows
        .map(row => {
          const student: any = {};
          headers.forEach((header, index) => {
            student[header.trim()] = row[index]?.trim() || '';
          });
          return student;
        });

      // Validate data
      const errors = validateCSV(students);
      if (errors.length > 0) {
        alert('CSV Validation Errors:\n' + errors.join('\n'));
        setUploading(false);
        return;
      }

      // Upload students one by one with individual passwords
      const results: BatchUploadResult = {
        successful: [],
        failed: [],
        total_processed: students.length
      };

      for (const student of students) {
        try {
          // Use apiClient method for proper authentication and backend communication
          const result = await apiClient.addSingleStudent({
            email: student.email,
            username: student.username,
            user_program: student.user_program,
            temporary_password: student.password
          });

          if (result.success) {
            results.successful.push({
              email: student.email,
              username: student.username,
              password: student.password
            });
          } else {
            results.failed.push({
              email: student.email,
              error: result.error || 'Unknown error'
            });
          }
        } catch (error: unknown) {
          results.failed.push({
            email: student.email,
            error: 'Network error'
          });
        }
      }

      onUploadComplete(results);

    } catch (error: unknown) {
      console.error('Upload error:', error);
      alert('Failed to process CSV file');
    }

    setUploading(false);
  };

  const downloadTemplate = () => {
    const csvContent = 'email,username,user_program,password\nstudent1@university.ca,student1,Computer Science,TempPass123\nstudent2@university.ca,student2,Engineering,SecurePass456';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Batch Student Upload</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Upload Instructions</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Upload a CSV file with student information. Each student will get their individual password from the file.
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Required columns: <code className="bg-blue-100 px-1 rounded">email</code>, <code className="bg-blue-100 px-1 rounded">username</code>, <code className="bg-blue-100 px-1 rounded">user_program</code>, <code className="bg-blue-100 px-1 rounded">password</code>
                </p>
              </div>
            </div>
          </div>

          {/* Download Template */}
          <div className="mb-6">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4" />
              Download CSV Template
            </button>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50"
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {file ? file.name : 'Click to select CSV file'}
              </p>
              <p className="text-sm text-gray-500">
                CSV files only. Maximum file size: 10MB
              </p>
            </div>
          </div>

          {/* Preview */}
          {showPreview && preview.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">Preview (first 5 rows):</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-300 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 border-r text-left text-sm font-medium">Email</th>
                      <th className="px-4 py-2 border-r text-left text-sm font-medium">Username</th>
                      <th className="px-4 py-2 border-r text-left text-sm font-medium">Program</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2 border-r text-sm">{row.email}</td>
                        <td className="px-4 py-2 border-r text-sm">{row.username}</td>
                        <td className="px-4 py-2 border-r text-sm">{row.user_program}</td>
                        <td className="px-4 py-2 text-sm font-mono">{'•'.repeat(row.password?.length || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Total rows to process: {preview.length}
              </p>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Students
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}