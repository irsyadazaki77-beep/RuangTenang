import Redis from 'ioredis';

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

export class RedisService {
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private memoryCache = new Map<string, CacheEntry>();
  private lastWarnTimestamp = 0;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (!redisUrl && !redisHost && process.env.NODE_ENV === 'test') {
      // In test mode without explicit Redis env, default to in-memory fallback
      return;
    }

    try {
      const options: any = {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        retryStrategy: (times: number) => {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 200, 1000);
        },
      };

      if (redisUrl) {
        this.client = new Redis(redisUrl, options);
      } else if (redisHost) {
        this.client = new Redis({
          host: redisHost,
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          ...options,
        });
      } else if (process.env.USE_REDIS === 'true') {
        this.client = new Redis(options);
      }

      if (this.client) {
        this.client.on('connect', () => {
          this.isConnected = true;
        });

        this.client.on('ready', () => {
          this.isConnected = true;
        });

        this.client.on('error', (err) => {
          this.isConnected = false;
          this.logWarnOnce(`[REDIS] Client connection error: ${err.message}`);
        });

        this.client.on('close', () => {
          this.isConnected = false;
        });
      }
    } catch (err: any) {
      this.isConnected = false;
      this.logWarnOnce(`[REDIS] Failed to initialize Redis client: ${err.message}`);
    }
  }

  private logWarnOnce(msg: string) {
    const now = Date.now();
    if (now - this.lastWarnTimestamp > 30000) {
      console.warn(msg);
      this.lastWarnTimestamp = now;
    }
  }

  public forceOffline(offline = true) {
    if (offline) {
      this.isConnected = false;
    } else if (this.client) {
      this.isConnected = this.client.status === 'ready';
    } else {
      this.isConnected = false;
    }
  }

  public async isHealthy(): Promise<boolean> {
    if (!this.isConnected || !this.client) return false;
    try {
      const pingRes = await this.client.ping();
      return pingRes === 'PONG';
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  public async get<T = any>(key: string): Promise<T | null> {
    if (this.isConnected && this.client) {
      try {
        const data = await this.client.get(key);
        if (data === null) return null;
        try {
          return JSON.parse(data) as T;
        } catch {
          return data as unknown as T;
        }
      } catch (err: any) {
        this.isConnected = false;
        this.logWarnOnce(`[REDIS_FALLBACK] Get failed for ${key}: ${err.message}`);
      }
    }

    // In-Memory Fallback
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch {
      return entry.value as unknown as T;
    }
  }

  public async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);

    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client.set(key, valStr, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, valStr);
        }
        return;
      } catch (err: any) {
        this.isConnected = false;
        this.logWarnOnce(`[REDIS_FALLBACK] Set failed for ${key}: ${err.message}`);
      }
    }

    // In-Memory Fallback
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryCache.set(key, { value: valStr, expiresAt });
  }

  /**
   * Atomic set-if-not-exists with TTL
   * Returns true if lock/key was created, false if key already exists
   */
  public async setnx(key: string, value: any, ttlSeconds: number): Promise<boolean> {
    const valStr = typeof value === 'string' ? value : JSON.stringify(value);

    if (this.isConnected && this.client) {
      try {
        const res = await this.client.set(key, valStr, 'EX', ttlSeconds, 'NX');
        return res === 'OK';
      } catch (err: any) {
        this.isConnected = false;
        this.logWarnOnce(`[REDIS_FALLBACK] Setnx failed for ${key}: ${err.message}`);
      }
    }

    // In-Memory Fallback
    const existing = this.memoryCache.get(key);
    const now = Date.now();
    if (existing && (existing.expiresAt === null || existing.expiresAt > now)) {
      return false; // Already locked
    }

    this.memoryCache.set(key, {
      value: valStr,
      expiresAt: now + ttlSeconds * 1000,
    });
    return true;
  }

  public async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch (err: any) {
        this.isConnected = false;
        this.logWarnOnce(`[REDIS_FALLBACK] Del failed for ${key}: ${err.message}`);
      }
    }

    // In-Memory Fallback
    this.memoryCache.delete(key);
  }

  public async delPattern(pattern: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
        return;
      } catch (err: any) {
        this.isConnected = false;
        this.logWarnOnce(`[REDIS_FALLBACK] DelPattern failed for ${pattern}: ${err.message}`);
      }
    }

    // In-Memory Fallback
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  public async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        const count = await this.client.incr(key);
        if (count === 1 && ttlSeconds && ttlSeconds > 0) {
          await this.client.expire(key, ttlSeconds);
        }
        return count;
      } catch (err: any) {
        this.isConnected = false;
        this.logWarnOnce(`[REDIS_FALLBACK] Incr failed for ${key}: ${err.message}`);
      }
    }

    // In-Memory Fallback
    const now = Date.now();
    const existing = this.memoryCache.get(key);
    let count = 0;
    let expiresAt = ttlSeconds ? now + ttlSeconds * 1000 : null;

    if (existing && (existing.expiresAt === null || existing.expiresAt > now)) {
      count = parseInt(existing.value, 10) || 0;
      expiresAt = existing.expiresAt;
    }

    count += 1;
    this.memoryCache.set(key, { value: String(count), expiresAt });
    return count;
  }

  public async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (this.isConnected && this.client) {
      try {
        const res = await this.client.expire(key, ttlSeconds);
        return res === 1;
      } catch (err: any) {
        this.isConnected = false;
        this.logWarnOnce(`[REDIS_FALLBACK] Expire failed for ${key}: ${err.message}`);
      }
    }

    // In-Memory Fallback
    const existing = this.memoryCache.get(key);
    if (!existing) return false;
    existing.expiresAt = Date.now() + ttlSeconds * 1000;
    return true;
  }

  public async flush(): Promise<void> {
    this.memoryCache.clear();
    if (this.isConnected && this.client) {
      try {
        await this.client.flushdb();
      } catch (err: any) {
        this.logWarnOnce(`[REDIS] Flushdb failed: ${err.message}`);
      }
    }
  }

  public async disconnect(): Promise<void> {
    this.memoryCache.clear();
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // Ignore disconnect error
      }
      this.client = null;
      this.isConnected = false;
    }
  }
}

export const redisService = new RedisService();
