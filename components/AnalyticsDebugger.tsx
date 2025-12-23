'use client';

import { useEffect, useState } from 'react';

interface AnalyticsEvent {
  timestamp: number;
  event: string;
  data: any;
}

export default function AnalyticsDebugger() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') return;

    // Intercept dataLayer pushes to track events
    const originalDataLayer = window.dataLayer || [];
    window.dataLayer = new Proxy(originalDataLayer, {
      get(target, prop) {
        return target[prop as keyof typeof target];
      },
      set(target, prop, value) {
        if (prop === 'length') {
          // New event was pushed
          const newEvent = target[target.length - 1];
          if (newEvent && typeof newEvent === 'object' && 'event' in newEvent) {
            setEvents(prev => [...prev.slice(-49), {
              timestamp: Date.now(),
              event: newEvent.event,
              data: newEvent
            }]);
          }
        }
        return Reflect.set(target, prop, value);
      }
    });

    // Check for keyboard shortcut to toggle debugger
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.key === 'A') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (process.env.NODE_ENV !== 'development' || !isVisible) return null;

  return (
    <div
      className="fixed top-4 right-4 w-96 max-h-96 bg-black bg-opacity-90 text-white text-xs overflow-y-auto z-[9999] rounded-lg p-3 border border-gray-600"
      style={{ fontFamily: 'monospace' }}
    >
      <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-2">
        <h3 className="font-bold text-sm">Analytics Debugger</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-300 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="mb-2 text-gray-300">
        GTM ID: {process.env.NEXT_PUBLIC_GTM_ID}
      </div>

      <div className="mb-2 text-gray-300">
        Events captured: {events.length}
      </div>

      {events.length === 0 ? (
        <div className="text-gray-400 italic">No events captured yet...</div>
      ) : (
        <div className="space-y-1">
          {events.slice(-10).map((event, index) => (
            <div key={index} className="border-l-2 border-blue-500 pl-2 py-1">
              <div className="text-yellow-300 font-semibold">{event.event}</div>
              <div className="text-xs text-gray-400">
                {new Date(event.timestamp).toLocaleTimeString()}
              </div>
              <pre className="text-xs text-gray-200 mt-1 overflow-x-auto">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-gray-600 text-xs text-gray-400">
        Press Alt+Shift+A to toggle • Dev mode only
      </div>
    </div>
  );
}