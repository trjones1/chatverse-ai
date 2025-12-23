// components/admin/ContentPipelineManager.tsx
// Admin Interface for Content Pipeline Management

"use client";

import React, { useState, useEffect } from 'react';
import { PRIORITY_CHARACTERS, type CharacterBible, type ContentGenerationQueue } from '@/lib/contentPipeline';
import { ContentScenarioManager, PRODUCTION_SCENARIOS, ContentScenario } from '@/lib/contentScenarios';

interface ContentPipelineManagerProps {
  isLoading?: boolean;
}

interface ContentLibraryItem {
  id: string;
  character_key: string;
  content_type: string;
  title?: string;
  file_url: string;
  thumbnail_url?: string;
  metadata: any;
  tags: string[];
  mood?: string;
  aesthetic?: string;
  is_nsfw: boolean;
  quality_score?: number;
  usage_count: number;
  last_used_at?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const ContentPipelineManager: React.FC<ContentPipelineManagerProps> = ({ isLoading }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'bibles' | 'queue' | 'library' | 'schedule' | 'production'>('production');
  const [bibles, setBibles] = useState<CharacterBible[]>([]);
  const [queueItems, setQueueItems] = useState<ContentGenerationQueue[]>([]);
  const [libraryItems, setLibraryItems] = useState<ContentLibraryItem[]>([]);
  const [libraryStats, setLibraryStats] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('lexi');
  const [libraryFilters, setLibraryFilters] = useState({
    character_key: '',
    content_type: '',
    mood: '',
    is_nsfw: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  // Fetch data on component mount
  useEffect(() => {
    fetchBibles();
    fetchQueue();
    fetchLibrary();
  }, []);

  // Refetch library when filters change
  useEffect(() => {
    if (activeTab === 'library') {
      fetchLibrary();
    }
  }, [libraryFilters, activeTab]);

  const fetchBibles = async () => {
    try {
      const response = await fetch('/api/content/bible?debug=dev');
      const data = await response.json();
      if (data.success) {
        setBibles(data.bibles || []);
      }
    } catch (error) {
      console.error('Failed to fetch bibles:', error);
    }
  };

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/content/generate');
      const data = await response.json();
      if (data.success) {
        setQueueItems(data.queue_items || []);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  const fetchLibrary = async () => {
    try {
      const params = new URLSearchParams({
        debug: 'dev',
        limit: '50'
      });
      
      if (libraryFilters.character_key) params.set('character_key', libraryFilters.character_key);
      if (libraryFilters.content_type) params.set('content_type', libraryFilters.content_type);
      if (libraryFilters.mood) params.set('mood', libraryFilters.mood);
      if (libraryFilters.is_nsfw) params.set('is_nsfw', 'true');

      const response = await fetch(`/api/content/library?${params}`);
      const data = await response.json();
      if (data.success) {
        setLibraryItems(data.library_items || []);
        setLibraryStats(data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch library:', error);
    }
  };

  const initializeBibles = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/content/bible?debug=dev', {
        method: 'PUT'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ Initialized ${data.bibles.length} character bibles`);
        await fetchBibles();
      } else {
        setMessage(`❌ Failed to initialize bibles: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async (characterKey: string, quantity: number = 5) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/content/generate?debug=dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_key: characterKey,
          content_type: 'batch',
          quantity,
          theme: 'weekly_variety',
          priority: 8
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ Queued ${quantity} items for ${characterKey}. Batch ID: ${data.batch_id}`);
        await fetchQueue();
      } else {
        setMessage(`❌ Failed to queue content: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const generateWeeklyBatch = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/content/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_keys: PRIORITY_CHARACTERS,
          weeks_ahead: 2
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ Batch generation initiated for ${data.results.length} characters`);
        await fetchQueue();
      } else {
        setMessage(`❌ Batch generation failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const processQueue = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/content/process?debug=dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_queue'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        // Refresh queue after a short delay to see processing status
        setTimeout(() => {
          fetchQueue();
          fetchLibrary();
        }, 1000);
      } else {
        setMessage(`❌ Processing failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const clearQueue = async () => {
    if (!confirm('Are you sure you want to clear all pending items from the generation queue? This cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/content/process?debug=dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_queue' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setTimeout(() => {
          fetchQueue();
        }, 500);
      } else {
        setMessage(`❌ Clear failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Tab Components
  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <div className="bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Character Bibles</h3>
          <div className="text-3xl font-bold text-blue-600">{bibles.length}</div>
          <p className="text-blue-700 text-sm">of {PRIORITY_CHARACTERS.length} priority characters</p>
        </div>
        
        <div className="bg-green-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">Queue Items</h3>
          <div className="text-3xl font-bold text-green-600">
            {queueItems.filter(item => item.status === 'pending').length}
          </div>
          <p className="text-green-700 text-sm">pending generation</p>
        </div>
        
        <div className="bg-purple-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">Library Items</h3>
          <div className="text-3xl font-bold text-purple-600">
            {libraryStats?.total_items || 0}
          </div>
          <p className="text-purple-700 text-sm">generated content items</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={initializeBibles}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Initialize All Character Bibles
          </button>
          
          <button
            onClick={generateWeeklyBatch}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Generate 2-Week Batch (All Priority Characters)
          </button>
          
          <button
            onClick={() => generateContent(selectedCharacter, 10)}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            Generate 10 Items for {selectedCharacter.charAt(0).toUpperCase() + selectedCharacter.slice(1)}
          </button>
        </div>
        
        <div className="mt-4 flex items-center gap-3">
          <label className="text-sm font-medium">Selected Character:</label>
          <select
            value={selectedCharacter}
            onChange={(e) => setSelectedCharacter(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            {PRIORITY_CHARACTERS.map(char => (
              <option key={char} value={char}>
                {char.charAt(0).toUpperCase() + char.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}
    </div>
  );

  const BiblesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Character Bibles</h3>
        <button
          onClick={initializeBibles}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Initialize Missing Bibles
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PRIORITY_CHARACTERS.map(characterKey => {
          const bible = bibles.find(b => b.character_key === characterKey);
          const isInitialized = !!bible;

          return (
            <div key={characterKey} className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold capitalize">{characterKey}</h4>
                <div className={`w-3 h-3 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-gray-300'}`} />
              </div>
              
              {isInitialized ? (
                <div className="space-y-2 text-sm text-gray-600">
                  <p><strong>Display Name:</strong> {bible.display_name}</p>
                  <p><strong>Post Frequency:</strong> {bible.content_settings?.post_frequency || 0}/week</p>
                  <p><strong>Platforms:</strong> {bible.content_settings?.platforms?.join(', ') || 'None'}</p>
                  <p><strong>Last Updated:</strong> {new Date(bible.updated_at).toLocaleDateString()}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Not initialized</p>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => generateContent(characterKey, 5)}
                  disabled={loading || !isInitialized}
                  className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  Generate 5 Items
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const QueueTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Generation Queue</h3>
        <div className="flex gap-3">
          <button
            onClick={processQueue}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Process Queue
          </button>
          <button
            onClick={fetchQueue}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Refresh
          </button>
          <button
            onClick={clearQueue}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Clear Queue
          </button>
        </div>
      </div>

      {queueItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No items in generation queue</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queueItems.slice(0, 20).map(item => (
            <div key={item.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium capitalize">{item.character_key}</span>
                    <span className="text-sm text-gray-500">{item.content_type}</span>
                    <div className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                      item.status === 'completed' ? 'bg-green-100 text-green-800' :
                      item.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status === 'processing' && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      )}
                      {item.status === 'completed' && <span>✓</span>}
                      {item.status === 'failed' && <span>✗</span>}
                      {item.status === 'pending' && <span>⏱</span>}
                      {item.status}
                    </div>
                    <span className="text-sm text-gray-500">Priority: {item.priority}</span>
                    {item.completed_at && (
                      <span className="text-xs text-green-600">
                        Completed: {new Date(item.completed_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 break-words overflow-hidden">{item.generation_prompt}</p>
                  {item.batch_id && (
                    <p className="text-xs text-gray-500 mt-1">Batch: {item.batch_id}</p>
                  )}
                  
                  {/* Progress indicator for processing items */}
                  {item.status === 'processing' && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Generating...</span>
                        <span>Estimated: 30-60s</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Output URLs for completed items */}
                  {item.status === 'completed' && item.output_urls && Array.isArray(item.output_urls) && item.output_urls.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 font-medium">Generated:</span>
                        {item.output_urls.slice(0, 3).map((url, index) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100"
                          >
                            View #{index + 1}
                          </a>
                        ))}
                        {item.output_urls.length > 3 && (
                          <span className="text-xs text-gray-500">+{item.output_urls.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-gray-500">
                  {new Date(item.created_at).toLocaleString()}
                </div>
              </div>
              
              {item.error_message && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
                  <span className="font-medium">Error:</span> {item.error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const LibraryTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Generated Content Library</h3>
        <div className="flex gap-3">
          <button
            onClick={fetchLibrary}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <h4 className="text-sm font-medium mb-3">Filters</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={libraryFilters.character_key}
            onChange={(e) => setLibraryFilters(prev => ({ ...prev, character_key: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Characters</option>
            {PRIORITY_CHARACTERS.map(char => (
              <option key={char} value={char}>
                {char.charAt(0).toUpperCase() + char.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            value={libraryFilters.content_type}
            onChange={(e) => setLibraryFilters(prev => ({ ...prev, content_type: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
          
          <input
            type="text"
            placeholder="Mood..."
            value={libraryFilters.mood}
            onChange={(e) => setLibraryFilters(prev => ({ ...prev, mood: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
          />
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={libraryFilters.is_nsfw}
              onChange={(e) => setLibraryFilters(prev => ({ ...prev, is_nsfw: e.target.checked }))}
              className="rounded"
            />
            NSFW Only
          </label>
        </div>
      </div>

      {/* Statistics */}
      {libraryStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-900">Total Items</h5>
            <p className="text-2xl font-bold text-blue-600">{libraryStats.total_items}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-green-900">Average Quality</h5>
            <p className="text-2xl font-bold text-green-600">
              {libraryStats.average_quality.toFixed(1)}/10
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-purple-900">NSFW Items</h5>
            <p className="text-2xl font-bold text-purple-600">{libraryStats.nsfw_count}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-orange-900">Characters</h5>
            <p className="text-2xl font-bold text-orange-600">
              {Object.keys(libraryStats.by_character).length}
            </p>
          </div>
        </div>
      )}

      {/* Gallery */}
      {libraryItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No generated content found</p>
          <p className="text-sm">Generated images will appear here after completion</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {libraryItems.map(item => (
            <div key={item.id} className="bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gray-100">
                {item.file_url ? (
                  <img
                    src={item.thumbnail_url || item.file_url}
                    alt={item.title || `${item.character_key} ${item.content_type}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-4xl">🎨</span>
                  </div>
                )}
              </div>
              
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{item.character_key}</span>
                  <div className="flex items-center gap-1">
                    {item.quality_score && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {item.quality_score}/10
                      </span>
                    )}
                    {item.is_nsfw && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        NSFW
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 mb-2">
                  {item.mood && <span className="mr-2">😊 {item.mood}</span>}
                  {item.aesthetic && <span>✨ {item.aesthetic}</span>}
                </div>
                
                <div className="flex flex-wrap gap-1 mb-2">
                  {item.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{item.tags.length - 3} more</span>
                  )}
                </div>
                
                <div className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleDateString()}
                  {item.usage_count > 0 && ` • Used ${item.usage_count}x`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Production Tab - Integrated scenario-based generator
  const ProductionTab = () => {
    const [selectedCharacter, setSelectedCharacter] = useState<'lexi' | 'nyx'>('lexi');
    const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
    const [provider, setProvider] = useState<'dalle' | 'replicate' | 'midjourney'>('dalle');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationResults, setGenerationResults] = useState<any[]>([]);
    const [productionMessage, setProductionMessage] = useState<string>('');

    // Get scenarios for selected character
    const availableScenarios = ContentScenarioManager.getAllScenariosForCharacter(selectedCharacter);
    const weeklyPlan = ContentScenarioManager.generateWeeklyContentPlan(selectedCharacter);

    const toggleScenarioSelection = (scenarioId: string) => {
      const newSelection = new Set(selectedScenarios);
      if (newSelection.has(scenarioId)) {
        newSelection.delete(scenarioId);
      } else {
        newSelection.add(scenarioId);
      }
      setSelectedScenarios(newSelection);
    };

    const selectWeeklyPlan = () => {
      const weeklyScenarioIds = new Set(weeklyPlan.scenarios.map(s => s.id));
      setSelectedScenarios(weeklyScenarioIds);
      setProductionMessage(`✨ Selected ${weeklyPlan.scenarios.length} scenarios for weekly content plan`);
    };

    const selectHighPriority = () => {
      const highPriorityScenarios = ContentScenarioManager.getHighPriorityScenarios(selectedCharacter);
      const scenarioIds = new Set(highPriorityScenarios.map(s => s.id));
      setSelectedScenarios(scenarioIds);
      setProductionMessage(`🎯 Selected ${highPriorityScenarios.length} high-priority scenarios`);
    };

    const generateContent = async () => {
      if (selectedScenarios.size === 0) {
        setProductionMessage('❌ Please select at least one scenario');
        return;
      }

      setIsGenerating(true);
      setGenerationResults([]);
      setProductionMessage('🎨 Starting content generation...');

      try {
        const requests = Array.from(selectedScenarios).map(scenarioId => {
          const scenario = ContentScenarioManager.getScenarioById(scenarioId);
          return {
            scenario,
            prompt: ContentScenarioManager.generateProductionPrompt(scenarioId, provider)
          };
        });

        setProductionMessage(`🎨 Generating ${requests.length} pieces of content...`);

        for (let i = 0; i < requests.length; i++) {
          const request = requests[i];
          if (!request.scenario || !request.prompt) continue;

          setProductionMessage(`🎨 Generating ${i + 1}/${requests.length}: ${request.scenario.title}`);

          const response = await fetch('/api/content/generate?debug=dev', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              character_key: selectedCharacter,
              content_type: 'image',
              generation_prompts: [request.prompt],
              prompt_data: {
                mood: request.scenario.mood,
                setting: request.scenario.setting,
                activity: request.scenario.activity,
                style_modifiers: request.scenario.styleModifiers,
                scenario_id: request.scenario.id
              },
              priority: request.scenario.priority
            })
          });

          const result = await response.json();
          
          if (result.success) {
            setGenerationResults(prev => [...prev, {
              scenario: request.scenario,
              result,
              prompt: request.prompt
            }]);
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setProductionMessage(`✅ Content generation complete! ${generationResults.length} items queued for processing.`);

      } catch (error) {
        setProductionMessage(`❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsGenerating(false);
      }
    };

    const previewPrompt = (scenarioId: string) => {
      const prompt = ContentScenarioManager.generateProductionPrompt(scenarioId, provider);
      alert(`Production Prompt Preview:\n\n${prompt}`);
    };

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-indigo-900 mb-2">🎨 Production Content Generator</h3>
          <p className="text-indigo-700">
            Generate consistent, high-quality character stills using predefined scenarios and advanced face consistency
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="font-semibold mb-4">Generation Settings</h4>
            
            {/* Character Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Character</label>
              <div className="flex gap-2">
                {(['lexi', 'nyx'] as const).map(character => (
                  <button
                    key={character}
                    onClick={() => {
                      setSelectedCharacter(character);
                      setSelectedScenarios(new Set());
                    }}
                    className={`px-3 py-2 rounded-md font-medium capitalize transition-colors text-sm ${
                      selectedCharacter === character
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {character === 'lexi' ? '💃 Lexi' : '🖤 Nyx'}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">AI Provider</label>
              <div className="flex gap-2 flex-wrap">
                {(['dalle', 'replicate', 'midjourney'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`px-3 py-2 rounded-md font-medium capitalize transition-colors text-sm ${
                      provider === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {p === 'dalle' ? '🎨 DALL-E' : p === 'midjourney' ? '🎭 MJ' : '🔄 Rep'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Selection */}
            <div className="space-y-2">
              <button
                onClick={selectWeeklyPlan}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-sm"
              >
                📅 Weekly Plan ({weeklyPlan.scenarios.length})
              </button>
              <button
                onClick={selectHighPriority}
                className="w-full px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium text-sm"
              >
                🎯 High Priority Only
              </button>
              <button
                onClick={() => setSelectedScenarios(new Set())}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-medium text-sm"
              >
                🗑️ Clear Selection
              </button>
            </div>
          </div>

          {/* Scenarios */}
          <div className="lg:col-span-2 bg-white rounded-lg border p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">
                {selectedCharacter === 'lexi' ? '💃 Lexi' : '🖤 Nyx'} Scenarios ({selectedScenarios.size} selected)
              </h4>
              <button
                onClick={generateContent}
                disabled={isGenerating || selectedScenarios.size === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm"
              >
                {isGenerating ? '🎨 Generating...' : `🚀 Generate (${selectedScenarios.size})`}
              </button>
            </div>

            {/* Status Message */}
            {productionMessage && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${
                productionMessage.includes('❌') ? 'bg-red-50 text-red-800' :
                productionMessage.includes('✅') ? 'bg-green-50 text-green-800' :
                'bg-blue-50 text-blue-800'
              }`}>
                {productionMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {availableScenarios.map(scenario => (
                <div
                  key={scenario.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    selectedScenarios.has(scenario.id)
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleScenarioSelection(scenario.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedScenarios.has(scenario.id)}
                        readOnly
                        className="w-3 h-3 text-purple-600 rounded"
                      />
                      <span className="font-medium text-xs">{scenario.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                        scenario.priority >= 8 ? 'bg-red-100 text-red-700' :
                        scenario.priority >= 6 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        P{scenario.priority}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          previewPrompt(scenario.id);
                        }}
                        className="px-1 py-0.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 space-y-1">
                    <p><strong>Mood:</strong> {scenario.mood.substring(0, 30)}...</p>
                    <p><strong>Setting:</strong> {scenario.setting.substring(0, 35)}...</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {scenario.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          #{tag}
                        </span>
                      ))}
                      {scenario.tags.length > 3 && (
                        <span className="text-xs text-gray-500">+{scenario.tags.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Content Pipeline Manager</h2>
          <p className="text-gray-600">Automated content generation for all characters</p>
        </div>
        
        {loading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8">
          {[
            { id: 'production', label: '🎨 Production Generator' },
            { id: 'overview', label: 'Overview' },
            { id: 'queue', label: 'Generation Queue' },
            { id: 'library', label: 'Generated Content' },
            { id: 'bibles', label: 'Character Bibles' },
            { id: 'schedule', label: 'Content Schedule' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'production' && <ProductionTab />}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'bibles' && <BiblesTab />}
      {activeTab === 'queue' && <QueueTab />}
      {activeTab === 'library' && <LibraryTab />}
      {activeTab === 'schedule' && (
        <div className="text-center py-12 text-gray-500">
          <p>Content scheduling interface coming soon...</p>
          <p className="text-sm">Will show upcoming posts, scheduling calendar, and posting analytics</p>
        </div>
      )}
    </div>
  );
};

export default ContentPipelineManager;