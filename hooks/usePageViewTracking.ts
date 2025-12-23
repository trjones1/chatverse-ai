import { useEffect, useRef } from 'react';

export function usePageViewTracking(visitorId: string | null) {
  const pageViewTracked = useRef(false);
  const startTime = useRef<number>(Date.now());
  const engagementMarked = useRef(false);

  // Track initial page view
  useEffect(() => {
    if (!visitorId) {
      console.log('⏳ Page view tracking: Waiting for visitor ID...');
      return;
    }

    if (pageViewTracked.current) {
      console.log('⏭️  Page view tracking: Already tracked, skipping');
      return;
    }

    console.log('📊 Page view tracking: Tracking page view for visitor:', visitorId.substring(0, 20) + '...');

    // Track page view on mount
    fetch('/api/track/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        engaged: false,
      }),
    })
      .then(res => {
        if (res.ok) {
          console.log('✅ Page view tracked successfully');
        } else {
          console.error('❌ Page view tracking failed:', res.status, res.statusText);
        }
        return res.json();
      })
      .then(data => console.log('📊 Page view response:', data))
      .catch(err => console.error('❌ Page view tracking failed:', err));

    pageViewTracked.current = true;

    // Track time on page before unload
    const handleBeforeUnload = () => {
      const timeOnPage = Math.floor((Date.now() - startTime.current) / 1000);

      // Use sendBeacon for reliable tracking during page unload
      const data = JSON.stringify({
        visitorId,
        timeOnPage,
        engaged: engagementMarked.current,
      });

      navigator.sendBeacon('/api/track/pageview', new Blob([data], { type: 'application/json' }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [visitorId]);

  // Function to mark engagement (call when user sends first message)
  const markEngaged = () => {
    if (!visitorId || engagementMarked.current) return;

    console.log('💬 Page view tracking: Marking user as engaged');
    engagementMarked.current = true;

    fetch('/api/track/pageview', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId,
        engaged: true,
        timeOnPage: Math.floor((Date.now() - startTime.current) / 1000),
      }),
    })
      .then(res => {
        if (res.ok) {
          console.log('✅ Engagement tracked successfully');
        } else {
          console.error('❌ Engagement tracking failed:', res.status, res.statusText);
        }
      })
      .catch(err => console.error('❌ Engagement tracking failed:', err));
  };

  return { markEngaged };
}
