import { supabase } from '../supabaseClient'
import { cacheStore } from './cacheStore'

export interface Karigar {
    id: string;
    name: string;
    work_type: 'Cutting' | 'Choti' | 'Half Belt' | 'General';
    rate_type: 'Per KG' | 'Per Piece' | 'Fixed';
    default_rate: number;
    status: 'ACTIVE' | 'INACTIVE';
}

const KARIGARS_CACHE_KEY = 'karigars_list'

export interface KarigarWorkRecord {
    id: string;
    karigar_id: string;
    order_id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    payment_status: 'PENDING' | 'PAID';
    payment_date?: string;
    payment_mode?: string;
    work_date: string;
    karigars?: { name: string };
}

export const getKarigars = async () => {
    const cached = cacheStore.get(KARIGARS_CACHE_KEY)
    if (cached) {
        fetchFreshKarigars()
        return cached as Karigar[]
    }
    return fetchFreshKarigars()
}

const fetchFreshKarigars = async () => {
    const { data, error } = await supabase
        .from('karigars')
        .select('*')
        .order('name')
    if (error) throw error
    cacheStore.set(KARIGARS_CACHE_KEY, data)
    return data as Karigar[]
}

export const createKarigar = async (karigar: Omit<Karigar, 'id'>) => {
    const { data, error } = await supabase
        .from('karigars')
        .insert(karigar)
        .select()
        .single()
    if (error) throw error
    cacheStore.invalidate(KARIGARS_CACHE_KEY)
    return data as Karigar
}

export const getKarigarWorkHistory = async (karigarId?: string, month?: string) => {
    let query = supabase
        .from('karigar_work_records')
        .select('*, karigars(name)')
        .order('work_date', { ascending: false })

    if (karigarId) query = query.eq('karigar_id', karigarId)
    if (month) {
        // Simple month filter for YYYY-MM
        query = query.gte('work_date', `${month}-01`).lte('work_date', `${month}-31`)
    }

    const { data, error } = await query
    if (error) throw error
    return data as KarigarWorkRecord[]
}

export const settleKarigarPayments = async (ids: string[], paymentDate: string, paymentMode: string) => {
    // 1. Fetch record details for accounting
    const { data: records, error: fetchError } = await supabase
        .from('karigar_work_records')
        .select('karigar_id, amount, karigars(name)')
        .in('id', ids)

    if (fetchError) throw fetchError

    // 2. Group by Karigar to create consolidated Expense entries
    const settlements: { [key: string]: { name: string, amount: number } } = {}

    records?.forEach(r => {
        const kId = r.karigar_id
        if (!settlements[kId]) {
            settlements[kId] = { name: (r.karigars as any)?.name || 'Unknown', amount: 0 }
        }
        settlements[kId].amount += Number(r.amount)
    })

    // 3. Insert into Expenses (This feeds the P&L)
    const expensesToAdd = Object.keys(settlements).map(kId => ({
        date: paymentDate,
        head: `Karigar Payment - ${settlements[kId].name}`, // MUST start with "Karigar Payment" for P&L Service
        amount: settlements[kId].amount,
        notes: `Settlement via ${paymentMode} for ${ids.length} work records`,
        gst_enabled: false
    }))

    if (expensesToAdd.length > 0) {
        const { error: expenseError } = await supabase
            .from('expenses')
            .insert(expensesToAdd)
        if (expenseError) throw expenseError
    }

    // 4. Update Status in Work Records
    const { error } = await supabase
        .from('karigar_work_records')
        .update({
            payment_status: 'PAID',
            payment_date: paymentDate,
            payment_mode: paymentMode
        })
        .in('id', ids)

    if (error) throw error

    // Invalidate P&L cache
    cacheStore.invalidate('pl_report')
}

export const updateKarigar = async (id: string, updates: Partial<Karigar>) => {
    const { error } = await supabase
        .from('karigars')
        .update(updates)
        .eq('id', id)

    if (error) throw error
    cacheStore.invalidate(KARIGARS_CACHE_KEY)
}

export const deleteKarigar = async (id: string) => {
    // Check for work records first to prevent FK error
    const { count, error: countError } = await supabase
        .from('karigar_work_records')
        .select('*', { count: 'exact', head: true })
        .eq('karigar_id', id)

    if (countError) throw countError
    if (count && count > 0) throw new Error("Cannot delete Karigar with existing work records. Deactivate instead.")

    const { error } = await supabase
        .from('karigars')
        .delete()
        .eq('id', id)

    if (error) throw error
    cacheStore.invalidate(KARIGARS_CACHE_KEY)
}

export const getKarigarBalances = async () => {
    // Fetch all work records to calculate pending balances
    const { data, error } = await supabase
        .from('karigar_work_records')
        .select('karigar_id, amount, payment_status')

    if (error) throw error

    const balances: { [key: string]: number } = {}
    data?.forEach(r => {
        if (r.payment_status === 'PENDING') {
            balances[r.karigar_id] = (balances[r.karigar_id] || 0) + Number(r.amount)
        }
    })
    return balances
}

export const recordKarigarPayment = async (karigarId: string, amount: number, mode: string, date: string, notes: string = '') => {

    const params = {
        p_karigar_id: karigarId,
        p_amount: amount,
        p_mode: mode,
        p_date: date,
        p_notes: notes
    }

    const { data, error } = await supabase.rpc('settle_karigar_payment_atomic', params)

    if (error) throw error

    // Invalidate caches
    cacheStore.invalidate(KARIGARS_CACHE_KEY)
    cacheStore.invalidate('pl_report')

    return data
}

// Helper to get name
const getKarigarName = async (id: string) => {
    const { data } = await supabase.from('karigars').select('name').eq('id', id).single()
    return data?.name || 'Unknown'
}

export const getKarigarStats = async (karigarId: string) => {
    const { data: records, error: rError } = await supabase
        .from('karigar_work_records')
        .select('amount')
        .eq('karigar_id', karigarId)
        .eq('payment_status', 'PENDING')

    if (rError) throw rError

    const pendingWork = records.reduce((sum, r) => sum + Number(r.amount), 0)

    const { data: kData, error: kError } = await supabase
        .from('karigars')
        .select('current_balance')
        .eq('id', karigarId)
        .single()

    if (kError) throw kError

    return {
        pendingWork,
        advance: Number(kData.current_balance) || 0
    }
}
