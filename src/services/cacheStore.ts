type CacheData = {
    data: any;
    timestamp: number;
    ttl?: number; // Per-key TTL override
};

type FetchFunction<T> = () => Promise<T>;

class CacheStore {
    private cache: Map<string, CacheData> = new Map();
    private DEFAULT_TTL = 1000 * 60 * 2; // 2 minutes default TTL

    /**
     * Get cached data if valid, otherwise return null
     */
    get(key: string) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const ttl = cached.ttl || this.DEFAULT_TTL;
        const isExpired = Date.now() - cached.timestamp > ttl;

        if (isExpired) {
            this.cache.delete(key); // Clean up expired entries
            return null;
        }

        return cached.data;
    }

    /**
     * Set data in cache with optional TTL override
     */
    set(key: string, data: any, ttl?: number) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * Invalidate a specific cache key
     */
    invalidate(key: string) {
        this.cache.delete(key);
    }

    /**
     * Invalidate all cache keys matching a pattern
     * Example: invalidatePattern('stock_') clears stock_summary, stock_transactions, etc.
     */
    invalidatePattern(pattern: string) {
        const keysToDelete: string[] = [];
        this.cache.forEach((_, key) => {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Clear all cached data
     */
    clear() {
        this.cache.clear();
    }

    /**
     * Stale-while-revalidate pattern: return cached data immediately,
     * then fetch fresh data in background and update cache
     */
    async getOrFetch<T>(
        key: string,
        fetchFn: FetchFunction<T>,
        ttl?: number
    ): Promise<T> {
        const cached = this.get(key);

        if (cached !== null) {
            // Return cached data immediately
            // Optionally trigger background refresh if close to expiry
            const cacheData = this.cache.get(key);
            if (cacheData) {
                const age = Date.now() - cacheData.timestamp;
                const cacheTtl = cacheData.ttl || this.DEFAULT_TTL;

                // If cache is more than 75% expired, refresh in background
                if (age > cacheTtl * 0.75) {
                    fetchFn().then(freshData => {
                        this.set(key, freshData, ttl);
                    }).catch(err => {
                        console.warn(`Background refresh failed for ${key}:`, err);
                    });
                }
            }

            return cached;
        }

        // No cache, fetch fresh data
        const freshData = await fetchFn();
        this.set(key, freshData, ttl);
        return freshData;
    }
}

export const cacheStore = new CacheStore();
