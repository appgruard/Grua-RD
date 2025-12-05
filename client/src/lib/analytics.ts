import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

const METRICS_ENDPOINT = '/api/analytics/web-vitals';

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    INP: [200, 500],
    LCP: [2500, 4000],
    TTFB: [800, 1800],
  };

  const [good, poor] = thresholds[name] || [0, 0];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

function sendMetric(metric: Metric): void {
  const webVitalMetric: WebVitalMetric = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  };

  if (import.meta.env.DEV) {
    const colorByRating = {
      good: '\x1b[32m',
      'needs-improvement': '\x1b[33m',
      poor: '\x1b[31m',
    };
    const color = colorByRating[webVitalMetric.rating];
    const reset = '\x1b[0m';
    console.log(
      `[Web Vital] ${color}${webVitalMetric.name}: ${webVitalMetric.value.toFixed(2)}${reset} (${webVitalMetric.rating})`
    );
  }

  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(webVitalMetric)], { type: 'application/json' });
    navigator.sendBeacon(METRICS_ENDPOINT, blob);
  } else {
    fetch(METRICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webVitalMetric),
      keepalive: true,
    }).catch(() => {});
  }
}

let initialized = false;

export function initWebVitals(): void {
  if (initialized) return;
  initialized = true;

  onCLS(sendMetric);
  onFCP(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
  onTTFB(sendMetric);
}

export function reportCustomMetric(name: string, value: number): void {
  const customMetric: WebVitalMetric = {
    name,
    value,
    rating: 'good',
    delta: value,
    id: `custom-${Date.now()}`,
    navigationType: 'custom',
  };

  if (import.meta.env.DEV) {
    console.log(`[Custom Metric] ${name}: ${value.toFixed(2)}`);
  }

  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(customMetric)], { type: 'application/json' });
    navigator.sendBeacon(METRICS_ENDPOINT, blob);
  } else {
    fetch(METRICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customMetric),
      keepalive: true,
    }).catch(() => {});
  }
}

export function measurePageLoad(): void {
  if (typeof window !== 'undefined' && window.performance) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfEntry) {
          reportCustomMetric('DOM_CONTENT_LOADED', perfEntry.domContentLoadedEventEnd - perfEntry.startTime);
          reportCustomMetric('LOAD_EVENT', perfEntry.loadEventEnd - perfEntry.startTime);
          reportCustomMetric('DOM_INTERACTIVE', perfEntry.domInteractive - perfEntry.startTime);
        }
      }, 0);
    });
  }
}
