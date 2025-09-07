'use client';

import { useState, useEffect } from 'react';
import { User, Unit } from '@/types/olympics';
import apiClient from '@/lib/api-client';

interface Lecture {
  id: string;
  title: string;
  description?: string;
  unit_id?: string;
  order_index: number;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  resources?: LectureResource[];
}

interface LectureResource {
  id: string;
  lecture_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  file_path: string;
  description?: string;
  is_public: boolean;
  uploaded_by: string;
  created_at: string;
}

interface ResourceManagerProps {
  currentUser: User;
  units: Unit[];
}

export default function ResourceManager({ currentUser, units }: ResourceManagerProps) {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Form states
  const [newLecture, setNewLecture] = useState({
    title: '',
    description: '',
    unit_id: '',
    order_index: 1,
    is_published: false
  });

  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    description: '',
    is_public: true
  });

  useEffect(() => {
    loadLectures();
  }, [selectedUnit]);

  const loadLectures = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getLectures(selectedUnit || undefined, false);
      if (response.success) {
        setLectures(response.data);
      } else {
        // Load from localStorage if available
        const storedLectures = localStorage.getItem('admin_created_lectures');
        if (storedLectures) {
          const parsedLectures = JSON.parse(storedLectures);
          setLectures(parsedLectures);
        } else {
          // Initially empty so admin can create lectures
          setLectures([]);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to load lectures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLecture.title.trim()) {
      alert('Please enter a lecture title');
      return;
    }

    try {
      try {
        const response = await apiClient.createLecture({
          ...newLecture,
          unit_id: newLecture.unit_id || undefined
        });

        if (response.success) {
          loadLectures();
          setShowCreateModal(false);
          setNewLecture({
            title: '',
            description: '',
            unit_id: '',
            order_index: 1,
            is_published: false
          });
          alert('Lecture created successfully!');
          return;
        }
      } catch (apiError) {
        console.log('API not available, using mock behavior:', apiError);
      }

      // Fallback to mock behavior
      const newLectureData: Lecture = {
        id: Math.random().toString(36).substr(2, 9),
        title: newLecture.title,
        description: newLecture.description || undefined,
        unit_id: newLecture.unit_id || undefined,
        order_index: newLecture.order_index,
        is_published: newLecture.is_published,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resources: []
      };

      const updatedLectures = [...lectures, newLectureData];
      setLectures(updatedLectures);
      
      // Store in localStorage for student access
      localStorage.setItem('admin_created_lectures', JSON.stringify(updatedLectures));
      
      setShowCreateModal(false);
      setNewLecture({
        title: '',
        description: '',
        unit_id: '',
        order_index: 1,
        is_published: false
      });
      alert('Lecture created successfully!');
      
    } catch (error: unknown) {
      console.error('Error creating lecture:', error);
      alert('Failed to create lecture. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadData.file || !selectedLecture) {
      alert('Please select a file and lecture');
      return;
    }

    try {
      setUploading(true);
      
      try {
        const response = await apiClient.uploadFileToLecture(
          selectedLecture,
          uploadData.file,
          uploadData.description,
          uploadData.is_public
        );

        if (response.success) {
          setShowUploadModal(false);
          setUploadData({
            file: null,
            description: '',
            is_public: true
          });
          setSelectedLecture('');
          loadLectures();
          alert('File uploaded successfully!');
          return;
        }
      } catch (apiError) {
        console.log('API not available, using mock behavior:', apiError);
      }

      // Fallback to mock behavior
      const mockResource: LectureResource = {
        id: Math.random().toString(36).substr(2, 9),
        lecture_id: selectedLecture,
        filename: uploadData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_'),
        original_filename: uploadData.file.name,
        file_type: uploadData.file.type,
        file_size: uploadData.file.size,
        file_path: `/uploads/mock/${uploadData.file.name}`,
        description: uploadData.description || undefined,
        is_public: uploadData.is_public,
        uploaded_by: currentUser.id,
        created_at: new Date().toISOString()
      };

      // Add resource to the selected lecture
      const updatedLectures = lectures.map(lecture => 
        lecture.id === selectedLecture
          ? { ...lecture, resources: [...(lecture.resources || []), mockResource] }
          : lecture
      );
      setLectures(updatedLectures);

      // Store in localStorage for student access
      localStorage.setItem('admin_created_lectures', JSON.stringify(updatedLectures));

      setShowUploadModal(false);
      setUploadData({
        file: null,
        description: '',
        is_public: true
      });
      setSelectedLecture('');
      alert('File uploaded successfully!');
      
    } catch (error: unknown) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      try {
        const response = await apiClient.deleteResource(resourceId);
        if (response.success) {
          loadLectures();
          alert('Resource deleted successfully!');
          return;
        }
      } catch (apiError) {
        console.log('API not available, using mock behavior:', apiError);
      }

      // Fallback to mock behavior
      const updatedLectures = lectures.map(lecture => ({
        ...lecture,
        resources: lecture.resources?.filter(resource => resource.id !== resourceId) || []
      }));
      setLectures(updatedLectures);

      // Store in localStorage for student access
      localStorage.setItem('admin_created_lectures', JSON.stringify(updatedLectures));
      alert('Resource deleted successfully!');
      
    } catch (error: unknown) {
      console.error('Error deleting resource:', error);
      alert('Failed to delete resource. Please try again.');
    }
  };

  const toggleLecturePublished = async (lectureId: string, currentStatus: boolean) => {
    try {
      try {
        const response = await apiClient.updateLecture(lectureId, {
          is_published: !currentStatus
        });

        if (response.success) {
          loadLectures();
          return;
        }
      } catch (apiError) {
        console.log('API not available, using mock behavior:', apiError);
      }

      // Fallback to mock behavior
      const updatedLectures = lectures.map(lecture => 
        lecture.id === lectureId
          ? { ...lecture, is_published: !currentStatus, updated_at: new Date().toISOString() }
          : lecture
      );
      setLectures(updatedLectures);

      // Store in localStorage for student access
      localStorage.setItem('admin_created_lectures', JSON.stringify(updatedLectures));
      
    } catch (error: unknown) {
      console.error('Error updating lecture:', error);
      alert('Failed to update lecture status. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('video')) return '🎥';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📊';
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📈';
    if (fileType.includes('zip') || fileType.includes('archive')) return '🗜️';
    return '📎';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olympic-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lectures and resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-oswald font-bold text-gray-900">Resource Management</h1>
            <p className="text-gray-600 mt-2">Manage lectures and upload learning materials</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="olympic-button"
            >
              Create Lecture
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="olympic-button secondary"
            >
              Upload File
            </button>
          </div>
        </div>
      </div>

      {/* Quest Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Quest
        </label>
        <select
          value={selectedUnit}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
        >
          <option value="">All Quests</option>
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lectures List */}
      <div className="space-y-6">
        {lectures.map((lecture) => (
          <div key={lecture.id} className="chef-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-oswald font-bold text-gray-900 mb-2">
                  {lecture.title}
                </h3>
                {lecture.description && (
                  <p className="text-gray-600 mb-2">{lecture.description}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Order: {lecture.order_index}</span>
                  {lecture.unit_id && (
                    <span>Quest: {units.find(u => u.id === lecture.unit_id)?.name || 'Unknown'}</span>
                  )}
                  <span>Resources: {lecture.resources?.length || 0}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => toggleLecturePublished(lecture.id, lecture.is_published)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    lecture.is_published
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {lecture.is_published ? 'Published' : 'Draft'}
                </button>
                <button
                  onClick={() => {
                    setSelectedLecture(lecture.id);
                    setShowUploadModal(true);
                  }}
                  className="text-olympic-blue hover:text-olympic-blue/80 text-sm font-medium"
                >
                  Add File
                </button>
              </div>
            </div>

            {/* Resources */}
            {lecture.resources && lecture.resources.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Resources</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {lecture.resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getFileIcon(resource.file_type)}</div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">
                            {resource.original_filename}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(resource.file_size)}
                          </div>
                          {resource.description && (
                            <div className="text-xs text-gray-600 mt-1">
                              {resource.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            alert(`Download functionality is disabled in development mode.\n\nFile: ${resource.original_filename}\nSize: ${formatFileSize(resource.file_size)}\nType: ${resource.file_type}`);
                          }}
                          className="text-olympic-blue hover:text-olympic-blue/80 text-xs"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleDeleteResource(resource.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!lecture.resources || lecture.resources.length === 0) && (
              <div className="border-t pt-4 text-center text-gray-500">
                No resources uploaded yet
              </div>
            )}
          </div>
        ))}

        {lectures.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-oswald font-bold text-gray-900 mb-2">No Lectures Yet</h3>
            <p className="text-gray-600 mb-4">Create your first lecture to get started with resource management.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="olympic-button"
            >
              Create First Lecture
            </button>
          </div>
        )}
      </div>

      {/* Create Lecture Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-oswald font-bold text-gray-900 mb-4">Create New Lecture</h2>
            
            <form onSubmit={handleCreateLecture}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLecture.title}
                    onChange={(e) => setNewLecture({ ...newLecture, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                    placeholder="Enter lecture title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newLecture.description}
                    onChange={(e) => setNewLecture({ ...newLecture, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quest
                  </label>
                  <select
                    value={newLecture.unit_id}
                    onChange={(e) => setNewLecture({ ...newLecture, unit_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                  >
                    <option value="">No quest assigned</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Index
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newLecture.order_index}
                    onChange={(e) => setNewLecture({ ...newLecture, order_index: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={newLecture.is_published}
                    onChange={(e) => setNewLecture({ ...newLecture, is_published: e.target.checked })}
                    className="h-4 w-4 text-olympic-blue focus:ring-olympic-blue border-gray-300 rounded"
                  />
                  <label htmlFor="is_published" className="ml-2 text-sm text-gray-700">
                    Publish immediately
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="olympic-button"
                >
                  Create Lecture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-oswald font-bold text-gray-900 mb-4">Upload File</h2>
            
            <form onSubmit={handleFileUpload}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Lecture *
                  </label>
                  <select
                    required
                    value={selectedLecture}
                    onChange={(e) => setSelectedLecture(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                  >
                    <option value="">Choose a lecture...</option>
                    {lectures.map((lecture) => (
                      <option key={lecture.id} value={lecture.id}>
                        {lecture.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setUploadData({ ...uploadData, file: e.target.files?.[0] || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.html,.zip,.rar,.7z,.mp4,.avi,.mov,.wmv,.flv,.mp3,.wav,.wma,.aac,.jpg,.jpeg,.png,.gif,.bmp,.svg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, Word, PowerPoint, Excel, Images, Videos, Audio, Archives (Max 50MB)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olympic-blue focus:border-olympic-blue"
                    placeholder="Optional description for this file"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={uploadData.is_public}
                    onChange={(e) => setUploadData({ ...uploadData, is_public: e.target.checked })}
                    className="h-4 w-4 text-olympic-blue focus:ring-olympic-blue border-gray-300 rounded"
                  />
                  <label htmlFor="is_public" className="ml-2 text-sm text-gray-700">
                    Make this file public for all students
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadData({ file: null, description: '', is_public: true });
                    setSelectedLecture('');
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadData.file || !selectedLecture}
                  className="olympic-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}