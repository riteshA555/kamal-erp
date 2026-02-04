import { supabase } from '../supabaseClient'
import { Order } from '../types'
import { Expense } from './expenseService'

export interface GSTSummaryItem {
    rate: number;
    taxableValue: number;
    gstAmount: number;
    totalAmount: number;
    type: 'output' | 'input';
}

export interface ITCStat {
    openingBalance: number;
    claimedThisMonth: number;
    utilization: number;
    closingBalance: number;
}

export const getGSTOrders = async (startDate?: string, endDate?: string) => {
    let query = supabase
        .from('orders')
        .select('*') // JOIN reverted to fix "Nothing showing" error
        .eq('gst_enabled', true)
        .order('order_date', { ascending: false })

    if (startDate) {
        query = query.gte('order_date', startDate)
    }
    if (endDate) {
        query = query.lte('order_date', endDate) // Use lte to include the end date if needed, or lt for next month start
    }

    // Note: If using lt next_month_start, ensure endDate is passed correctly.
    // For simplicity, let's assume endDate is inclusive or caller handles it.
    // Let's stick to strict dates provided.

    const { data, error } = await query
    if (error) throw error
    return data as Order[]
}

export const getITCExpenses = async (startDate?: string, endDate?: string) => {
    let query = supabase
        .from('expenses')
        .select('*')
        // .eq('gst_enabled', true) // Removing this check strictly if we want to see all expenses with GST columns set, 
        // but wait, the previous code had .eq('gst_enabled', true). Let's keep it.
        .eq('gst_enabled', true)
        .order('date', { ascending: false })

    if (startDate) {
        query = query.gte('date', startDate)
    }
    if (endDate) {
        query = query.lte('date', endDate)
    }

    const { data, error } = await query
    if (error) throw error
    return data as Expense[]
}

export const getGSTCustomers = async () => {
    const { data, error } = await supabase
        .from('ledgers')
        .select('id, name, gst_number, state')
    if (error) throw error
    return data
}

export const calculateGSTSummary = (items: (Order | Expense)[], type: 'output' | 'input') => {
    const summary: Record<number, GSTSummaryItem> = {}

    items.forEach(item => {
        const rate = 'gst_rate' in item ? Number(item.gst_rate) : 0
        const taxable = 'subtotal' in item ? Number(item.subtotal) : ('amount' in item ? Number((item as any).amount) : 0)
        const gst = Number(item.gst_amount || 0)
        const total = 'total_amount' in item ? Number(item.total_amount) : (taxable + gst)

        if (!summary[rate]) {
            summary[rate] = { rate, taxableValue: 0, gstAmount: 0, totalAmount: 0, type }
        }

        summary[rate].taxableValue += taxable
        summary[rate].gstAmount += gst
        summary[rate].totalAmount += total
    })

    return Object.values(summary).sort((a, b) => a.rate - b.rate)
}
