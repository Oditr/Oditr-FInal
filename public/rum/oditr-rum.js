/**
 * Øditr Real User Monitoring (RUM) Script
 * 
 * Lightweight, privacy-first script to capture Core Web Vitals.
 * Fails silently, does not block main thread, collects no PII.
 */
(function() {
  if (typeof window === 'undefined' || !window.performance) return;

  // 1. Get Project ID from current script tag
  const scriptTag = document.currentScript || document.querySelector('script[data-project-id]');
  const projectId = scriptTag ? scriptTag.getAttribute('data-project-id') : null;
  if (!projectId) return;

  // 2. Generate short-lived anonymous IDs for sampling & grouping
  // Session lasts for the duration of the browser tab. Pageview is for this load.
  const generateId = () => Math.random().toString(36).substring(2, 10);
  let sessionId = sessionStorage.getItem('oditr_sid');
  if (!sessionId) {
    sessionId = generateId();
    try { sessionStorage.setItem('oditr_sid', sessionId); } catch(e){}
  }
  const pageviewId = generateId();

  // 3. Endpoint Configuration
  // Try to determine the host where the script was loaded from, or default to relative path
  let endpoint = '/api/rum/collect';
  if (scriptTag && scriptTag.src) {
    try {
      const u = new URL(scriptTag.src);
      endpoint = u.origin + '/api/rum/collect';
    } catch(e){}
  }

  // 4. Capture Context
  const getContext = () => {
    let connectionType = 'unknown';
    if (navigator.connection) {
      connectionType = navigator.connection.effectiveType || 'unknown';
    }
    
    // Very coarse device estimation based on width
    const width = window.innerWidth || document.documentElement.clientWidth;
    const deviceType = width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
    
    // Simple browser detection
    const ua = navigator.userAgent;
    let browser = 'Other';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge')) browser = 'Edge';

    return {
      projectId,
      pageviewId,
      sessionId,
      url: window.location.href,
      deviceType,
      browser,
      viewportWidth: width,
      viewportHeight: window.innerHeight || document.documentElement.clientHeight,
      connectionType,
      timestamp: Date.now()
    };
  };

  // 5. Send Payload
  const sendMetric = (metricName, value) => {
    const payload = Object.assign(getContext(), {
      metricName: metricName,
      metricValue: Math.round(value)
    });

    const data = JSON.stringify(payload);
    
    // sendBeacon is non-blocking and works during page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, data);
    } else {
      // Fallback
      fetch(endpoint, { method: 'POST', body: data, keepalive: true }).catch(() => {});
    }
  };

  // 6. Metric Observers using Performance API

  // Helper to safely observe
  const observe = (type, cb) => {
    try {
      const obs = new PerformanceObserver((list) => {
        list.getEntries().forEach(cb);
      });
      obs.observe({ type, buffered: true });
      return obs;
    } catch (e) {
      return null;
    }
  };

  // FCP & TTFB
  observe('paint', (entry) => {
    if (entry.name === 'first-contentful-paint') {
      sendMetric('FCP', entry.startTime);
    }
  });

  observe('navigation', (entry) => {
    sendMetric('TTFB', entry.responseStart);
  });

  // LCP
  let lcpSent = false;
  const lcpObs = observe('largest-contentful-paint', (entry) => {
    // Only send the last one before interaction or hidden
  });
  
  // Actually, calculating true LCP and CLS without standard web-vitals library can be tricky
  // because LCP updates until interaction. Let's use standard web-vitals patterns.
  
  // We will dynamically load the official small web-vitals script from unpkg to ensure accuracy,
  // OR we can implement the basic version. Given this is a standalone script, let's just 
  // report what we catch. To be accurate, we'll send it on visibility change (hidden).

  let maxLcp = 0;
  observe('largest-contentful-paint', (entry) => {
    if (entry.startTime > maxLcp) maxLcp = entry.startTime;
  });

  let cumulativeCls = 0;
  observe('layout-shift', (entry) => {
    if (!entry.hadRecentInput) cumulativeCls += entry.value;
  });

  let maxInp = 0;
  observe('first-input', (entry) => {
    const delay = entry.processingStart - entry.startTime;
    if (delay > maxInp) maxInp = delay;
    // FI isn't full INP, but acts as a proxy for basic implementations if INP event isn't supported.
  });
  
  observe('event', (entry) => {
    if (entry.interactionId) {
      const inp = entry.duration;
      if (inp > maxInp) maxInp = inp;
    }
  });

  // Send aggregated metrics when the page goes hidden or unloads
  const flushMetrics = () => {
    if (lcpSent) return;
    if (maxLcp > 0) sendMetric('LCP', maxLcp);
    if (cumulativeCls > 0) sendMetric('CLS', cumulativeCls);
    if (maxInp > 0) sendMetric('INP', maxInp);
    lcpSent = true;
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushMetrics();
    }
  });

  window.addEventListener('pagehide', flushMetrics);

})();
