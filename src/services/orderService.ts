import { supabase } from '../supabaseClient'
import { Order, OrderItem } from '../types'
import { cacheStore } from './cacheStore'

const CACHE_KEYS = {
    ORDERS: 'orders_list'
}

export const getOrders = async () => {
    return cacheStore.getOrFetch(CACHE_KEYS.ORDERS, async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*, items:order_items(*)')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data as Order[]
    })
}

export const createOrder = async (order: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'order_number' | 'user_id' | 'gst_enabled' | 'gst_rate' | 'gst_amount' | 'subtotal' | 'total_amount'>, items: Omit<OrderItem, 'id' | 'order_id' | 'amount'>[], gstEnabled: boolean = false, gstRate: number = 3) => {
    const { data, error } = await supabase.rpc('create_order_atomic', {
        p_customer_name: order.customer_name,
        p_order_date: order.order_date,
        p_material_type: order.material_type,
        p_items: items,
        p_gst_enabled: gstEnabled,
        p_gst_rate: gstRate
    })

    if (error) {
        console.error('RPC Error:', error)
        throw error
    }

    // Invalidate related caches
    cacheStore.invalidate(CACHE_KEYS.ORDERS)
    cacheStore.invalidate('dashboard_stats')
    cacheStore.invalidatePattern('stock_') // Orders affect stock

    return data
}

export const deleteOrder = async (orderId: string) => {
    // 1. Delete Stock Transactions
    const { error: stockError } = await supabase
        .from('stock_transactions')
        .delete()
        .eq('order_id', orderId)
    if (stockError) throw stockError

    // 2. Delete Accounting Transactions
    const { error: transError } = await supabase
        .from('transactions')
        .delete()
        .eq('order_id', orderId)
    if (transError) throw transError

    // 3. Delete Karigar Work Records
    const { error: workError } = await supabase
        .from('karigar_work_records')
        .delete()
        .eq('order_id', orderId)
    if (workError) throw workError


    const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

    if (error) throw error

    // Invalidate related caches
    cacheStore.invalidate(CACHE_KEYS.ORDERS)
    cacheStore.invalidate('dashboard_stats')
    cacheStore.invalidatePattern('stock_') // Deleting orders affects stock
}

export const deleteOrders = async (orderIds: string[]) => {
    if (orderIds.length === 0) return

    // 1. Delete Stock Transactions
    const { error: stockError } = await supabase
        .from('stock_transactions')
        .delete()
        .in('order_id', orderIds)
    if (stockError) throw stockError

    // 2. Delete Accounting Transactions
    const { error: transError } = await supabase
        .from('transactions')
        .delete()
        .in('order_id', orderIds)
    if (transError) throw transError

    // 3. Delete Karigar Work Records
    const { error: workError } = await supabase
        .from('karigar_work_records')
        .delete()
        .in('order_id', orderIds)
    if (workError) throw workError



    const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds)

    if (error) throw error

    // Invalidate related caches
    cacheStore.invalidate(CACHE_KEYS.ORDERS)
    cacheStore.invalidate('dashboard_stats')
    cacheStore.invalidatePattern('stock_')
}

