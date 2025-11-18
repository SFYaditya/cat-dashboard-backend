/**
 * 简单的内存缓存实现
 * 用于减少重复查询，提升 API 性能
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // 缓存有效期（毫秒）
}

export class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = 5000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// 导出单例实例
export const responseCache = new SimpleCache();

