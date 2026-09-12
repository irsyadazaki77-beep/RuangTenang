const fs = require('fs');
const path = 'server/services/ai/aiMetricsService.ts';

let content = fs.readFileSync(path, 'utf8');

const oldRecord = `  recordRequestMetric(metric: Omit<RequestMetric, 'timestamp'>): void {
    const fullMetric: RequestMetric = {
      ...metric,
      timestamp: Date.now()
    };
    metricsBuffer.push(fullMetric);
    if (metricsBuffer.length > MAX_BUFFER_SIZE) {
      metricsBuffer.shift();
    }
  },`;

const newRecord = `  recordRequestMetric(metric: Omit<RequestMetric, 'timestamp'>): void {
    const fullMetric: RequestMetric = {
      ...metric,
      timestamp: Date.now()
    };
    
    // Log structured metric for observability (e.g. for GCP Cloud Logging)
    console.info(JSON.stringify({
      log_type: 'AI_METRIC',
      ...fullMetric
    }));
    
    metricsBuffer.push(fullMetric);
    if (metricsBuffer.length > MAX_BUFFER_SIZE) {
      metricsBuffer.shift();
    }
  },`;

content = content.replace(oldRecord, newRecord);

fs.writeFileSync(path, content);
console.log('Added structured logging to aiMetricsService');
