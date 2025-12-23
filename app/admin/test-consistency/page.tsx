'use client';

import { useState } from 'react';
import { ConsistentPromptBuilder } from '@/lib/faceConsistency';

export default function TestConsistencyPage() {
  const [character, setCharacter] = useState('lexi');
  const [basePrompt, setBasePrompt] = useState('beautiful woman sitting in a cafe');
  const [mood, setMood] = useState('confident');
  const [setting, setSetting] = useState('luxury restaurant');
  const [provider, setProvider] = useState<'dalle' | 'replicate' | 'midjourney'>('dalle');
  const [result, setResult] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const characters = [
    'lexi', 'nyx', 'aiko', 'dom', 'chase', 'zaria', 'chloe'
  ];

  const moods = [
    'confident', 'mysterious', 'playful', 'serious', 'flirty', 'elegant', 'cozy'
  ];

  const settings = [
    'luxury restaurant', 'dark alley', 'kawaii bedroom', 'office', 'beach', 'library', 'gym'
  ];

  const providers: ('dalle' | 'replicate' | 'midjourney')[] = [
    'dalle', 'replicate', 'midjourney'
  ];

  const testConsistency = () => {
    try {
      setGenerating(true);
      const promptResult = ConsistentPromptBuilder.buildImagePrompt({
        characterKey: character,
        basePrompt,
        mood,
        setting,
        provider
      });
      setResult(promptResult);
    } catch (error) {
      console.error('Consistency test error:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setGenerating(false);
    }
  };

  const testGeneration = async () => {
    if (!result?.prompt) return;
    
    setGenerating(true);
    try {
      const response = await fetch('/api/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          character_key: character,
          content_type: 'image',
          quantity: 1,
          mood,
          setting,
          is_nsfw: false,
          priority: 5
        })
      });
      
      const generationResult = await response.json();
      console.log('Generation result:', generationResult);
      
      if (response.ok) {
        alert('✅ Generation queued successfully! Check the content queue.');
      } else {
        alert(`❌ Generation failed: ${generationResult.error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('❌ Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🎯 Face Consistency Test
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Controls */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Character
                </label>
                <select
                  value={character}
                  onChange={(e) => setCharacter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {characters.map(char => (
                    <option key={char} value={char}>{char.charAt(0).toUpperCase() + char.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Prompt
                </label>
                <textarea
                  value={basePrompt}
                  onChange={(e) => setBasePrompt(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter base prompt..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mood
                  </label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {moods.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Setting
                  </label>
                  <select
                    value={setting}
                    onChange={(e) => setSetting(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {settings.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {providers.map(p => (
                    <option key={p} value={p}>{p.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <button
                  onClick={testConsistency}
                  disabled={generating}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  🔄 Test Prompt Generation
                </button>
                
                {result?.prompt && (
                  <button
                    onClick={testGeneration}
                    disabled={generating}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    🎨 Generate with DALL-E
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {result && (
                <>
                  {result.error ? (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <h3 className="text-red-800 font-semibold mb-2">❌ Error</h3>
                      <p className="text-red-700">{result.error}</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <h3 className="text-green-800 font-semibold mb-2">✅ Enhanced Prompt</h3>
                        <p className="text-green-700 text-sm whitespace-pre-wrap break-words">
                          {result.prompt}
                        </p>
                      </div>

                      {result.negativePrompt && (
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                          <h3 className="text-orange-800 font-semibold mb-2">🚫 Negative Prompt</h3>
                          <p className="text-orange-700 text-sm">
                            {result.negativePrompt}
                          </p>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <h3 className="text-blue-800 font-semibold mb-2">📊 Metadata</h3>
                        <pre className="text-blue-700 text-xs">{JSON.stringify(result.metadata, null, 2)}</pre>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="bg-gray-100 rounded-md p-4">
                <h3 className="font-semibold text-gray-800 mb-2">💡 Multi-Reference System</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 4 reference photos per character for maximum stability</li>
                  <li>• Stronger consistency terms with multi-reference</li>
                  <li>• Random reference rotation for variation</li>
                  <li>• Enhanced negative prompts prevent face drift</li>
                  <li>• Provider-specific optimizations (DALL-E, Replicate, Midjourney)</li>
                  <li>• ControlNet integration with reference images</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">📝 Setup Checklist</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">Required Files:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• /public/references/lexi-reference.jpg</li>
                <li>• /public/references/nyx-reference.jpg</li>
                <li>• /public/references/aiko-reference.jpg</li>
                <li>• /public/references/dom-reference.jpg</li>
                <li>• /public/references/chase-reference.jpg</li>
                <li>• /public/references/zaria-reference.jpg</li>
                <li>• /public/references/chloe-reference.jpg</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-2">Configuration:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Update facial descriptions in /lib/faceConsistency.ts</li>
                <li>• OPENAI_API_KEY configured ✅</li>
                <li>• Character bibles created ✅</li>
                <li>• Face consistency system active ✅</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}