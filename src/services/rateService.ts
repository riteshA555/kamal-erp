import { supabase } from '../supabaseClient'
import { cacheStore } from './cacheStore'

export interface SilverRate {
    id: string;
    rate_date: string;
    source: 'MCX' | 'Local Dealer';
    rate_10g: number;
    rate_1g: number;
    notes?: string;
}

const CACHE_KEYS = {
    LATEST_RATE: 'latest_rate',
    RATE_HISTORY: 'rate_history',
    RATE_HISTORY_PREFIX: 'rate_history_'
}

const RATE_TTL = 1000 * 60 * 5; // 5 minutes for rates

export const getLatestRate = async () => {
    return cacheStore.getOrFetch(CACHE_KEYS.LATEST_RATE, async () => {
        const { data, error } = await supabase
            .from('silver_rates')
            .select('*')
            .order('rate_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        if (error && error.code !== 'PGRST116') throw error
        return data as SilverRate | null
    }, RATE_TTL)
}

export const getRateHistory = async (source?: string) => {
    const cacheKey = source
        ? `${CACHE_KEYS.RATE_HISTORY_PREFIX}${source}`
        : CACHE_KEYS.RATE_HISTORY;

    return cacheStore.getOrFetch(cacheKey, async () => {
        let query = supabase
            .from('silver_rates')
            .select('*')
            .order('rate_date', { ascending: true })

        if (source) query = query.eq('source', source)

        const { data, error } = await query
        if (error) throw error
        return data as SilverRate[]
    }, RATE_TTL)
}

export const addSilverRate = async (rate: Omit<SilverRate, 'id' | 'rate_1g'>) => {
    const rate_1g = rate.rate_10g / 10
    const { data, error } = await supabase
        .from('silver_rates')
        .upsert(
            { ...rate, rate_1g },
            { onConflict: 'rate_date,source' }
        )
        .select()
        .single()
    if (error) throw error

    // Invalidate all rate caches
    cacheStore.invalidate(CACHE_KEYS.LATEST_RATE)
    cacheStore.invalidatePattern(CACHE_KEYS.RATE_HISTORY)
    cacheStore.invalidatePattern('stock_summary') // Stock summary depends on rates

    return data as SilverRate
}
export const deleteSilverRate = async (id: string) => {
    const { error } = await supabase
        .from('silver_rates')
        .delete()
        .eq('id', id)
    if (error) throw error

    // Invalidate all rate caches
    cacheStore.invalidate(CACHE_KEYS.LATEST_RATE)
    cacheStore.invalidatePattern(CACHE_KEYS.RATE_HISTORY)
    cacheStore.invalidatePattern('stock_summary')
}
