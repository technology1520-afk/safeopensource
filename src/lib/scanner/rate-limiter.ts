export interface ScanRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  queueDepth: number;
  message?: string;
}

interface ScanRecord {
  timestamps: number[];
}

const ONE_HOUR_MS = 60 * 60 * 1000;
const ANON_LIMIT = 3;
const EMAIL_LIMIT = 20;

// In-memory rate limiting stores
const ipScanRecords = new Map<string, ScanRecord>();
const emailScanRecords = new Map<string, ScanRecord>();

// Live queue depth tracking
let activeScanCount = 0;

export function incrementActiveScans() {
  activeScanCount++;
}

export function decrementActiveScans() {
  activeScanCount = Math.max(0, activeScanCount - 1);
}

export function getActiveScanQueueDepth(): number {
  return activeScanCount;
}

/**
 * Check and register scan request against IP and email rate limits
 */
export function checkScanRateLimit(ip: string, email?: string): ScanRateLimitResult {
  const now = Date.now();
  const queueDepth = getActiveScanQueueDepth();

  // Normalize IP
  const cleanIp = ip ? ip.trim().replace(/^::ffff:/, '') : '127.0.0.1';

  // 1. If email provided, use email tier (20/hr)
  if (email && email.includes('@')) {
    const cleanEmail = email.toLowerCase().trim();
    let record = emailScanRecords.get(cleanEmail);
    if (!record) {
      record = { timestamps: [] };
      emailScanRecords.set(cleanEmail, record);
    }

    // Filter to last hour
    record.timestamps = record.timestamps.filter((ts) => now - ts < ONE_HOUR_MS);

    if (record.timestamps.length >= EMAIL_LIMIT) {
      const oldest = record.timestamps[0];
      const retryAfter = Math.max(1, Math.ceil((oldest + ONE_HOUR_MS - now) / 1000));
      return {
        allowed: false,
        limit: EMAIL_LIMIT,
        remaining: 0,
        retryAfter,
        queueDepth,
        message: `Rate limit exceeded. Email tier is limited to ${EMAIL_LIMIT} scans per hour. Retry in ${retryAfter}s.`,
      };
    }

    // Record this scan
    record.timestamps.push(now);
    return {
      allowed: true,
      limit: EMAIL_LIMIT,
      remaining: EMAIL_LIMIT - record.timestamps.length,
      retryAfter: 0,
      queueDepth,
    };
  }

  // 2. Anonymous IP tier (3/hr)
  let record = ipScanRecords.get(cleanIp);
  if (!record) {
    record = { timestamps: [] };
    ipScanRecords.set(cleanIp, record);
  }

  // Filter to last hour
  record.timestamps = record.timestamps.filter((ts) => now - ts < ONE_HOUR_MS);

  if (record.timestamps.length >= ANON_LIMIT) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + ONE_HOUR_MS - now) / 1000));
    return {
      allowed: false,
      limit: ANON_LIMIT,
      remaining: 0,
      retryAfter,
      queueDepth,
      message: `Rate limit exceeded. Anonymous scans are limited to ${ANON_LIMIT} per hour. Provide a free email for 20/hr or retry in ${retryAfter}s.`,
    };
  }

  // Record this scan
  record.timestamps.push(now);
  return {
    allowed: true,
    limit: ANON_LIMIT,
    remaining: ANON_LIMIT - record.timestamps.length,
    retryAfter: 0,
    queueDepth,
  };
}

