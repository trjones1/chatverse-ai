// components/admin/GridSlicer.tsx
'use client';

import { useState } from 'react';

interface SliceResult {
  success: boolean;
  message: string;
  batch_id?: string;
  character_key?: string;
  slices_created?: number;
  slices_failed?: number;
  stored_images?: Array<{
    slice: number;
    position: string;
    url: string;
    path: string;
  }>;
  content_library_ids?: string[];
  error?: string;
  debug_info?: any;
}

export default function GridSlicer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [characterKey, setCharacterKey] = useState('');
  const [mood, setMood] = useState('casual');
  const [tags, setTags] = useState('batch,grid');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SliceResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const characters = [
    { key: 'lexi', name: 'Lexi' },
    { key: 'nyx', name: 'Nyx' },
    { key: 'aiko', name: 'Aiko' },
    { key: 'dom', name: 'Dom' },
    { key: 'chase', name: 'Chase' },
    { key: 'zaria', name: 'Zaria' },
    { key: 'chloe', name: 'Chloe' }
  ];

  const moods = ['casual', 'confident', 'playful', 'seductive', 'elegant'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Clean up previous preview URL
      return () => URL.revokeObjectURL(url);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleSlice = async () => {
    if (!selectedFile || !characterKey) {
      alert('Please select a file and character');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('character_key', characterKey);
      formData.append('mood', mood);
      formData.append('tags', tags);

      const response = await fetch('/api/admin/slice-grid', {
        method: 'POST',
        body: formData,
      });

      const data: SliceResult = await response.json();
      setResult(data);

      if (data.success) {
        console.log('✅ Grid slicing successful:', data);
      } else {
        console.error('❌ Grid slicing failed:', data.error);
      }

    } catch (error) {
      console.error('Grid slicing error:', error);
      setResult({
        success: false,
        message: 'Failed to slice grid',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setCharacterKey('');
    setMood('casual');
    setTags('batch,grid');
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold text-gray-900">2x2 Grid Slicer</h2>
        <p className="text-gray-600 mt-1">
          Upload a 2x2 grid image to slice into 4 individual images for approval
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload 2x2 Grid Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Character
            </label>
            <select
              value={characterKey}
              onChange={(e) => setCharacterKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select character...</option>
              {characters.map(char => (
                <option key={char.key} value={char.key}>
                  {char.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mood
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {moods.map(moodOption => (
                  <option key={moodOption} value={moodOption}>
                    {moodOption.charAt(0).toUpperCase() + moodOption.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="batch,grid,selfie"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSlice}
              disabled={!selectedFile || !characterKey || isProcessing}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium
                hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                transition-colors duration-200"
            >
              {isProcessing ? 'Slicing Grid...' : 'Slice Grid'}
            </button>

            <button
              onClick={reset}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium
                hover:bg-gray-50 transition-colors duration-200"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          {previewUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <img
                  src={previewUrl}
                  alt="Grid preview"
                  className="w-full h-auto rounded-lg border border-gray-200"
                />
                <div className="mt-2 text-xs text-gray-500 text-center">
                  This will be sliced into 4 separate images (top-left, top-right, bottom-left, bottom-right)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className={`rounded-lg border p-4 ${
          result.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className={`font-semibold mb-2 ${
            result.success ? 'text-green-900' : 'text-red-900'
          }`}>
            {result.success ? '✅ Grid Slicing Successful' : '❌ Grid Slicing Failed'}
          </div>
          
          <p className={`mb-3 ${
            result.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {result.message}
          </p>

          {result.success && result.slices_created && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4 text-green-800">
                <div>
                  <span className="font-medium">Character:</span> {result.character_key}
                </div>
                <div>
                  <span className="font-medium">Batch ID:</span> {result.batch_id}
                </div>
                <div>
                  <span className="font-medium">Images Created:</span> {result.slices_created}/4
                </div>
                <div>
                  <span className="font-medium">Failed:</span> {result.slices_failed}/4
                </div>
              </div>

              {result.stored_images && result.stored_images.length > 0 && (
                <div className="mt-4">
                  <div className="font-medium text-green-800 mb-2">Created Images:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                    {result.stored_images.map((img, idx) => (
                      <div key={idx} className="bg-green-100 rounded p-2">
                        <div className="font-medium">Slice {img.slice} ({img.position})</div>
                        <div className="truncate">Path: {img.path}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-800 text-sm">
                <div className="font-medium mb-1">📋 Next Steps:</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Images are now in the <strong>Image Approval Manager</strong> below</li>
                  <li>Review and approve/reject each image individually</li>
                  <li>Approved images will be moved to the character's selfie bank</li>
                </ol>
              </div>
            </div>
          )}

          {result.error && (
            <div className="text-red-800 text-sm">
              <span className="font-medium">Error:</span> {result.error}
            </div>
          )}

          {result.debug_info && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                Debug Info
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 rounded p-2 overflow-auto">
                {JSON.stringify(result.debug_info, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}