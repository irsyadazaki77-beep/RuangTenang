import { Request, Response, NextFunction } from 'express';
import { serverDb } from '../database.js';

interface ClientState {
  burstTokens: number;
  lastRequest: number;
  minuteCount: number;
  minuteReset: number;
  hourlyCount: number;
  hourlyReset: number;
}

const clientStates = new Map<string, ClientState>();
const activeRequests = new Map<string, number>();

let globalDailyUsage = 0;
let globalDailyReset = 0;

function updateAndCheckState(key: string, isAnonymous: boolean, now: number): { allowed: boolean, state: ClientState } {
  let state = clientStates.get(key);
  if (!state || now > state.hourlyReset) {
    state = {
      burstTokens: isAnonymous ? 3 : 10,
      lastRequest: now,
      minuteCount: 0,
      minuteReset: now + 60000,
      hourlyCount: 0,
      hourlyReset: now + 3600000,
    };
    clientStates.set(key, state);
  } else if (now > state.minuteReset) {
    state.minuteCount = 0;
    state.minuteReset = now + 60000;
  }

  const timePassed = now - state.lastRequest;
  const maxTokens = isAnonymous ? 3 : 10;
  const refillRate = isAnonymous ? 10000 : 2000; // ms per token
  
  state.burstTokens = Math.min(maxTokens, state.burstTokens + Math.floor(timePassed / refillRate));
  state.lastRequest = now;

  let allowed = true;
  if (state.burstTokens <= 0) allowed = false;
  
  const maxPerMinute = isAnonymous ? 5 : 30;
  if (state.minuteCount >= maxPerMinute) allowed = false;

  const maxPerHour = isAnonymous ? 20 : 100;
  if (state.hourlyCount >= maxPerHour) allowed = false;

  return { allowed, state };
}

export async function aiAbuseLimiter(req: Request, res: Response, next: NextFunction) {
  const isAnonymous = !req.user || req.user.userId === 'guest';
  const clientIp = req.ip || '127.0.0.1';
  const clientFingerprint = req.headers['x-anonymous-id'] as string || '';
  
  // Track IP and Fingerprint separately to prevent rotating one to bypass limits
  const ipKey = `ip_${clientIp}`;
  const fingerKey = clientFingerprint ? `finger_${clientFingerprint}` : null;
  const userKey = !isAnonymous ? `user_${req.user!.userId}` : null;

  // Keys to check
  const keysToCheck = isAnonymous ? [ipKey] : [userKey!];
  if (isAnonymous && fingerKey) keysToCheck.push(fingerKey);

  // 1. Concurrency limit
  const maxConcurrency = isAnonymous ? 1 : 3;
  for (const key of keysToCheck) {
    const currentActive = activeRequests.get(key) || 0;
    if (currentActive >= maxConcurrency) {
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        error: 'Terlalu banyak permintaan secara bersamaan. Silakan tunggu permintaan sebelumnya selesai.'
      });
    }
  }

  // 2. Global Circuit Breaker
  const now = Date.now();
  if (now > globalDailyReset) {
    globalDailyUsage = 0;
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    globalDailyReset = tomorrow.getTime();
  }
  
  const GLOBAL_DAILY_LIMIT = process.env.GLOBAL_AI_BUDGET ? parseInt(process.env.GLOBAL_AI_BUDGET, 10) : 5000;
  if (globalDailyUsage >= GLOBAL_DAILY_LIMIT) {
    return res.status(503).json({
      success: false,
      code: 'GLOBAL_AI_LIMIT_REACHED',
      error: 'Layanan AI sedang mengalami beban tinggi secara global. Silakan coba lagi nanti.'
    });
  }

  // 3. Burst & Rate limits
  let allAllowed = true;
  const statesToUpdate: ClientState[] = [];
  
  for (const key of keysToCheck) {
    const { allowed, state } = updateAndCheckState(key, isAnonymous, now);
    if (!allowed) allAllowed = false;
    statesToUpdate.push(state);
  }

  if (!allAllowed) {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMITED',
      error: 'Batas permintaan tercapai. Silakan perlambat jeda obrolan.'
    });
  }

  // Challenge mechanism check
  const maxPerHour = isAnonymous ? 20 : 100;
  const challengeThreshold = isAnonymous ? (maxPerHour * 0.75) : (maxPerHour * 0.90);
  for (const state of statesToUpdate) {
    if (state.hourlyCount >= challengeThreshold) {
      res.setHeader('X-Challenge-Required', 'true');
      break;
    }
  }
  
  // Deduct token
  for (const state of statesToUpdate) {
    state.burstTokens -= 1;
    state.minuteCount += 1;
    state.hourlyCount += 1;
  }
  globalDailyUsage += 1;

  for (const key of keysToCheck) {
    activeRequests.set(key, (activeRequests.get(key) || 0) + 1);
  }
  
  let finished = false;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    for (const key of keysToCheck) {
      const active = activeRequests.get(key) || 0;
      if (active > 0) {
        activeRequests.set(key, active - 1);
      }
    }
  };

  res.on('finish', cleanup);
  res.on('close', cleanup);

  next();
}

// Function for tests to reset state
export function resetAbuseState() {
  clientStates.clear();
  activeRequests.clear();
  globalDailyUsage = 0;
}
