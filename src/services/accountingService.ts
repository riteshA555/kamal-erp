import { supabase } from '../supabaseClient'
import { cacheStore } from './cacheStore'

export interface LedgerSummary {
    ledger_name: string;
    total_debit: number;
    total_credit: number;
    balance: number;
}

export interface PLData {
    jobWorkIncome: number;
    productSalesIncome: number;
    generalExpenses: number;
    karigarExpenses: number;
    totalExpenses: number;
    netProfit: number;
}

const CACHE_KEYS = {
    PL_REPORT: 'pl_report',
    CUSTOMER_STATEMENT_PREFIX: 'customer_statement_'
}

export const getPLReport = async () => {
    return cacheStore.getOrFetch(CACHE_KEYS.PL_REPORT, async () => {
        // 1. Get Incomes from system ledgers
        const { data: incomeData, error: incomeError } = await supabase
            .from('transactions')
            .select('ledgers!inner(name), credit')
            .in('ledgers.name', ['Job Work Income', 'Product Sales Income'])

        if (incomeError) throw incomeError

        const jobWorkIncome = incomeData
            .filter((t: any) => (t.ledgers as any).name === 'Job Work Income')
            .reduce((sum: number, t: any) => sum + Number(t.credit), 0)

        const productSalesIncome = incomeData
            .filter((t: any) => (t.ledgers as any).name === 'Product Sales Income')
            .reduce((sum: number, t: any) => sum + Number(t.credit), 0)

        // 2. Get Expenses and separate Karigar vs General
        const { data: expenseData, error: expenseError } = await supabase
            .from('expenses')
            .select('head, amount, gst_amount, gst_enabled')

        if (expenseError) throw expenseError

        const karigarExpenses = expenseData
            .filter((e: any) => e.head.startsWith('Karigar Payment'))
            .reduce((sum: number, e: any) => sum + Number(e.amount), 0)

        const generalExpenses = expenseData
            .filter((e: any) => !e.head.startsWith('Karigar Payment'))
            .reduce((sum: number, e: any) => {
                // For P&L, we should count the Net Expense (excluding GST if it's recorded)
                // If GST is enabled, specific gst_amount is usually ITC (Asset), not Expense.
                const netAmount = (e.gst_enabled && e.gst_amount)
                    ? (Number(e.amount) - Number(e.gst_amount))
                    : Number(e.amount)
                return sum + netAmount
            }, 0)

        const totalExpenses = generalExpenses + karigarExpenses

        return {
            jobWorkIncome,
            productSalesIncome,
            generalExpenses,
            karigarExpenses,
            totalExpenses,
            netProfit: (jobWorkIncome + productSalesIncome) - totalExpenses
        } as PLData
    })
}

export const getCustomerStatement = async (customerName: string, startDate?: string, endDate?: string) => {
    // Generate cache key with date params to ensure uniqueness
    const cacheKey = `${CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX}${customerName}_${startDate || 'all'}_${endDate || 'all'}`;

    return cacheStore.getOrFetch(cacheKey, async () => {
        // 1. Find Ledger ID
        const { data: ledgers, error: ledgerError } = await supabase
            .from('ledgers')
            .select('id')
            .eq('name', customerName)
            .limit(1)

        if (ledgerError || !ledgers.length) throw new Error("Customer not found or invalid name")

        const ledgerId = ledgers[0].id

        // 2. Fetch Transactions for this Ledger
        let query = supabase
            .from('transactions')
            .select('*')
            .eq('ledger_id', ledgerId)
            .order('date', { ascending: false })

        if (startDate) {
            query = query.gte('date', startDate)
        }
        if (endDate) {
            query = query.lte('date', endDate)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    })
}

export const getAssetLedgers = async () => {
    // Fetches Customers (Assets) for the dropdown
    const { data, error } = await supabase
        .from('ledgers')
        .select('id, name')
        .eq('type', 'ASSET')
        .order('name')

    if (error) throw error
    return data
}

export const recordPayment = async (ledgerId: string, amount: number, mode: string, note: string) => {
    const date = new Date().toISOString().split('T')[0]

    // Use atomic RPC to handle double-entry (Customer Credit / Cash Debit)
    const { data, error } = await supabase.rpc('record_ledger_payment_atomic', {
        p_ledger_id: ledgerId,
        p_amount: amount,
        p_mode: mode,
        p_date: date,
        p_note: note,
        p_type: 'IN'
    })

    if (error) throw error

    // Invalidate caches
    cacheStore.invalidatePattern(CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX)
    cacheStore.invalidate('pl_report')
    return data
}

export const recordPaymentOut = async (ledgerId: string, amount: number, mode: string, note: string) => {
    const date = new Date().toISOString().split('T')[0]

    // Use atomic RPC for Vendor Payment (Vendor Debit / Cash Credit)
    const { data, error } = await supabase.rpc('record_ledger_payment_atomic', {
        p_ledger_id: ledgerId,
        p_amount: amount,
        p_mode: mode,
        p_date: date,
        p_note: note,
        p_type: 'OUT'
    })

    if (error) throw error

    // Invalidate caches
    cacheStore.invalidatePattern(CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX)
    cacheStore.invalidate('pl_report')
    return data
}


export const getLiabilityLedgers = async () => {
    // Fetches Vendors (Liabilities)
    const { data, error } = await supabase
        .from('ledgers')
        .select('id, name')
        .eq('type', 'LIABILITY')
        .order('name')

    if (error) throw error
    return data
}

export const createLedger = async (name: string, type: 'ASSET' | 'LIABILITY' | 'EXPENSE' | 'INCOME') => {
    const { data, error } = await supabase
        .from('ledgers')
        .insert({ name, type })
        .select()

    if (error) throw error
    return data[0]
}


export const deleteLedger = async (id: string) => {
    // 1. Check for transactions
    const { count, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('ledger_id', id)

    if (countError) throw countError
    if (count && count > 0) throw new Error("Cannot delete Ledger with existing transactions. Please clear dues first.")

    // 2. Delete Ledger
    const { error } = await supabase
        .from('ledgers')
        .delete()
        .eq('id', id)

    if (error) throw error
    cacheStore.invalidate(CACHE_KEYS.CUSTOMER_STATEMENT_PREFIX)
}
