import { Injectable, Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

interface CacheEntry<T> {
  data: T;
}

@Injectable()
export class RedisCacheService {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly defaultTtlSeconds = 60;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    const options: RedisOptions = {
      enableReadyCheck: false, // avoid INFO command when permissions are restricted
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    };

    this.client = redisUrl ? new Redis(redisUrl, options) : new Redis(options);
    this.client.on('error', (err) =>
      this.logger.warn(`Redis connection error: ${err.message}`),
    );
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      const parsed: CacheEntry<T> = JSON.parse(raw);
      return parsed.data;
    } catch (err) {
      this.logger.warn(`Cache get failed for key ${key}: ${String(err)}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = this.defaultTtlSeconds) {
    try {
      const payload: CacheEntry<T> = { data: value };
      await this.client.set(key, JSON.stringify(payload), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Cache set failed for key ${key}: ${String(err)}`);
    }
  }
}
