'use client';

import { useState } from 'react';

interface FileViewerProps {
  filename: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  description?: string;
  onClose: () => void;
}

export default function FileViewer({ 
  filename, 
  fileType, 
  fileSize, 
  downloadUrl, 
  description, 
  onClose 
}: FileViewerProps) {
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate download progress for large files
      if (fileSize > 10000000) { // > 10MB
        for (let i = 0; i <= 100; i += 10) {
          setDownloadProgress(i);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Check if file is too large for mobile
      const isMobile = window.innerWidth < 768;
      if (isMobile && fileSize > 50000000) { // > 50MB on mobile
        throw new Error('File too large for mobile download. Try on a computer with WiFi.');
      }

      // In development mode, show helpful message
      if (process.env.NODE_ENV === 'development') {
        alert(`📥 Development Mode Download\n\nFile: ${filename}\nSize: ${formatFileSize(fileSize)}\nType: ${fileType}\n\nIn production, this would download the actual file.`);
      } else {
        // Production download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      setError(error.message || 'Download failed. Please try again.');
    } finally {
      setLoading(false);
      setDownloadProgress(0);
    }
  };

  const canPreview = () => {
    return fileType.includes('image') || 
           fileType.includes('pdf') || 
           fileType.includes('text');
  };

  const getConnectionWarning = () => {
    if (fileSize > 100000000) { // > 100MB
      return '⚠️ Large file - may take several minutes on school WiFi';
    } else if (fileSize > 25000000) { // > 25MB
      return '📡 Medium file - may take 1-2 minutes to download';
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="text-4xl">{getFileIcon(fileType)}</div>
            <div>
              <h2 className="text-xl font-oswald font-bold text-gray-900">
                {filename}
              </h2>
              <div className="text-sm text-gray-500 space-x-4">
                <span>{formatFileSize(fileSize)}</span>
                <span>{fileType}</span>
              </div>
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Connection Warning */}
        {getConnectionWarning() && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-yellow-800">{getConnectionWarning()}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Preview Area */}
        {canPreview() && fileType.includes('image') && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Preview</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <img
                src={downloadUrl}
                alt={filename}
                className="max-w-full h-auto rounded"
                onError={() => setError('Cannot preview this image')}
              />
            </div>
          </div>
        )}

        {canPreview() && fileType.includes('pdf') && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">PDF Preview</h3>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-gray-600 mb-3">
                📄 PDF files can be viewed in your browser after download
              </p>
              <p className="text-sm text-gray-500">
                Most modern browsers support PDF viewing. If not, you'll need a PDF reader app.
              </p>
            </div>
          </div>
        )}

        {/* Mobile Specific Information */}
        <div className="md:hidden bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <h4 className="font-medium text-blue-900 mb-2">📱 Mobile Viewing Tips</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• PDFs: Will open in your browser or PDF app</li>
            <li>• Videos: May stream or download based on your settings</li>
            <li>• Large files: Connect to WiFi before downloading</li>
            <li>• Having issues? Try on a computer</li>
          </ul>
        </div>

        {/* Download Progress */}
        {loading && downloadProgress > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Downloading...</span>
              <span className="text-sm text-gray-500">{downloadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-olympic-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
                role="progressbar"
                aria-valuenow={downloadProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleDownload}
            disabled={loading}
            className={`flex-1 olympic-button py-3 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Downloading...
              </span>
            ) : (
              `📥 Download ${filename}`
            )}
          </button>
          
          {/* Alternative viewing options */}
          {fileType.includes('video') && (
            <button
              className="flex-1 px-4 py-3 border border-olympic-blue text-olympic-blue rounded-lg hover:bg-olympic-blue hover:text-white transition-all"
              onClick={() => {
                alert('🎥 Video Streaming\n\nIn production, this would open a streaming player optimized for school bandwidth.');
              }}
            >
              🎥 Stream Video
            </button>
          )}
          
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Close
          </button>
        </div>

        {/* File Information */}
        <div className="mt-6 pt-4 border-t text-xs text-gray-500">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>File Type:</strong> {fileType}
            </div>
            <div>
              <strong>Size:</strong> {formatFileSize(fileSize)}
            </div>
          </div>
          {fileSize > 20000000 && (
            <p className="mt-2 text-yellow-600">
              💡 Large file detected. Consider downloading during off-peak hours for faster speeds.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}