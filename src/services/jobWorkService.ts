import { supabase } from '../supabaseClient'
import { JobWorkItem } from '../types'
import { cacheStore } from './cacheStore'

const JOB_WORK_CACHE_KEY = 'job_work_items'

export const getJobWorkItems = async () => {
    const cached = cacheStore.get(JOB_WORK_CACHE_KEY)
    if (cached) {
        fetchFreshJobWork()
        return cached as JobWorkItem[]
    }
    return fetchFreshJobWork()
}

const fetchFreshJobWork = async () => {
    const { data, error } = await supabase
        .from('job_work_items')
        .select('*')
        .eq('is_active', true)
        .order('name')

    if (error) throw error
    cacheStore.set(JOB_WORK_CACHE_KEY, data)
    return data as JobWorkItem[]
}

export const updateJobWorkItem = async (id: string, updates: Partial<JobWorkItem>) => {
    const { error } = await supabase
        .from('job_work_items')
        .update(updates)
        .eq('id', id)
    if (error) throw error
    cacheStore.invalidate(JOB_WORK_CACHE_KEY)
}

export const deleteJobWorkItem = async (id: string) => {
    const { error } = await supabase
        .from('job_work_items')
        .update({ is_active: false })
        .eq('id', id)
    if (error) throw error
    cacheStore.invalidate(JOB_WORK_CACHE_KEY)
}

export const addJobWorkItem = async (item: Omit<JobWorkItem, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('job_work_items')
        .insert([item])
        .select()
    if (error) throw error
    cacheStore.invalidate(JOB_WORK_CACHE_KEY)
    return data[0] as JobWorkItem
}
