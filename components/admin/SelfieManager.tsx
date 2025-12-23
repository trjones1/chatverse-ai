'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface SelfieData {
  id: string;
  character_key: string;
  file_url: string;
  thumbnail_url?: string;
  mood?: string;
  aesthetic?: string;
  is_nsfw: boolean;
  tags: string[];
  metadata: any;
  usage_count: number;
  last_used_at?: string;
  status: string;
  created_at: string;
}

interface SelfieConfig {
  character_key: string;
  enabled: boolean;
  frequency_percentage: number;
  mood_matching: boolean;
  nsfw_enabled: boolean;
  settings: any;
}

const CHARACTERS = ['lexi', 'nyx', 'aiko', 'chloe', 'zaria', 'nova', 'dom', 'chase', 'ethan', 'jayden', 'miles'];

export default function SelfieManager() {
  const { user } = useAuth();
  const [selectedCharacter, setSelectedCharacter] = useState('lexi');
  const [selfies, setSelfies] = useState<SelfieData[]>([]);
  const [config, setConfig] = useState<SelfieConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // New selfie form state
  const [newSelfie, setNewSelfie] = useState({
    file_url: '',
    thumbnail_url: '',
    mood: '',
    aesthetic: '',
    is_nsfw: false,
    tags: '',
    title: ''
  });

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  
  const supabase = createClient();

  useEffect(() => {
    if (selectedCharacter) {
      loadCharacterData();
    }
  }, [selectedCharacter]);

  const loadCharacterData = async () => {
    setLoading(true);
    try {
      // Load selfies
      const { data: selfiesData, error: selfiesError } = await supabase
        .from('content_library')
        .select('*')
        .eq('character_key', selectedCharacter)
        .eq('content_type', 'selfie')
        .order('created_at', { ascending: false });

      if (selfiesError) throw selfiesError;
      setSelfies(selfiesData || []);

      // Load configuration
      const { data: configData, error: configError } = await supabase
        .from('character_selfie_config')
        .select('*')
        .eq('character_key', selectedCharacter)
        .single();

      if (configError && configError.code !== 'PGRST116') throw configError;
      setConfig(configData || null);

    } catch (error) {
      console.error('Error loading character data:', error);
      toast.error('Failed to load character data');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<SelfieConfig>) => {
    try {
      if (!config) {
        // Create new config
        const insertData = {
          character_key: selectedCharacter,
          enabled: updates.enabled ?? false,
          frequency_percentage: updates.frequency_percentage ?? 10,
          mood_matching: updates.mood_matching ?? true,
          nsfw_enabled: updates.nsfw_enabled ?? false,
          settings: updates.settings ?? {}
        };
        const { error } = await (supabase
          .from('character_selfie_config') as any)
          .insert(insertData);
        if (error) throw error;
      } else {
        // Update existing config
        const { error } = await (supabase
          .from('character_selfie_config') as any)
          .update(updates)
          .eq('character_key', selectedCharacter);
        if (error) throw error;
      }
      
      toast.success('Configuration updated');
      loadCharacterData();
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Failed to update configuration');
    }
  };

  const addSelfie = async () => {
    if (uploadMethod === 'url' && !newSelfie.file_url) {
      toast.error('Image URL is required');
      return;
    }

    if (uploadMethod === 'file' && !selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      if (uploadMethod === 'file') {
        await uploadFileAndAddSelfie();
      } else {
        await addSelfieFromUrl();
      }
    } catch (error) {
      console.error('Error adding selfie:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add selfie');
    } finally {
      setUploading(false);
    }
  };

  const uploadFileAndAddSelfie = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('character', selectedCharacter);
    formData.append('mood', newSelfie.mood);
    formData.append('aesthetic', newSelfie.aesthetic);
    formData.append('tags', newSelfie.tags);
    formData.append('is_nsfw', newSelfie.is_nsfw.toString());
    formData.append('title', newSelfie.title || selectedFile.name);

    const response = await fetch('/api/admin/upload-selfie', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload selfie');
    }

    toast.success('Selfie uploaded successfully');
    resetForm();
    loadCharacterData();
  };

  const addSelfieFromUrl = async () => {
    const response = await fetch(`/api/selfies/${selectedCharacter}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        ...newSelfie,
        tags: newSelfie.tags.split(',').map(t => t.trim()).filter(t => t),
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add selfie');
    }

    toast.success('Selfie added successfully');
    resetForm();
    loadCharacterData();
  };

  const resetForm = () => {
    setNewSelfie({
      file_url: '',
      thumbnail_url: '',
      mood: '',
      aesthetic: '',
      is_nsfw: false,
      tags: '',
      title: ''
    });
    setSelectedFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      // Auto-fill title with filename if empty
      if (!newSelfie.title) {
        setNewSelfie({ ...newSelfie, title: file.name.replace(/\.[^/.]+$/, '') });
      }
    }
  };

  const deleteSelfie = async (id: string) => {
    if (!confirm('Are you sure you want to delete this selfie?')) return;

    try {
      const { error } = await (supabase
        .from('content_library') as any)
        .update({ status: 'archived' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Selfie deleted');
      loadCharacterData();
    } catch (error) {
      console.error('Error deleting selfie:', error);
      toast.error('Failed to delete selfie');
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Character Selfie Management</h2>
        <p className="text-gray-600">
          Manage selfies and configuration for each character
        </p>
      </div>
      
      {/* Character Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium mb-3">Select Character</h3>
        <div className="flex flex-wrap gap-2">
          {CHARACTERS.map((character) => (
            <button
              key={character}
              onClick={() => setSelectedCharacter(character)}
              className={`px-3 py-2 rounded-md font-medium capitalize transition-colors text-sm ${
                selectedCharacter === character
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {character}
            </button>
          ))}
        </div>
      </div>

      {/* Configuration Panel */}
      {config && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-lg font-medium mb-3">Configuration for {selectedCharacter}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Enabled</span>
            </label>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Frequency %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={config.frequency_percentage}
                onChange={(e) => updateConfig({ frequency_percentage: parseInt(e.target.value) })}
                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
              />
            </div>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.mood_matching}
                onChange={(e) => updateConfig({ mood_matching: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Mood Matching</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.nsfw_enabled}
                onChange={(e) => updateConfig({ nsfw_enabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">NSFW Enabled</span>
            </label>
          </div>
        </div>
      )}

      {/* Add New Selfie */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium mb-3">Add New Selfie</h3>

        {/* Upload Method Selector */}
        <div className="mb-4">
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="url"
                checked={uploadMethod === 'url'}
                onChange={(e) => setUploadMethod(e.target.value as 'url' | 'file')}
                className="mr-2"
              />
              <span className="text-sm font-medium">Upload from URL</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="file"
                checked={uploadMethod === 'file'}
                onChange={(e) => setUploadMethod(e.target.value as 'url' | 'file')}
                className="mr-2"
              />
              <span className="text-sm font-medium">Upload File Directly</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {uploadMethod === 'url' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Image URL *
                </label>
                <input
                  type="url"
                  value={newSelfie.file_url}
                  onChange={(e) => setNewSelfie({ ...newSelfie, file_url: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Thumbnail URL
                </label>
                <input
                  type="url"
                  value={newSelfie.thumbnail_url}
                  onChange={(e) => setNewSelfie({ ...newSelfie, thumbnail_url: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  placeholder="https://..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Image File *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                />
                {selectedFile && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                    <span className="text-green-700">Selected: {selectedFile.name}</span>
                    <span className="text-gray-500 ml-2">({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newSelfie.title}
                  onChange={(e) => setNewSelfie({ ...newSelfie, title: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
                  placeholder="Image title"
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Mood
            </label>
            <select
              value={newSelfie.mood}
              onChange={(e) => setNewSelfie({ ...newSelfie, mood: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
            >
              <option value="">No specific mood</option>
              <option value="playful">Playful</option>
              <option value="flirty">Flirty</option>
              <option value="intimate">Intimate</option>
              <option value="sweet">Sweet</option>
              <option value="confident">Confident</option>
              <option value="mysterious">Mysterious</option>
              <option value="happy">Happy</option>
              <option value="sultry">Sultry</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Aesthetic
            </label>
            <input
              type="text"
              value={newSelfie.aesthetic}
              onChange={(e) => setNewSelfie({ ...newSelfie, aesthetic: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
              placeholder="e.g., casual, elegant, sporty"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={newSelfie.tags}
              onChange={(e) => setNewSelfie({ ...newSelfie, tags: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
              placeholder="outdoor, mirror, bedroom"
            />
          </div>
          
          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={newSelfie.is_nsfw}
                onChange={(e) => setNewSelfie({ ...newSelfie, is_nsfw: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">NSFW</span>
            </label>
          </div>
        </div>
        
        <div className="mt-3">
          <button
            onClick={addSelfie}
            disabled={uploading || (uploadMethod === 'url' && !newSelfie.file_url) || (uploadMethod === 'file' && !selectedFile)}
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {uploading ? (uploadMethod === 'file' ? 'Uploading...' : 'Adding...') : (uploadMethod === 'file' ? 'Upload Selfie' : 'Add Selfie')}
          </button>
          {uploadMethod === 'file' && selectedFile && (
            <div className="mt-2 text-xs text-gray-600">
              📋 Ready to upload: {selectedFile.name}
              {newSelfie.is_nsfw && <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded font-medium">NSFW</span>}
            </div>
          )}
        </div>
      </div>

      {/* Existing Selfies */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-medium mb-3">
          Existing Selfies ({selfies.length})
        </h3>
        
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : selfies.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No selfies found for {selectedCharacter}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {selfies.map((selfie) => (
              <div key={selfie.id} className="border border-gray-200 rounded-lg p-3">
                <div className="aspect-square mb-2 relative">
                  <img
                    src={selfie.thumbnail_url || selfie.file_url}
                    alt={`${selectedCharacter} selfie`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  {selfie.is_nsfw && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white px-1 py-0.5 rounded text-xs font-bold">
                      NSFW
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 text-xs">
                  {selfie.mood && (
                    <div><strong>Mood:</strong> {selfie.mood}</div>
                  )}
                  {selfie.aesthetic && (
                    <div><strong>Aesthetic:</strong> {selfie.aesthetic}</div>
                  )}
                  {selfie.tags.length > 0 && (
                    <div><strong>Tags:</strong> {selfie.tags.join(', ')}</div>
                  )}
                  <div><strong>Used:</strong> {selfie.usage_count} times</div>
                  {selfie.last_used_at && (
                    <div><strong>Last used:</strong> {new Date(selfie.last_used_at).toLocaleDateString()}</div>
                  )}
                </div>
                
                <div className="mt-2 flex space-x-1">
                  <button
                    onClick={() => window.open(selfie.file_url, '_blank')}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    View
                  </button>
                  <button
                    onClick={() => deleteSelfie(selfie.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}