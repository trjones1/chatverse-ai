// components/admin/ImageApprovalManager.tsx
// Admin interface for approving/rejecting generated images

"use client";

import React, { useState, useEffect } from 'react';
import { PRIORITY_CHARACTERS } from '@/lib/contentPipeline';

interface PendingImage {
  id: string;
  character_key: string;
  title: string;
  file_url: string;
  thumbnail_url: string;
  metadata: {
    generation_prompt: string;
    revised_prompt?: string;
    provider: string;
    model: string;
    storage_path: string;
    stored_images?: Array<{
      storage_path: string;
      public_url: string;
      size: number;
      content_type: string;
    }>;
  };
  tags: string[];
  mood: string;
  aesthetic: string;
  quality_score: number;
  status: string;
  created_at: string;
}

interface StorageStats {
  waitingForApproval: number;
  approved: number;
  rejected: number;
  totalSize: number;
}

const ImageApprovalManager: React.FC = () => {
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string>('');
  const [nsfwFlags, setNsfwFlags] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    fetchPendingImages();
  }, [selectedCharacter]);

  const fetchPendingImages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ debug: 'dev', limit: '50' });
      if (selectedCharacter) {
        params.set('character', selectedCharacter);
      }

      const response = await fetch(`/api/admin/content/approval?${params}`);
      const data = await response.json();

      if (data.success) {
        setPendingImages(data.pending_images || []);
        setStorageStats(data.storage_stats);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error fetching images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImageAction = async (imageId: string, action: 'approve' | 'reject', options?: {
    reason?: string;
    qualityScore?: number;
    addToSelfieBank?: boolean;
    isNsfw?: boolean;
  }) => {
    setProcessing(prev => new Set(prev).add(imageId));
    
    try {
      const response = await fetch('/api/admin/content/approval?debug=dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_id: imageId,
          action,
          reason: options?.reason,
          quality_score: options?.qualityScore,
          add_to_selfie_bank: options?.addToSelfieBank,
          is_nsfw: options?.isNsfw || nsfwFlags.get(imageId) || false
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(
          action === 'approve' 
            ? `✅ Image approved${result.added_to_selfie_bank ? ' and added to selfie bank' : ''}!`
            : `❌ Image rejected${options?.reason ? `: ${options.reason}` : ''}`
        );
        
        // Remove from pending list
        setPendingImages(prev => prev.filter(img => img.id !== imageId));
        setSelectedImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(imageId);
          return newSet;
        });

        // Update storage stats
        if (storageStats) {
          setStorageStats(prev => prev ? {
            ...prev,
            waitingForApproval: prev.waitingForApproval - 1,
            approved: action === 'approve' ? prev.approved + 1 : prev.approved,
            rejected: action === 'reject' ? prev.rejected + 1 : prev.rejected
          } : null);
        }
      } else {
        setMessage(`❌ Failed to ${action}: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(imageId);
        return newSet;
      });
    }
  };

  const handleBatchAction = async (action: 'approve' | 'reject', reason?: string) => {
    if (selectedImages.size === 0) {
      setMessage('❌ No images selected for batch action');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/content/approval?debug=dev', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_ids: Array.from(selectedImages),
          action,
          reason
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage(`✅ Batch ${action}: ${result.successful}/${result.total_processed} successful`);
        
        // Remove processed images from the list
        setPendingImages(prev => prev.filter(img => !selectedImages.has(img.id)));
        setSelectedImages(new Set());
        
        // Refresh stats
        await fetchPendingImages();
      } else {
        setMessage(`❌ Batch ${action} failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageId)) {
        newSet.delete(imageId);
      } else {
        newSet.add(imageId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedImages(new Set(pendingImages.map(img => img.id)));
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Image Approval Manager</h2>
          <p className="text-gray-600">Review and approve generated character images</p>
        </div>
        
        <button
          onClick={fetchPendingImages}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Storage Stats */}
      {storageStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-900">Waiting for Approval</h3>
            <p className="text-2xl font-bold text-yellow-600">{storageStats.waitingForApproval}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-900">Approved</h3>
            <p className="text-2xl font-bold text-green-600">{storageStats.approved}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-900">Rejected</h3>
            <p className="text-2xl font-bold text-red-600">{storageStats.rejected}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900">Total Size</h3>
            <p className="text-2xl font-bold text-blue-600">
              {(storageStats.totalSize / 1024 / 1024).toFixed(1)}MB
            </p>
          </div>
        </div>
      )}

      {/* Filters and Batch Actions */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={selectedCharacter}
            onChange={(e) => setSelectedCharacter(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Characters</option>
            {PRIORITY_CHARACTERS.map(char => (
              <option key={char} value={char}>
                {char.charAt(0).toUpperCase() + char.slice(1)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedImages.size} selected
            </span>
            <button
              onClick={selectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>

          {selectedImages.size > 0 && (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => handleBatchAction('approve')}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Batch Approve ({selectedImages.size})
              </button>
              <button
                onClick={() => handleBatchAction('reject', 'Batch rejected by admin')}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Batch Reject ({selectedImages.size})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Images Grid */}
      {pendingImages.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🎨</div>
          <p className="text-lg">No images waiting for approval</p>
          <p className="text-sm">Generated images will appear here for review</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {pendingImages.map(image => (
            <div 
              key={image.id} 
              className={`bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-all ${
                selectedImages.has(image.id) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {/* Image */}
              <div className="aspect-square bg-gray-100 relative">
                <img
                  src={image.file_url}
                  alt={image.title}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => window.open(image.file_url, '_blank')}
                />
                
                {/* Selection checkbox */}
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.id)}
                    onChange={() => toggleImageSelection(image.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 bg-white"
                  />
                </div>

                {/* Processing overlay */}
                {processing.has(image.id) && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{image.character_key}</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    Score: {image.quality_score}/10
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-3">
                  <p><strong>Mood:</strong> {image.mood}</p>
                  <p><strong>Style:</strong> {image.aesthetic}</p>
                  <p><strong>Provider:</strong> {image.metadata?.provider}</p>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  <p className="truncate" title={image.metadata?.generation_prompt}>
                    <strong>Prompt:</strong> {image.metadata?.generation_prompt?.substring(0, 60)}...
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {image.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                  {image.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{image.tags.length - 3}</span>
                  )}
                </div>

                {/* NSFW Flag */}
                <div className="mb-3 p-2 bg-gray-50 rounded border">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={nsfwFlags.get(image.id) || false}
                      onChange={(e) => {
                        const newFlags = new Map(nsfwFlags);
                        newFlags.set(image.id, e.target.checked);
                        setNsfwFlags(newFlags);
                      }}
                      className="rounded"
                    />
                    <span className="font-medium text-red-600">🔞 Mark as NSFW</span>
                  </label>
                  <div className="text-xs text-gray-500 mt-1">
                    NSFW content will only be shown to Premium+ subscribers
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleImageAction(image.id, 'approve', {
                        qualityScore: 8,
                        addToSelfieBank: true
                      })}
                      disabled={processing.has(image.id)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      ✓ Approve & Add to Selfies
                      {nsfwFlags.get(image.id) && <span className="ml-1 text-xs">(NSFW)</span>}
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleImageAction(image.id, 'approve', { qualityScore: 7 })}
                      disabled={processing.has(image.id)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      ✓ Approve Only
                      {nsfwFlags.get(image.id) && <span className="ml-1 text-xs">(NSFW)</span>}
                    </button>
                    <button
                      onClick={() => handleImageAction(image.id, 'reject', { 
                        reason: 'Quality not meeting standards',
                        qualityScore: 3
                      })}
                      disabled={processing.has(image.id)}
                      className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-2 text-center">
                  {new Date(image.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageApprovalManager;