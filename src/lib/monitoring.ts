// Monitoring Configuration
// Production monitoring and observability setup

interface MonitoringConfig {
  enabled: boolean;
  dsn?: string;
  environment: string;
  sampleRate: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private config: MonitoringConfig;
  
  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV || 'production',
      sampleRate: 0.1,
      ...config,
    };
  }
  
  // Record a performance metric
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    if (!this.config.enabled) return;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metric] ${name}: ${value}ms`, tags);
    }
    
    // Check thresholds and alert if needed
    this.checkThresholds(name, value);
  }
  
  // Check if metric exceeds thresholds
  private checkThresholds(name: string, value: number) {
    const thresholds: Record<string, number> = {
      'api.response_time': 1000,
      'db.query_time': 500,
      'stripe.checkout_time': 3000,
      'page.load_time': 2500,
      'ai.prediction_time': 5000,
    };
    
    const threshold = thresholds[name];
    if (threshold && value > threshold) {
      console.error(`⚠️ Performance threshold exceeded: ${name} = ${value}ms (threshold: ${threshold}ms)`);
      // In production, this would send to monitoring service
      this.sendAlert(name, value, threshold);
    }
  }
  
  // Send alert to monitoring service
  private sendAlert(metric: string, value: number, threshold: number) {
    if (!this.config.enabled) return;
    
    // In production, integrate with actual monitoring service
    // For now, log the alert
    const alert = {
      type: 'performance_threshold_exceeded',
      metric,
      value,
      threshold,
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
    };
    
    console.error('[ALERT]', alert);
  }
  
  // Get statistics for a metric
  getStats(metricName: string) {
    const values = this.metrics.get(metricName) || [];
    if (values.length === 0) return null;
    
    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
  
  // Get all metrics summary
  getAllMetrics() {
    const summary: Record<string, any> = {};
    
    this.metrics.forEach((values, name) => {
      summary[name] = this.getStats(name);
    });
    
    return summary;
  }
}

// Error tracking helper
export class ErrorTracker {
  private errors: Array<{
    message: string;
    stack?: string;
    timestamp: Date;
    context?: any;
  }> = [];
  
  trackError(error: Error, context?: any) {
    const errorRecord = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      context,
    };
    
    this.errors.push(errorRecord);
    
    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors.shift();
    }
    
    // Log error
    console.error('[Error Tracked]', {
      message: error.message,
      context,
      timestamp: errorRecord.timestamp.toISOString(),
    });
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(errorRecord);
    }
  }
  
  private sendToErrorService(error: any) {
    // Placeholder for actual error service integration
    // Would integrate with Sentry, Rollbar, etc.
  }
  
  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit).reverse();
  }
  
  clearErrors() {
    this.errors = [];
  }
}

// Web Vitals tracking
export function trackWebVitals(metric: {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}) {
  const monitor = new PerformanceMonitor();
  
  // Track the metric
  monitor.recordMetric(`web_vitals.${metric.name}`, metric.value, {
    rating: metric.rating,
  });
  
  // Log for development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}: ${metric.value} (${metric.rating})`);
  }
}

// Initialize monitoring
let performanceMonitor: PerformanceMonitor | null = null;
let errorTracker: ErrorTracker | null = null;

export function initMonitoring() {
  if (typeof window === 'undefined') return;
  
  performanceMonitor = new PerformanceMonitor();
  errorTracker = new ErrorTracker();
  
  // Track page load performance
  if (window.performance) {
    window.addEventListener('load', () => {
      const perfData = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (perfData) {
        performanceMonitor?.recordMetric('page.dns', perfData.domainLookupEnd - perfData.domainLookupStart);
        performanceMonitor?.recordMetric('page.tcp', perfData.connectEnd - perfData.connectStart);
        performanceMonitor?.recordMetric('page.ttfb', perfData.responseStart - perfData.requestStart);
        performanceMonitor?.recordMetric('page.download', perfData.responseEnd - perfData.responseStart);
        performanceMonitor?.recordMetric('page.domInteractive', perfData.domInteractive - perfData.fetchStart);
        performanceMonitor?.recordMetric('page.domComplete', perfData.domComplete - perfData.fetchStart);
      }
    });
  }
  
  // Track unhandled errors
  window.addEventListener('error', (event) => {
    errorTracker?.trackError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  
  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorTracker?.trackError(new Error(event.reason), {
      type: 'unhandledrejection',
    });
  });
  
  // Monitoring initialized - log only in development
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Monitoring initialized');
  }
}

// Export singleton instances
export function getPerformanceMonitor() {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

export function getErrorTracker() {
  if (!errorTracker) {
    errorTracker = new ErrorTracker();
  }
  return errorTracker;
}